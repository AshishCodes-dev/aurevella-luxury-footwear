# Architecture Specification: AUREVELLA

> **Purpose**: Documents the system design, communication architecture, REST API design, and component responsibilities for AUREVELLA.  
> Outlines the deployment topology, technology trade-offs, and phased execution roadmap.

- **Last updated**: October 22, 2026  
- **Status**: Draft v1.2

---

## 1. System Overview & Architecture Diagram

AUREVELLA is engineered as a decoupled, modern three-tier client-server web architecture leveraging JavaScript ES modules across the entire stack. Identity authentication is delegated to Firebase Authentication (supporting Email/Password and Google OAuth), while authorization roles, sessions, product catalogs, and transactional data reside strictly in MongoDB.

```mermaid
flowchart LR
    subgraph Client Tier
        User([Customer / Admin])
        Browser["React 19 + Vite SPA\n(Tailwind CSS v4, Zero-Motion)"]
        LocalCart[(Local Storage\nGuest Cart)]
    end

    subgraph Identity & Third-Party Tier
        FirebaseAuth["Firebase Authentication\n(Identity Provider: Email/Pass & Google)"]
        Razorpay["Razorpay Payment Gateway\n(Orders API, Refunds & Webhooks)"]
        MediaStore["Media Storage\n(Cloudinary / Disk) [OPEN]"]
        EmailService["Transactional Email\n(Resend/SendGrid/SES) [OPEN]"]
    end

    subgraph Application Tier
        ExpressAPI["Node.js + Express API\n(Helmet, Morgan, CORS, Cookie-Parser)"]
        RawWebhook["express.raw()\n/api/payments/webhook"]
        JSONParser["express.json()\nStandard Routes"]
    end

    subgraph Data Tier
        MongoDB[(MongoDB Atlas Replica Set\nMongoose ODM)]
    end

    User -->|Interacts| Browser
    Browser <-->|Sign in / ID Token| FirebaseAuth
    Browser <-->|Guest Cart Sync| LocalCart
    Browser -->|HTTPS / ID Token to /session\n(httpOnly Secure Cookies)| ExpressAPI
    ExpressAPI -->|Verify ID Token| FirebaseAuth
    ExpressAPI --> RawWebhook
    ExpressAPI --> JSONParser
    ExpressAPI -->|Transactions / Atomic Updates| MongoDB
    ExpressAPI -->|Create Order / Verify HMAC / Refunds| Razorpay
    ExpressAPI -->|Upload / Fetch Images| MediaStore
    ExpressAPI -->|Dispatch Order & Auth Emails| EmailService
    Razorpay -.->|Server Webhook Event (Raw JSON)| RawWebhook
```

### Core Currency Principle
- **All monetary calculations and stored attributes represent integer PAISE (1 INR = 100 paise)**. All API requests and responses carry amounts with the `Paise` suffix (e.g., `totalAmountPaise`). Rupees are derived on the client strictly for formatted UI display.

---

## 2. Layer Responsibilities & Middleware Ordering

### 2.1 Frontend Single Page Application (SPA)
- **Role**: Presentational and interactive client running in the user's browser.
- **Technologies**: React 19, Vite, Tailwind CSS v4.
- **Responsibilities**:
  - Render responsive luxury UI conforming to brand guidelines.
  - Manage guest cart in browser storage; initiate merge to database cart upon login.
  - Mount Razorpay Checkout modal for customer payment capture.
  - Transmit custom CSRF verification header (`X-Aurevella-Request: 1`) on all mutating requests.
  - Display prices converted from paise to rupees (`₹ (paise / 100).toLocaleString('en-IN')`).

### 2.2 Backend Application Programming Interface (API)
- **Role**: Business logic enforcement, security boundary, and transactional coordinator.
- **Technologies**: Node.js v24+, Express v4/v5, Mongoose v8.
- **Responsibilities**:
  - Authenticate requests, parse secure JWTs from cookies, re-fetch user from DB on every protected request for immediate role/revocation enforcement.
  - Enforce server-side pricing, atomic stock reservations, and order state transitions.
  - Coordinate payment verification via a unified atomic routine shared between callbacks and webhooks.
  - Sanitize all inbound requests and return standardized JSON responses.

