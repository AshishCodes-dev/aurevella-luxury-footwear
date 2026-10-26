import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Address from '../models/Address.js';

export class OrderValidationError extends Error {
  constructor(message, statusCode = 400, details = null) {
    super(message);
    this.name = 'OrderValidationError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Converts integer paise to rupees, preserving fractional paise with 2 decimal precision
 * without silently rounding away cents/paise.
 *
 * @param {number} paise
 * @returns {number}
 */
export const toRupees = (paise) => {
  if (typeof paise !== 'number' || isNaN(paise)) return 0;
  return paise % 100 === 0 ? paise / 100 : Number((paise / 100).toFixed(2));
};

/**
 * Formats integer paise into standard Indian Rupee notation (e.g. ₹3,499 or ₹3,499.50)
 *
 * @param {number} paise
 * @returns {string}
 */
export const formatRupeeText = (paise) => {
  if (typeof paise !== 'number' || isNaN(paise)) return '₹0';
  const rupees = paise / 100;
  if (paise % 100 === 0) {
    return `₹${rupees.toLocaleString('en-IN')}`;
  }
  return `₹${rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Validates requested items against database products, checks stock and active status,
 * and calculates line totals, subtotal, and total strictly using server pricePaise.
 * Client-submitted prices and totals are strictly ignored.
 *
 * @param {Array<{ id: string, quantity: number, size?: string|null }>} rawItems
 * @returns {Promise<{
 *   items: Array<any>,
 *   itemsCount: number,
 *   subtotalPaise: number,
 *   shippingFeePaise: number,
 *   totalPaise: number,
 *   currency: string
 * }>}
 */
export const validateAndCalculateOrderItems = async (rawItems) => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new OrderValidationError('Order must contain at least one item');
  }

  if (rawItems.length > 20) {
    throw new OrderValidationError('Order cannot exceed 20 unique line items');
  }

  const validatedItems = [];
  const requestedQtyPerProduct = new Map();
  let itemsCount = 0;
  let subtotalPaise = 0;

  for (let idx = 0; idx < rawItems.length; idx++) {
    const item = rawItems[idx];

    if (!item || typeof item !== 'object') {
      throw new OrderValidationError(`Invalid item format at line ${idx + 1}`);
    }

    const rawId = item.id || item.productId || item.code;
    if (!rawId || typeof rawId !== 'string' || !rawId.trim()) {
      throw new OrderValidationError(`Product identifier is required at line ${idx + 1}`);
    }

    const trimmedId = rawId.trim();
    const qty = parseInt(item.quantity, 10);

    if (isNaN(qty) || !Number.isInteger(qty) || qty < 1) {
      throw new OrderValidationError(`Quantity must be a positive integer at line ${idx + 1}`);
    }

    if (qty > 10) {
      throw new OrderValidationError(
        `Quantity cannot exceed 10 pairs per model (line ${idx + 1})`
      );
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(trimmedId);
    const productQuery = isObjectId
      ? { $or: [{ _id: trimmedId }, { code: trimmedId }, { slug: trimmedId.toLowerCase() }] }
      : { $or: [{ code: trimmedId }, { slug: trimmedId.toLowerCase() }] };

    const product = await Product.findOne(productQuery);

    if (!product) {
      throw new OrderValidationError(
        `Product identifier "${trimmedId}" does not exist in atelier catalogue`,
        400,
        { productId: trimmedId }
      );
    }

    if (!product.isActive) {
      throw new OrderValidationError(
        `Product "${product.name}" is currently inactive and cannot be ordered`,
        400,
        { productId: trimmedId, productName: product.name }
      );
    }

    // Sizing validation:
    // Footwear products with configured supported sizes require a valid, selected size.
    // Non-footwear products or products explicitly configured with empty sizes array (sizes = []) do not require sizing.
    const rawSize =
      item.size !== undefined && item.size !== null && typeof item.size === 'string' && item.size.trim().length > 0
        ? item.size.trim()
        : null;

    const hasExplicitlyNoSizes = Array.isArray(product.sizes) && product.sizes.length === 0;
    const availableSizes =
      Array.isArray(product.sizes) && product.sizes.length > 0
        ? product.sizes
        : ['EU 36', 'EU 37', 'EU 38', 'EU 39', 'EU 40', 'EU 41'];

    if (!hasExplicitlyNoSizes) {
      if (!rawSize) {
        throw new OrderValidationError(
          `A valid footwear size is required for "${product.name}". Available sizes: ${availableSizes.join(', ')}`,
          400,
          {
            productId: trimmedId,
            productName: product.name,
            availableSizes,
            reason: 'size_required',
          }
        );
      }

      if (!availableSizes.includes(rawSize)) {
        throw new OrderValidationError(
          `Invalid or unsupported size "${rawSize}" for "${product.name}". Available sizes: ${availableSizes.join(', ')}`,
          400,
          {
            productId: trimmedId,
            productName: product.name,
            requestedSize: rawSize,
            availableSizes,
            reason: 'unsupported_size',
          }
        );
      }
    }

    const productIdStr = product._id.toString();
    const totalRequestedSoFar = (requestedQtyPerProduct.get(productIdStr) || 0) + qty;
    if (product.stockQuantity < totalRequestedSoFar) {
      throw new OrderValidationError(
        `Insufficient stock for "${product.name}". Requested: ${qty}, available: ${product.stockQuantity}`,
        400,
        {
          productId: trimmedId,
          productName: product.name,
          requested: totalRequestedSoFar,
          available: product.stockQuantity,
        }
      );
    }
    requestedQtyPerProduct.set(productIdStr, totalRequestedSoFar);

    // Integer paise calculations strictly from database
    const unitPricePaise = product.pricePaise;
    const lineTotalPaise = unitPricePaise * qty;

    validatedItems.push({
      product: product._id,
      productCode: product.code || product.slug,
      name: product.name,
      slug: product.slug,
      image: product.image,
      size: rawSize || null,
      pricePaise: unitPricePaise,
      quantity: qty,
      lineTotalPaise,
    });

    itemsCount += qty;
    subtotalPaise += lineTotalPaise;
  }

  const shippingFeePaise = 0; // Complimentary white-glove luxury delivery
  const totalPaise = subtotalPaise + shippingFeePaise;

  return {
    items: validatedItems,
    itemsCount,
    subtotalPaise,
    shippingFeePaise,
    totalPaise,
    currency: 'INR',
  };
};

/**
 * Validates shipping address existence and ensures strict ownership by authenticated user.
 * Returns immutable address snapshot for embedding into Order document.
 *
 * @param {string|mongoose.Types.ObjectId} addressId
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {Promise<Object>}
 */
export const validateAndSnapshotAddress = async (addressId, userId) => {
  if (!addressId) {
    throw new OrderValidationError('Shipping address ID is required');
  }

  if (!mongoose.Types.ObjectId.isValid(addressId)) {
    throw new OrderValidationError('Invalid shipping address ID format');
  }

  const address = await Address.findOne({
    _id: addressId,
    user: userId,
  });

  if (!address) {
    throw new OrderValidationError(
      'Shipping address was not found or does not belong to your account',
      400
    );
  }

  return {
    recipientName: address.recipientName,
    phone: address.phone,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 || '',
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country || 'India',
  };
};