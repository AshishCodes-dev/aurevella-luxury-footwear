# Design System & Visual Guidelines: AUREVELLA

> **Purpose**: Establishes the visual identity, typography system, colour palettes, and UI component standards for AUREVELLA.  
> Directs the aesthetic execution to communicate Italian-inspired luxury, bespoke craftsmanship, and minimalist direct-to-consumer elegance.

- **Last updated**: October 22, 2026  
- **Status**: Draft v1

---

## 1. Brand Philosophy & Aesthetic Tone

**AUREVELLA** represents the convergence of traditional Italian-inspired footwear design and master craftsmanship in India. The design philosophy is centered on the principle:  
> *"Luxury, Reimagined."*

### What We Are (Aesthetic Pillars)
- **Minimalist & Architectural**: Generous whitespace, disciplined alignment, and uncrowded layouts.
- **Product-First Focus**: Footwear photography is the primary visual centerpiece; UI elements exist only to support and elevate the product.
- **Warm Understated Luxury**: Dark warm tones, bespoke leather browns, and muted ivory/champagne typography.
- **Tactile & Refined**: Restrained interactive states, subtle transitions, and precise typography.

### What NOT to Do (Anti-Patterns)
- ❌ **No Neon or High-Saturation Colors**: Never use bright blues, harsh reds, or synthetic neon highlights.
- ❌ **No Heavy or Distracting Animations**: Avoid floating elements, bouncy buttons, spinning loaders, or continuous parallax effects that distract from the merchandise.
- ❌ **No Cluttered Layouts or Gimmicky Badges**: Avoid aggressive sales countdown timers, popups, spin-the-wheel discounts, or crowded coupon banners.
- ❌ **No Pure Black `#000000` Backgrounds**: Pure black washes out the subtle warm brown undertones of the brand logo and creates harsh visual contrast with imagery.

---

## 2. Color Palette & Theme Tokens

> **Important Note on Brand Colors**: The hexadecimal values listed below are **provisional theme tokens**. Final production hex codes will be extracted and calibrated directly from the client's official vector / high-res logo file `[OPEN]`.

```css
@theme {
  --color-background: #0F0A09;   /* Obsidian Noir: Warm, very dark brown-black base */
  --color-surface:    #181210;   /* Atelier Surface: Card and panel elevated background */
  --color-surface-subtle: #241B18; /* Surface Borders and dividers */
  --color-brown:      #2E1814;   /* Espresso Leather: Rich deep brown accent (Logo Circle) */
  --color-brown-light:#4A2C26;   /* Burnished Bronze: Hover and focus border states */
  --color-ivory:      #CFC9BA;   /* Vintage Ivory: Primary text, heading color, brand accent */
  --color-ivory-muted:#9E9685;   /* Aged Parchment: Secondary metadata and descriptions */
  --color-gold-accent:#D4AF37;   /* Tuscan Gold: Limited Edition highlights and rating stars */
}
```

### Color Specification Table
| Token Name | Hex Code | Role & Usage | Contrast Ratio on Dark Base |
| :--- | :--- | :--- | :--- |
| **Obsidian Base** | `#0F0A09` | Canvas background for the entire application. Warm undertone preserving dark brown logo visibility. | Baseline Canvas |
| **Atelier Surface**| `#181210` | Product cards, modal backdrops, dropdowns, and form containers. | 1.15:1 (Subtle depth separation) |
| **Espresso Brown** | `#2E1814` | Matches the circular emblem of the AUREVELLA logo. Secondary button accents and luxury cards. | Primary Brand Hue |
| **Burnished Accent**| `#4A2C26` | Border highlights, active variant swatches, button hover states. | 2.5:1 on Base |
| **Vintage Ivory** | `#CFC9BA` | Primary headings, logo wordmark, primary button text, key body copy. | **11.2:1 (Exceeds WCAG AAA)** |
| **Aged Parchment**| `#9E9685` | Subtitles, product specifications, breadcrumbs, footers. | **6.4:1 (Exceeds WCAG AA)** |
| **Tuscan Gold** | `#D4AF37` | Limited Edition luxury badge, exclusive edition numbers, subtle focal accents. | **8.1:1 on Base** |