### 2.3 Express Middleware Pipeline & Critical Ordering
The Express pipeline must mount raw body parsing for payment webhooks **prior** to generic JSON parsing:

```text
1. helmet()                        # Standard defensive security headers
2. cors(corsOptions)               # Strict origin matching to CLIENT_URL
3. cookie-parser()                 # Parse signed/secure cookies
4. express.raw({ type: ... })      # MOUNTED FIRST on /api/payments/webhook for HMAC signature verification
5. express.json()                  # MOUNTED SUBSEQUENTLY for all standard JSON API routes
6. express.urlencoded()            # Form parsing
7. custom CSRF header guard        # Enforce X-Aurevella-Request header on mutating requests
8. morgan()                        # Request logging (never logging PII or secrets)
9. API Router mounting             # /api/auth, /api/products, /api/payments, etc.
10. 404 Handler                    # Catch-all route not found
11. Central Error Handler          # Global error interception, sanitize stacks in production
```

```text
backend/src/
├── app.js               # Express application configuration & ordered middleware pipeline
├── server.js            # Entry point initializing db connection and HTTP listener
├── config/              # Infrastructure clients (db.js connection, Razorpay client instance)
├── controllers/         # Business logic handlers (auth, products, orders, payments, admin)
├── middleware/          # Security filters (authenticate, authorizeAdmin, csrfGuard, rateLimiter)
├── models/              # Mongoose schemas (User, Product, ProductVariant, StockReservation, Order, Payment)
├── routes/              # Express Router definitions binding endpoints to controller handlers
└── utils/               # Pure helper utilities (price calculation, token issuance, seedAdmin)
```

---

## 3. Planned REST API Endpoints

### 3.1 Authentication & User Routes (`/api/auth`)
| Method | Path | Access Level | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/session` | Public | Verify Firebase ID token, upsert MongoDB user record, issue backend httpOnly JWT cookie. |
| `POST` | `/api/auth/logout` | Authenticated | Invalidate session by clearing httpOnly JWT cookie. |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current user profile and role (re-queried from DB on each request). |
| `PUT` | `/api/auth/profile` | Customer / Admin | Update personal name and contact phone number. |
| `POST` | `/api/auth/addresses` | Customer | Add a new shipping address to user profile. |
| `PUT` | `/api/auth/addresses/:id` | Customer | Update an existing shipping address. |
| `DELETE`| `/api/auth/addresses/:id` | Customer | Delete a saved shipping address. |

> *Note*: Customer password registration, login, and password reset are handled client-side via Firebase Authentication (email/password & Google). The backend verifies Firebase ID tokens and maintains its own secure session cookies.

### 3.2 Product & Collection Routes (`/api/products`, `/api/collections`, `/api/categories`)
| Method | Path | Access Level | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/products` | Public | List published products with optional category/collection filtering. |
| `GET` | `/api/products/:slug` | Public | Get single product detail by slug with variants and custom options. |
| `GET` | `/api/collections` | Public | List all active collections (e.g., Limited Edition, Sample Collection). |
| `GET` | `/api/collections/:slug` | Public | Get specific collection details and associated product list. |
| `GET` | `/api/categories` | Public | List available product categories (e.g., Heels, Flats `[ASSUMPTION]`). |

### 3.3 Shopping Cart Routes (`/api/cart`)
| Method | Path | Access Level | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/cart` | Customer | Fetch current authenticated customer's persistent cart. |
| `POST` | `/api/cart/items` | Customer | Add variant item with quantity and customization options to cart. |
| `POST` | `/api/cart/merge` | Customer | Merge local browser guest cart items into database cart upon login. |
| `PUT` | `/api/cart/items/:itemId` | Customer | Update quantity of a line item in cart. |
| `DELETE`| `/api/cart/items/:itemId` | Customer | Remove specific line item from cart. |
| `DELETE`| `/api/cart` | Customer | Clear all items from current cart. |

### 3.4 Order & Checkout Routes (`/api/orders`)
| Method | Path | Access Level | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/orders` | Customer | Retrieve historical orders for logged-in customer. |
| `GET` | `/api/orders/:id` | Customer | Retrieve detailed order breakdown by ID (includes `orderStatus` and `paymentStatus`). |
| `POST` | `/api/orders/:id/cancel` | Customer | Cancel order before dispatch (`placed` / `processing`); releases or restores stock `[OPEN]`. |

