import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import { toRupees, formatRupeeText } from '../utils/orderPricing.js';

/**
 * Valid fulfillment state transitions matrix.
 * Note: 'paid', 'payment_failed', 'payment_reconciliation_needed' are strictly gateway-controlled
 * and can NEVER be transitioned into via admin endpoint.
 */
const VALID_FULFILLMENT_TRANSITIONS = {
  paid: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
  pending_payment: ['cancelled'],
  payment_reconciliation_needed: ['processing', 'cancelled'],
  payment_failed: ['cancelled'],
};

/**
 * GET /api/admin/stats
 * Aggregates live business intelligence metrics directly from MongoDB.
 */
export const getDashboardStats = async (req, res) => {
  try {
    const [
      revenueAggregation,
      ordersByStatus,
      totalOrdersCount,
      totalProductsCount,
      lowStockProducts,
      totalCustomersCount,
      recentOrders,
    ] = await Promise.all([
      // Total Revenue from confirmed paid / fulfilled orders
      Order.aggregate([
        {
          $match: {
            status: { $in: ['paid', 'processing', 'shipped', 'delivered'] },
          },
        },
        {
          $group: {
            _id: null,
            totalPaise: { $sum: '$totalPaise' },
          },
        },
      ]),

      // Order counts grouped by status
      Order.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),

      // Total orders count
      Order.countDocuments(),

      // Total products count
      Product.countDocuments(),

      // Products with low inventory (<= 5 units)
      Product.find({ stockQuantity: { $lte: 5 } })
        .populate('category', 'name slug')
        .select('name code slug stockQuantity pricePaise image isActive')
        .sort({ stockQuantity: 1 })
        .limit(10),

      // Total customer accounts
      User.countDocuments({ role: 'customer' }),

      // Most recent 5 orders across all customers
      Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('user', 'name email'),
    ]);

    const totalRevenuePaise = revenueAggregation[0]?.totalPaise || 0;
    const statusCounts = {};
    ordersByStatus.forEach((item) => {
      statusCounts[item._id] = item.count;
    });

    return res.status(200).json({
      status: 'success',
      metrics: {
        revenue: {
          totalPaise: totalRevenuePaise,
          totalRupees: toRupees(totalRevenuePaise),
          totalFormatted: formatRupeeText(totalRevenuePaise),
        },
        orders: {
          total: totalOrdersCount,
          byStatus: statusCounts,
          pending: statusCounts.pending_payment || 0,
          paid: statusCounts.paid || 0,
          processing: statusCounts.processing || 0,
          shipped: statusCounts.shipped || 0,
          delivered: statusCounts.delivered || 0,
          cancelled: statusCounts.cancelled || 0,
          reconciliationNeeded: statusCounts.payment_reconciliation_needed || 0,
        },
        inventory: {
          totalProducts: totalProductsCount,
          lowStockCount: lowStockProducts.length,
          lowStockItems: lowStockProducts.map((p) => p.toSafeJSON()),
        },
        customers: {
          total: totalCustomersCount,
        },
        recentOrders: recentOrders.map((o) => ({
          ...o.toSafeJSON(),
          customerName: o.user?.name || o.shippingAddress?.recipientName || 'Guest Customer',
          customerEmail: o.user?.email || null,
        })),
      },
    });
  } catch (error) {
    console.error('[Admin Controller - getDashboardStats]:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve administrative dashboard metrics',
    });
  }
};

/**
 * GET /api/admin/products
 * List products for management with pagination, filtering, and sorting.
 */
