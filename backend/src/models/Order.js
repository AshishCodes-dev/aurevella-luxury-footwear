import mongoose from 'mongoose';
import { toRupees, formatRupeeText } from '../utils/orderPricing.js';

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
    },
    productCode: {
      type: String,
      required: [true, 'Product code is required'],
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Product name snapshot is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Product slug snapshot is required'],
      trim: true,
    },
    image: {
      type: String,
      required: [true, 'Product image snapshot is required'],
      trim: true,
    },
    pricePaise: {
      type: Number,
      required: [true, 'Unit price in integer paise is required'],
      min: [0, 'Price paise cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer paise value',
      },
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      max: [10, 'Maximum 10 pairs permitted per model per order'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer quantity',
      },
    },
    lineTotalPaise: {
      type: Number,
      required: [true, 'Line total in integer paise is required'],
      min: [0, 'Line total cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer paise value',
      },
    },
  },
  { _id: false }
);

const shippingAddressSnapshotSchema = new mongoose.Schema(
  {
    recipientName: {
      type: String,
      required: [true, 'Recipient name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^[0-9+ -]{10,15}$/, 'Invalid phone number format'],
    },
    addressLine1: {
      type: String,
      required: [true, 'Street address is required'],
      trim: true,
    },
    addressLine2: {
      type: String,
      trim: true,
      default: '',
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
    },
    postalCode: {
      type: String,
      required: [true, 'PIN code is required'],
      trim: true,
      match: [/^[1-9][0-9]{5}$/, 'PIN code must be a valid 6-digit Indian postal code'],
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
      default: 'India',
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: [true, 'Order number is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    items: {
      type: [orderItemSchema],
      required: [true, 'Order items are required'],
      validate: {
        validator: function (items) {
          return Array.isArray(items) && items.length > 0 && items.length <= 20;
        },
        message: 'Order must contain between 1 and 20 line items',
      },
    },
    shippingAddress: {
      type: shippingAddressSnapshotSchema,
      required: [true, 'Shipping address snapshot is required'],
    },
    itemsCount: {
      type: Number,
      required: [true, 'Total item count is required'],
      min: [1, 'Total item count must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer item count',
      },
    },
    subtotalPaise: {
      type: Number,
      required: [true, 'Subtotal in paise is required'],
      min: [0, 'Subtotal cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer paise value',
      },
    },
    shippingFeePaise: {
      type: Number,
      default: 0,
      min: [0, 'Shipping fee cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer paise value',
      },
    },
    totalPaise: {
      type: Number,
      required: [true, 'Total amount in paise is required'],
      min: [0, 'Total cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer paise value',
      },
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: [
        'pending_payment',
        'paid',
        'payment_failed',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
      ],
      default: 'pending_payment',
      index: true,
    },
    paymentDetails: {
      method: {
        type: String,
        default: 'razorpay',
        trim: true,
      },
      razorpayOrderId: {
        type: String,
        trim: true,
        index: true,
        sparse: true,
      },
      razorpayPaymentId: {
        type: String,
        trim: true,
        sparse: true,
      },
      razorpaySignature: {
        type: String,
        trim: true,
      },
      paidAt: {
        type: Date,
        default: null,
      },
      failureReason: {
        type: String,
        trim: true,
        default: null,
      },
    },
    idempotencyKey: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Database-enforced compound index preventing concurrent duplicate orders per customer
orderSchema.index(
  { user: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: 'string' } },
  }
);

/**
 * Generate human-readable unique order number: AUR-YYYYMMDD-XXXX
 */
export const generateOrderNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `AUR-${dateStr}-${randomChars}`;
};

/**
 * Returns safe JSON presentation with rupee conversions and client-facing text
 */
orderSchema.methods.toSafeJSON = function () {
  return {
    id: this._id.toString(),
    orderNumber: this.orderNumber,
    userId: this.user?.toString ? this.user.toString() : this.user,
    items: this.items.map((i) => {
      const unitRupees = toRupees(i.pricePaise);
      const lineRupees = toRupees(i.lineTotalPaise);
      return {
        productId: i.product?.toString ? i.product.toString() : i.product,
        productCode: i.productCode,
        name: i.name,
        slug: i.slug,
        image: i.image,
        quantity: i.quantity,
        pricePaise: i.pricePaise,
        price: unitRupees,
        priceText: formatRupeeText(i.pricePaise),
        lineTotalPaise: i.lineTotalPaise,
        lineTotal: lineRupees,
        lineTotalText: formatRupeeText(i.lineTotalPaise),
      };
    }),
    shippingAddress: {
      recipientName: this.shippingAddress?.recipientName,
      phone: this.shippingAddress?.phone,
      addressLine1: this.shippingAddress?.addressLine1,
      addressLine2: this.shippingAddress?.addressLine2 || '',
      city: this.shippingAddress?.city,
      state: this.shippingAddress?.state,
      postalCode: this.shippingAddress?.postalCode,
      country: this.shippingAddress?.country || 'India',
    },
    itemsCount: this.itemsCount,
    subtotalPaise: this.subtotalPaise,
    subtotal: toRupees(this.subtotalPaise),
    subtotalText: formatRupeeText(this.subtotalPaise),
    shippingFeePaise: this.shippingFeePaise,
    shippingFee: toRupees(this.shippingFeePaise),
    shippingFeeText:
      this.shippingFeePaise === 0
        ? 'Complimentary'
        : formatRupeeText(this.shippingFeePaise),
    totalPaise: this.totalPaise,
    total: toRupees(this.totalPaise),
    totalText: formatRupeeText(this.totalPaise),
    currency: this.currency,
    status: this.status,
    paymentDetails: {
      method: this.paymentDetails?.method || 'razorpay',
      razorpayOrderId: this.paymentDetails?.razorpayOrderId || null,
      paidAt: this.paymentDetails?.paidAt || null,
    },
    notes: this.notes,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const Order = mongoose.model('Order', orderSchema);

export default Order;