### Logo Presentation on Dark Background
The AUREVELLA logo features a dark brown circular seal. If placed on a pure black (`#000000`) background, the circular perimeter disappears into the dark.  
- **Rule**: The site canvas is calibrated to warm Obsidian Noir (`#0F0A09`).
- **Rule**: On elevated cards (`#181210`), the logo circle is defined with a delicate, hairline border in ivory (`rgba(207, 201, 186, 0.15)`) or soft radial drop shadow to maintain crisp silhouette separation.

---

## 3. Typography Hierarchy

### 3.1 Font Selection
- **Primary Serif (Headings & Luxury Display)**:
  - **Option 1 (Recommended)**: **`Cormorant Garamond`** (Google Fonts) — Timeless, classical Roman proportions with razor-sharp serifs, perfect for luxury Italian-inspired aesthetics.
  - **Option 2 (Alternative)**: **`Playfair Display`** (Google Fonts) — High-contrast modern transitional serif with high editorial elegance.
  - **Fallback Stack**: `Didot, "Bodoni MT", "Cinzel", Georgia, "Times New Roman", serif`.
- **Primary Sans (Body Copy & UI Components)**:
  - **Primary**: **`Inter`** or **`Plus Jakarta Sans`** (Google Fonts) — Highly legible geometric grotesque optimized for high-density UI, numbers, and variant selectors.
  - **Fallback Stack**: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.

### 3.2 Type Scale
| Level | Font Family | Size | Weight | Line Height | Tracking | Application |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Display 1** | Serif | `3.75rem` (60px) | Light (300) | 1.1 | `tracking-widest` | Hero headline ("Luxury, Reimagined.") |
| **Heading 1** | Serif | `2.5rem` (40px) | Normal (400) | 1.2 | `tracking-wider` | Section titles, Product detail titles |
| **Heading 2** | Serif | `1.75rem` (28px) | Normal (400) | 1.3 | `tracking-wide` | Collection banners, Cart drawer titles |
| **Heading 3** | Serif | `1.25rem` (20px) | Medium (500) | 1.4 | `tracking-normal` | Product card titles, Modal headers |
| **Subhead** | Sans | `1.0rem` (16px) | Medium (500) | 1.5 | `tracking-wider` | Uppercase category badges, sub-navigation |
| **Body Large**| Sans | `1.125rem` (18px)| Light (300) | 1.6 | `tracking-normal`| Brand narrative paragraphs |
| **Body Base** | Sans | `0.9375rem`(15px)| Normal (400) | 1.6 | `tracking-normal`| Specifications, reviews, descriptions |
| **Caption / UI**| Sans| `0.8125rem`(13px)| Medium (500) | 1.4 | `tracking-wide` | Status badges, variant sizes, price tags |

---

## 4. Component Standards

### 4.1 Buttons & Call to Action (CTA)
- **Primary Luxury Button**:
  - Background: Vintage Ivory (`#CFC9BA`)
  - Text: Obsidian Noir (`#0F0A09`), font-sans, uppercase, `tracking-widest`, weight 500, text-sm.
  - Padding: `14px 28px`.
  - Hover: Background subtle lift to `#E5E0D3`, transition 200ms ease.
  - Active: Scale 0.98.
- **Secondary / Outline Button**:
  - Background: Transparent.
  - Border: 1px solid Vintage Ivory (`#CFC9BA` or `rgba(207, 201, 186, 0.4)`).
  - Text: Vintage Ivory (`#CFC9BA`), uppercase, `tracking-widest`.
  - Hover: Background `rgba(207, 201, 186, 0.1)`, border `#CFC9BA`.
- **Text CTA Link**:
  - Text with a subtle underline offset (`underline-offset-4 decoration-1 decoration-ivory/40 hover:decoration-ivory`).