export const getAdminProducts = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};

    // Search query (name or code or slug)
    if (req.query.search && typeof req.query.search === 'string') {
      const q = req.query.search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { code: { $regex: q, $options: 'i' } },
        { slug: { $regex: q, $options: 'i' } },
      ];
    }

    // Active status filter
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    // Category filter
    if (req.query.category && typeof req.query.category === 'string') {
      const catTrimmed = req.query.category.trim();
      if (mongoose.Types.ObjectId.isValid(catTrimmed)) {
        filter.category = catTrimmed;
      } else {
        const foundCat = await Category.findOne({ slug: catTrimmed.toLowerCase() });
        if (foundCat) {
          filter.category = foundCat._id;
        }
      }
    }

    // Sorting
    let sort = { createdAt: -1 };
    if (req.query.sort === 'price-low-high') sort = { pricePaise: 1 };
    if (req.query.sort === 'price-high-low') sort = { pricePaise: -1 };
    if (req.query.sort === 'stock-low-high') sort = { stockQuantity: 1 };
    if (req.query.sort === 'name-az') sort = { name: 1 };

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name slug')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      status: 'success',
      products: products.map((p) => p.toSafeJSON()),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error('[Admin Controller - getAdminProducts]:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve products catalogue',
    });
  }
};

/**
 * GET /api/admin/products/:idOrSlug
 * Retrieve single product for inspection/editing.
 */
export const getAdminProductById = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const trimmed = idOrSlug.trim();
    const isObjectId = mongoose.Types.ObjectId.isValid(trimmed);

    const conditions = [{ slug: trimmed.toLowerCase() }, { code: trimmed }];
    if (isObjectId) conditions.push({ _id: trimmed });

    const product = await Product.findOne({ $or: conditions }).populate('category', 'name slug');
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      product: product.toSafeJSON(),
    });
  } catch (error) {
    console.error('[Admin Controller - getAdminProductById]:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve product details',
    });
  }
};

/**
 * POST /api/admin/products
 * Securely create a new product model with strict validation.
 */
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      slug,
      code,
      pricePaise,
      categoryId,
      description,
      image,
      images,
      alt,
      stockQuantity,
      isActive,
      priority,
    } = req.body;

    // Validate Category exists
    const categoryExists = await Category.findById(categoryId);
    if (!categoryExists) {
      return res.status(400).json({
        status: 'error',
        message: 'Specified category does not exist',
      });
    }

    // Check slug uniqueness
    const existingSlug = await Product.findOne({ slug: slug.toLowerCase().trim() });
    if (existingSlug) {
      return res.status(409).json({
        status: 'error',
        message: `Product slug "${slug}" is already in use`,
      });
    }

    // Check code uniqueness if provided
    if (code && typeof code === 'string' && code.trim()) {
      const existingCode = await Product.findOne({ code: code.trim() });
      if (existingCode) {
        return res.status(409).json({
          status: 'error',
          message: `Product code "${code}" is already in use`,
        });
      }
    }

    const newProduct = await Product.create({
      name: name.trim(),
      slug: slug.toLowerCase().trim(),
      code: code ? code.trim() : null,
      pricePaise,
      category: categoryExists._id,
      description: description.trim(),
      image: image.trim(),
      images: Array.isArray(images) && images.length > 0 ? images : [image.trim()],
      alt: alt ? alt.trim() : name.trim(),
      stockQuantity: stockQuantity ?? 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      priority: priority !== undefined ? Boolean(priority) : false,
    });

    const populated = await Product.findById(newProduct._id).populate('category', 'name slug');

    return res.status(201).json({
      status: 'success',
      message: 'Product created successfully',
      product: populated.toSafeJSON(),
    });
  } catch (error) {
    console.error('[Admin Controller - createProduct]:', error);
    if (error.code === 11000) {
      return res.status(409).json({
        status: 'error',
        message: 'Duplicate key conflict: slug or code already exists',
      });
    }
    return res.status(500).json({
      status: 'error',
      message: 'Failed to create product',
    });
  }
};

