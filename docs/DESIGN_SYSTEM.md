# Design System & Visual Guidelines: AUREVELLA

> **Purpose**: Establishes the visual identity, typography system, colour palettes, zero-motion standards, and UI component specifications for AUREVELLA.  
> Directs the aesthetic execution to communicate Italian-inspired luxury, bespoke craftsmanship, and minimalist direct-to-consumer elegance.

- **Last updated**: October 23, 2026  
- **Status**: Draft v1.4

---

## 1. Brand Philosophy & Aesthetic Tone

**AUREVELLA** represents the convergence of traditional Italian-inspired footwear design and master craftsmanship in India. The design philosophy is centered on the principle:  
> *"Luxury, Reimagined."*

### What We Are (Aesthetic Pillars)
- **Minimalist & Architectural**: Generous whitespace, disciplined alignment, and uncrowded layouts.
- **Product-First Focus**: Footwear photography is the primary visual centerpiece; UI elements exist only to support and elevate the product.
- **Warm Understated Luxury**: Dark warm tones, bespoke leather browns, and muted ivory/champagne typography.
- **Tactile & Disciplined Precision**: Immediate feedback, subtle luxury easing, and razor-sharp typography.

### What NOT to Do (Anti-Patterns & Motion Restrictions)
- ❌ **No Distracting or Heavy Motion**: No parallax, scroll-triggered effects, auto carousels, bounce/spring/shake, scale/zoom, or slide-in transitions.
- ❌ **No Layout Transitions**: Never animate or transition width, height, margin, or layout dimensions.
- ❌ **No Excessive Durations**: Never use transitions or animations exceeding 250ms; never use `transition: all`.
- ❌ **No Unbounded Loops**: Infinite loops are strictly forbidden (except the single button loading spinner).
- ❌ **No Third-Party Animation Libraries**: Do not import or bundle `tw-animate-css` or external animation runtimes.
- ❌ **No Neon or High-Saturation Colors**: Never use bright blues, harsh reds, or synthetic neon highlights.
- ❌ **No Gimmicky Badges or Distractions**: Avoid aggressive sales countdown timers, popups, spin-the-wheel discounts, rating stars, or crowded coupon banners.
- ❌ **No Pure Black `#000000` Backgrounds**: Pure black washes out the subtle warm brown undertones of the brand logo and creates harsh visual contrast with imagery.

### Subtle Motion Policy (Replaces Zero-Motion)
AUREVELLA adopts a disciplined, high-end motion policy tailored for luxury e-commerce:

#### 1. Motion Tokens
- `--motion-fast: 150ms`: Used for micro-interactions (hover, focus, active states).
- `--motion-base: 200ms`: Used for entry appearances (content fade-in, alerts, dialogs).

#### 2. Allowed Motion
- **Micro-interactions (150ms, `--motion-fast`)**: Smooth transitions strictly limited to `color`, `background-color`, `border-color`, `opacity`, and `box-shadow` on buttons, navigation links, form inputs, and cards (`.transition-subtle`).
- **Entry Transitions (200ms, `--motion-base`)**: Opacity-only fade-in (`opacity: 0 -> 1`) for new page content, status alerts, mobile drawers, and modal dialogs (`.animate-fade-in`).
- **Loading State Indicator**: One simple continuous spinner (`.animate-spinner`) on loading buttons.
- **Image Reveal**: Subtle opacity-only fade-in upon image asset load.

#### 3. Prefers-Reduced-Motion Requirement
All transitions and animations are strictly disabled whenever the user expresses a preference for reduced motion:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition: none !important;
    animation: none !important;
    scroll-behavior: auto !important;
  }
}
```

#### 4. Testing & Verification Rule
Codebase grep audits across `frontend/src/` must exclusively reveal the allowed tokens (`--motion-fast`, `--motion-base`) and allowed utility classes (`.transition-subtle`, `.animate-fade-in`, `.animate-spinner`). Any generic `transition: all` or unlisted keyframes fail the build audit.

---

## 2. Color Palette & Theme Tokens

> **Important Note on Brand Colors**: The color palette is calibrated directly to the official brand assets: Brown `#2F1C15` (matching the circular mark) and Vintage Ivory `#FEF5E6` (matching the logo typography and monogram).

