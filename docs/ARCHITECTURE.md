# Architecture Specification: AUREVELLA

> **Purpose**: Documents the system design, communication architecture, REST API design, and component responsibilities for AUREVELLA.  
> Outlines the deployment topology, technology trade-offs, and phased execution roadmap.

- **Last updated**: October 22, 2026  
- **Status**: Draft v1

---

## 1. System Overview & Architecture Diagram

AUREVELLA is engineered as a decoupled, modern three-tier client-server web architecture leveraging JavaScript ES modules across the entire stack.

```mermaid
flowchart LR
    subgraph Client Tier
        User([Customer / Admin])
        Browser["React 19 + Vite SPA\n(Tailwind CSS v4)"]
    end

    subgraph Application Tier
        ExpressAPI["Node.js + Express API\n(Helmet, Morgan, CORS, Cookie-Parser)"]
    end

    subgraph Data & Third-Party Tier
        MongoDB[(MongoDB Atlas\nMongoose ODM)]
        Razorpay["Razorpay Payment Gateway\n(Orders API & Webhooks)"]
        MediaStore["Media Storage\n(Cloudinary / Disk) [OPEN]"]
    end

    User -->|Interacts| Browser
    Browser -->|HTTPS / REST API\n(httpOnly Secure Cookies)| ExpressAPI
    ExpressAPI -->|Mongoose Queries| MongoDB
    ExpressAPI -->|Create Order / Verify HMAC| Razorpay
    ExpressAPI -->|Upload / Fetch Images| MediaStore
    Razorpay -.->|Server Webhook Event| ExpressAPI
```

---

## 2. Layer Responsibilities

### 2.1 Frontend Single Page Application (SPA)
- **Role**: Presentational and interactive layer executed client-side in the user's browser.
- **Technologies**: React 19, Vite, Tailwind CSS v4.
- **Responsibilities**:
  - Render responsive UI according to brand luxury design guidelines.
  - Manage client state (active cart view, authenticated user session state, variant selections).
  - Communicate with backend Express API via asynchronous `fetch` calls.
  - Mount Razorpay Checkout modal for customer payment capture.
  - Perform client-side format validation to give instantaneous feedback to users.

### 2.2 Backend Application Programming Interface (API)
- **Role**: Business logic enforcement, security gateway, and transactional coordinator.
- **Technologies**: Node.js v24+, Express v4/v5, Mongoose v8.
- **Responsibilities**:
  - Authenticate requests, parse secure JWTs from cookies, and enforce role-based access control.
  - Execute business rules: calculate prices server-side, check and decrement inventory atomically.
  - Communicate securely with external APIs (Razorpay order creation and signature verification).
  - Sanitize all inbound requests and return standardized JSON responses.

### 2.3 Backend Directory Responsibilities

```text
backend/src/
├── app.js               # Express application configuration, middleware pipeline & error handling
├── config/              # Infrastructure clients (db.js connection, Razorpay client instance)
├── controllers/         # Business logic functions handling requests, validation & responses
├── middleware/          # Reusable filters (auth verification, role guards, validation, rate limiters)
├── models/              # Mongoose schemas enforcing domain rules, validation & indexes
├── routes/              # Express Router definitions binding endpoints to controller handlers
└── utils/               # Pure helper utilities (price calculation, token issuance, error classes)
```

---

## 3. Planned REST API Endpoints

### 3.1 Authentication & User Routes (`/api/auth`)
| Method | Path | Access Level | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new customer account and establish session. |
| `POST` | `/api/auth/login` | Public | Authenticate user credentials and issue secure session cookie. |
| `POST` | `/api/auth/logout` | Authenticated | Invalidate session and clear authentication cookie. |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current user profile and role. |
| `PUT` | `/api/auth/profile` | Customer / Admin | Update personal name and contact number. |
| `POST` | `/api/auth/addresses` | Customer | Add a new shipping address to user profile. |
| `PUT` | `/api/auth/addresses/:id` | Customer | Update an existing shipping address. |
| `DELETE`| `/api/auth/addresses/:id` | Customer | Delete a saved shipping address. |

### 3.2 Product & Collection Routes (`/api/products`, `/api/collections`)
| Method | Path | Access Level | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/products` | Public | List published products with optional category/collection filtering. |
| `GET` | `/api/products/:slug` | Public | Get single product detail by slug with variants and custom options. |
| `GET` | `/api/collections` | Public | List all active collections (e.g., Limited Edition, Heritage). |
| `GET` | `/api/collections/:slug` | Public | Get specific collection details and associated product list. |
| `GET` | `/api/categories` | Public | List available product categories. |

### 3.3 Shopping Cart Routes (`/api/cart`)
| Method | Path | Access Level | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/cart` | Customer | Fetch current authenticated customer's persistent cart. |
| `POST` | `/api/cart/items` | Customer | Add variant item with quantity and customization options to cart. |
| `PUT` | `/api/cart/items/:itemId` | Customer | Update quantity of a line item in cart. |
| `DELETE`| `/api/cart/items/:itemId` | Customer | Remove specific line item from cart. |
| `DELETE`| `/api/cart` | Customer | Clear all items from current cart. |

