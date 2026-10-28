# AUREVELLA — Luxury Footwear E-Commerce Platform

Direct-to-consumer (D2C) luxury footwear platform offering Italian-inspired elegance, handcrafted in India, under the brand philosophy *"Luxury, Reimagined."* Built with a modern, decoupled three-tier architecture featuring bespoke interchangeable heel craftsmanship, server-authoritative checkout, and cryptographic payment verification.

---

## 🏛️ Architecture & Stack Overview

- **Frontend**: React 19, Vite 6, Tailwind CSS v4, Lucide React, React Hook Form, Zod.
- **Backend API**: Node.js (ES modules), Express, Mongoose 8, Razorpay SDK, Firebase Admin SDK.
- **Database**: MongoDB Atlas Replica Set (strictly required for ACID multi-document transactions during inventory operations).
- **Identity Provider**: Firebase Authentication (Email/Password & Google OAuth) on the client, exchanging verified ID tokens for backend `httpOnly`, `SameSite=Lax` JWT session cookies.
- **Payment Gateway**: Razorpay (Orders API, HMAC SHA-256 cryptographic verification, atomic single-document state claim, and idempotent webhooks).
- **Core Currency Principle**: **All monetary amounts across the database, APIs, and business calculations are stored and processed strictly as integer PAISE (1 INR = 100 paise)**. Rupees (₹) are derived client-side for presentation only.

---

## 📁 Repository Directory Structure