```css
@theme {
  --color-background:     #0F0A09;   /* Obsidian Noir: Warm, very dark brown-black base */
  --color-surface:        #181210;   /* Surface Dark: Card and panel elevated background */
  --color-surface-hover:  #241B18;   /* Surface Hover and interactive states */
  --color-brown:          #2F1C15;   /* Espresso Leather: Rich deep brown accent (Logo Circle) */
  --color-brown-light:    #4A2C26;   /* Burnished Bronze: Hover and focus border states */
  --color-ivory:          #FEF5E6;   /* Vintage Ivory: Primary headings, logo, primary button fill */
  --color-ivory-muted:    #B8AD9A;   /* Muted Sand: Secondary copy, metadata, and descriptions */
  --color-border:         #2F1C15;   /* Card, header, and section border lines */
  --product-ratio:        1 / 1;     /* Single token for product imagery aspect ratio */
}
```

### Color Specification Table
| Token Name | Hex Code | Role & Usage | Contrast Ratio on Base / Surface | WCAG Compliance |
| :--- | :--- | :--- | :--- | :--- |
| **Obsidian Base** | `#0F0A09` | Canvas background for the entire application. Warm undertone preserving dark brown logo visibility. | Baseline Canvas | Baseline |
| **Surface Dark** | `#181210` | Product cards, modal backdrops, dropdowns, and form containers. | 1.15:1 vs Base | Depth separation |
| **Espresso Brown** | `#2F1C15` | Matches the circular emblem of the AUREVELLA logo. Borders, cards, and secondary accents. | Primary Brand Hue | Brand Accent |
| **Vintage Ivory** | `#FEF5E6` | Primary headings, logo live text, primary button fill, Limited Edition outline badge. | **17.5:1 on Base**, **16.5:1 on Surface** | **Exceeds WCAG AAA** |
| **Muted Sand** | `#B8AD9A` | Body copy, subtitles, product specifications, breadcrumbs, footers. | **8.73:1 on Base**, **8.18:1 on Surface** | **Exceeds WCAG AAA** (well above 4.5:1 AA) |
| **Primary Button**| Fill: `#FEF5E6`, Text: `#0F0A09` | Primary conversion CTAs and form submission buttons. | **17.5:1 text contrast** | **Exceeds WCAG AAA** |

### Logo Presentation on Dark Background
The AUREVELLA logo features a dark brown circular seal (`#2F1C15`). If placed on a pure black (`#000000`) background, the circular perimeter disappears into the dark.  
- **Rule**: The site canvas is calibrated to warm Obsidian Noir (`#0F0A09`).
- **Rule**: Header uses `aurevella-mark.png` (~40px high, `alt=""`) alongside live serif text "AUREVELLA" in `#FEF5E6`. Link features `aria-label="AUREVELLA home"`.
- **Rule**: Footer and About hero use `aurevella-logo-full.png` (`alt="AUREVELLA - Luxury Interchangeable Heels"`) with explicit `width` and `height` set.

---

## 3. Typography Hierarchy

### 3.1 Self-Hosted Font Selection (No External CDN)
All fonts must be self-hosted locally using `@fontsource` npm packages to eliminate Google Fonts CDN privacy issues, network roundtrips, and layout shifts:
- **Primary Serif (Headings & Luxury Display)**:
  - **Self-Hosted Package**: `@fontsource/cormorant-garamond` — Timeless Roman proportions with sharp serifs.
  - **CSS Font Family**: `"Cormorant Garamond", Georgia, serif`.
- **Primary Sans (Body Copy & UI Components)**:
  - **Self-Hosted Package**: `@fontsource-variable/inter` — Clean, legible grotesque optimized for high-density UI and variant selectors.
  - **CSS Font Family**: `"Inter Variable", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.

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
  - Background: Vintage Ivory (`#CFC9BA`).
  - Text: Obsidian Noir (`#0F0A09`), font-sans, uppercase, `tracking-widest`, weight 500, text-sm.
  - Padding: `14px 28px` (minimum 44px touch height).
  - Hover: Subtle background shift to `#E5E0D3` (`.transition-subtle`, 150ms).
  - Focus-visible: Instant ring `ring-1 ring-[#CFC9BA]`.
  - Loading State: Shows a compact continuous spinner (`.animate-spinner`) and disables interactive clicks.
- **Secondary / Outline Button**:
  - Background: Transparent.
  - Border: 1px solid Vintage Ivory (`#CFC9BA`).
  - Text: Vintage Ivory (`#CFC9BA`), uppercase, `tracking-widest`.
  - Hover: Subtle background shift (`.transition-subtle`, 150ms).