/**
 * PUT /api/admin/products/:id
 * Securely update permitted product attributes.
 */
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid product ID format',
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found',
      });
    }

    const {
      name,
      pricePaise,
      categoryId,
      description,
      image,
      images,
      alt,
      stockQuantity,
      isActive,
      priority,
    } = req.body;

    // Validate Category if changing
    if (categoryId) {
      const categoryExists = await Category.findById(categoryId);
      if (!categoryExists) {
        return res.status(400).json({
          status: 'error',
          message: 'Specified category does not exist',
        });
      }
      product.category = categoryExists._id;
    }

    if (name !== undefined) product.name = name.trim();
    if (pricePaise !== undefined) product.pricePaise = pricePaise;
    if (description !== undefined) product.description = description.trim();
    if (image !== undefined) product.image = image.trim();
    if (Array.isArray(images)) product.images = images;
    if (alt !== undefined) product.alt = alt.trim();
    if (stockQuantity !== undefined) product.stockQuantity = stockQuantity;
    if (isActive !== undefined) product.isActive = Boolean(isActive);
    if (priority !== undefined) product.priority = Boolean(priority);

    await product.save();
    const updated = await Product.findById(product._id).populate('category', 'name slug');

    return res.status(200).json({
      status: 'success',
      message: 'Product updated successfully',
      product: updated.toSafeJSON(),
    });
  } catch (error) {
    console.error('[Admin Controller - updateProduct]:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update product',
    });
  }
};

/**
 * PATCH /api/admin/products/:id/stock
 * Targeted inventory adjustment with strict non-negative integer validation.
 */
export const updateProductStock = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid product ID format',
      });
    }

    const { stockQuantity } = req.body;
    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Stock quantity must be a non-negative integer',
      });
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { $set: { stockQuantity } },
      { new: true }
    ).populate('category', 'name slug');

    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      message: `Inventory updated to ${stockQuantity} units`,
      product: product.toSafeJSON(),
    });
  } catch (error) {
    console.error('[Admin Controller - updateProductStock]:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update product inventory',
    });
  }
};

/**
 * GET /api/admin/orders
 * List all customer orders with pagination, status filtering, and search.
 */
