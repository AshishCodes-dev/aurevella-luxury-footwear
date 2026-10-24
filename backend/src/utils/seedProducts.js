import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';

const LAUNCH_CATEGORIES = [
  {
    name: 'Interchangeable Heel',
    slug: 'interchangeable-heel',
    description: 'Artisanal Italian-inspired footwear featuring Aurevella signature interchangeable heel mechanics.',
    displayOrder: 1,
    isActive: true,
  },
  {
    name: 'Flat Slide',
    slug: 'flat-slide',
    description: 'Bespoke flat slides with artisanal knot details and textured ergonomic footbeds.',
    displayOrder: 2,
    isActive: true,
  },
];

const LAUNCH_PRODUCTS = [
  {
    code: 'prod-01',
    name: 'Floral Block Heel Sandal',
    slug: 'floral-block-heel-sandal',
    categorySlug: 'interchangeable-heel',
    pricePaise: 349900, // ₹3,499 in integer paise
    description:
      'Ankle-strap sandal adorned with artisanal red floral print and pearl embellishment, featuring interchangeable heel mechanics.',
    image: '/images/products/product-01-floral-block-heel-sandal.jpg',
    images: ['/images/products/product-01-floral-block-heel-sandal.jpg'],
    alt: 'Block heel ankle-strap sandal with red floral print and a pearl embellishment',
    stockQuantity: 25,
    isActive: true,
    priority: true,
  },
  {
    code: 'prod-02',
    name: 'Blue Floral Slide',
    slug: 'blue-floral-slide',
    categorySlug: 'flat-slide',
    pricePaise: 329900, // ₹3,299 in integer paise
    description:
      'Bespoke flat slide handcrafted with a knotted blue floral strap, woven textured footbed, and ergonomic contouring.',
    image: '/images/products/product-02-blue-floral-slide.jpg',
    images: ['/images/products/product-02-blue-floral-slide.jpg'],
    alt: 'Flat slide with a knotted blue floral strap and woven sole',
    stockQuantity: 30,
    isActive: true,
    priority: true,
  },
  {
    code: 'prod-03',
    name: 'Floral Block Heel Mule',
    slug: 'floral-block-heel-mule',
    categorySlug: 'interchangeable-heel',
    pricePaise: 369900, // ₹3,699 in integer paise
    description:
      'Sculpted mule silhouette with vibrant red floral leather upper, antiqued gold hardware buckle, and stable block heel.',
    image: '/images/products/product-03-floral-block-heel-mule.jpg',
    images: ['/images/products/product-03-floral-block-heel-mule.jpg'],
    alt: 'Block heel mule with red floral print and a gold buckle',
    stockQuantity: 20,
    isActive: true,
    priority: true,
  },
];

export const seedProducts = async () => {
  console.log('==============================================');
  console.log('   AUREVELLA — Product & Category Seeder     ');
  console.log('==============================================\n');

  try {
    await connectDB();

    // 1. Upsert Categories
    const categoryMap = new Map();
    for (const catData of LAUNCH_CATEGORIES) {
      const category = await Category.findOneAndUpdate(
        { slug: catData.slug },
        { $set: catData },
        { upsert: true, new: true, runValidators: true }
      );
      categoryMap.set(catData.slug, category._id);
      console.log(`[Category] Synced: ${category.name} (${category.slug}) -> ID: ${category._id}`);
    }

    // 2. Upsert Products
    for (const prodData of LAUNCH_PRODUCTS) {
      const categoryId = categoryMap.get(prodData.categorySlug);
      if (!categoryId) {
        throw new Error(`Category not found for slug: ${prodData.categorySlug}`);
      }

      const productPayload = {
        code: prodData.code,
        name: prodData.name,
        slug: prodData.slug,
        category: categoryId,
        pricePaise: prodData.pricePaise,
        description: prodData.description,
        image: prodData.image,
        images: prodData.images,
        alt: prodData.alt,
        stockQuantity: prodData.stockQuantity,
        isActive: prodData.isActive,
        priority: prodData.priority,
      };

      const product = await Product.findOneAndUpdate(
        { slug: prodData.slug },
        { $set: productPayload },
        { upsert: true, new: true, runValidators: true }
      );

      console.log(
        `[Product] Synced: ${product.name} | ₹${product.pricePaise / 100} (${product.pricePaise} paise) | Stock: ${product.stockQuantity}`
      );
    }

    console.log('\n✔ SUCCESS: All 2 categories and 3 launch products seeded idempotently.');
  } catch (error) {
    console.error('\n❌ FAILED to seed products:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('[Database] Disconnected cleanly.\n');
  }
};

// Execute if run directly from CLI
if (process.argv[1] && process.argv[1].endsWith('seedProducts.js')) {
  seedProducts()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
