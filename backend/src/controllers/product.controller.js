import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Category from '../models/Category.js';

/**
 * GET /api/categories
 * Returns active categories ordered by displayOrder
 */
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ displayOrder: 1, name: 1 });
    return res.status(200).json({
      status: 'success',
      count: categories.length,
      categories: categories.map((c) => c.toSafeJSON()),
    });
  } catch (error) {
    console.error('[Product Controller - getCategories]:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve product categories',
    });
  }
};

/**
 * GET /api/products
 * Query options:
 *   category: slug or name (optional)
 *   sort: 'featured' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' (optional)
 */
export const getProducts = async (req, res) => {
  try {
    const { category, sort } = req.query;
    const filter = { isActive: true };

    // 1. Category Filtering
    if (category && typeof category === 'string' && category.trim() !== '' && category.toLowerCase() !== 'all') {
      const trimmedCategory = category.trim();
      const matchedCategory = await Category.findOne({
        $or: [
          { slug: trimmedCategory.toLowerCase() },
          { name: new RegExp(`^${trimmedCategory}$`, 'i') },
        ],
        isActive: true,
      });

      if (!matchedCategory) {
        // If category filter does not match any active category, return empty results safely
        return res.status(200).json({
          status: 'success',
          count: 0,
          products: [],
        });
      }
      filter.category = matchedCategory._id;
    }

    // 2. Safe Allowlisted Sorting
    const sortMap = {
      featured: { priority: -1, createdAt: -1 },
      'price-asc': { pricePaise: 1 },
      'price-desc': { pricePaise: -1 },
      'name-asc': { name: 1 },
      'name-desc': { name: -1 },
    };
    const sortOption = sortMap[sort] || sortMap.featured;

    const products = await Product.find(filter)
      .populate('category', 'name slug')
      .sort(sortOption);

    return res.status(200).json({
      status: 'success',
      count: products.length,
      products: products.map((p) => p.toSafeJSON()),
    });
  } catch (error) {
    console.error('[Product Controller - getProducts]:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve products catalogue',
    });
  }
};

/**
 * GET /api/products/:idOrSlug
 * Returns single active product by Mongo ObjectId or unique slug
 */
export const getProductByIdOrSlug = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    if (!idOrSlug || typeof idOrSlug !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'Product identifier is required',
      });
    }

    const trimmed = idOrSlug.trim();
    const isObjectId = mongoose.Types.ObjectId.isValid(trimmed);

    const orConditions = [
      { slug: trimmed.toLowerCase() },
      { code: trimmed },
    ];
    if (isObjectId) {
      orConditions.push({ _id: trimmed });
    }

    const product = await Product.findOne({ $or: orConditions, isActive: true }).populate('category', 'name slug');

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
    console.error('[Product Controller - getProductByIdOrSlug]:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve product details',
    });
  }
};