### 3.5 Payment Routes (`/api/payments`)
| Method | Path | Access Level | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/payments/create-order` | Customer | Atomically reserve stock for 15 min and generate Razorpay Order ID. |
| `POST` | `/api/payments/verify` | Customer | Client callback calling shared `finalizeOrderPayment` to verify HMAC signature. |
| `POST` | `/api/payments/webhook` | Public (Verified) | Server-to-server webhook (raw body) calling shared `finalizeOrderPayment`. |

### 3.6 Admin Routes (`/api/admin`)
| Method | Path | Access Level | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/products` | Admin | Retrieve all products (including drafts and deactivated). |
| `POST` | `/api/admin/products` | Admin | Create a new product with base details and media. |
| `PUT` | `/api/admin/products/:id` | Admin | Update product information, description, and status. |
| `DELETE`| `/api/admin/products/:id` | Admin | Deactivate or remove a product. |
| `POST` | `/api/admin/products/:id/variants`| Admin | Add size, colour, SKU, and stock variant to product. |
| `PUT` | `/api/admin/products/:id/variants/:variantId` | Admin | Update variant stock, pricing override in paise, and active state. |
| `POST` | `/api/admin/categories` | Admin | Create a new category. |
| `PUT` | `/api/admin/categories/:id` | Admin | Update category details or display order. |
| `DELETE`| `/api/admin/categories/:id` | Admin | Deactivate or delete category. |
| `POST` | `/api/admin/collections` | Admin | Create an editorial collection (including Limited Edition). |
| `PUT` | `/api/admin/collections/:id` | Admin | Update collection banner, description, or batch cap. |
| `DELETE`| `/api/admin/collections/:id` | Admin | Deactivate or delete collection. |
| `GET` | `/api/admin/customization-options` | Admin | List all customization schemas. |
| `POST` | `/api/admin/customization-options` | Admin | Create new customization schema blueprint. |
| `PUT` | `/api/admin/customization-options/:id` | Admin | Update customization schema blueprint. |
| `DELETE`| `/api/admin/customization-options/:id` | Admin | Deactivate customization schema blueprint. |
| `POST` | `/api/admin/media/sign-upload` | Admin | Generate secure signed upload parameters for Cloudinary `[OPEN]`. |
| `GET` | `/api/admin/orders` | Admin | List all store orders with status and date filters. |
| `GET` | `/api/admin/orders/:id` | Admin | View comprehensive order details, snapshots, and payment ID. |
| `PUT` | `/api/admin/orders/:id/status` | Admin | Update order lifecycle status and tracking courier reference. |
| `POST` | `/api/admin/orders/:id/cancel` | Admin | Administrative order cancellation; restores stock. |
| `POST` | `/api/admin/orders/:id/refund` | Admin | Issue full or partial refund via Razorpay Refund API. |
| `GET` | `/api/admin/inquiries`| Admin | List contact submissions for admin concierge response. |
| `PUT` | `/api/admin/inquiries/:id/status` | Admin | Update status of customer inquiry (`new`, `in_progress`, `resolved`). |
| `GET` | `/api/admin/ping` | Admin | Health and authorization ping for administrative testing. |

### 3.7 General & System (`/api/contact`, `/api/health`)
| Method | Path | Access Level | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Return server health status and MongoDB connection state. |
| `POST` | `/api/contact` | Public | Receive customer contact form inquiry and store in database. |

---

## 4. Key Architectural Flows

### 4.1 Firebase Identity, Session Exchange & Lifecycle
```text
1. User authenticates on frontend via Firebase Authentication (email/password or Google OAuth).
2. Firebase client returns user credentials; browser calls user.getIdToken().
3. Frontend dispatches POST /api/auth/session with { idToken } and header X-Aurevella-Request: 1.
4. Express auth controller verifies ID token via firebase-admin:
   const decodedToken = await admin.auth().verifyIdToken(idToken);
5. Controller upserts MongoDB user:
   a) Matches by firebaseUid, OR matches by email if decodedToken.email_verified === true.
   b) If email matches existing record with different firebaseUid and email_verified is false:
      reject with 409 Conflict ("Email exists. Verify email before linking.").
   c) New users created with role: 'customer' (roles are strictly in MongoDB; client role ignored).
6. Express signs its own JWT containing { userId: user._id, role: user.role } with JWT_SECRET:
   - Customer Session Lifetime: 7 days [ASSUMPTION].
   - Admin Session Lifetime: 24 hours [ASSUMPTION].
7. Express sets httpOnly, Secure (in production), SameSite=Lax cookie 'token'.
8. Frontend AuthContext receives user metadata; calls Firebase client signOut() to avoid state drift.
9. On every subsequent authenticated request, middleware reads cookie and re-queries DB
   user record to guarantee immediate role updates and revocation enforcement.
```