### 3.4 Order & Checkout Routes (`/api/orders`)
| Method | Path | Access Level | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/orders` | Customer | Retrieve historical orders for logged-in customer. |
| `GET` | `/api/orders/:id` | Customer | Retrieve detailed order breakdown by ID (owned by customer). |

### 3.5 Payment Routes (`/api/payments`)
| Method | Path | Access Level | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/payments/create-order` | Customer | Create official Razorpay Order ID for cart checkout. |
| `POST` | `/api/payments/verify` | Customer | Verify HMAC SHA-256 signature after payment modal completion. |
| `POST` | `/api/payments/webhook` | Public (Verified) | Handle Razorpay asynchronous webhook events (e.g., `payment.captured`). |

### 3.6 Admin Routes (`/api/admin`)
| Method | Path | Access Level | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/products` | Admin | Retrieve all products (including drafts and deactivated). |
| `POST` | `/api/admin/products` | Admin | Create a new product with base details and media. |
| `PUT` | `/api/admin/products/:id` | Admin | Update product information, description, and status. |
| `DELETE`| `/api/admin/products/:id` | Admin | Deactivate or remove a product. |
| `POST` | `/api/admin/products/:id/variants`| Admin | Add size, colour, SKU, and stock variant to product. |
| `PUT` | `/api/admin/products/:id/variants/:variantId` | Admin | Update variant stock, pricing override, and active state. |
| `GET` | `/api/admin/orders` | Admin | List all store orders with status and date filters. |
| `GET` | `/api/admin/orders/:id` | Admin | View comprehensive order details, snapshots, and payment ID. |
| `PUT` | `/api/admin/orders/:id/status` | Admin | Update order lifecycle status and tracking courier reference. |

### 3.7 General & Inquiries (`/api/contact`, `/api/health`)
| Method | Path | Access Level | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Return server health status and MongoDB connection state. |
| `POST` | `/api/contact` | Public | Receive customer contact form inquiry and store in database. |
| `GET` | `/api/admin/inquiries`| Admin | List contact submissions for admin concierge response. |

---

## 4. Key Architectural Flows

### 4.1 Signup & Login Flow
```text
1. User enters email and password into React UI.
2. Frontend sends POST /api/auth/login with credentials.
3. Express controller validates inputs and retrieves user record via Mongoose.
4. Controller compares password hash using bcrypt.compare().
5. On success: Express signs JWT containing { userId, role } using JWT_SECRET.
6. Express sets httpOnly, Secure, SameSite=Lax cookie 'token' in HTTP response header.
7. Frontend receives user profile metadata and updates authentication context.
```

### 4.2 Checkout, Razorpay Payment, Verification & Webhook Flow
```text
1. Customer initiates checkout on /checkout page.
2. Frontend sends POST /api/payments/create-order with selected shipping address ID.
3. Backend fetches customer cart and re-calculates subtotals from active database product prices.
4. Backend verifies that all variants have adequate stock.
5. Backend calls Razorpay API: razorpay.orders.create({ amount: totalInPaise, currency: "INR", receipt: orderId }).
6. Backend creates a pending Order document (status: "Payment Pending") and responds with { razorpayOrderId, amount, keyId }.
7. Frontend opens Razorpay Checkout modal using received credentials.
8. Customer completes payment on Razorpay modal.
9. Razorpay modal returns { razorpay_order_id, razorpay_payment_id, razorpay_signature } to frontend.
10. Frontend immediately posts these credentials to POST /api/payments/verify.
11. Backend generates expected signature: HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id, RAZORPAY_KEY_SECRET).
12. If signature matches:
    a) Backend checks idempotency (ensures order is not already processed).
    b) Atomically updates Order status to "Placed" and links payment details.
    c) Atomically decrements variant stock counts in database.
    d) Empties customer's cart.
    e) Responds with { success: true, orderId }.
