/**
 * AUREVELLA — Content Configuration & Site Copy
 * All textual copy, links, contact data, and placeholder assets are centralized here.
 * Any item requiring official client verification or input is flagged with TODO(client).
 */

export const siteConfig = {
  brand: 'AUREVELLA',
  tagline: 'Luxury, Reimagined.',
  subline: 'Italian-inspired elegance, crafted in India.',

  // Contact Information
  contact: {
    email: 'marketing@myaurevella.in',
    instagram: {
      url: 'https://www.instagram.com/myaurevella',
      handle: '@myaurevella',
    },
    // TODO(client): Confirm official WhatsApp business number and pre-filled message text
    whatsapp: {
      number: '+91 00000 00000', // TODO(client): Official WhatsApp business number
      url: 'https://wa.me/910000000000?text=Hello%20Aurevella%2C%20I%20would%20like%20to%20inquire%20about%20your%20footwear.', // TODO(client): WhatsApp link
      label: '+91 00000 00000',
    },
    studioAddress: 'TODO(client): Physical studio or registered office location (e.g. Mumbai / Delhi, India)',
    supportHours: 'TODO(client): Concierge support hours (e.g. Monday – Saturday, 10:00 AM – 7:00 PM IST)',
  },

  // Primary Navigation
  navLinks: [
    { label: 'Home', href: '/' },
    { label: 'Shop', href: '/shop' },
    { label: 'Collections', href: '/collections' },
    { label: 'Limited Edition', href: '/limited-edition' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ],

  // Footer Navigation Columns
  footerNav: {
    shop: [
      { label: 'All Footwear', href: '/shop' },
      { label: 'Collections', href: '/collections' },
      { label: 'Limited Edition', href: '/limited-edition' },
      { label: 'Customization', href: '/shop#customization' }, // TODO(client): Customization policy and lead time
    ],
    company: [
      { label: 'Our Story', href: '/about' },
      { label: 'Artisan Craftsmanship', href: '/about#craftsmanship' },
      { label: 'Contact & Concierge', href: '/contact' },
    ],
    legal: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms & Conditions', href: '/terms' },
      { label: 'Shipping Policy', href: '/shipping-policy' },
      { label: 'Returns & Exchanges', href: '/returns-policy' },
    ],
  },

  // Hero Section Copy
  hero: {
    eyebrow: 'Bespoke Footwear Atelier',
    headline: 'Luxury, Reimagined.',
    subline: 'Italian-inspired elegance, meticulously crafted in India.',
    primaryCta: { label: 'Explore the Collection', href: '/shop' },
    secondaryCta: { label: 'Limited Edition', href: '/limited-edition' },
  },

  // Brand Story Narrative
  story: {
    eyebrow: 'The Atelier Philosophy',
    heading: 'Where Continental Architecture Meets Indian Craftsmanship',
    paragraphs: [
      'AUREVELLA was conceived with an uncompromising mandate: to unite the refined contours of classic Italian footwear design with the venerable traditions of Indian master shoe artisans.',
      'Every silhouette is crafted from hand-selected full-grain leathers and hand-finished with bespoke patina dyes. Each pair honors generational shoemaking techniques, delivering structured poise, breathability, and lifelong durability.',
    ],
    quote: '"True luxury requires no loud proclamations—it is felt in the weight of the leather, the balance of the arch, and the silence of the stitch."',
  },

  // Featured Products (Sample Catalog Showcase)
  // TODO(client): Replace with verified launch catalog products and photography
  featuredProducts: [
    {
      id: 'prod-01',
      name: 'The Milano Oxford',
      category: "Men's Formal", // TODO(client): Confirm category categorization
      pricePaise: 2499000,
      priceDisplay: '₹24,990',
      description: 'Handcrafted wholecut Oxford in burnished espresso calfskin.',
      imageSlotPlaceholder: 'TODO(client): Image asset for The Milano Oxford (3:4 ratio, min 750x1000px)',
    },
    {
      id: 'prod-02',
      name: 'The Florence Monk Strap',
      category: 'Bespoke Buckle',
      pricePaise: 2799000,
      priceDisplay: '₹27,990',
      description: 'Double monk strap featuring antiqued brass buckles and hand-beveled soles.',
      imageSlotPlaceholder: 'TODO(client): Image asset for The Florence Monk Strap (3:4 ratio, min 750x1000px)',
    },
    {
      id: 'prod-03',
      name: 'The Roma Chelsea',
      category: 'Ankle Boot',
      pricePaise: 3199000,
      priceDisplay: '₹31,990',
      description: 'Seamless Goodyear-welted Chelsea boot crafted from supple vegetable-tanned leather.',
      imageSlotPlaceholder: 'TODO(client): Image asset for The Roma Chelsea (3:4 ratio, min 750x1000px)',
    },
    {
      id: 'prod-04',
      name: 'The Venetian Tassel Loafer',
      category: 'Casual Elegance',
      pricePaise: 2299000,
      priceDisplay: '₹22,990',
      description: 'Supple hand-sewn apron loafer finished with braided tassel accents.',
      imageSlotPlaceholder: 'TODO(client): Image asset for The Venetian Tassel Loafer (3:4 ratio, min 750x1000px)',
    },
  ],

  // Limited Edition Showcase
  limitedEdition: {
    badge: 'Limited Edition',
    heading: 'The Imperial Series Drop',
    description:
      'Individually numbered, small-batch releases handcrafted with rare museum calf leather and solid brass hardware. Strictly capped at 50 pairs worldwide. Once retired, the series is never reproduced.',
    cta: { label: 'View Limited Edition', href: '/limited-edition' },
  },

  // Core Pillars / Values
  values: [
    {
      id: 'handcrafted',
      title: 'Handcrafted Precision',
      description: 'Lasted by hand and built with traditional Goodyear-welted construction for lasting comfort.',
    },
    {
      id: 'italian',
      title: 'Italian-Inspired Elegance',
      description: 'Sculpted contours inspired by classic Florentine and Milanese sartorial traditions.',
    },
    {
      id: 'india',
      title: 'Crafted in India',
      description: 'Empowering master regional artisans with ethical, bespoke atelier shoemaking.',
    },
  ],

  // Copyright and Legal Notice
  copyright: '© 2026 AUREVELLA. Luxury, Reimagined. All rights reserved.',
};

export default siteConfig;
