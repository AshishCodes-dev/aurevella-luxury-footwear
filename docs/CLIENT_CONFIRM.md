# AUREVELLA — Client Confirmation & Marketing Claims Audit

This document tracks all marketing claims, artisanal assertions, and policy commitments across the AUREVELLA platform. 

- **Client-Confirmed Facts (Preserved As-Is):**
  - Brand name: **AUREVELLA**
  - Tagline: *"Luxury, Reimagined."*
  - Brand premise: *"Italian-inspired elegance, crafted in India"*
  - Production hallmark: *"Handcrafted"*
  - Instagram handle: **@myaurevella** (https://www.instagram.com/myaurevella)
  - Marketing email: **marketing@myaurevella.in**
  - WhatsApp concierge: **+91 77280 60447** (https://wa.me/917728060447)

- **Marketing Claims Policy:**
  Any specific claim not yet formally confirmed by the client has been replaced with neutral, accurate wording that avoids unsubstantiated commitments.
- **Protected Policy & Product Copy:**
  Policy pages (`ShippingPolicy.jsx`, `ReturnsPolicy.jsx`, `PrivacyPolicy.jsx`, `TermsConditions.jsx`) and *"interchangeable heels"* technical descriptions were not altered; they are listed below for client verification and sign-off.

---

## 1. Marketing Claims Review Table

| File & Line | Original Text | New Text / Status | Question for Client |
|:---|:---|:---|:---|
| `frontend/src/content/site.js:27` | `studioAddress: 'Private Atelier Showroom & Studio Fittings (By Appointment — Mumbai / Delhi)'` | `studioAddress: 'Private Fitting Consultations (By Appointment)'` | Does Aurevella have dedicated physical showrooms/studios in Mumbai and/or Delhi for private fittings, or should client consultations remain by appointment only? |
| `frontend/src/content/site.js:48` | `{ label: 'Customization', href: '/contact' }` | `{ label: 'Concierge', href: '/contact' }` | Does Aurevella offer bespoke custom footwear manufacturing, or should inquiries be handled through general concierge service? |
| `frontend/src/content/site.js:65` | `eyebrow: 'Bespoke Footwear Atelier'` | `eyebrow: 'Footwear Atelier'` | Should Aurevella be branded as a "Bespoke Footwear Atelier" (made-to-measure) or a luxury ready-to-wear footwear atelier? |
| `frontend/src/content/site.js:124-126` | `heading: 'The Atelier Series Drop'`, `description: 'Individually numbered, small-batch releases handcrafted with rare leathers and solid brass hardware. Strictly capped at 50 pairs worldwide. Once retired, the series is never reproduced.'` | `heading: 'The Limited Edition Drop'`, `description: 'Small-batch footwear releases handcrafted in limited quantities. Once a series concludes, the edition is retired.'` | Are limited drops strictly capped at 50 pairs worldwide using rare leathers and solid brass hardware, and is each model permanently retired upon sell-out? |
| `frontend/src/content/site.js:135` | `description: 'Lasted by hand and built with bespoke artisan construction for lasting poise.'` | `description: 'Lasted by hand and built with quality construction for lasting comfort and poise.'` | Is the lasting process bespoke (individual client foot molds) or handcrafted bench lasting over standard sizing lasts? |
| `frontend/src/content/site.js:145` | `description: 'Empowering master regional artisans with ethical, bespoke atelier shoemaking.'` | `description: 'Supporting regional artisans through dedicated, handcrafted footwear production.'` | What specific regional artisan clusters and shoemaking heritage should be highlighted in brand storytelling? |
| `frontend/src/pages/Home.jsx:205` | `Our luxury footwear consultants are available for personalized sizing inquiries and order guidance.` | `Our concierge team is available for sizing inquiries and order guidance.` | Are dedicated luxury footwear consultants available for 1-on-1 sizing consultations, or is support provided via customer service / WhatsApp? |
| `frontend/src/pages/Collections.jsx:15` | `subtitle: 'From Morning Poise to Gala Drama'` | `subtitle: 'Versatile Styling for Day and Evening'` | Does "Versatile Styling for Day and Evening" align with your preferred collection positioning? |
| `frontend/src/pages/Collections.jsx:17` | `Our signature interchangeable heel engineering redefines footwear versatility. Designed with an ultra-secure locking mechanism, effortlessly transition between sculptural block profiles and daytime silhouettes without compromising lumbar alignment or arch balance.` | `Our signature interchangeable heel engineering offers versatile silhouettes for day and evening wear. Designed with a secure locking mechanism to easily adapt your style with dependable stability and comfort.` | Are there clinical or orthopedic studies to substantiate anatomical/lumbar alignment claims, or should messaging highlight comfort and stability? |
| `frontend/src/pages/Collections.jsx:20` | `'Balanced ergonomic arch distribution'` -> `'Comfort-focused contoured footbed'` | **REMOVED** (**Needs Confirmation**) | Does Aurevella footwear feature a specially contoured, orthopedic, or padded footbed, or should footbed specifications remain unspecified? |
| `frontend/src/pages/Collections.jsx:21` | `'Supple full-grain Italian leather uppers'` | `'Selected quality leather and textile uppers'` | Are uppers made from imported Italian full-grain leather, domestic Indian leather, or specialty textiles? |
| `frontend/src/pages/Collections.jsx:34` | `subtitle: 'Unlined Luxury for Effortless Elegance'` | `subtitle: 'Comfortable Designs for Daily Elegance'` | Are the resort slides unlined luxury construction, or standard padded flat slide construction? |
| `frontend/src/pages/Collections.jsx:36` | `Embodying relaxed sophistication, our resort slides pair handwoven artisanal soles with cloud-soft knotted straps. Created for sun-drenched afternoons, coastal escapes, and understated daily comfort.` | `Our flat slides pair handwoven soles with knotted straps, crafted for relaxed sophistication and understated daily comfort.` | Does this description accurately reflect the materials and styling of the Blue Floral Slide (prod-02)? |
| `frontend/src/pages/Collections.jsx:39` | `'Hand-knotted silk-touch textile straps'` | `'Hand-knotted textile straps'` | What is the exact textile composition of the knotted strap on prod-02 (e.g. silk blend, satin polyester, cotton)? |
| `frontend/src/pages/Collections.jsx:49-59` | `badge: 'Atelier Preview'` -> `badge: 'Upcoming Release'` | `badge: 'Evening Series'` (**Needs Confirmation**) | Does Aurevella plan to market an Evening & Statement Series, and should it carry an upcoming release badge or standard capsule branding? |
| `frontend/src/pages/Collections.jsx:50-60` | `title: 'Red Carpet & Evening Series'`, `description: 'Sculptural contours, hand-applied gold hardware, and architectural heel geometries crafted for red carpet entrances and bespoke celebrations.'` | `title: 'Evening & Statement Series'`, `description: 'Elevated contours, metallic accents, and refined styling crafted for evening occasions. Each pair is designed to offer a distinctive presence.'` | Has a "Red Carpet Gala Series" or "Evening Series" been designed, does it use solid brass hardware, and are bespoke heel height adjustments offered? |
| `frontend/src/pages/Collections.jsx:80` | `Explore our curated footwear capsules, where classic continental architecture harmonizes with bespoke Indian shoemaking craftsmanship.` | `Explore our curated footwear capsules, where Italian-inspired design harmonizes with handcrafted Indian shoemaking.` | Does this phrasing accurately convey the blend of Italian design influence and Indian craftsmanship? |
| `frontend/src/pages/Collections.jsx:171-181` | `Private Atelier Commissioning`, `Our Red Carpet Gala Series is reserved for bespoke private orders and red carpet commissions...` -> `Our upcoming evening silhouettes are currently in preparation.` | `Evening Series Inquiries`, `Connect with our concierge team to explore evening silhouettes and design consultations. Inquiries and lookbooks available upon concierge request.` (**Needs Confirmation**) | Does Aurevella have evening footwear styles currently in preparation/production, or should all evening styling remain general concierge inquiries? |
| `frontend/src/pages/LimitedEdition.jsx:13-16` | `title: 'Individually Numbered'`, `description: 'Every pair carries a hand-stamped serial number (e.g., 07/50) heat-pressed into the interior Italian calfskin lining.'` | `title: 'Handcrafted in India'`, `description: 'Crafted with deliberate care, reflecting fine artisanal footwear construction.'` (**Needs Confirmation**) | Are limited edition pairs individually serial-numbered (e.g. 07/50) and heat-stamped into interior calfskin linings? |
| `frontend/src/pages/LimitedEdition.jsx:19-22` | `title: 'Solid Cedar & Wooden Box'`, `description: 'Delivered in an archival handcrafted wooden storage box with custom aromatic cedar shoe trees...'` -> `title: 'Signature Packaging'`, `description: 'Delivered in dedicated protective packaging with individual dust bags...'` | **REMOVED** (**Needs Confirmation**) | What exact packaging components are provided with each footwear order—dust bags, branded box, shoe trees, or standard packaging? |
| `frontend/src/pages/LimitedEdition.jsx:25-28` | `title: 'Archival Provenance Certificate'`, `description: 'Accompanied by a gold-embossed certificate of authenticity signed by our chief lasting artisan...'` -> `title: 'Authenticity Guarantee'`, `description: 'Every pair is verified prior to dispatch to ensure it meets our quality and design standards.'` | `title: 'Interchangeable Heels'`, `description: 'Engineered with our signature convertible heel mechanism for versatile wear.'` (**Needs Confirmation**) | Does Aurevella provide a physical or written authenticity guarantee certificate signed by an artisan with limited editions? |
| `frontend/src/pages/LimitedEdition.jsx:31-34` | `title: 'Strict Global Cap'`, `description: 'Limited strictly to 50 pairs worldwide. Once a series is fully commissioned, the last and pattern are permanently retired.'` -> `description: 'Each limited edition is offered for a restricted duration, celebrating unique seasonal styling.'` | `title: 'Concierge Guidance'`, `description: 'Direct consultation available for personalized sizing inquiries and order assistance.'` (**Needs Confirmation**) | Are limited edition drops sold for a strictly restricted calendar duration, or simply offered while supplies last? |
| `frontend/src/pages/LimitedEdition.jsx:44` | `Strictly 50 Pairs Worldwide` | `Curated Limited Run` | Should the header tag promote a specific numeric cap (e.g. 50 pairs) or a general limited-edition badge? |
| `frontend/src/pages/LimitedEdition.jsx:50` | `Small-batch handcrafted collector drops featuring antique patinas, rare floral textiles, and solid brass detailing.` | `Small-batch handcrafted footwear featuring distinctive textiles and refined metallic accents.` | Are the limited edition materials antique patinas, rare floral textiles, and solid brass? |
| `frontend/src/pages/LimitedEdition.jsx:63` | `Series 01 • 50 Pairs` | `Series 01 • Limited Run` | Is the first release series strictly capped at 50 pairs? |
| `frontend/src/pages/LimitedEdition.jsx:80` | `Active Atelier Allocation` | `Featured Release` | Is the term "Allocation" preferred by the client for product inventory? |
| `frontend/src/pages/LimitedEdition.jsx:88` | `Handcrafted from rich floral jacquard and lined with butter-soft calfskin. Finished with our signature interchangeable block heel mechanism and a solid brushed gold buckle. Designed for discerning patrons who demand singular craftsmanship.` | `Handcrafted from floral jacquard textile with smooth interior lining. Finished with our signature interchangeable block heel mechanism and a gold-tone buckle. Designed for discerning patrons who appreciate singular craftsmanship.` | What are the exact material specifications for Floral Block Heel Mule (prod-03) (upper textile, lining material, buckle metal alloy)? |
| `frontend/src/pages/LimitedEdition.jsx:95-96` | `Allocation Status: Bespoke Orders Open` | `Availability: Available to Order` | Are orders classified as bespoke commissions or standard e-commerce orders? |
| `frontend/src/pages/LimitedEdition.jsx:97-102` | Allocation progress bar (`div with w-2/5`) and `Numbered 01/50 through 50/50 allocation in progress` -> `Limited release available while quantities last` | **REMOVED** (**Needs Confirmation**) | Does Aurevella track numerical allocation tiers, real-time batch meters, or inventory percentage bars on limited edition models? |
| `frontend/src/pages/LimitedEdition.jsx:110` | `Commission This Pair` | `Order This Pair` | Should the primary CTA button read "Order This Pair" or "Commission This Pair"? |
| `frontend/src/pages/LimitedEdition.jsx:120` | `Reserve Serial Number` | `Inquire via WhatsApp` | Can customers reserve a specific serial number via WhatsApp? |
| `frontend/src/pages/LimitedEdition.jsx:136-139` | `Every Pair is an Heirloom — We treat our limited drops as pieces of wearable sculpture rather than seasonal commodities.` | `Artisanal Craftsmanship — We treat our limited drops with deliberate craftsmanship and attention to detail.` | Does the client endorse marketing footwear as "heirloom wearable sculpture"? |
| `frontend/src/pages/LimitedEdition.jsx:163-164` | `Individual serial inscriptions are assigned sequentially upon order confirmation. Bespoke monogram inquiries may be routed to our concierge.` | `Limited release pairs are fulfilled sequentially upon order confirmation. Inquiries may be routed directly to our concierge.` | Does Aurevella offer custom monogramming on footwear, and if so, what is the lead time and fee? |
| `frontend/src/pages/About.jsx:13-16` | `Anatomical Last Sculpting — Each silhouette originates on custom wooden lasts contoured to distribute body weight evenly across the metatarsal and heel arches.` | `Careful Silhouette Modeling — Each silhouette is contoured to balance aesthetics with comfortable everyday wear.` | Are shoes lasted on custom wooden anatomical lasts designed for weight distribution across arches? |
| `frontend/src/pages/About.jsx:21-22` | `We source breathable full-grain leathers, durable woven textiles, and precision metal hardware tested to resist coastal humidity and wear.` | `We select quality leathers, durable woven textiles, and refined metal hardware chosen for long-lasting wear.` | Have materials undergone specific coastal humidity lab/chamber testing? |
| `frontend/src/pages/About.jsx:25-28` | `Our proprietary heel locking mechanism is machined from lightweight structural alloy to provide rock-solid stability in every setting.` | `Our signature heel locking mechanism is designed to provide dependable stability and versatility in every setting.` | What alloy and engineering specifications are used for the interchangeable heel locking mechanism? |
| `frontend/src/pages/About.jsx:49` | `AUREVELLA was founded on a singular premise: luxury footwear should embody timeless European elegance without sacrificing anatomical ease or local artisanal integrity.` | `AUREVELLA was founded on a singular premise: luxury footwear should embody timeless elegance without sacrificing comfort or artisanal craftsmanship.` | Does this refined brand premise accurately reflect your company values? |
| `frontend/src/pages/About.jsx:124` | `Every pair undergoes over seventy bespoke bench operations before receiving its final seal of dispatch.` -> `Every pair undergoes thorough bench craftsmanship and inspection before receiving its final dispatch.` | `Our footwear is handcrafted with deliberate attention to detail and construction.` (**Needs Confirmation**) | What specific bench craftsmanship operations, lasting stages, or inspection procedures should be cited in workshop descriptions? |
| `frontend/src/pages/About.jsx:149` | `Private fittings and bespoke commissions arranged exclusively through our concierge service.` | `Personal inquiries and sizing consultations are arranged through our concierge service.` | Are in-person private fittings and bespoke commissions available to customers? |
| `frontend/src/pages/ProductDetail.jsx:421` | `All-India atelier delivery` | `Complimentary delivery across India` | Is all-India delivery branded as "atelier delivery" with white-glove couriers? |

---

## 2. Policy-Page Commitments & Core Product Claims (Unchanged, Needs Confirmation)

The following policy statements and core technical claims were preserved without alteration. The client must review and confirm each policy commitment:

| File & Line | Current Unchanged Text | Status | Question for Client |
|:---|:---|:---:|:---|
| `frontend/src/pages/ShippingPolicy.jsx:12-13` | `Complimentary Domestic Shipping — All domestic orders across India are shipped with fully complimentary insured express courier delivery.` | **Needs Confirmation** | Is all domestic shipping within India 100% complimentary on all orders with zero minimum order value threshold? |
| `frontend/src/pages/ShippingPolicy.jsx:27-28` | `Fully Insured Transit — Your commission is 100% insured against loss or damage from our atelier doors to your residence.` | **Needs Confirmation** | Does Aurevella hold an active transit insurance policy with its courier partners covering 100% of order value against loss, theft, or damage? |
| `frontend/src/pages/ShippingPolicy.jsx:17-18` | `2–3 Day In-Stock Dispatch — In-stock footwear models are carefully inspected, buffed, and dispatched within 2 to 3 business days.` | **Needs Confirmation** | Can fulfillment operations consistently meet the 2 to 3 business days dispatch commitment for in-stock footwear? |
| `frontend/src/pages/ShippingPolicy.jsx:78-79` | `In-Stock Ready-to-Wear: Dispatched within 2–3 business days of verified payment. Limited Edition & Made-to-Order: Individually lasted and dispatched within 10–14 business days.` | **Needs Confirmation** | Are the 2–3 business days (ready-to-wear) and 10–14 business days (made-to-order) dispatch SLAs approved? |
| `frontend/src/pages/ShippingPolicy.jsx:22-23` | `Bespoke Wooden Presentation — Arrives in our custom rigid wooden presentation box with individual dust bags and protective tissue.` | **Needs Confirmation** | Will all deliveries be packaged in custom wooden boxes, or in rigid luxury cardboard presentation boxes with dust bags? |
| `frontend/src/pages/ReturnsPolicy.jsx:13,28` | `Return or exchange must be initiated within 14 calendar days of confirmed courier delivery. ... Enjoy our seamless 14-day sizing exchange and return policy.` | **Needs Confirmation** | Is the 14 calendar days return and sizing exchange window confirmed? |
| `frontend/src/pages/ReturnsPolicy.jsx:42` | `If your footwear does not provide the contoured comfort you desire, we offer one complimentary size exchange per order. Our concierge will arrange doorstep courier pickup and coordinate dispatch of your replacement size at no additional charge.` | **Needs Confirmation** | Is one complimentary size exchange with free reverse courier doorstep pickup confirmed for all domestic orders? |
| `frontend/src/pages/ReturnsPolicy.jsx:80,83` | `Once received at our atelier, returned footwear undergoes a technical inspection within 48 business hours. ... refunds typically reflect in your account within 5 to 7 business days.` | **Needs Confirmation** | Are the 48-hour inspection SLA and 5-7 business day Razorpay refund reflection timeframes confirmed? |
| `frontend/src/pages/TermsConditions.jsx:54` | `All prices displayed on the store are denominated in Indian Rupees (INR) and are inclusive of all applicable Goods and Services Tax (GST).` | **Needs Confirmation** | Are displayed retail prices (₹3,499, ₹3,299, ₹3,699) fully GST-inclusive, and what is Aurevella's registered GSTIN for customer invoices? |
| `frontend/src/pages/ProductDetail.jsx:262` | `Inclusive of all taxes • Complimentary standard delivery` | **Needs Confirmation** | Confirmed match with Terms & Conditions and Shipping Policy? |
| `frontend/index.html:9,12,19,20,28,29` | `AUREVELLA — Luxury Interchangeable Heels` | **Needs Confirmation** | Does Aurevella want "Luxury Interchangeable Heels" as the primary title tag and social sharing meta descriptor? |
| `frontend/src/content/site.js:10,78,140` | `descriptor: 'Luxury Interchangeable Heels'`, `'Our signature interchangeable heels are designed around one idea: Luxury, Reimagined.'`, `'Sculpted contours and interchangeable heel engineering inspired by classic sartorial traditions.'` | **Needs Confirmation** | How does the interchangeable heel mechanism operate in practice (e.g. twist-lock, slide-latch, magnetic lock), and should technical usage instructions or video guides be provided? |
| `frontend/src/pages/Home.jsx:62` | `<span>Interchangeable Heels</span>` | **Needs Confirmation** | Confirmed placement as a core hallmark on the homepage? |
| `frontend/src/pages/Collections.jsx:14,24` | `Interchangeable Heels Capsule`, `Explore Interchangeable Heels` | **Needs Confirmation** | Confirmed category naming for convertible footwear models? |
| `frontend/src/pages/LimitedEdition.jsx:88` | `Finished with our signature interchangeable block heel mechanism...` | **Needs Confirmation** | Confirmed that the Limited Edition Floral Block Heel Mule (prod-03) features the interchangeable heel mechanism? |
| `frontend/src/pages/About.jsx:25,68` | `Interchangeable Heel Engineering`, `By introducing our signature interchangeable heel mechanism, we eliminate the false choice between towering evening glamour and all-day walking comfort.` | **Needs Confirmation** | Confirmed brand narrative regarding interchangeable heel convenience? |
| `frontend/src/pages/ShippingPolicy.jsx:75` | `Because each shoe incorporates our proprietary interchangeable heel fitting and hand-stitched components...` | **Needs Confirmation** | Confirmed operational reference in shipping guidelines? |
| `frontend/src/pages/TermsConditions.jsx:67,70` | `The AUREVELLA name, trademark, bespoke heel attachment engineering... No reproduction, reverse-engineering, mechanical copying, or commercial re-distribution of our interchangeable heel mechanism or designs is permitted...` | **Needs Confirmation** | Has a patent, design registration, or trademark application been filed in India or internationally for the interchangeable heel mechanism? |

---

## 3. Pending Owner Business Decisions & Operations Backlog

The following operational and business decisions require explicit client sign-off prior to production deployment:

### A. Shipping & Logistics
1. **Domestic Shipping Rates & Thresholds:**
   - Confirm whether all domestic shipping across India is 100% complimentary on all orders, or if a minimum order value threshold (e.g., free above ₹5,000) applies.
2. **Transit Insurance:**
   - Confirm whether Aurevella maintains a merchant transit insurance agreement covering 100% of order value against loss, theft, or transit damage with designated couriers.
3. **Fulfillment SLAs:**
   - Confirm dispatch SLAs: 2–3 business days for in-stock ready-to-wear models, and 10–14 business days for made-to-order or limited editions.
4. **Packaging Standard:**
   - Confirm whether packaging consists of custom wooden presentation boxes or rigid luxury cardboard presentation boxes with individual dust bags.

### B. Returns & Exchanges
1. **Return Window:**
   - Confirm the 14 calendar day return/exchange window from confirmed carrier delivery date.
2. **Reverse Pickup & Size Exchange:**
   - Confirm offering one complimentary size exchange per order with pre-arranged doorstep reverse courier pickup.
3. **Technical Inspection & Refund SLA:**
   - Confirm the 48-business-hour return technical inspection SLA and 5–7 business day Razorpay bank refund timeline.

### C. Legal, Tax & Corporate Identity
1. **Registered Business Entity:**
   - Provide the registered legal entity name, corporate office address, and registered GSTIN for customer invoicing and Terms of Service.
2. **Support Channels & Concierge:**
   - Confirm operational support email addresses (`concierge@myaurevella.in`, `support@myaurevella.in`, or `marketing@myaurevella.in`).
   - Confirm active operating hours for the WhatsApp concierge (`+91 77280 60447`).
3. **Intellectual Property Sign-Off:**
   - Confirm legal registration status (registered trademark, design registration, or patent pending) regarding the "Interchangeable Heel" locking mechanism.

### D. Private Atelier Consultations
1. **Consultation Format:**
   - Confirm whether Aurevella offers physical showroom/atelier fittings in Mumbai/Delhi or if appointments are conducted digitally via WhatsApp Concierge.

---

## 4. Provider Dashboard Secret Rotation Checklist (Pre-Launch)

Before production release, the following external credential variables must be generated and rotated directly within their respective provider dashboards. **Values must never be committed to Git or stored in shared repositories.**

| Credential Variable Name | Provider Dashboard / Service | Rotation Requirement |
|:---|:---|:---|
| `RAZORPAY_KEY_ID` | Razorpay Dashboard (`rzp_live_...`) | Generate dedicated Live mode API key. Test mode keys (`rzp_test_...`) must not be used for live commerce. |
| `RAZORPAY_KEY_SECRET` | Razorpay Dashboard | Generated alongside the live Key ID; keep securely in production server environment. |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay Dashboard > Webhooks | Set up webhook endpoint (`https://api.myaurevella.in/api/v1/payments/webhook`) and generate secret. |
| `MONGODB_URI` | MongoDB Atlas / Managed Cluster | Dedicated production database user with least-privilege credentials, network IP access list, and TLS enabled. |
| `JWT_SECRET` | Production Server Environment | Cryptographically secure high-entropy string (minimum 64 characters / 256 bits). |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Google Cloud Console / Firebase Console | Dedicated production service account JSON key stored at an absolute path outside the repo (e.g., `/home/<user>/secrets/aurevella-firebase.json`). |
| `ADMIN_SEED_PASSWORD` | Initial Admin Setup | Use a unique complex passphrase for initial seeding; rotate immediately upon first admin login. |