### 4.2 Checkout, Stock Reservation & Payment Verification Flow
```text
Phase 1: Checkout Initiation & Atomic Stock Reservation
1. Customer initiates checkout on /checkout.
2. Frontend sends POST /api/payments/create-order with selected shipping address ID.
3. Backend starts a MongoDB multi-document transaction (supported on Atlas replica sets):
   a) Recalculates subtotalPaise from database prices for all cart items.
   b) Verifies and reserves stock for every variant:
      ProductVariant.updateOne(
        { _id: item.variantId, $expr: { $gte: [{ $subtract: ["$stock", "$reservedQuantity"] }, item.quantity] } },
        { $inc: { reservedQuantity: item.quantity } }
      )
      * If modifiedCount === 0 for any item, abort transaction; return 400 "Insufficient stock".
   c) If product belongs to Limited Edition collection with totalBatchLimit:
      Collection.updateOne(
        { _id: collId, $expr: { $gte: [{ $subtract: ["$totalBatchLimit", { $add: ["$batchReservedCount", "$batchSoldCount"] }] }, item.quantity] } },
        { $inc: { batchReservedCount: item.quantity } }
      )
      * If modifiedCount === 0, abort transaction; return 400 "Limited Edition batch limit reached".
   d) Generates unique orderNumber via atomic counters collection.
   e) Creates Order document with orderStatus: "pending_payment", paymentStatus: "pending".
   f) Creates StockReservation documents with status: "active", expiresAt: now + 15 minutes [ASSUMPTION].
   g) Commits MongoDB transaction.
4. Backend calls Razorpay API: razorpay.orders.create({ amount: totalAmountPaise, currency: "INR", receipt: orderNumber }).
5. Order updated with razorpayOrderId. Backend responds with { razorpayOrderId, amountPaise, keyId, orderNumber }.

Phase 2: Payment Execution & Verification
6. Frontend launches Razorpay modal; customer completes payment.
7. Razorpay modal returns { razorpay_order_id, razorpay_payment_id, razorpay_signature }.
8. Frontend sends credentials to POST /api/payments/verify. In parallel, Razorpay sends webhook to POST /api/payments/webhook.
9. BOTH endpoints delegate execution to ONE shared atomic function: finalizeOrderPayment(orderId, paymentData, isWebhook).

Phase 3: The Atomic Payment Finalization Gate
10. Verification Checks:
    a) Verify HMAC SHA-256 signature against RAZORPAY_KEY_SECRET (for /verify) or RAZORPAY_WEBHOOK_SECRET (for webhook).
    b) For /verify, verify order belongs to logged-in user.
    c) Verify paymentData.amountPaise === order.totalAmountPaise.
    d) Verify paymentData.currency === "INR".
    e) Verify razorpay_order_id matches order.razorpayOrderId.
11. ATOMIC GATE:
    Order.findOneAndUpdate(
      { _id: orderId, paymentStatus: "pending" },
      { 
        $set: { 
          paymentStatus: "paid", 
          orderStatus: "placed",
          "paymentDetails.razorpayPaymentId": razorpay_payment_id,
          "paymentDetails.method": paymentData.method
        },
        $push: { statusHistory: { status: "placed", timestamp: new Date(), actor: "system" } }
      },
      { new: true }
    )
    * If modifiedCount === 0 (or returned doc is null): Order was ALREADY finalized by the concurrent callback/webhook!
      Return current order status immediately (idempotent no-op; avoid double stock decrement).
12. If update succeeded:
    a) In a transaction, consume stock:
       ProductVariant.updateOne({ _id: item.variantId }, { $inc: { stock: -item.quantity, reservedQuantity: -item.quantity } })
       Collection.updateOne({ _id: collId }, { $inc: { batchSoldCount: item.quantity, batchReservedCount: -item.quantity } })
       StockReservation.updateMany({ order: orderId }, { $set: { status: "consumed" } })
    b) Clear customer's database cart.
    c) Record payment in `payments` collection with unique partial index on razorpayPaymentId.
    d) Dispatch order confirmation transactional email via background worker.

Phase 4: Late-Payment Edge Case (Payment Captured After Reservation Expired)
13. If order was marked "expired" (15-min timeout elapsed, stock reservations released back to pool):
    a) Attempt to re-reserve stock:
       ProductVariant.updateOne(
         { _id: item.variantId, $expr: { $gte: [{ $subtract: ["$stock", "$reservedQuantity"] }, item.quantity] } },
         { $inc: { stock: -item.quantity } }
       )
    b) If re-reservation succeeds -> fulfill order, mark orderStatus: "placed", paymentStatus: "paid".
    c) If re-reservation fails (stock was taken by another buyer during delay):
       - Mark orderStatus: "cancelled", paymentStatus: "refunded", flag "needs_attention: true".
       - Automatically trigger Razorpay Refund API (full refund for totalAmountPaise).
       - Notify admin concierge and send explanatory email to customer.
```

