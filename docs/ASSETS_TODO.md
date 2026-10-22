# AUREVELLA — Brand Assets & Imagery Action Checklist

> **Purpose**: Documents the temporary/placeholder visual assets introduced in Phase 2.1 and defines the mandatory production requirements before commercial launch.  
> **Status**: Active Working Document  
> **Last updated**: October 23, 2026

---

## 1. Product Catalog Photography

The three product images currently placed in `frontend/public/images/products/`:
1. `product-01-floral-block-heel-sandal.jpg`
2. `product-02-blue-floral-slide.jpg`
3. `product-03-floral-block-heel-mule.jpg`

> [!WARNING]
> **Temporary Client Visuals**: These assets are low-resolution sample images (~1000 px wide after upscaling) supplied for initial layout assembly. They must **ONLY** be rendered in UI cards of 500 CSS px width or less, and must **NEVER** be used as hero banners or full-width imagery.

### Mandatory Pre-Launch Replacement Criteria:
- **Resolution**: High-resolution studio masters, minimum 1500 px wide (recommended 2400 × 2400 px master resolution).
- **Aspect Ratio**: Standard 1:1 square ratio (`--product-ratio: 1 / 1`) or client-confirmed commercial ratio.
- **Background**: Neutral studio white/light stone plain background without extraneous props, seamlessly blending with the AUREVELLA dark luxury theme.
- **Angles Required Per SKU**:
  1. Primary angle: 3/4 perspective exterior facing forward.
  2. Side profile: Full medial and lateral profile view showing heel contour.
  3. Top-down view: Insole, toe box, and strap detailing.
  4. Rear/Heel view: Interchangeable heel mechanism and heel profile.
  5. Sole view: Outsole finish, artisan stamp, and Goodyear/Blake stitch detailing.
- **Product Metadata**:
  - Official commercial model names (replacing provisional `TODO(client)` names).
  - Production pricing in INR (stored in integer paise, e.g. `₹24,990` = `2499000` paise).
  - Sizing chart availability (EU / UK / US sizing range).
  - Material specifications and interchangeable heel mechanism instructions.

---

## 2. Brand Identity & Vector Assets

The current brand identity files in `frontend/public/brand/`:
- `aurevella-mark.png`
- `aurevella-logo-full.png`
- `aurevella-wordmark.png`
- `aurevella-icon-512.png`
- `apple-touch-icon.png`
- `favicon-32.png`
- `favicon.ico`

### Mandatory Pre-Launch Replacement Criteria:
- **Vector Source Master**: Replace raster PNG files with clean SVG vector files (`.svg`) for the circular mark, the wordmark, and the full combined emblem.
- **Asset Cleanliness**: Ensure SVG paths are optimized, with pure `#2F1C15` (Espresso Brown) and `#FEF5E6` (Vintage Ivory) fills, without anti-aliasing artifacts or raster halos.
- **Color Calibration**: Finalize official brand Pantone / HEX values matching client-approved stationery and packaging.

---

## 3. Communication & Contact Channels

- **WhatsApp Business**: Confirm official registered WhatsApp Business number and pre-filled inquiry text (currently using `+91 77280 60447`).
- **Concierge Studio**: Confirm registered studio or atelier showroom physical address and concierge operational hours.
- **Brand Story & Interchangeable Heel Mechanism**: Complete client sign-off on the technical description and marketing narrative for the interchangeable heel mechanism.