```text
AureVeLla/
├── backend/
│   ├── scripts/
│   │   ├── checkEnv.js                 # Environment variable configuration checker
│   │   ├── migratePaymentIdIndex.js    # Safe sparse unique index migration for payments
│   │   ├── seedTestDB.js               # Isolated test database seeder
│   │   ├── testOfflineMock.js          # In-memory fail-closed Razorpay mock verifier
│   │   ├── testPhase5.js               # Phase 5 payment regression suite
│   │   ├── testPhase6_1.js             # Phase 6.1 catalogue & variant regression suite
│   │   ├── testPhase6_2.js             # Phase 6.2 payment isolation & ACID transaction suite
│   │   ├── testPhase7.js               # Phase 7 checkout & order history regression suite
│   │   ├── testPhase11.js              # Phase 11 secure admin dashboard & order management suite
│   │   ├── testPhase14.js              # Phase 14 authentication lifecycle & route guard suite
│   │   ├── testSeedAdminSafety.js      # Admin seeder safety guards & schema validation suite
│   │   └── testLoop2Hardening.js       # Multi-origin CORS, rate limiters & error masking suite
│   ├── src/
│   │   ├── config/
│   │   │   ├── corsOrigins.js          # Multi-origin parser & allowed origin resolver
│   │   │   ├── db.js                   # Mongoose connection & URI parser
│   │   │   ├── firebase.js             # Firebase Admin SDK initialization
│   │   │   └── razorpay.js             # Razorpay SDK instance & offline test double factory
│   │   ├── controllers/
│   │   │   ├── address.controller.js   # Customer address book handlers
│   │   │   ├── admin.controller.js     # Atelier executive stats, product CRUD & fulfillment
│   │   │   ├── auth.controller.js      # Session exchange, user profile & logout handlers
│   │   │   ├── order.controller.js     # Server quotes & order creation handlers
│   │   │   ├── payment.controller.js   # Payment creation, verification & webhooks
│   │   │   └── product.controller.js   # Product catalogue & category handlers
│   │   ├── middleware/
│   │   │   ├── adminAuth.js            # Admin authorization guard
│   │   │   ├── auth.js                 # JWT authenticate & authorizeAdmin guards
│   │   │   ├── csrfGuard.js            # Custom X-Aurevella-Request & Origin header defense
│   │   │   ├── errorHandler.js         # Production-safe error masking & centralized logging
│   │   │   ├── rateLimiter.js          # Tiered rate limiting with payment webhook exemption
│   │   │   ├── sanitize.js             # NoSQL query injection sanitizer
│   │   │   └── validate.js             # Zod request schema validator
│   │   ├── models/
│   │   │   ├── Address.js              # Indian postal format customer addresses
│   │   │   ├── Category.js             # Product categories schema
│   │   │   ├── Order.js                # Immutable orders, item snapshots & payment history
│   │   │   ├── Product.js              # Footwear models, pricing in paise & inventory
│   │   │   └── User.js                 # Authenticated customers & admin roles
│   │   ├── routes/
│   │   │   ├── admin.routes.js         # Protected administrative metrics, product & order routes
│   │   │   ├── auth.routes.js          # Session, profile & authentication routes
│   │   │   ├── order.routes.js         # Quote calculation & order creation routes
│   │   │   ├── payment.routes.js       # Razorpay orders, callback verification & webhook
│   │   │   ├── product.routes.js       # Product listing, filtering & category routes
│   │   │   └── user.routes.js          # Customer saved address routes
│   │   ├── services/
│   │   │   └── paymentInventory.service.js # Shared atomic payment gate & inventory deduction
│   │   ├── utils/
│   │   │   ├── orderPricing.js         # Integer paise price calculation engine
│   │   │   ├── seedAdmin.js            # Initial administrator provisioning script
│   │   │   └── seedProducts.js         # Launch footwear models seeder
│   │   └── app.js                      # Express middleware pipeline & security configuration
│   ├── .env.example                    # Backend environment template
│   ├── package.json                    # Backend dependencies & npm test scripts
│   └── server.js                       # HTTP server entrypoint
├── frontend/
│   ├── public/
│   │   ├── .htaccess                   # Apache/LiteSpeed SPA rewrite fallback for Hostinger
│   │   ├── brand/                      # Official client logos, circular marks & icons
│   │   ├── images/products/            # 1:1 client footwear launch photography
│   │   ├── robots.txt                  # Search engine crawler policies
│   │   └── sitemap.xml                 # XML sitemap index of canonical brand pages
│   ├── scripts/
│   │   └── layout-check.mjs            # Playwright headless browser layout & form audit
│   ├── src/
│   │   ├── components/
│   │   │   ├── AppShell.jsx            # Header, drawer navigation, footer & focus trap
│   │   │   ├── BagDrawer.jsx           # Slide-over shopping bag drawer
│   │   │   ├── Logo.jsx                # Responsive luxury brand mark & wordmark
│   │   │   ├── ProductCard.jsx         # 1:1 aspect ratio footwear presentation card
│   │   │   └── ProtectedRoute.jsx      # Role & authentication route wrapper
│   │   ├── config/
│   │   │   └── firebase.js             # Firebase client SDK initialization
│   │   ├── context/
│   │   │   ├── AuthContext.jsx         # Session synchronization & auth state provider
│   │   │   └── BagContext.jsx          # Shopping bag state & localStorage provider
│   │   ├── data/
│   │   │   └── products.js             # Trusted client product registry & fallback
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   │   ├── AdminDashboard.jsx  # Top-level executive portal with tabs & status badges
│   │   │   │   ├── AdminOverview.jsx   # Business metrics, revenue, low stock & orders pipeline
│   │   │   │   ├── AdminProducts.jsx   # Product catalogue table, stock edit & creation modal
│   │   │   │   └── AdminOrders.jsx     # Orders table, customer dossiers & fulfillment progression
│   │   │   ├── Account.jsx             # Profile management & order history navigation
│   │   │   ├── BagPage.jsx             # Dedicated shopping bag page
│   │   │   ├── Checkout.jsx            # Multi-step bespoke checkout & Razorpay modal
│   │   │   ├── ForgotPassword.jsx      # Password reset recovery request screen
│   │   │   ├── Home.jsx                # Luxury editorial homepage & storytelling
│   │   │   ├── Login.jsx               # Email/password & Google login with auto-reset
│   │   │   ├── Orders.jsx              # Customer orders register & payment retry
│   │   │   ├── PlaceholderPage.jsx     # Luxury fallback template for upcoming sections
│   │   │   ├── ProductDetail.jsx       # Complete responsive product detail page (PDP)
│   │   │   ├── Shop.jsx                # Footwear catalogue with category & sort filters
│   │   │   └── Signup.jsx              # Customer registration screen
│   │   ├── utils/
│   │   │   ├── api.js                  # Centralized fetch client with CSRF headers
│   │   │   └── useDocumentTitle.js     # Accessible dynamic document title hook
│   │   ├── App.jsx                     # Route definitions & application providers
│   │   └── main.jsx                    # React 19 DOM root mount
│   ├── .env.example                    # Frontend environment template
│   ├── package.json                    # Frontend dependencies & build scripts
│   └── vite.config.js                  # Vite bundler configuration with Tailwind CSS v4
├── docs/                               # Comprehensive project architectural specifications
│   └── archive/                        # Historical phase logs & visual/UX audit reports
├── .gitignore                          # Strict secret, log, and build output exclusions
└── README.md                           # Master project documentation
```