---

## 5. Media & Image Storage Strategy `[OPEN]`

| Dimension | Option 1: Cloudinary (Recommended) | Option 2: Local Server Disk |
| :--- | :--- | :--- |
| **Storage Location** | Global Cloudinary CDN & storage bucket. | Hosting server file system (`/uploads` directory). |
| **Cost** | Free tier (verify limits before quoting to client) `[OPEN]`. | Included with hosting plan storage space. |
| **Performance** | Extremely fast; delivered via global edge CDN. Automatic WebP/AVIF format optimization. | Bound to server bandwidth and physical server location. |
| **Backup & Resilience**| High; images persist independently of application server redeployments or container resets. | Fragile; server migration or redeployment requires manual backup and transfer of media folder. |
| **Trade-off Summary** | **Best for luxury visual fidelity and speed.** Stateless server architecture. | Simple to configure if plan permits disk writes, but slower page loads for customers. |

---

## 6. Deployment Architecture Decision Matrix `[OPEN]`

> **Subdomain Architecture Requirement**: Because authentication tokens are delivered via `httpOnly`, `SameSite=Lax` cookies, the Express API **must** be deployed on a subdomain of the client's registered domain (e.g., `https://api.aurevella.com` where frontend is `https://aurevella.com`). If a host does not permit mapping custom subdomains with valid SSL certificates, cross-origin cookie authentication will fail and the auth strategy must be revisited.

| Option | Architecture Layout | Feasibility & Hosting Requirements | Advantages | Considerations |
| :--- | :--- | :--- | :--- | :--- |
| **Option A: Unified Hostinger** | Both React static build and Node.js Express API hosted directly on Hostinger. | Requires a Hostinger VPS or Cloud Startup plan with Node.js runtime support `[OPEN]`. | Single hosting provider, single billing account, simplified domain mapping. | Incompatible with standard Hostinger Shared Web Hosting plans that only support PHP/static. |
| **Option B: Decoupled Hosting (Hybrid)** | Frontend static files hosted on Hostinger; Backend API hosted on a dedicated Node host (e.g., Render, Railway, VPS). | Works with **any** Hostinger plan. Backend host **must** be mapped to `api.<clientdomain>` via DNS CNAME. | Flexible; enables specialized backend runtime with auto-restart, logging, and free TLS. | Requires configuring DNS subdomain pointing to backend host and strict CORS. |
| **Option C: Managed Cloud PaaS** | Frontend deployed to global Edge CDN (Vercel/Cloudflare); Backend on Node host; Hostinger domain pointed via DNS. | Domain stays on Hostinger; hosting moves to specialized developer platforms. Backend host mapped to `api.<clientdomain>`. | Highest performance, global caching, automated CI/CD directly from GitHub. | Client's existing hosting storage is unused; billing might incur separate services later if scaling. |

### Note on Backups and Hosting Reliability `[OPEN]`
- **Free Tier Limitations [VERIFY before quoting to client]**: Free database tiers (e.g., MongoDB Atlas M0 free tier) do not include automated daily point-in-time backups, have connection and storage limits, and lack high-availability SLAs. Free backend hosting instances may experience cold starts (sleeping) that disrupt incoming Razorpay webhooks. Budgeting for dedicated production infrastructure must be confirmed with the client `[OPEN]`.

