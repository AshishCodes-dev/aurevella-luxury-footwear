# Project Requirements: AUREVELLA

> **Purpose**: Defines the functional, non-functional, and operational requirements for the AUREVELLA luxury footwear e-commerce platform.  
> Serves as the authoritative scope and baseline for technical implementation, testing, and client sign-off.

- **Last updated**: October 22, 2026  
- **Status**: Draft v1.1

---

## 1. Overview and Business Goals

**AUREVELLA** is a direct-to-consumer (D2C) brand offering Italian-inspired elegance, handcrafted in India, under the brand philosophy *"Luxury, Reimagined."*

### Key Business Goals
1. Establish a refined digital boutique reflecting luxury handcrafted footwear, bespoke customization, and elite brand positioning.
2. Provide seamless, secure e-commerce capabilities from product discovery to digital payment fulfillment.
3. Enable administrative autonomy for managing product catalogues, variant inventories, limited-edition runs, and customer orders.
4. Maintain a foundation flexible enough to expand into adjacent categories (such as home décor) in subsequent growth phases.

### Core Currency Principle
- **All monetary values across the entire platform (database, APIs, business calculations) are stored and computed strictly as integer PAISE (1 INR = 100 paise)**. Conversion to Rupees (₹) is executed client-side for visual presentation only.

---

## 2. User Roles & Access Hierarchy

| Role | Description | Access Permissions |
| :--- | :--- | :--- |
| **Guest / Visitor** | Unauthenticated public visitor exploring the brand. | Browse catalogue, view product details, maintain local browser cart, contact brand via forms/WhatsApp/Instagram. Must authenticate to checkout. |
| **Customer** | Authenticated consumer with a registered account. | Manage profile and shipping addresses, maintain persistent synchronized cart, complete online payments, view order history and fulfillment statuses, request cancellations before shipping. |
| **Admin** | Authorized store administrator provisioned via backend CLI seed script. | Full access to product catalog management, categories, collections, variant pricing/inventory control, order status tracking, refunds, and inquiry review. |

---

## 3. Functional Requirements

### Area A: Authentication & User Accounts
- **FR-1**: User Registration — Customers can register with first name, last name, email address, and password.  
  *Acceptance Criterion*: Valid credentials create a new customer record with hashed password; duplicate emails are rejected with a 409 conflict status.
- **FR-2**: User Authentication — Customers and administrators can log in using email and password.  
  *Acceptance Criterion*: Valid credentials issue an httpOnly, Secure session JWT cookie; invalid attempts return a generic 401 unauthorized response.
- **FR-3**: User Logout — Authenticated users can terminate their active session.  
  *Acceptance Criterion*: Invoking logout clears the authentication cookie on the client and terminates server-side session validity.
- **FR-4**: Customer Profile Management — Authenticated customers can view and edit their name and contact number.  
  *Acceptance Criterion*: Profile updates save to the database and reflect immediately without requiring re-login.
- **FR-5**: Shipping Address Book — Customers can save, view, edit, and delete multiple shipping addresses with one marked default.  
  *Acceptance Criterion*: Address edits validate postal code and state, and save snapshots to active customer profiles.
- **FR-6**: Password Security — Customer passwords must contain a minimum of 8 characters, including at least one uppercase letter and one number.  
  *Acceptance Criterion*: Frontend and backend validate password complexity before accepting registration or update requests.

### Area B: Product Catalogue & Discovery
- **FR-7**: Catalogue Browsing — Visitors can browse all active footwear items grouped by categories and collections.  
  *Acceptance Criterion*: Catalogue displays product cards with primary image, title, starting price (`basePricePaise`), and available colors/sizes.
- **FR-8**: Category & Collection Filtering — Visitors can filter items by category (e.g., Heels, Flats `[ASSUMPTION - confirm with client]`) and collection.  
  *Acceptance Criterion*: Filtering updates the displayed product grid dynamically without a full-page reload.
