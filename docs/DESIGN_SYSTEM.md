# Design System & Visual Guidelines: AUREVELLA

> **Purpose**: Establishes the visual identity, typography system, colour palettes, zero-motion standards, and UI component specifications for AUREVELLA.  
> Directs the aesthetic execution to communicate Italian-inspired luxury, bespoke craftsmanship, and minimalist direct-to-consumer elegance.

- **Last updated**: October 22, 2026  
- **Status**: Draft v1.3

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

> **Important Note on Brand Colors**: The hexadecimal values listed below are **provisional theme tokens**. Final production hex codes will be extracted and calibrated directly from the client's official vector / high-res logo file `[OPEN]`.

```css
@theme {
  --color-background:     #0F0A09;   /* Obsidian Noir: Warm, very dark brown-black base */
  --color-surface:        #181210;   /* Surface Dark: Card and panel elevated background */
  --color-surface-subtle: #241B18;   /* Surface Borders and dividers */
  --color-brown:          #2E1814;   /* Espresso Leather: Rich deep brown accent (Logo Circle) */
  --color-brown-light:    #4A2C26;   /* Burnished Bronze: Hover and focus border states */
  --color-ivory:          #CFC9BA;   /* Vintage Ivory: Primary text, heading color, brand accent */
  --color-ivory-muted:    #9E9685;   /* Aged Parchment: Secondary metadata and descriptions */
}
```

### Color Specification Table
| Token Name | Hex Code | Role & Usage | Contrast Ratio on Dark Base |
| :--- | :--- | :--- | :--- |
| **Obsidian Base** | `#0F0A09` | Canvas background for the entire application. Warm undertone preserving dark brown logo visibility. | Baseline Canvas |
| **Surface Dark** | `#181210` | Product cards, modal backdrops, dropdowns, and form containers. | 1.15:1 (Subtle depth separation) |
| **Espresso Brown** | `#2E1814` | Matches the circular emblem of the AUREVELLA logo. Secondary button accents and luxury cards. | Primary Brand Hue |
| **Burnished Accent**| `#4A2C26` | Border highlights, active variant swatches, button hover states. | 2.5:1 on Base |
| **Vintage Ivory** | `#CFC9BA` | Primary headings, logo wordmark, primary button text, key body copy, Limited Edition outline. | **11.2:1 (Exceeds WCAG AAA)** |
| **Aged Parchment**| `#9E9685` | Subtitles, product specifications, breadcrumbs, footers. | **6.4:1 (Exceeds WCAG AA)** |

### Logo Presentation on Dark Background
The AUREVELLA logo features a dark brown circular seal. If placed on a pure black (`#000000`) background, the circular perimeter disappears into the dark.  
- **Rule**: The site canvas is calibrated to warm Obsidian Noir (`#0F0A09`).
- **Rule**: On elevated cards (`#181210`), the logo circle is defined with a delicate, hairline border in ivory (`rgba(207, 201, 186, 0.15)`) to maintain crisp silhouette separation.

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
- Autofill Styling: Overridden via `:-webkit-autofill` and `:autofill` to retain surface `#181210` and text `#CFC9BA`, preventing browser-default blue/grey tint.

### 4.3 Product Card
- Container: Surface dark (`#181210`) with subtle border `1px solid rgba(207, 201, 186, 0.08)`.
- Image Aspect Ratio: Standard **3:4 portrait ratio** (e.g., 600px × 800px).
- Image Hover: Static (no zoom, no scale transformation).
- Content:
  - Title: Cormorant Garamond, text-lg, text-ivory.
  - Category: Uppercase sans, text-xs, tracking-widest, text-ivory-muted.
  - Price: Sans font, weight 500, text-ivory (formatted in INR from paise).
  - Variant Indicators: Small static swatches displaying available colourways.

### 4.4 Limited Edition Badge
- Pill badge with ivory outline: `border border-[#CFC9BA] bg-transparent text-[#CFC9BA]`.
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

1. **Aspect Ratio Consistency**:
   - Product Grid Listings: **3:4 aspect ratio** (e.g. 750 × 1000 px).
   - Product Detail Hero Gallery: **3:4 aspect ratio** with 1:1 close-up macro shots.
   - Editorial Banners: **16:9** desktop, **4:5** mobile.
2. **Lighting & Background**:
   - Clean, controlled studio lighting emphasizing leather grain, burnished patina, welt stitching, and natural leather luster.
   - Neutral dark or warm stone backgrounds that blend harmoniously into the website's dark canvas.
3. **Format & Delivery**:
   - Master files served statically or via cloud storage in modern WebP/AVIF formats to maintain sub-2-second page loads.

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
