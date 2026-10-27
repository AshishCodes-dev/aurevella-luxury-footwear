/**
 * AUREVELLA — Content Configuration & Site Copy
 * All textual copy, links, contact data, and sample assets are centralized here.
 * Any item requiring official client verification or input is flagged with TODO(client).
 */

export const siteConfig = {
  brand: 'AUREVELLA',
  tagline: 'Luxury, Reimagined.',
  descriptor: 'Luxury Interchangeable Heels',
  subline: 'Italian-inspired elegance, crafted in India.',

  // Contact Information
  contact: {
    email: 'marketing@myaurevella.in',
    instagram: {
      url: 'https://www.instagram.com/myaurevella',
      handle: '@myaurevella',
    },
    // TODO(client): confirm business WhatsApp
    whatsapp: {
      number: '+91 77280 60447',
      url: 'https://wa.me/917728060447',
      label: '+91 77280 60447',
    },
    // TODO(client): Physical studio or registered office location (e.g. Mumbai / Delhi, India)
    studioAddress: 'Private Atelier Showroom & Studio Fittings (By Appointment — Mumbai / Delhi)',
    // TODO(client): Concierge support hours
    supportHours: 'Monday – Saturday, 10:00 AM – 7:00 PM IST',
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

  // Hero Section Copy (Text-only with Logo; no product photo in hero)
  hero: {
    eyebrow: 'Bespoke Footwear Atelier',
    headline: 'Luxury, Reimagined.',
    subline: 'Italian-inspired elegance, crafted in India.',
    primaryCta: { label: 'Explore the Collection', href: '/shop' },
    secondaryCta: { label: 'The Limited Edition', href: '/limited-edition' },
  },

  // Brand Story Narrative
  // TODO(client): confirm target customer, brand story and how the interchangeable heels work before publishing.
  story: {
    eyebrow: 'The Atelier Philosophy',
    heading: 'Where Continental Architecture Meets Indian Craftsmanship',
    paragraphs: [
      'AUREVELLA brings Italian-inspired elegance to footwear, crafted in India and made by hand. Our signature interchangeable heels are designed around one idea: Luxury, Reimagined.',
    ],
    quote: '"Luxury, Reimagined."',
  },

  // Homepage "Featured" Section (Exactly 3 sample products; no 4th placeholder card)
  // Low-resolution client visuals used strictly in cards of 500 CSS px or less.
  featuredProducts: [
    {
      id: 'prod-01',
      name: 'Floral Block Heel Sandal', // TODO(client): Confirm product name
      category: 'Interchangeable Heel',
      price: 3499,
      priceText: '₹3,499',
      link: '/product/prod-01',
      image: '/images/products/product-01-floral-block-heel-sandal.jpg',
      alt: 'Block heel ankle-strap sandal with red floral print and a pearl embellishment',
      priority: true,
    },
    {
      id: 'prod-02',
      name: 'Blue Floral Slide', // TODO(client): Confirm product name
      category: 'Flat Slide',
      price: 3299,
      priceText: '₹3,299',
      link: '/product/prod-02',
      image: '/images/products/product-02-blue-floral-slide.jpg',
      alt: 'Flat slide with a knotted blue floral strap and woven sole',
      priority: true,
    },
    {
      id: 'prod-03',
      name: 'Floral Block Heel Mule', // TODO(client): Confirm product name
      category: 'Interchangeable Heel',
      price: 3699,
      priceText: '₹3,699',
      link: '/product/prod-03',
      image: '/images/products/product-03-floral-block-heel-mule.jpg',
      alt: 'Block heel mule with red floral print and a gold buckle',
      priority: true,
    },
  ],

  // Limited Edition Showcase
  limitedEdition: {
    badge: 'Limited Edition',
    heading: 'The Atelier Series Drop',
    description:
      'Individually numbered, small-batch releases handcrafted with rare leathers and solid brass hardware. Strictly capped at 50 pairs worldwide. Once retired, the series is never reproduced.',
    cta: { label: 'View Limited Edition', href: '/limited-edition' },
  },

  // Core Pillars / Values
  values: [
    {
      id: 'handcrafted',
      title: 'Handcrafted Precision',
      description: 'Lasted by hand and built with bespoke artisan construction for lasting poise.',
    },
    {
      id: 'italian',
      title: 'Italian-Inspired Elegance',
      description: 'Sculpted contours and interchangeable heel engineering inspired by classic sartorial traditions.',
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