export const getAdminOrders = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};

    // Filter by order status
    if (req.query.status && typeof req.query.status === 'string') {
      const allowedStatuses = [
        'pending_payment',
        'paid',
        'payment_failed',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'payment_reconciliation_needed',
      ];
      if (allowedStatuses.includes(req.query.status)) {
        filter.status = req.query.status;
      }
    }

    // Search query (order number, recipient name, phone, or razorpay payment ID)
    if (req.query.search && typeof req.query.search === 'string') {
      const q = req.query.search.trim();
      filter.$or = [
        { orderNumber: { $regex: q, $options: 'i' } },
        { 'shippingAddress.recipientName': { $regex: q, $options: 'i' } },
        { 'shippingAddress.phone': { $regex: q, $options: 'i' } },
        { 'paymentDetails.razorpayPaymentId': { $regex: q, $options: 'i' } },
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email'),
      Order.countDocuments(filter),
    ]);

    return res.status(200).json({
      status: 'success',
      orders: orders.map((o) => ({
        ...o.toSafeJSON(),
        customerName: o.user?.name || o.shippingAddress?.recipientName || 'Guest Customer',
        customerEmail: o.user?.email || null,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error('[Admin Controller - getAdminOrders]:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve orders list',
    });
  }
};

/**
 * GET /api/admin/orders/:idOrNumber
 * Get full order details for administrative review.
 */
export const getAdminOrderById = async (req, res) => {
  try {
    const { idOrNumber } = req.params;
    const trimmed = idOrNumber.trim();
    const isObjectId = mongoose.Types.ObjectId.isValid(trimmed);

    const conditions = [{ orderNumber: trimmed.toUpperCase() }];
    if (isObjectId) conditions.push({ _id: trimmed });

    const order = await Order.findOne({ $or: conditions }).populate('user', 'name email phone');
    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      order: {
        ...order.toSafeJSON(),
        customer: order.user
          ? {
              id: order.user._id,
              name: order.user.name,
              email: order.user.email,
              phone: order.user.phone,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('[Admin Controller - getAdminOrderById]:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve order details',
    });
  }
};

/**
 * PATCH /api/admin/orders/:idOrNumber/fulfillment
 * Securely transition fulfillment state with strict validation and atomic concurrency locking.
 *
 * CRITICAL SECURITY & PAYMENT RULES:
 * 1. Admin can NEVER set status to 'paid'. Setting 'paid' is strictly reserved for Razorpay verification.
 * 2. Unpaid orders ('pending_payment') cannot be marked 'shipped' or 'delivered'.
 * 3. Cannot alter payment details (razorpayPaymentId, paidAt, etc.).
 * 4. Only permitted fulfillment progressions are allowed:
 *    - 'paid' -> 'processing' or 'cancelled'
 *    - 'processing' -> 'shipped' or 'cancelled'
 *    - 'shipped' -> 'delivered'
 * 5. Atomic conditional update: locks on expected status to reject concurrent/stale modifications with 409 Conflict.
 */
export const updateOrderFulfillment = async (req, res) => {
  try {
    const { idOrNumber } = req.params;
    const { status, notes, expectedStatus } = req.body;

    // Strict Rule 1: Admin can NEVER manually declare an order 'paid'
    if (status === 'paid') {
      return res.status(400).json({
        status: 'error',
        message: 'Security Policy: Orders cannot be manually marked "paid". Payment must be verified cryptographically via Razorpay.',
      });
    }

    const trimmed = idOrNumber.trim();
    const isObjectId = mongoose.Types.ObjectId.isValid(trimmed);

    const conditions = [{ orderNumber: trimmed.toUpperCase() }];
    if (isObjectId) conditions.push({ _id: trimmed });

    const order = await Order.findOne({ $or: conditions });
    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found',
      });
    }

    const currentStatus = order.status;

    // Optimistic concurrency check: if client provided an expected status that does not match
    if (expectedStatus && typeof expectedStatus === 'string' && expectedStatus !== currentStatus) {
      return res.status(409).json({
        status: 'error',
        message: `Order status conflict: Expected status was "${expectedStatus}", but current status is "${currentStatus}". Please refresh and retry.`,
      });
    }

    const allowedNextStatuses = VALID_FULFILLMENT_TRANSITIONS[currentStatus] || [];

    // Verify transition validity against current status
    if (!allowedNextStatuses.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid fulfillment transition: Cannot change order status from "${currentStatus}" to "${status}". Allowed transitions: [${allowedNextStatuses.join(', ')}]`,
      });
    }

    // Build update payload
    const updateFields = {
      $set: {
        status,
      },
    };

    if (notes && typeof notes === 'string' && notes.trim()) {
      const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const newNote = `[${timestamp}] Admin fulfillment update to "${status}": ${notes.trim()}`;
      const combinedNotes = order.notes ? `${order.notes}\n${newNote}` : newNote;
      updateFields.$set.notes = combinedNotes.length > 500 ? combinedNotes.slice(-500) : combinedNotes;
    }

    // Atomic conditional update: matches order ID AND expected current status
    // Ensures concurrent requests validate against actual DB state and reject race conditions with 409
    const updated = await Order.findOneAndUpdate(
      {
        _id: order._id,
        status: currentStatus, // Concurrency guard: status must not have changed since validation
      },
      updateFields,
      {
        new: true,
        runValidators: true,
      }
    ).populate('user', 'name email');

    if (!updated) {
      // The order was concurrently modified between initial read and write
      const freshOrder = await Order.findById(order._id);
      return res.status(409).json({
        status: 'error',
        message: `Order status conflict: The order was concurrently updated to "${freshOrder?.status || 'unknown'}" by another request. Please refresh and retry.`,
      });
    }

    return res.status(200).json({
      status: 'success',
      message: `Order fulfillment status updated to "${status}"`,
      order: updated.toSafeJSON(),
    });
  } catch (error) {
    console.error('[Admin Controller - updateOrderFulfillment]:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update order fulfillment status',
    });
  }
};
