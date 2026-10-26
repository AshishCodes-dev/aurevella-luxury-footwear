/**
 * AUREVELLA — Footwear Sizing Reference & Measurement Guidelines
 * Centralized reference for size conversions, measurement instructions, and concierge advisory.
 *
 * NOTE: Provisional sizing data (EU 36–41) pending final production lasts confirmation.
 * Sizing guidance provides reference conversion and does not constitute a guaranteed fit warranty.
 */

import { siteConfig } from './site.js';

export const SIZING_CONVERSION_TABLE = [
  { eu: 'EU 36', uk: 'UK 3.5', us: 'US 5.5', footLengthCm: '23.0', footLengthIn: '9.06' },
  { eu: 'EU 37', uk: 'UK 4.0', us: 'US 6.0', footLengthCm: '23.5', footLengthIn: '9.25' },
  { eu: 'EU 38', uk: 'UK 5.0', us: 'US 7.0', footLengthCm: '24.0', footLengthIn: '9.45' },
  { eu: 'EU 39', uk: 'UK 6.0', us: 'US 8.0', footLengthCm: '24.8', footLengthIn: '9.76' },
  { eu: 'EU 40', uk: 'UK 6.5', us: 'US 8.5', footLengthCm: '25.5', footLengthIn: '10.04' },
  { eu: 'EU 41', uk: 'UK 7.5', us: 'US 9.5', footLengthCm: '26.2', footLengthIn: '10.31' },
];

export const MEASUREMENT_STEPS = [
  {
    step: '01',
    title: 'Paper Preparation',
    description: 'Tape a blank sheet of paper firmly to a hard, uncarpeted floor flush against a flat wall.',
  },
  {
    step: '02',
    title: 'Dual Foot Standing',
    description: 'Stand upright with your heel resting gently against the wall. Distribute your weight evenly across both feet, wearing the hosiery you intend to pair with your footwear.',
  },
  {
    step: '03',
    title: 'Mark Longest Point',
    description: 'Using a pen or pencil held straight down (perpendicular to the floor), mark the tip of your longest toe on the paper. Repeat for both feet.',
  },
  {
    step: '04',
    title: 'Measure in Centimeters',
    description: 'Use a ruler to measure the distance from the wall edge of the paper to the toe mark. Always fit to your larger foot.',
  },
  {
    step: '05',
    title: 'Compare with Chart',
    description: 'Find your foot length in the conversion table. If your measurement falls between two sizes, we recommend selecting the next size up, or consulting our atelier concierge.',
  },
];

export const SIZING_DISCLAIMER =
  'Footwear fit and comfort may vary slightly across open-toe slides, mules, and ankle-strap sandals due to arch profile and instep volume. This conversion chart and measurement guide serve as general atelier reference guidance and do not constitute an absolute or legally binding fit guarantee.';

/**
 * Generates direct WhatsApp concierge link for sizing and fit guidance
 * @param {string} [productName]
 * @returns {string}
 */
export const getSizingConciergeUrl = (productName = '') => {
  const base = siteConfig?.contact?.whatsapp?.url || 'https://wa.me/917728060447';
  const text = productName
    ? `Hello Aurevella Atelier,\nI am inquiring about footwear sizing guidance for "${productName}". Could you advise on the recommended size and fit profile?`
    : 'Hello Aurevella Atelier,\nI would like personalized sizing and fit guidance for the handcrafted footwear collection.';
  return `${base}?text=${encodeURIComponent(text)}`;
};