### 4.2 Form Inputs
- Background: Surface dark (`#181210`).
- Border: 1px solid `rgba(207, 201, 186, 0.2)`.
- Text: Vintage Ivory (`#CFC9BA`), font-sans text-sm.
- Focus: Border color Espresso Brown Light (`#4A2C26`) with soft ivory focus ring (`ring-1 ring-ivory/30`), outline none.
- Placeholder: Aged Parchment muted (`#9E9685/60`).

### 4.3 Product Card
- Container: Surface dark (`#181210`) with subtle border `1px solid rgba(207, 201, 186, 0.08)`.
- Image Aspect Ratio: Standard **3:4 portrait ratio** (e.g., 600px × 800px) or **1:1 square ratio** on clean editorial backgrounds.
- Image Hover: Subtle zoom `scale-105` over 500ms ease; no jarring overlays.
- Content:
  - Title: Cormorant Garamond, text-lg, text-ivory.
  - Category: Uppercase sans, text-xs, tracking-widest, text-ivory-muted.
  - Price: Sans font, weight 500, text-ivory.
  - Variant Indicators: Small circular swatches displaying available leather colourways.

### 4.4 Limited Edition Badge
- Pill badge with border: `border border-[#D4AF37]/40 bg-[#2E1814]/80 text-[#D4AF37]`.
- Typography: Uppercase sans, text-xs, `tracking-widest`, font-medium.
- Icon: Small diamond or minimalist crown glyph prefix.

### 4.5 Navigation Bar (Header)
- Background: Obsidian Noir (`#0F0A09/90`) with backdrop blur (`backdrop-blur-md`).
- Layout: Centered luxury wordmark "AUREVELLA", left-aligned collection navigation links, right-aligned cart & profile icons.
- Mobile Behavior: Hamburger icon opening a full-height minimalist slide-out navigation drawer with smooth opacity transition.

### 4.6 Footer
- Background: `#0B0706` (deepest dark shade).
- Content: Brand story synopsis, customer care links, WhatsApp concierge link, Instagram handle, newsletter subscribe, and copyright notice.

---

## 5. Layout & Responsive Breakpoints

Design adheres to a mobile-first responsive grid using standard Tailwind CSS v4 breakpoints:

| Breakpoint | Minimum Width | Typical Devices | Grid Layout & Container |
| :--- | :--- | :--- | :--- |
| **Default (Base)** | `< 640px` | Mobile smartphones (360px – 428px) | 1 column product grid, 16px screen padding, bottom sticky checkout bar. |
| **`sm`** | `640px` | Large phones / phablets | 2 column product grid, 24px screen padding. |
| **`md`** | `768px` | Tablets (iPad portrait) | 2 column product grid, expanded navigation menu, slide-over cart drawer. |
| **`lg`** | `1024px` | Laptops / iPad landscape | 3 column product grid, sticky PDP product info pane. |
| **`xl`** | `1280px` | Standard Desktop monitors | 4 column product grid, max container width 1240px. |
| **`2xl`**| `1536px` | Ultra-wide / 4K displays | Max container width 1400px centered with wide luxury margins. |

---

## 6. Imagery & Photography Guidelines

1. **Aspect Ratio Consistency**:
   - Product Grid Listings: **3:4 aspect ratio** (e.g. 750 × 1000 px).
   - Product Detail Hero Gallery: **3:4 aspect ratio** with 1:1 close-up macro leather shots.
   - Editorial / Homepage Banners: **16:9** desktop, **4:5** mobile.
2. **Lighting & Background**:
   - Clean, controlled atelier studio lighting emphasizing leather grain, burnished patina, welt stitching, and natural leather luster.
   - Neutral dark or warm stone backgrounds that blend harmoniously into the website's dark canvas.
3. **Format & Compression**:
   - Master files uploaded as high-res PNG/JPEG, served dynamically as modern WebP/AVIF formats to maintain sub-2-second page loads.
