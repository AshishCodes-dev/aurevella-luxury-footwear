import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [150, 'Product name cannot exceed 150 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Product slug is required'],
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Product slug must be kebab-case (e.g. floral-block-heel-sandal)'],
    },
    code: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    pricePaise: {
      type: Number,
      required: [true, 'Product price in paise is required'],
      min: [0, 'Price cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value in paise',
      },
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Product category is required'],
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    image: {
      type: String,
      required: [true, 'Primary image path is required'],
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
    alt: {
      type: String,
      trim: true,
      default: '',
    },
    stockQuantity: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: [0, 'Stock quantity cannot be negative'],
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer stock value',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    priority: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Method to return safe JSON representation with formatted rupee helpers for clients
productSchema.methods.toSafeJSON = function () {
  const priceRupees = Math.round(this.pricePaise / 100);
  const categoryData =
    this.category && typeof this.category === 'object' && this.category.name
      ? this.category.name
      : typeof this.category === 'string'
      ? this.category
      : undefined;

  return {
    id: this.code || this._id.toString(),
    _id: this._id.toString(),
    code: this.code || null,
    name: this.name,
    slug: this.slug,
    pricePaise: this.pricePaise,
    price: priceRupees,
    priceText: `₹${priceRupees.toLocaleString('en-IN')}`,
    category: categoryData,
    categoryId:
      this.category && typeof this.category === 'object' && this.category._id
        ? this.category._id.toString()
        : this.category?.toString(),
    categorySlug:
      this.category && typeof this.category === 'object' && this.category.slug
        ? this.category.slug
        : undefined,
    description: this.description,
    image: this.image,
    images: this.images && this.images.length > 0 ? this.images : [this.image],
    alt: this.alt || this.name,
    stockQuantity: this.stockQuantity,
    inStock: this.stockQuantity > 0,
    isActive: this.isActive,
    priority: this.priority,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const Product = mongoose.model('Product', productSchema);

export default Product;