---

## 7. Phased Implementation Roadmap (Phases 1–8)

| Phase | Milestone Name | Primary Focus & Deliverable Goal |
| :--- | :--- | :--- |
| **Phase 1** | **Authentication & Design Foundation** | Establish brand luxury design tokens, zero-motion styling, self-hosted fonts, Firebase Auth (email/password + Google) + backend session cookie auth, user profile, and admin ping. |
| **Phase 2** | **Homepage & App Shell** | Complete responsive homepage, hero showcase, craftsmanship narrative, social concierge links, and full storefront layout. |
| **Phase 3** | **Product Catalogue & Admin** | Implement product model, variant inventory management, categories, customer-facing catalogue browsing, filtering, and admin product/stock management portal. |
| **Phase 4** | **Cart & Checkout Architecture** | Build persistent database-backed customer cart, guest cart merging, 15-min stock reservation engine, and multi-step checkout screen. |
| **Phase 5** | **Razorpay Payments** | Integrate Razorpay Orders API, client modal, shared `finalizeOrderPayment` verification, raw body webhook parser, idempotent order processing, and refund APIs. |
| **Phase 6** | **Limited Edition & Customization** | Build Limited Edition badges with batch reservation caps, and deploy flexible per-product bespoke customization engine. |
| **Phase 7** | **Testing & Security Hardening** | Execute full negative testing suite, CSRF header checks, rate limiting, NoSQL injection audit, OWASP security hardening, and performance optimization. |
| **Phase 8** | **Hostinger Production Deployment** | Configure production environment, build static frontend assets, deploy backend according to agreed deployment architecture on `api.` subdomain, point client domain, verify SSL and live payment processing. |

---

## Changelog v1.2
- **Firebase Authentication Identity Integration**: Integrated Firebase Authentication as client-side identity provider (Email/Password and Google OAuth). Browser exchanges Firebase ID token for backend `httpOnly` session cookie via `POST /api/auth/session`.
- **Backend Role Isolation**: Removed backend bcrypt password hashing and public registration/login endpoints; roles (`customer`, `admin`) reside exclusively in MongoDB and are never accepted from Firebase or client payloads.
- **Account Linking by Email**: Enforced account linking by email only when Firebase ID token indicates `email_verified: true`, returning 409 Conflict otherwise to prevent identity hijack.
- **Admin Ping Route**: Added `GET /api/admin/ping` for automated testing of admin RBAC guards.
- **Roadmap Realignment**: Updated Phase 1 scope to Authentication + Design Foundation, and Phase 2 to Homepage + App Shell.

---

## Changelog v1.1
- **Money Unit Standard**: Standardized all monetary figures to integer PAISE (`amountPaise`, `totalAmountPaise`, `subtotalPaise`).
- **Unified Status Enums**: Updated all architectural diagrams and flows to use `pending_payment`, `placed`, `processing`, `shipped`, `delivered`, `cancelled`, `expired` for orders, and `pending`, `paid`, `failed`, `refunded`, `partially_refunded` for payments.
- **Stock Reservation Architecture**: Designed 15-minute atomic stock reservation within MongoDB replica set transactions during checkout initiation (`create-order`), with automatic release on cancel/expiry and consumption on payment.
- **Single Payment Gate**: Unified `/verify` and `/webhook` into a single shared atomic `finalizeOrderPayment` handler utilizing atomic `findOneAndUpdate` on `{ paymentStatus: 'pending' }` to eliminate race conditions.
- **Raw Webhook Parser**: Documented mandatory `express.raw()` body parsing mounted before `express.json()` for cryptographic Razorpay webhook signature validation.
- **Subdomain Cookie Architecture**: Specified the requirement for hosting the API on a subdomain (`api.<clientdomain>`) to enable `SameSite=Lax` cookie authentication.
- **Extended Endpoints Catalog**: Added admin CRUD for categories, collections, customization schemas, image upload, order cancellation, refunds, and customer password reset.
- **Removed Fabricated Content**: Eliminated all unconfirmed product names, category labels, and claims in favor of neutral, client-aligned specifications.
