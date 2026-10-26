/**
 * AUREVELLA — Trusted Product Registry & Product Data
 * Single source of truth for footwear models, categories, pricing, and client visuals.
 * All prices are validated here; client-submitted prices are NEVER trusted.
 */

export const DEFAULT_PROVISIONAL_SIZES = ['EU 36', 'EU 37', 'EU 38', 'EU 39', 'EU 40', 'EU 41'];

export const PRODUCTS = [
  {
    id: 'prod-01',
    name: 'Floral Block Heel Sandal',
    slug: 'floral-block-heel-sandal',
    category: 'Interchangeable Heel',
    price: 3499,
    priceText: '₹3,499',
    link: '/product/prod-01',
    image: '/images/products/product-01-floral-block-heel-sandal.jpg',
    alt: 'Block heel ankle-strap sandal with red floral print and a pearl embellishment',
    description: 'Ankle-strap sandal adorned with artisanal red floral print and pearl embellishment, featuring interchangeable heel mechanics.',
    sizes: DEFAULT_PROVISIONAL_SIZES,
    priority: true,
  },
  {
    id: 'prod-02',
    name: 'Blue Floral Slide',
    slug: 'blue-floral-slide',
    category: 'Flat Slide',
    price: 3299,
    priceText: '₹3,299',
    link: '/product/prod-02',
    image: '/images/products/product-02-blue-floral-slide.jpg',
    alt: 'Flat slide with a knotted blue floral strap and woven sole',
    description: 'Bespoke flat slide handcrafted with a knotted blue floral strap, woven textured footbed, and ergonomic contouring.',
    sizes: DEFAULT_PROVISIONAL_SIZES,
    priority: true,
  },
  {
    id: 'prod-03',
    name: 'Floral Block Heel Mule',
    slug: 'floral-block-heel-mule',
    category: 'Interchangeable Heel',
    price: 3699,
    priceText: '₹3,699',
    link: '/product/prod-03',
    image: '/images/products/product-03-floral-block-heel-mule.jpg',
    alt: 'Block heel mule with red floral print and a gold buckle',
    description: 'Sculpted mule silhouette with vibrant red floral leather upper, antiqued gold hardware buckle, and stable block heel.',
    sizes: DEFAULT_PROVISIONAL_SIZES,
    priority: true,
  },
];

export const PRODUCTS_MAP = new Map(PRODUCTS.map((p) => [p.id, p]));

export const getProductById = (id) => {
  if (!id || typeof id !== 'string') return null;
  const direct = PRODUCTS_MAP.get(id);
  if (direct) return direct;

  const query = id.trim().toLowerCase();
  return (
    PRODUCTS.find(
      (p) =>
        p.id.toLowerCase() === query ||
        (p.slug && p.slug.toLowerCase() === query)
    ) || null
  );
};

export const CATEGORIES = ['All', 'Interchangeable Heel', 'Flat Slide'];

export const formatPriceINR = (amount) => {
  return `₹${amount.toLocaleString('en-IN')}`;
};

export default PRODUCTS;