13. If user closes browser before step 10: Razorpay Webhook (POST /api/payments/webhook) verifies signature and executes step 12 asynchronously.
```

### 4.3 Admin Product & Variant Creation Flow
```text
1. Admin logs into /admin dashboard.
2. Admin submits product title, category, craftsmanship narrative, and base price via POST /api/admin/products.
3. Backend validates inputs, generates unique URL slug, and stores base Product document.
4. Admin defines variants: adds sizes (e.g. EU 41, 42, 43), leather colours, SKUs, and stock quantities.
5. Admin defines customization options (if applicable) specifying input types, label, and surcharge.
6. Backend persists variants and options, indexing SKUs for fast lookup.
7. Product immediately becomes visible in store catalogue.
```

---

## 5. Media & Image Storage Strategy `[OPEN]`

High-resolution photography is paramount for AUREVELLA luxury footwear. The exact storage mechanism depends on the client's confirmed hosting plan.

### Comparison Table: Image Storage Options
| Dimension | Option 1: Cloudinary (Recommended) | Option 2: Local Server Disk |
| :--- | :--- | :--- |
| **Storage Location** | Global Cloudinary CDN & storage bucket. | Hosting server file system (`/uploads` directory). |
| **Cost** | Free tier (up to 25 credits/month; ~25,000 transformations or 25GB storage/bandwidth). | Included with hosting plan storage space. |
| **Performance** | Extremely fast; delivered via global edge CDN. Automatic WebP/AVIF format optimization. | Bound to server bandwidth and physical server location. |
| **Backup & Resilience**| High; images persist independently of application server redeployments or container resets. | Fragile; server migration or redeployment requires manual backup and transfer of media folder. |
| **Trade-off Summary** | **Best for luxury visual fidelity and speed.** Negligible risk of exceeding free tier during initial launch. | Simple to configure if plan permits disk writes, but slower page loads for customers. |

*Recommendation*: Adopt Cloudinary for automatic format delivery (`f_auto`, `q_auto`), keeping the application server stateless.

---

## 6. Deployment Architecture Decision Matrix `[OPEN]`

The deployment layout depends directly on the client's Hostinger plan details (`[OPEN]` Question Q-1):

| Option | Architecture Layout | Feasibility & Hosting Requirements | Advantages | Considerations |
| :--- | :--- | :--- | :--- | :--- |
| **Option A: Unified Hostinger** | Both React static build and Node.js Express API hosted directly on Hostinger. | Requires a Hostinger VPS or Cloud Startup plan with Node.js runtime support. | Single hosting provider, single billing account, simplified domain mapping. | Incompatible with standard Hostinger Shared Web Hosting plans that only support PHP/static. |
| **Option B: Decoupled Hosting (Hybrid)** | Frontend static files hosted on Hostinger (via domain web root); Backend API hosted on a dedicated Node host (e.g., Render, Railway, or VPS). | Works with **any** Hostinger plan (including basic Shared Hosting). | Flexible; enables specialized backend runtime with auto-restart, logging, and free TLS. | Requires configuring DNS subdomain (e.g. `api.aurevella.com`) pointing to backend host and strict CORS. |
| **Option C: Managed Cloud PaaS** | Frontend deployed to global Edge CDN (Vercel/Cloudflare); Backend on Node host; Hostinger domain pointed via DNS. | Domain stays on Hostinger; hosting moves to specialized developer platforms. | Highest performance, global caching, automated CI/CD directly from GitHub. | Client's existing hosting storage is unused; billing might incur separate services later if scaling. |

*Decision Rule*: Confirm client's specific Hostinger package before committing to Option A or Option B.

---

## 7. Phased Implementation Roadmap (Phases 1–8)

| Phase | Milestone Name | Primary Focus & Deliverable Goal |
| :--- | :--- | :--- |
| **Phase 1** | **Design System & Homepage** | Establish brand luxury visual identity (Tailwind v4 tokens, serif typography, dark palette) and complete responsive homepage, hero narrative, craftsmanship showcase, and social concierge links. |
| **Phase 2** | **Authentication & Accounts** | Implement JWT httpOnly cookie authentication, customer registration, login/logout, profile management, and shipping address book. |
| **Phase 3** | **Product Catalogue & Admin** | Implement product model, variant inventory management, categories, customer-facing catalogue browsing, filtering, and admin product/stock management portal. |
| **Phase 4** | **Cart & Checkout Architecture** | Build persistent database-backed customer cart, line-item customization attachment, order calculation engine, and multi-step checkout screen. |
| **Phase 5** | **Razorpay Payments** | Integrate Razorpay Orders API, client modal popup, cryptographic HMAC signature verification, idempotent order processing, and webhook listeners. |
| **Phase 6** | **Limited Edition & Customization** | Build Limited Edition badges with batch caps, and deploy flexible per-product bespoke customization engine (monograms, leather selection). |
| **Phase 7** | **Testing & Security Hardening** | Execute full negative testing suite, rate limiting, NoSQL injection audit, OWASP security hardening, and performance asset optimization. |
| **Phase 8** | **Hostinger Production Deployment** | Configure production environment, build static frontend assets, deploy backend according to agreed deployment architecture, point client domain, verify SSL and live payment processing. |
