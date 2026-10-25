import 'dotenv/config';
import mongoose from 'mongoose';
import { connectTestDB } from '../src/config/db.js';
import Category from '../src/models/Category.js';
import Product from '../src/models/Product.js';

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
    pricePaise: 349900,
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
    pricePaise: 329900,
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
    pricePaise: 369900,
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

async function seed() {
  await connectTestDB();
  const categoryMap = new Map();
  for (const catData of LAUNCH_CATEGORIES) {
    const category = await Category.findOneAndUpdate(
      { slug: catData.slug },
      { $set: catData },
      { upsert: true, new: true, runValidators: true }
    );
    categoryMap.set(catData.slug, category._id);
  }

  for (const prodData of LAUNCH_PRODUCTS) {
    const categoryId = categoryMap.get(prodData.categorySlug);
    const { categorySlug, ...rest } = prodData;
    await Product.findOneAndUpdate(
      { code: prodData.code },
      { $set: { ...rest, category: categoryId } },
      { upsert: true, new: true, runValidators: true }
    );
  }

  console.log('✔ Dedicated test database (aurevella_test) seeded with launch products and categories.');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