- **Text CTA Link**:
  - Text with underline offset (`hover:text-white transition-subtle`).

### 4.2 Form Inputs & Controls
- Background: Surface dark (`#181210`).
- Border: 1px solid `#2E1814`.
- Text: Vintage Ivory (`#CFC9BA`), font-sans text-sm.
- Height / Touch Target: Minimum 44px height.
- Focus-visible: Subtle border and ring color shift (`.transition-subtle`, 150ms).
- Placeholder: Aged Parchment muted (`#9E9685`).
- Labels: Always paired with form input via explicit `htmlFor` attribute.
- Error Messaging: Rendered directly below input with `aria-live="polite"` and role alert.
- Autofill Styling: Overridden via `:-webkit-autofill` and `:autofill` to retain surface `#181210` and text `#FEF5E6`, preventing browser-default blue/grey tint.

### 4.3 Product Card
- Container: Surface dark (`#181210`) with subtle border `1px solid #2F1C15`. Maximum card width strictly 500 CSS px or less for current client visuals.
- Image Aspect Ratio: Single token `--product-ratio: 1 / 1` (provisional 1:1 square ratio; final ratio decided when clean high-resolution photos arrive).
- Image Dimensions & Loading: `width="500" height="500"`, `object-fit: cover`, centered; `loading="lazy"` except images visible on initial load. Opacity fade-in on load allowed (`.img-fade-in` with `--motion-base: 200ms`).
- Content:
  - Title: Cormorant Garamond, text-lg, text-[#FEF5E6].
  - Category: Uppercase sans, text-xs, tracking-widest, text-[#B8AD9A].
  - Price: Sans font, weight 500, text-[#FEF5E6] (provisional text "Price coming soon").
  - Inquire CTA: Underlined link to `/shop`.

### 4.4 Limited Edition Badge
- Pill badge with ivory outline: `border border-[#FEF5E6] bg-transparent text-[#FEF5E6]`.
- Typography: Uppercase sans, text-xs, `tracking-widest`, font-medium.
- Icon: None (clean minimalist luxury text).

### 4.5 Navigation Bar (Header)
- Background: Obsidian Noir (`#0F0A09`).
- Layout: Centered luxury wordmark "AUREVELLA", left-aligned navigation links, right-aligned account & cart actions.
- Mobile Behavior: Hamburger toggle opening a full-height solid mobile drawer without slide or fade transitions.

### 4.6 Footer
- Background: `#0B0706` (deepest dark shade).
- Content: Brand story synopsis, customer care links, legal policy links, WhatsApp concierge link, Instagram handle, and copyright notice.

---

## 5. Layout, Responsive Breakpoints & Accessibility

### 5.1 Responsive Breakpoints
Every layout must be mobile-first and tested rigorously without horizontal scrolling at:
- **360px**: Small mobile smartphones (e.g., Android devices).
- **768px**: Tablets (e.g., iPad portrait).
- **1024px**: Laptops / Tablets landscape.
- **1440px**: Standard desktop monitors.

| Breakpoint | Minimum Width | Grid Layout & Container |
| :--- | :--- | :--- |
| **Default (Base)** | `360px` | 1 column product grid, 16px horizontal padding, 44px minimum touch targets. |
| **`sm`** | `640px` | 2 column product grid, 24px screen padding. |
| **`md`** | `768px` | 2 column product grid, expanded navigation menu, instant cart drawer. |
| **`lg`** | `1024px` | 3 column product grid, sticky PDP details column. |
| **`xl`** | `1280px` | 4 column product grid, max container width 1240px. |
| **`2xl`**| `1440px+` | Max container width 1400px centered with wide luxury margins. |

### 5.2 Accessibility Rules (WCAG 2.1 AA Compliance)
1. **Touch Targets**: All clickable buttons, inputs, links, and variant selectors must have a minimum interactive dimension of **44px × 44px** on handheld screens.
2. **Form Labels**: Every input must feature an associated `<Label htmlFor="...">` element.
3. **Password Visibility**: Password inputs must provide a dedicated show/hide toggle button with `aria-label`.
4. **Autocomplete Attributes**: All identity form fields must use standard autocomplete attributes (`name`, `email`, `current-password`, `new-password`, `tel`).
5. **Visible Focus**: Interactive elements must retain visible, high-contrast focus rings (`focus-visible:ring-1 focus-visible:ring-ivory`).
6. **Screen Reader Announcements**: Form validation errors and dynamic status alerts must be wrapped in `aria-live="polite"` regions.

---

## 6. Imagery & Photography Guidelines

1. **Aspect Ratio Consistency & Tokens**:
   - Product Card Listings: **1:1 square ratio** controlled via CSS token `--product-ratio: 1 / 1` (single place to adjust globally when high-resolution commercial photography arrives).
   - Card Dimension Limits: Low-resolution client sample visuals must strictly reside in cards of **500 CSS px width or less**.
   - Hero & Banners: The Hero section is **text-only with brand logo**; no product photography is permitted in hero or full-width banners.
2. **Sample Visual Assets (Temporary Placeholders)**:
   - Three initial client visuals are placed in `frontend/public/images/products/`:
     - `product-01-floral-block-heel-sandal.jpg`
     - `product-02-blue-floral-slide.jpg`
     - `product-03-floral-block-heel-mule.jpg`
   - See `docs/ASSETS_TODO.md` for pre-launch production replacement criteria (min 1500px, neutral studio backgrounds, 5 distinct angles per SKU).
3. **Loading & Reveal Rules**:
   - Explicit `width="500"` and `height="500"` attributes set on card images to prevent layout shift.
   - `loading="lazy"` on below-the-fold assets; `loading="eager"` on initial viewport assets.
   - Reveal animation: Subtle opacity-only fade-in (`.img-fade-in` at 200ms) upon asset load.

---

## Changelog v1.4
- **Brand Asset Integration & Calibration**: Calibrated theme tokens directly to official brand assets: Brown `#2F1C15` and Vintage Ivory `#FEF5E6`. Replaced provisional `#CFC9BA` and `#2E1814`. Updated body and muted text to `#B8AD9A` (8.73:1 contrast on Obsidian base, 8.18:1 on surface, exceeding WCAG AAA). Set primary button fill to `#FEF5E6` with `#0F0A09` text.
- **Logo Hierarchy**: Header uses `aurevella-mark.png` (~40px) with live serif text; footer and about hero use `aurevella-logo-full.png` with explicit dimensions and descriptive alt text.
- **Imagery Guidelines**: Introduced token `--product-ratio: 1 / 1`. Mandated maximum 500 CSS px card width for temporary sample client visuals. Enforced text-only hero without product photography. Added `docs/ASSETS_TODO.md`.
- **Favicon & Meta Update**: Configured `favicon.ico`, `favicon-32.png`, and `apple-touch-icon.png`; removed SVG placeholder.

---

## Changelog v1.3
- **Subtle Motion Policy (Replaces Zero-Motion Mandate)**: Removed the global `transition: none / animation: none / scroll-behavior` kill-switch. Introduced tokens `--motion-fast: 150ms` and `--motion-base: 200ms`. Permitted targeted 150ms micro-interactions (colour, background, border, opacity, box-shadow) and 200ms opacity-only entry fade-ins. Allowed continuous spinner on loading buttons. Strictly prohibited layout transitions, parallax, carousels, bounces, zooms, and `transition: all`.
- **Prefers-Reduced-Motion**: Enforced `@media (prefers-reduced-motion: reduce)` disabling all transitions and animations for users requesting reduced motion.
- **Autofill Dark Luxury Styling**: Added global CSS overrides for `:-webkit-autofill` and `:autofill` preserving dark surface `#181210` and ivory `#CFC9BA` text.

---

## Changelog v1.2
- **Zero-Motion Mandate**: Completely removed all motion, animation, keyframes, transitions, smooth scrolling, carousels, and parallax across all UI specifications. Enforced instant colour changes only. Added global `transition: none !important; animation: none !important;` rule.
- **Color Palette Simplification**: Removed gold `#D4AF37`. Updated Limited Edition badge to an ivory outline (`border border-[#CFC9BA]`). Removed fabricated "Atelier" names, rating stars, and newsletter references.
- **Self-Hosted Typography**: Switched typography to self-hosted `@fontsource/cormorant-garamond` and `@fontsource-variable/inter` packages, removing all Google Fonts CDN dependencies.
- **Responsive & Accessibility Expansion**: Added strict viewport testing requirements (360px, 768px, 1024px, 1440px with zero horizontal scroll) and WCAG 2.1 AA accessibility standards (44px touch targets, visible focus, autocomplete, and aria-live errors).

---

## Changelog v1.1