- **FR-9**: Product Detail Page (PDP) — Visitors can view full specifications, multi-angle imagery, handcrafted details, and size guide.  
  *Acceptance Criterion*: PDP renders image gallery, description, craftsmanship notes, price in INR, and variant selector (size and colour).
- **FR-10**: Real-Time Variant Selection — Selecting a specific size and colour combination dynamically updates SKU stock status and price override (`priceOverridePaise`, if defined).  
  *Acceptance Criterion*: Out-of-stock size/colour combinations display a disabled state and prevent cart addition.
- **FR-11**: Extensible Taxonomy `[ASSUMPTION]` — Footwear is the initial product line, but categories are defined in a generic category model allowing future expansions (e.g., Home Décor). `[OPEN]`  
  *Acceptance Criterion*: Adding non-footwear products requires only selecting or creating a new category without code modification.
- **FR-12**: Brand Aesthetic Compliance — Product presentations adhere strictly to a dark luxury palette (#0F0A09 background, #2E1814 brown, #CFC9BA ivory).  
  *Acceptance Criterion*: High-resolution product images stand out against dark backdrops without conflicting contrast or visual clutter.

### Area C: Special Collections (Limited Edition & Customization)
- **FR-13**: Limited Edition Collection — Products flagged as Limited Edition display a distinct luxury badge and optional production batch limit (`totalBatchLimit`).  
  *Acceptance Criterion*: Limited Edition PDP highlights exclusivity and stops accepting orders once the batch limit is exhausted via atomic reservation counters.
- **FR-14**: Customization Engine `[OPEN]` — Products configured for bespoke customization allow customers to select custom options before adding to cart.  
  *Acceptance Criterion*: Customization options (e.g., colour selection, initials engraving `[OPEN]`) attach directly to the line item.
- **FR-15**: Flexible Customization Schema — Customization attributes must be dynamically configurable per product in the database without code refactoring.  
  *Acceptance Criterion*: Admin can define input types (dropdown, colour swatch, text field) and price surcharges in paise (`priceDeltaPaise`) per custom option.
- **FR-16**: Customization Order Snapshot — Selected customization choices must be permanently snapshotted in the order document.  
  *Acceptance Criterion*: Subsequent edits to product customization options do not alter historical orders.

### Area D: Shopping Cart & Guest Browsing
- **FR-17**: Cart Operations — Customers can add items with selected size, colour, quantity, and customization notes to their cart.  
  *Acceptance Criterion*: Adding an item increments quantity or creates a new distinct line item if variant or customization differs.
- **FR-18**: Cart Item Management — Customers can modify item quantities and remove items from the cart slide-over / page.  
  *Acceptance Criterion*: Cart calculates line totals, item counts, and subtotal in paise dynamically on each change.
- **FR-19**: Persistent Database Cart — Authenticated customer carts persist across browser sessions and devices.  
  *Acceptance Criterion*: Logging in on a new device restores previously added active cart items from the database.
- **FR-20**: Cart Inventory Pre-Check — Cart inspects variant available stock (`stock - reservedQuantity`) before letting user proceed to checkout.  
  *Acceptance Criterion*: If an item is no longer available in the requested quantity, a clear notification displays and checkout is disabled.

### Area E: Checkout & Payment Processing
- **FR-21**: Mandatory Customer Authentication `[ASSUMPTION]` — Checkout requires customers to log in or create an account; no guest checkout is permitted.  
  *Acceptance Criterion*: Unauthenticated users attempting checkout are directed to login/register and returned to checkout upon authentication.
- **FR-22**: Address Selection & Snapshot — Customer selects an existing saved address or enters a new shipping address during checkout.  
  *Acceptance Criterion*: The finalized shipping address is copied directly into the order record as an immutable snapshot.
- **FR-23**: Server-Authoritative Price Calculation — All order totals, subtotals, shipping fees `[OPEN]`, and applicable taxes `[OPEN]` are computed exclusively on the backend in integer paise.  
  *Acceptance Criterion*: Client-submitted prices or totals are completely ignored by the backend API.
- **FR-24**: Online Payment Integration & Atomic Stock Reservation — Customer initiates payment via Razorpay checkout interface in INR.  
  *Acceptance Criterion*: Backend creates an official Razorpay Order ID and atomically reserves variant stock for 15 minutes `[ASSUMPTION]`; if any item has insufficient stock, the entire cart checkout fails.
- **FR-25**: Payment Verification & Idempotency — Backend verifies Razorpay cryptographic HMAC SHA-256 signature and webhook before confirming order.  
  *Acceptance Criterion*: A single shared atomic routine updates `paymentStatus` to `paid`, sets `orderStatus` to `placed`, consumes reserved stock, and ignores duplicate callback/webhook replays.
- **FR-26**: Online Payment Only `[ASSUMPTION]` — Online digital payments (Cards, UPI, Netbanking, Wallets via Razorpay) are the only supported payment method. Cash on Delivery (COD) is reserved for a future phase.  
  *Acceptance Criterion*: Checkout displays Razorpay online payment option with placeholder data schema for future payment methods.

### Area F: Order History & Tracking
- **FR-27**: Order Confirmation — Upon successful payment verification, customer is directed to an order success screen showing the order summary and order number.  
  *Acceptance Criterion*: Order success screen renders unique order number, itemized products, shipping address snapshot, and paid total.
- **FR-28**: Customer Order History — Authenticated customers can view a list of all their historical and active orders.  
  *Acceptance Criterion*: Order list renders chronological records with status badge, date, total amount, and link to detailed breakdown.
- **FR-29**: Order Status Lifecycle — Orders transition through predefined statuses (`pending_payment`, `placed`, `processing`, `shipped`, `delivered`, `cancelled`, `expired`).  
  *Acceptance Criterion*: Each transition appends an entry to the order status history array with timestamp, actor (customer/admin/system), and notes. Note: `crafting` status is only included if the client confirms pairs are made to order `[OPEN]`.
- **FR-30**: Order Receipt / Summary View — Customers can inspect an itemized receipt including variant details and customization specifications.  
  *Acceptance Criterion*: Detailed order view shows exact product variant snapshots, customization selections, payment reference, and tracking details.

### Area G: Admin Administration
- **FR-31**: Protected Admin Dashboard — Administrative routes and APIs are strictly restricted to users with the `admin` role.  
  *Acceptance Criterion*: Non-admin users attempting access receive a 403 Forbidden response and are redirected away.
- **FR-32**: Product Catalogue Management — Admins can create, update, deactivate, and delete products.  
  *Acceptance Criterion*: Creating/editing a product validates all required fields, descriptions, craftsmanship specifications, and category associations.
- **FR-33**: Variant & Inventory Management — Admins can manage sizes, colours, SKUs, and stock quantities per variant.  
  *Acceptance Criterion*: Inventory updates adjust stock levels immediately; setting stock to 0 disables purchasing for that variant.
- **FR-34**: Limited Edition Controls — Admins can designate a product as Limited Edition, set total available batch limits, and toggle badge visibility.  
  *Acceptance Criterion*: Limited Edition flag and batch counters save to the product document and update store badges.
- **FR-35**: Order Management Portal — Admins can view all orders across all customers with filtering by status and date.  
  *Acceptance Criterion*: Portal lists orders with search by Order ID or customer email, and displays payment verification identifiers.
- **FR-36**: Order Fulfillment Update — Admins can update order status (e.g., mark as `processing`, `shipped`, `delivered`) and add tracking numbers.  
  *Acceptance Criterion*: Status update persists to order history and updates customer-facing tracking immediately.

### Area H: General & Brand Engagement
- **FR-37**: Homepage Experience — Highlights brand history, hero showcase ("Luxury, Reimagined."), featured footwear, limited releases, and artisanal craftsmanship narrative.  
  *Acceptance Criterion*: Homepage renders luxury aesthetic with optimized image assets, serif typography, and clear calls to action.
- **FR-38**: Contact & Concierge Form — Visitors can submit inquiries through a luxury contact section.  
  *Acceptance Criterion*: Inquiries validate name, email, subject, and message, and store in the database for admin review.
- **FR-39**: Social & Direct Concierge Links — Homepage and footer provide direct, verified links to official WhatsApp concierge and Instagram profile.  
  *Acceptance Criterion*: WhatsApp link opens chat with prefilled luxury concierge greeting; Instagram link opens in a new tab with security attributes (`rel="noopener noreferrer"`).
- **FR-40**: Responsive Design — Seamless browsing across all viewports (mobile, tablet, desktop, 4K displays).  
  *Acceptance Criterion*: Navigation transitions into a clean mobile drawer on screens < 768px with full accessibility.

### Area I: Extended Platform Features (v1.1 Additions)
- **FR-41**: Password Reset & Recovery — Customers can request a password reset via email.  
  *Acceptance Criterion*: System generates a cryptographically hashed single-use token expiring in 30 minutes `[ASSUMPTION]`; generic response returned regardless of email existence to prevent user enumeration.
- **FR-42**: Guest Cart Browsing & Login Merging — Visitors can add items to their cart without being logged in.  
  *Acceptance Criterion*: Guest cart is stored locally in browser storage and automatically merged into the customer's database cart upon successful login; checkout requires authentication `[ASSUMPTION]`.
- **FR-43**: Customer Order Cancellation — Customers can cancel an order before dispatch (while status is `placed` or `processing`, subject to client policy `[OPEN]`).  
  *Acceptance Criterion*: Valid cancellation transitions order status to `cancelled`, restores physical inventory (`stock += quantity`), and queues or processes refund.
- **FR-44**: Admin Cancellation & Refund Processing — Admins can cancel orders and issue full or partial refunds via Razorpay Refund API.  
  *Acceptance Criterion*: Admin triggers refund with specified amount in paise; Razorpay refund API executes, payment status updates to `refunded` or `partially_refunded`, and stock is restored if unfulfilled.
- **FR-45**: Admin Category Taxonomy CRUD — Admins can create, edit, reorder, and deactivate product categories.  
  *Acceptance Criterion*: Category updates reflect immediately in storefront navigation and filter menus.
- **FR-46**: Admin Collection CRUD & Batch Controls — Admins can create and edit editorial collections, assign products, and configure Limited Edition batch caps and counters.  
  *Acceptance Criterion*: Batch limits are enforced atomically during checkout reservation.
- **FR-47**: Admin Customization Blueprint Management — Admins can configure custom option schemas (option codes, labels, input types, and price surcharges in paise).  
  *Acceptance Criterion*: Configured schema attaches to designated products and renders appropriate customer input fields on PDP.
- **FR-48**: Admin Product Media Upload — Admins can upload product photography via a secure signed upload flow (Cloudinary `[OPEN]`) or validated server upload.  
  *Acceptance Criterion*: Upload validates image MIME types, inspects file buffers, optimizes asset, and saves HTTPS URL to product document.
- **FR-49**: Transactional Email Notifications — System dispatches automated transactional emails for order confirmation, password reset, and dispatch notifications.  
  *Acceptance Criterion*: Emails send reliably upon trigger events via selected email service provider `[OPEN]`.
- **FR-50**: Mandatory Legal & Compliance Pages — Store provides accessible static pages for Privacy Policy, Terms and Conditions, Shipping Policy, Return and Refund Policy, and Contact Details.  
  *Acceptance Criterion*: Legal pages render in footer links and comply with payment gateway compliance standards; legal copy is supplied by client `[OPEN]`.

---

## 4. Non-Functional Requirements

### 4.1 Security
- **NFR-1**: Passwords must be hashed using `bcrypt` (work factor 12) before database storage, and the password field must be excluded from default query projections (`select: false`).
- **NFR-2**: Authentication session tokens (JWT) must be delivered via `httpOnly`, `Secure`, `SameSite=Lax` cookies scoped to an authorized domain/subdomain to prevent XSS exfiltration.
- **NFR-3**: All payment callbacks and webhooks must be verified server-side using Razorpay HMAC SHA-256 signatures before fulfilling orders.
- **NFR-4**: API endpoints must enforce strict input sanitization, parameterized queries via Mongoose to prevent NoSQL injection, and rate limiting on sensitive routes (auth, payments).
- **NFR-13**: CSRF protection must be enforced on all state-changing endpoints via custom HTTP header validation (`X-Aurevella-Request: 1`) and Origin/Referer matching.

### 4.2 Performance
- **NFR-5**: Initial page load time must not exceed 2.0 seconds on standard 4G/broadband connections.
- **NFR-6**: Product imagery must be modern-format web-optimized (WebP/AVIF) with lazy-loading applied to below-the-fold assets.
- **NFR-7**: Database queries on products, orders, and users must use indexed keys (SKU, category, customer ID, order number) to achieve sub-50ms query execution.

### 4.3 Responsive & Viewport
- **NFR-8**: Mobile-first design architecture supporting standard screen viewports (360px up to 1920px+).
- **NFR-9**: Touch targets on interactive elements (buttons, variant swatches, inputs) must be at least 44px × 44px on mobile devices.
- **NFR-10**: Fluid typography and spacing maintaining proportion across all desktop and handheld resolutions.

### 4.4 Browser Support & Compatibility
- **NFR-11**: Full compatibility with evergreen browsers: Google Chrome, Apple Safari (iOS & macOS), Mozilla Firefox, Microsoft Edge (latest 2 versions).
- **NFR-12**: Graceful fallback for CSS features and serif system fonts if external typography fails to load.

---

## 5. Out of Scope (Current Phase)

The following capabilities are excluded from Phase 0–8 and reserved for future strategic roadmap phases:
1. **Guest Checkout**: Not permitted in initial release; accounts required for luxury customer care and order history `[ASSUMPTION]`.
2. **Cash on Delivery (COD)**: Excluded in initial release; digital prepaid payment only `[ASSUMPTION]`.
3. **Multi-Vendor Marketplace**: The platform is dedicated exclusively to the AUREVELLA brand.
4. **Native Mobile Apps (iOS/Android)**: Web platform only (responsive PWA-ready architecture).
5. **International Currency & Cross-Border Logistics**: Initial deployment focuses on domestic Indian market (INR ₹) until international shipping partners are established `[OPEN]`.
6. **Automated Third-Party Logistics API Integration (Shiprocket/Delhivery)**: Tracking numbers will be entered manually by admins in Phase 3/7.

---

## 6. Open Questions for Client

The following questions require formal client clarification. They are formatted clearly for direct review by the client:

| Ref # | Category | Client Question in Simple Language | Impact if Unconfirmed |
| :--- | :--- | :--- | :--- |
| **Q-1** | **Hosting Plan** | *Which specific Hostinger hosting plan do you currently own? (e.g., Premium Shared Web Hosting, Business Web Hosting, Cloud Startup, or VPS?)* `[OPEN]` | Determines whether the backend Node.js API can run directly on Hostinger or if a separate Node host mapped to an `api.` subdomain is required. |
| **Q-2** | **Customization** | *What specific customization options do you want to offer your customers? (e.g., Colour selection, custom initials/monogram engraving, lining colour, or bespoke sizing?)* `[OPEN]` | We designed a flexible per-product model, but knowing exact options helps configure realistic initial templates and pricing surcharges. |
| **Q-3** | **Product Scope** | *Will the store sell footwear exclusively at launch (e.g. Heels and Flats `[ASSUMPTION]`), or do you also want to list home décor items or accessories right away?* `[OPEN]` | We have set up a flexible category structure by default `[ASSUMPTION]`, but product taxonomy and navigation menus will reflect your answer. |
| **Q-4** | **Shipping Fees** | *What is your shipping policy? Will shipping be free on all orders, free above a certain order value, or a fixed delivery charge per order?* `[OPEN]` | Needed for the server-side price calculation logic during checkout. |
| **Q-5** | **Tax & GST** | *Are your product prices already inclusive of GST, or should GST be calculated and added as a separate line item at checkout?* `[OPEN]` | Determines checkout calculation breakdown and receipt line items. |
| **Q-6** | **Delivery Regions** | *Where will you deliver? Nationwide across all Indian PIN codes, or restricted to specific major cities/states initially?* `[OPEN]` | Needed to implement postal code validation during checkout. |
| **Q-7** | **Return & Cancellation** | *What is your policy regarding order cancellations before shipping, and returns/exchanges, especially for handcrafted or customized pairs?* `[OPEN]` | Required for customer cancellation buttons, legal policy pages, and post-purchase customer guidance. |
| **Q-8** | **High-Res Images** | *Do you have final high-resolution product photography and brand assets (including the original dark brown circle logo file)?* `[OPEN]` | Required to finalize theme hex codes and optimize media loading performance. |
| **Q-9** | **Crafting Lifecycle Status** | *Are your shoes made to order upon purchase, or are finished pairs maintained in stock for immediate dispatch?* `[OPEN]` | If shoes are made to order, we will activate the `crafting` status in the order lifecycle; otherwise, standard `processing -> shipped` is used. |
| **Q-10** | **Transactional Email** | *Which email delivery service would you prefer for sending order receipts and password reset emails? (Options: Resend, SendGrid, Amazon SES [VERIFY before quoting to client])?* `[OPEN]` | Necessary to configure transactional email dispatch. |
| **Q-11** | **Legal Policy Copy** | *Can you provide your legal policy text (Privacy Policy, Terms & Conditions, Shipping Policy, Return & Refund Policy)?* `[OPEN]` | Mandatory for storefront footer and payment gateway merchant account activation. |
| **Q-12** | **Backups & Hosting Reliability** | *Would you like to budget for dedicated database backups and production hosting tiers with high availability SLA [VERIFY before quoting to client]?* `[OPEN]` | Free-tier databases (e.g. Atlas free tier) do not include automated daily backup snapshots or high-concurrency SLAs. |

---

## Changelog v1.1
- **Money Unit Standard**: Standardized all monetary attributes and calculations to integer PAISE (`basePricePaise`, `priceOverridePaise`, `priceDeltaPaise`, etc.).
- **Unified Status Enums**: Aligned order statuses to `pending_payment`, `placed`, `processing`, `shipped`, `delivered`, `cancelled`, `expired`. Added `crafting` as an `[OPEN]` item dependent on client confirmation.
- **Stock Reservation Model**: Integrated 15-minute atomic stock reservation on checkout initiation (`create-order`) and documented refund handling for expired late payments.
- **Guest Cart & Account Recovery**: Added FR-41 (Password Reset) and FR-42 (Guest Cart browsing and automatic merging upon customer login).
- **Order Lifecycle & Refunds**: Added FR-43 (Customer Cancellation before shipping) and FR-44 (Admin Cancellation and Razorpay Refund API processing).
- **Taxonomy, Collections & Media**: Added FR-45 (Category CRUD), FR-46 (Collection CRUD with batch caps), FR-47 (Customization Blueprint CRUD), and FR-48 (Admin Media Upload).
- **Communication & Compliance**: Added FR-49 (Transactional Emails) and FR-50 (Mandatory Legal & Policy Pages).
- **Removed Invented Details**: Removed fabricated product and category names; utilized neutral footwear placeholders ("Heels", "Flats" marked as `[ASSUMPTION]`).
