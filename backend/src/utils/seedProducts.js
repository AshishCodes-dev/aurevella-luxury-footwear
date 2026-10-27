import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';

export const LAUNCH_CATEGORIES = [
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

export const LAUNCH_PRODUCTS = [
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
    sizes: ['EU 36', 'EU 37', 'EU 38', 'EU 39', 'EU 40', 'EU 41'],
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
    sizes: ['EU 36', 'EU 37', 'EU 38', 'EU 39', 'EU 40', 'EU 41'],
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
    sizes: ['EU 36', 'EU 37', 'EU 38', 'EU 39', 'EU 40', 'EU 41'],
  },
];

/**
 * Idempotently synchronizes launch categories and products into the active database.
 * Does not disconnect the database, allowing safe invocation during server startup or test setup.
 *
 * Non-destructive by default (overwrite = false):
 * - If a category or product already exists, all existing client-managed data (names, prices,
 *   images, stock quantities, and active/inactive status) are strictly preserved.
 * - Only missing categories and products are inserted.
 *
 * @param {Object} [options]
 * @param {Object} [options.logger=console]
 * @param {boolean} [options.overwrite=false] - When false, never overwrites existing products or categories.
 * @returns {Promise<{ categoriesCount: number, productsCount: number }>}
 */
export const syncLaunchProducts = async ({ logger = console, overwrite = false } = {}) => {
  // 1. Synchronize Categories safely
  const categoryMap = new Map();
  for (const catData of LAUNCH_CATEGORIES) {
    let category = await Category.findOne({ slug: catData.slug });

    if (!category) {
      category = await Category.create(catData);
      if (logger?.log) {
        logger.log(`[Category] Created missing category: ${category.name} (${category.slug}) -> ID: ${category._id}`);
      }
    } else if (overwrite) {
      category = await Category.findOneAndUpdate(
        { slug: catData.slug },
        { $set: catData },
        { new: true, runValidators: true }
      );
      if (logger?.log) {
        logger.log(`[Category] Updated: ${category.name} (${category.slug}) -> ID: ${category._id}`);
      }
    } else {
      if (logger?.log) {
        logger.log(`[Category] Preserved existing category: ${category.name} (${category.slug})`);
      }
    }
    categoryMap.set(catData.slug, category._id);
  }

  // 2. Synchronize Products safely
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
      sizes: prodData.sizes || ['EU 36', 'EU 37', 'EU 38', 'EU 39', 'EU 40', 'EU 41'],
    };

    const existingProduct = await Product.findOne({
      $or: [{ code: prodData.code }, { slug: prodData.slug }],
    });

    if (!existingProduct) {
      const created = await Product.create(productPayload);
      if (logger?.log) {
        logger.log(
          `[Product] Created missing launch model: ${created.name} (${created.code}) | ₹${created.pricePaise / 100} | Stock: ${created.stockQuantity}`
        );
      }
    } else if (overwrite) {
      const updated = await Product.findOneAndUpdate(
        { _id: existingProduct._id },
        { $set: productPayload },
        { new: true, runValidators: true }
      );
      if (logger?.log) {
        logger.log(
          `[Product] Updated: ${updated.name} (${updated.code}) | ₹${updated.pricePaise / 100} | Stock: ${updated.stockQuantity}`
        );
      }
    } else {
      // Non-destructive: Preserve existing name, price, stock, images, and isActive status
      if (logger?.log) {
        logger.log(
          `[Product] Preserved existing product: ${existingProduct.name} (${existingProduct.code || prodData.code}) — price, stock, images, and active status unchanged.`
        );
      }
    }
  }

  return {
    categoriesCount: LAUNCH_CATEGORIES.length,
    productsCount: LAUNCH_PRODUCTS.length,
  };
};

/**
 * Ensures all canonical launch models (prod-01, prod-02, prod-03) exist in the active database.
 * If any model is missing, synchronizes only the missing items non-destructively.
 *
 * Guarantees:
 * 1. Checks presence by code or slug regardless of isActive status (never re-activates deactivated items).
 * 2. Never overwrites existing product prices, inventory, images, or custom descriptions.
 * 3. 100% idempotent on repeated server boots.
 *
 * @param {Object} [options]
 * @param {Object} [options.logger=console]
 * @returns {Promise<boolean>} True if sync was executed, false if already complete.
 */
export const ensureLaunchCatalogue = async ({ logger = console } = {}) => {
  const existingProducts = await Product.find(
    {
      $or: [
        { code: { $in: LAUNCH_PRODUCTS.map((p) => p.code) } },
        { slug: { $in: LAUNCH_PRODUCTS.map((p) => p.slug) } },
      ],
    },
    'code slug'
  ).lean();

  const existingIdentifiers = new Set([
    ...existingProducts.map((p) => p.code).filter(Boolean),
    ...existingProducts.map((p) => p.slug).filter(Boolean),
  ]);

  const hasMissingLaunchModel = LAUNCH_PRODUCTS.some(
    (p) => !existingIdentifiers.has(p.code) && !existingIdentifiers.has(p.slug)
  );

  if (hasMissingLaunchModel) {
    if (logger?.log) {
      logger.log('[Catalogue] Canonical launch models incomplete in database. Synchronizing missing items safely (non-destructive)...');
    }
    await syncLaunchProducts({ logger, overwrite: false });
    if (logger?.log) {
      logger.log('[Catalogue] Canonical models (prod-01, prod-02, prod-03) verified in atelier catalogue.');
    }
    return true;
  }
  return false;
};

export const seedProducts = async ({ overwrite = false } = {}) => {
  console.log('==============================================');
  console.log('   AUREVELLA — Product & Category Seeder     ');
  console.log('==============================================\n');

  try {
    await connectDB();
    await syncLaunchProducts({ logger: console, overwrite });
    console.log('\n✔ SUCCESS: Launch catalogue synchronization completed.');
  } catch (error) {
    console.error('\n❌ FAILED to seed products:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('[Database] Disconnected cleanly.\n');
  }
};

/**
 * Direct execution guard for Node.js ESM.
 */
export const isDirectExecution = (importMetaUrl = import.meta.url, argv1 = process.argv[1]) => {
  if (!argv1 || typeof argv1 !== 'string') return false;
  try {
    const currentFilePath = path.resolve(fileURLToPath(importMetaUrl));
    const executedFilePath = path.resolve(argv1);
    return currentFilePath.toLowerCase() === executedFilePath.toLowerCase();
  } catch (_) {
    return false;
  }
};

if (isDirectExecution()) {
  const forceOverwrite = process.argv.includes('--force') || process.argv.includes('--overwrite');
  seedProducts({ overwrite: forceOverwrite })
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