---

## 🌐 Implemented Frontend Routes

| Route | Page Component | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `/` | `Home.jsx` | Public | Luxury brand showcase, brand narrative, 3 featured silhouettes, and concierge links. |
| `/shop` | `Shop.jsx` | Public | Footwear catalogue, category filtering (`All`, `Interchangeable Heel`, `Flat Slide`), and sorting. |
| `/product/:id`, `/shop/:id` | `ProductDetail.jsx` | Public | Full Product Detail Page (PDP) with responsive layout, size selector, and Add-to-Bag flow. |
| `/bag`, `/cart` | `BagPage.jsx` | Public | Dedicated shopping bag page with quantity modification and line totals. |
| `/checkout` | `Checkout.jsx` | Authenticated | Multi-step checkout: address selection, server quote engine, and Razorpay payment modal. |
| `/orders` | `Orders.jsx` | Authenticated | Customer orders register showing commissioned pairs, payment receipts, and retry actions. |
| `/account` | `Account.jsx` | Authenticated | Profile overview, name/phone editing, and secure session logout. |
| `/admin`, `/admin/*` | `AdminDashboard.jsx` | Admin (`role: 'admin'`) | Dedicated Atelier Admin Dashboard: live executive stats, product catalogue CRUD, and order fulfillment progression. |
| `/login` | `Login.jsx` | Public | Email/password & Google sign-in with automatic form reset on mount/unmount. |
| `/signup` | `Signup.jsx` | Public | Customer account registration. |
| `/forgot-password` | `ForgotPassword.jsx`| Public | Single-use password reset email submission. |
| `/collections` | `PlaceholderPage.jsx` | Public | Curated seasonal capsule release preview. |
| `/limited-edition` | `PlaceholderPage.jsx` | Public | Numbered limited drop series preview. |
| `/about` | `PlaceholderPage.jsx` | Public | Atelier heritage & craftsmanship notes. |
| `/contact` | `PlaceholderPage.jsx` | Public | Atelier concierge contact advisory with direct WhatsApp link. |
| `/privacy`, `/terms`| `PlaceholderPage.jsx` | Public | Privacy policy and client terms placeholders. |
| `/shipping-policy` | `PlaceholderPage.jsx` | Public | White-glove insured delivery policy placeholder. |
| `/returns-policy` | `PlaceholderPage.jsx` | Public | Sizing exchange and return guidelines placeholder. |
| `*` | `PlaceholderPage.jsx` | Public | Luxury 404 Not Found error page with home redirection. |

---

## 🔌 Backend REST API Catalog

### Authentication (`/api/auth`)
- `POST /api/auth/session` — Verifies Firebase ID token, upserts user, issues `httpOnly` secure session cookie.
- `GET /api/auth/me` — Returns current authenticated user record (re-queried from DB on each request).
- `PUT /api/auth/profile` — Updates customer name and contact phone number.
- `POST /api/auth/logout` — Invalids session by clearing the `httpOnly` cookie.

### Product Catalogue (`/api/products`, `/api/categories`)
- `GET /api/products` — Lists active products with category filtering and allowlisted sorting.
- `GET /api/products/:idOrSlug` — Retrieves single active footwear model by Mongo ObjectId or unique slug.
- `GET /api/categories` — Retrieves active product categories ordered by display hierarchy.

### Customer Addresses (`/api/users`)
- `GET /api/users/addresses` — Retrieves saved shipping addresses belonging strictly to `req.user._id`.
- `POST /api/users/addresses` — Validates and creates a new Indian shipping address (PIN code & phone regex).

### Commissioned Orders (`/api/orders`)
- `POST /api/orders/quote` — Recalculates subtotal, shipping fees, and order totals strictly from database prices in integer paise.
- `POST /api/orders` — Creates order with immutable line item and address snapshots in `pending_payment` status.
- `GET /api/orders` — Retrieves authenticated customer's historical orders (tenant-isolated).
- `GET /api/orders/:idOrNumber` — Retrieves detailed breakdown for a specific commissioned order.

