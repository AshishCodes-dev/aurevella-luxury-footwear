import mongoose from 'mongoose';
import Order, { generateOrderNumber } from '../models/Order.js';
import {
  validateAndCalculateOrderItems,
  validateAndSnapshotAddress,
  OrderValidationError,
  toRupees,
  formatRupeeText,
} from '../utils/orderPricing.js';

/**
 * POST /api/orders/quote
 * Pre-checkout validation & price recalculation endpoint.
 * Evaluates stock and recalculates totals strictly from database pricePaise.
 * Never modifies database state or decrements inventory.
 */
export const validateCheckoutQuote = async (req, res) => {
  try {
    const { items, addressId } = req.body;

    const pricing = await validateAndCalculateOrderItems(items);

    let addressSnapshot = null;
    if (addressId) {
      addressSnapshot = await validateAndSnapshotAddress(addressId, req.user._id);
    }

    return res.status(200).json({
      status: 'success',
      quote: {
        items: pricing.items.map((i) => ({
          productId: i.product.toString(),
          productCode: i.productCode,
          name: i.name,
          slug: i.slug,
          image: i.image,
          quantity: i.quantity,
          pricePaise: i.pricePaise,
          price: toRupees(i.pricePaise),
          priceText: formatRupeeText(i.pricePaise),
          lineTotalPaise: i.lineTotalPaise,
          lineTotal: toRupees(i.lineTotalPaise),
          lineTotalText: formatRupeeText(i.lineTotalPaise),
        })),
        itemsCount: pricing.itemsCount,
        subtotalPaise: pricing.subtotalPaise,
        subtotal: toRupees(pricing.subtotalPaise),
        subtotalText: formatRupeeText(pricing.subtotalPaise),
        shippingFeePaise: pricing.shippingFeePaise,
        shippingFee: toRupees(pricing.shippingFeePaise),
        shippingFeeText:
          pricing.shippingFeePaise === 0
            ? 'Complimentary'
            : formatRupeeText(pricing.shippingFeePaise),
        totalPaise: pricing.totalPaise,
        total: toRupees(pricing.totalPaise),
        totalText: formatRupeeText(pricing.totalPaise),
        currency: pricing.currency,
        shippingAddress: addressSnapshot,
      },
    });
  } catch (error) {
    if (error instanceof OrderValidationError) {
      return res.status(error.statusCode || 400).json({
        status: 'error',
        message: error.message,
        details: error.details || null,
      });
    }

    console.error('[Order Controller - validateCheckoutQuote]:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to calculate order quote',
    });
  }
};

/**
 * POST /api/orders
 * Creates an order in 'pending_payment' status after server-side stock and price verification.
 * In Phase 6.1, stock is verified but NOT decremented (stock decrements upon verified payment in Phase 6.2).
 */
export const createOrder = async (req, res) => {
  try {
    const { items, addressId, notes = '', idempotencyKey } = req.body;

    // 1. Idempotency Check: if identical key exists for user, return existing order
    if (idempotencyKey && typeof idempotencyKey === 'string' && idempotencyKey.trim()) {
      const existing = await Order.findOne({
        user: req.user._id,
        idempotencyKey: idempotencyKey.trim(),
      });
      if (existing) {
        return res.status(200).json({
          status: 'success',
          isDuplicate: true,
          order: existing.toSafeJSON(),
        });
      }
    }

    // 2. Server-side item validation and pricing calculation
    const pricing = await validateAndCalculateOrderItems(items);

    // 3. Shipping address validation and immutable snapshotting
    const addressSnapshot = await validateAndSnapshotAddress(addressId, req.user._id);

    // 4. Generate unique human-readable order number (AUR-YYYYMMDD-XXXX)
    let orderNumber = generateOrderNumber();
    let collisionCheck = await Order.exists({ orderNumber });
    let attempts = 0;
    while (collisionCheck && attempts < 5) {
      orderNumber = generateOrderNumber();
      collisionCheck = await Order.exists({ orderNumber });
      attempts++;
    }

    // 5. Persist Order document
    const order = await Order.create({
      orderNumber,
      user: req.user._id,
      items: pricing.items,
      shippingAddress: addressSnapshot,
      itemsCount: pricing.itemsCount,
      subtotalPaise: pricing.subtotalPaise,
      shippingFeePaise: pricing.shippingFeePaise,
      totalPaise: pricing.totalPaise,
      currency: pricing.currency,
      status: 'pending_payment',
      paymentDetails: {
        method: 'razorpay',
      },
      idempotencyKey: idempotencyKey ? idempotencyKey.trim() : undefined,
      notes: typeof notes === 'string' ? notes.slice(0, 500).trim() : '',
    });

    return res.status(201).json({
      status: 'success',
      order: order.toSafeJSON(),
    });
  } catch (error) {
    if (error instanceof OrderValidationError) {
      return res.status(error.statusCode || 400).json({
        status: 'error',
        message: error.message,
        details: error.details || null,
      });
    }

    // Handle race-condition duplicate key error on (user, idempotencyKey)
    if (error.code === 11000 && req.body.idempotencyKey) {
      try {
        const existing = await Order.findOne({
          user: req.user._id,
          idempotencyKey: req.body.idempotencyKey.trim(),
        });
        if (existing) {
          return res.status(200).json({
            status: 'success',
            isDuplicate: true,
            order: existing.toSafeJSON(),
          });
        }
      } catch (findErr) {
        console.error('[Order Controller - idempotency resolution error]:', findErr);
      }
    }

    console.error('[Order Controller - createOrder]:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to create order',
    });
  }
};

/**
 * GET /api/orders
 * Retrieves orders belonging to authenticated user with pagination support, ordered newest first.
 */
export const getUserOrders = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const total = await Order.countDocuments({ user: req.user._id });
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      status: 'success',
      count: orders.length,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      orders: orders.map((o) => o.toSafeJSON()),
    });
  } catch (error) {
    console.error('[Order Controller - getUserOrders]:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve orders',
    });
  }
};

/**
 * GET /api/orders/:idOrNumber
 * Retrieves single order strictly scoped to authenticated user.
 */
export const getOrderByIdOrNumber = async (req, res) => {
  try {
    const { idOrNumber } = req.params;
    if (!idOrNumber || typeof idOrNumber !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'Order identifier is required',
      });
    }

    const trimmed = idOrNumber.trim();
    const isObjectId = mongoose.Types.ObjectId.isValid(trimmed);

    const orConditions = [{ orderNumber: trimmed.toUpperCase() }];
    if (isObjectId) {
      orConditions.push({ _id: trimmed });
    }

    const order = await Order.findOne({
      user: req.user._id,
      $or: orConditions,
    });

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      order: order.toSafeJSON(),
    });
  } catch (error) {
    console.error('[Order Controller - getOrderByIdOrNumber]:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve order details',
    });
  }
};