### Payments (`/api/payments`)
- `POST /api/payments/create-order` — Generates official Razorpay Order ID for an order in `pending_payment`.
- `POST /api/payments/verify` — Verifies cryptographic HMAC SHA-256 signature, validates capture/amount with gateway, claims order state atomically (`pending_payment` $\rightarrow$ `processing`), and decrements inventory.
- `POST /api/payments/webhook` — Provider-to-server raw body webhook handler with signature verification.

### Administrative Management (`/api/admin`) — *Requires `authenticate` & `authorizeAdmin`*
- `GET /api/admin/ping` — Admin-only authorization check confirming `role: 'admin'`.
- `GET /api/admin/stats` — Executive analytics: total verified revenue from paid orders, orders breakdown by status, product count, low-stock watchlist ($\le 5$ units), patron count, and recent 5 orders.
- `GET /api/admin/products` — Paginated product catalogue management with query search, category filtering, and status filtering.
- `GET /api/admin/products/:idOrSlug` — Retrieves full product attributes by ObjectId, unique code, or slug.
- `POST /api/admin/products` — Creates product with server-side Zod validation (integer `pricePaise`, category existence check, unique slug and code).
- `PUT /api/admin/products/:id` — Updates permitted product attributes (title, pricePaise, categoryId, description, images, stockQuantity, isActive, priority).
- `PATCH /api/admin/products/:id/stock` — Atomic stock adjustment with non-negative integer validation.
- `GET /api/admin/orders` — Paginated customer orders list with status filtering and live search across order number, customer name, phone, and Razorpay payment ID.
- `GET /api/admin/orders/:idOrNumber` — Full order dossier with customer snapshot, shipping destination, line items, and tamper-resistant payment verification record.
- `PATCH /api/admin/orders/:idOrNumber/fulfillment` — Strict state machine progression (`paid` $\rightarrow$ `processing` $\rightarrow$ `shipped` $\rightarrow$ `delivered`, or `cancelled`).
  - **Payment Security Policy**: Admin endpoints **NEVER** allow setting status to `paid` (strictly reserved for Razorpay verification). Razorpay payment details (`razorpayPaymentId`, `paidAt`) are immutable and protected against tampering.

### System & Health Probes
- `GET /api/health` — Public server and database connectivity health probe.

---

## 🔐 Environment Variables

Environment files (`.env`) contain secrets and infrastructure configuration. They are excluded from version control via `.gitignore`. Never commit or expose `.env` values.

### Backend (`backend/.env`)
| Variable | Description |
| :--- | :--- |
| `PORT` | Listening port for Express HTTP server (e.g. `5000` or host `$PORT`) |
| `NODE_ENV` | Environment mode (`development` or `production`) |
| `CLIENT_URL` | Primary allowed origin for CORS and CSRF guards (e.g. `https://myaurevella.in`) |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed origins (e.g. `https://myaurevella.in,https://www.myaurevella.in,http://localhost:5173`) |
| `TRUST_PROXY` | Reverse-proxy hop count or trust flag (`true`, `false`, or hop count) for IP resolution & rate limiting |
| `MONGODB_URI` | MongoDB Atlas replica set connection string (`mongodb+srv://...`) |
| `MONGODB_TEST_URI` | Dedicated local test database URI (`127.0.0.1:27017/aurevella_test`) |
| `JWT_SECRET` | Cryptographic secret for signing session tokens (min 32 characters) |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Path to Firebase Admin service account JSON file (optional if inline vars set) |
| `FIREBASE_PROJECT_ID` | Firebase project identifier |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin service account email |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin private key |
| `RAZORPAY_KEY_ID` | Razorpay API key ID (`rzp_test_...` or `rzp_live_...`) |
| `RAZORPAY_KEY_SECRET` | Razorpay API key secret |
| `RAZORPAY_WEBHOOK_SECRET` | Dedicated Razorpay webhook signature secret |
| `ADMIN_SEED_EMAIL` | Optional initial admin email for seed script |
| `ADMIN_SEED_PASSWORD` | Optional initial admin password for seed script |
| `ADMIN_SEED_NAME` | Optional initial admin display name |

### Frontend (`frontend/.env`)
| Variable | Description |
| :--- | :--- |
| `VITE_API_URL` | Base URL of backend API (e.g. `http://localhost:5000` or `https://api.myaurevella.in`) |
| `VITE_FIREBASE_API_KEY` | Firebase web client API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase web auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET`| Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Cloud Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase web application ID |

---

## 🏃 Local Setup & Development

### 1. Prerequisites
- **Node.js**: v20+ LTS (Tested on v24.15.0)
- **npm**: v10+ (Tested on v12.0.0)
- **Git**: v2+ (Tested on v2.55.0)
- **MongoDB**: Local MongoDB community service at `127.0.0.1:27017` or Atlas replica set.

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env and supply your local or sandbox configuration
node scripts/checkEnv.js
npm run seed:products   # Seeds launch footwear models and categories
npm run dev             # Starts backend with nodemon on port 5000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env and point VITE_API_URL to your backend
npm run dev             # Starts Vite development server at http://localhost:5173
```

---

## 🧪 Testing & Verification Suites

The repository contains automated verification suites for responsive layout, fail-closed offline payment isolation, and database regression:

### 1. Headless Browser Layout & Form Audit (Frontend)
Executes Playwright across 19 routes on 5 responsive viewports (360px, 390px, 768px, 1024px, 1440px), checking for horizontal overflow, broken images, touch target sizing, CLS, and form lifecycle cleanups:
```bash
cd frontend
npm run check:layout
```

### 2. Standalone In-Memory Razorpay Mock Suite (Backend)
Verifies fail-closed behavior without network or database dependencies:
```bash
cd backend
node scripts/testOfflineMock.js
```

### 3. Isolated Local Regression Suites (Backend)
Runs against dedicated local database `127.0.0.1:27017/aurevella_test` with offline payment test doubles:
```bash
cd backend
npm run test:phase5         # 17/17 tests: payment creation, verification & refunds
npm run test:phase6-1       # 18/18 tests: catalogue browsing, category filters & stock bounds
npm run test:phase6-2       # 33/33 tests: payment gateway isolation, ACID transactions & concurrency
npm run test:phase7         # 15/15 tests: bespoke checkout flow, quotes & address isolation
npm run test:phase11        # 37/37 tests: secure admin dashboard, product CRUD & order fulfillment
npm run test:phase14        # 27/27 tests: authentication lifecycle, user state & route protection
npm run test:admin-safety   # 10/10 tests: admin seeder safety guards & real Mongoose schema validations
npm run test:hardening      # 16/16 tests: multi-origin CORS, rate limiters & error masking
```

---

## 🚀 Deployment Considerations (Hostinger)

1. **SPA Route Fallback**:
   [`frontend/public/.htaccess`](frontend/public/.htaccess) contains the Apache/LiteSpeed URL rewrite rules. When deploying `frontend/dist/` to Hostinger's `public_html/`, direct page refreshes on `/shop`, `/checkout`, `/account`, `/orders`, and `/admin` will properly serve `index.html`.
2. **Subdomain Architecture**:
   Because backend authentication tokens use `httpOnly`, `SameSite=Lax` cookies, the Express API must be mapped via DNS to a subdomain of the production domain (e.g. `api.myaurevella.in`).
3. **ACID Transaction Requirement**:
   In production (`NODE_ENV=production`), the payment inventory service requires a MongoDB replica set (`ReplicaSetWithPrimary`). Standard MongoDB Atlas clusters (M0 free tier and above) satisfy this requirement.

---

## ⚠️ Known Limitations & Current Scope

- **Shopping Bag Persistence**: The shopping cart operates using browser `localStorage` (`aurevella_bag`). Cross-device database cart synchronization (`/api/cart`) is reserved for a future phase.
- **Policy Copy**: Static legal routes (`/privacy`, `/terms`, `/shipping-policy`, `/returns-policy`, `/about`, `/contact`) render luxury placeholder screens awaiting finalized client copy.
- **Live Payment Gateway Sandbox**: Payment workflows are verified using automated in-memory test doubles and local test database simulations; manual browser checkout with live `rzp_test_...` sandbox credentials has not yet been executed.
