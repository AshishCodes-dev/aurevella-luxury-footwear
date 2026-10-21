# Phase 0A Log: Foundation Setup

## a) Node, npm and git versions
- **Node.js**: `v24.15.0` (LTS 20+)
- **npm**: `12.0.0`
- **Git**: `2.55.0.windows.5`

---

## b) Final folder tree (excluding node_modules)

```text
AureVeLla/
├── .gitignore
├── README.md
├── backend/
│   ├── .env (local, git-ignored)
│   ├── .env.example
│   ├── package-lock.json
│   ├── package.json
│   ├── server.js
│   └── src/
│       ├── app.js
│       ├── config/
│       │   └── db.js
│       ├── controllers/
│       │   └── .gitkeep
│       ├── middleware/
│       │   └── .gitkeep
│       ├── models/
│       │   └── .gitkeep
│       ├── routes/
│       │   └── .gitkeep
│       └── utils/
│           └── .gitkeep
├── docs/
│   ├── .gitkeep
│   └── PHASE_LOG.md
└── frontend/
    ├── .env (local, git-ignored)
    ├── .env.example
    ├── index.html
    ├── package-lock.json
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── index.css
        └── main.jsx
```

---

## c) Every package installed, with versions

### Frontend (`frontend/package.json`)
- **Dependencies**:
  - `react`: `19.3.1`
  - `react-dom`: `19.3.1`
- **DevDependencies**:
  - `vite`: `6.4.5`
  - `@vitejs/plugin-react`: `4.7.0`
  - `tailwindcss`: `4.3.3`
  - `@tailwindcss/vite`: `4.3.3`

### Backend (`backend/package.json`)
- **Dependencies**:
  - `express`: `4.22.3`
  - `mongoose`: `8.24.6`
  - `dotenv`: `16.6.1`
  - `cors`: `2.8.6`
  - `helmet`: `8.3.0`
  - `morgan`: `1.12.1`
- **DevDependencies**:
  - `nodemon`: `3.1.14`

---

## d) Commands run
1. **Environment Check**:
   - `node -v`
   - `npm -v`
   - `git --version`
2. **Directory & File Structure Creation**:
   - `New-Item -ItemType Directory -Force -Path frontend, backend, docs`
   - `New-Item -ItemType Directory -Force -Path src/config, src/models, src/routes, src/controllers, src/middleware, src/utils`
   - `New-Item -ItemType File -Force -Path src/models/.gitkeep, src/routes/.gitkeep, src/controllers/.gitkeep, src/middleware/.gitkeep, src/utils/.gitkeep, docs/.gitkeep`
3. **Dependency Installation**:
   - Frontend: `npm install` inside `frontend/`
   - Backend: `npm install` inside `backend/`
4. **Git Setup & Verification**:
   - `git init -b main`
   - `git remote add origin https://github.com/AshishCodes-dev/aurevella-luxury-footwear.git`
   - `git check-ignore -v backend/.env frontend/.env`
   - `git add .`
   - `git commit -m "Phase 0A: project foundation setup"`
   - `git push -u origin main`
   - `git tag phase-0a`
   - `git push origin phase-0a`
5. **Testing Commands**:
   - Backend server execution: `node server.js`
   - Health endpoint verification: `Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method Get`
   - Frontend development server: `npm run dev -- --host 127.0.0.1 --port 5173`
   - End-to-end integration check: `node -e "..."` verifying HTTP status and JSON health response
   - CORS origin verification: `Invoke-RestMethod` with allowed origin (`http://localhost:5173`) and unauthorized origin (`http://evil-attacker.com`)
   - Production bundle test: `npm run build` inside `frontend/`
   - Git history safety verification: `git log --all --name-only --oneline -- "*.env" "**/.env"` and `git ls-tree -r --name-only HEAD`

---

## e) Test results
- **Backend start & health check (`GET /api/health`)**: PASS — Responds with `{ status: "ok", service: "aurevella-backend", database: "connected", timestamp }`.
- **Frontend start & placeholder UI health status check**: PASS — Placeholder mounts and resolves `Backend: connected` against backend API.
- **CORS policy verification**: PASS — Requests from `http://localhost:5173` succeed; unauthorized origins blocked.
- **Frontend production build (`npm run build`)**: PASS — Built 29 modules cleanly in 460ms.
- **Git cleanliness & history secret isolation**: PASS — Working tree clean, zero `.env` files tracked in Git history or commit tree.

---

## f) Git metadata
- **Last Commit Hash**: `1fc1bc1acd8266f82e038498993eb349f45acc3c` (`1fc1bc1`)
- **Branch**: `main`
- **Remote URL**: `https://github.com/AshishCodes-dev/aurevella-luxury-footwear.git`
- **Tag**: `phase-0a`

---

## g) Skipped, changed from prompt, or unsure about
- **Skipped**: None. All requirements executed completely.
- **Changed from prompt**:
  - In `backend/server.js`, imported `import 'dotenv/config'` to guarantee that environment variables are populated prior to any module resolution in ES modules.
  - In `backend/src/app.js`, dynamically evaluated `process.env.CLIENT_URL` inside the CORS callback to reliably validate browser requests from the frontend client origin.
  - In `frontend/src/index.css`, configured theme tokens (`--color-background`, `--color-brown`, `--color-ivory`) using official Tailwind CSS v4 syntax (`@import "tailwindcss";` and `@theme`).
- **Unsure about**: None.


---

# Phase 0B Log: Planning Documents

## Overview & Tag Audit
- **Tag Correction**: Tag `phase-0a` points to the initial commit (`1fc1bc1acd8266f82e038498993eb349f45acc3c`), prior to report fixes. Tag `phase-0a-verified` was created on the verified foundation HEAD (`af27ca0472e399589a19c52fe1c5fa631fbafba7`) and pushed to the remote repository. The original tag `phase-0a` remains untouched.
- **Application Code Status**: Strictly maintained. No application code in `frontend/` or `backend/` was altered. Changes were restricted to `docs/` and the documentation section of `README.md`.

---

## a) Files Created or Changed (with line counts)

| File Path | Type | Line Count | Description |
| :--- | :--- | :---: | :--- |
| `docs/PROJECT_REQUIREMENTS.md` | Created | 150 | Functional (FR-1 to FR-40), NFRs, user roles, out of scope, client questions. |
| `docs/ARCHITECTURE.md` | Created | 193 | System diagrams, layer responsibilities, REST API catalog, Razorpay flows, deployment table. |
| `docs/DATABASE_SCHEMA.md` | Created | 227 | 11 MongoDB collection schemas, atomic rules, order status lifecycle, ER diagrams. |
| `docs/SECURITY_PLAN.md` | Created | 128 | httpOnly cookie JWT, bcrypt, Razorpay HMAC, rate limiting, threat modeling matrix. |
| `docs/TESTING_PLAN.md` | Created | 111 | Verification checklists (TC, TA, TP, TN, TR, TL), negative tests, bug template, sign-off. |
| `docs/DESIGN_SYSTEM.md` | Created | 133 | Color tokens, Cormorant Garamond / Inter typography, component standards, mobile rules. |
| `docs/README.md` | Created | 16 | Central documentation index and navigation directory. |
| `README.md` | Modified | 121 | Added `## 📚 Documentation` section linking to all specifications in `docs/`. |
| `docs/PHASE_LOG.md` | Modified | -- | Appended Phase 0B execution log and final report. |

---

## b) Every `[OPEN]` Item

1. **`[OPEN]` Hostinger Plan Details**: Which specific Hostinger hosting plan does the client own? (e.g., Shared Web Hosting, Business Web Hosting, Cloud Startup, or VPS?) Determines whether Express Node.js API runs directly on Hostinger or requires a separate Node host.
2. **`[OPEN]` Customization Scope**: What specific customization options do customers receive? (e.g., leather colour selection, custom monogram engraving, lining colour, sole type, or bespoke sizing?). Schema is designed to be configurable per product.
3. **`[OPEN]` Product Scope & Taxonomy**: Will the store launch with footwear exclusively, or also list home décor items or accessories right away? (Instagram shows home décor items).
4. **`[OPEN]` Shipping Fee Structure**: Free shipping nationwide, flat rate, or tiered based on order value?
5. **`[OPEN]` Tax & GST Calculation**: Are prices inclusive of GST, or must GST be computed and displayed as an additional line item at checkout?
6. **`[OPEN]` Delivery Regions**: Pan-India across all pincodes, or restricted to selected states/metros?
7. **`[OPEN]` Return & Refund Policy**: Exact policy details, specifically regarding handcrafted and customized pairs.
8. **`[OPEN]` High-Resolution Brand Assets**: Official vector / high-resolution logo file with the dark brown circular seal to finalize hex tokens.
9. **`[OPEN]` Image Storage Strategy**: Cloudinary free tier vs hosting server local disk (trade-offs documented).
10. **`[OPEN]` Deployment Topology**: Unified Hostinger (Option A) vs Hybrid Decoupled (Option B) vs Cloud PaaS (Option C).

---

## c) Every `[ASSUMPTION]` Item

1. **`[ASSUMPTION]` Online Payment Only**: Razorpay digital payments (UPI, Cards, Netbanking) is the sole initial payment method. Cash on Delivery (COD) is deferred as an optional later feature with placeholder fields maintained in the database schema.
2. **`[ASSUMPTION]` Mandatory Customer Login**: Customers must log in or register an account to complete checkout; no guest checkout is supported initially.
3. **`[ASSUMPTION]` Category Taxonomy Flexibility**: Footwear is the primary launch focus, but the category schema is built generically to accommodate non-footwear luxury goods (e.g. Home Décor) without requiring schema migrations.

---

## d) Contradictions and Risks Identified

1. **Hostinger Shared Hosting vs Node.js Stack**: The client owns Hostinger hosting, but standard shared hosting tiers on Hostinger do not natively support Node.js backend runtimes or persistent background processes. If the plan is shared hosting, architecture must use Option B (decoupled frontend on Hostinger, backend on dedicated Node host).
2. **Logo Contrast vs Pure Black Canvas**: The logo features a dark brown circle. If placed on pure black `#000000`, the logo contour becomes invisible. The UI background must strictly use the warm Obsidian base `#0F0A09` with subtle card separation `#181210` and hairline ivory border `#CFC9BA/15`.
3. **Custom Footwear Returns**: Handcrafted and personalized/engraved products typically cannot be returned or resold. The client's return policy must explicitly define separate terms for standard versus customized pairs.
4. **Razorpay Webhook Timing**: Customers may close their browser or network connection immediately upon paying before the frontend verification API is reached. An idempotent server-to-server webhook is required to prevent lost orders.

---

## e) Git Metadata

- **Phase 0A Initial Commit**: `1fc1bc1acd8266f82e038498993eb349f45acc3c` (`1fc1bc1`)
- **Phase 0A Verified Commit**: `af27ca0472e399589a19c52fe1c5fa631fbafba7` (`af27ca0`)
- **Phase 0B Planning Documents Commit**: `eb22b2e841fe746a89cfa2c54cf469ea7d9fca88` (`eb22b2e`)
- **Active Branch**: `main`
- **Remote Origin**: `https://github.com/AshishCodes-dev/aurevella-luxury-footwear.git`
- **Tags**:
  - `phase-0a` (Initial foundation setup commit `1fc1bc1`)
  - `phase-0a-verified` (Verified foundation HEAD `af27ca0`)

---

## f) Skipped or Uncertain Items
- **Skipped**: None. No application code was altered. All required planning documents were authored, indexed, and committed.
- **Uncertain Items**: None. All open technical points are explicitly cataloged under section (b).


---

# Phase 0C Log: Documentation Patch (v1.1)

## a) Step 0 Raw Outputs

```text
On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean
 README.md                    |  15 +++
 docs/ARCHITECTURE.md         | 235 +++++++++++++++++++++++++++++++++++++
 docs/DATABASE_SCHEMA.md      | 273 +++++++++++++++++++++++++++++++++++++++++++
 docs/DESIGN_SYSTEM.md        | 165 ++++++++++++++++++++++++++
 docs/PHASE_LOG.md            |  76 ++++++++++++
 docs/PROJECT_REQUIREMENTS.md | 182 +++++++++++++++++++++++++++++
 docs/README.md               |  21 ++++
 docs/SECURITY_PLAN.md        | 162 +++++++++++++++++++++++++
 docs/TESTING_PLAN.md         | 139 ++++++++++++++++++++++
 9 files changed, 1268 insertions(+)
```
> **Audit Confirmation**: `git diff --stat phase-0a-verified phase-0b` confirms that only `docs/` files and `README.md` were modified. No `backend/` or `frontend/` files were touched.

---

## b) Summary of Changes per Document

### `docs/PROJECT_REQUIREMENTS.md` (Draft v1.1)
- Standardized all monetary attributes and calculations to integer PAISE (`basePricePaise`, `priceOverridePaise`, `priceDeltaPaise`, `totalAmountPaise`).
- Aligned order statuses to 7 exact enums (`pending_payment`, `placed`, `processing`, `shipped`, `delivered`, `cancelled`, `expired`); added `crafting` as `[OPEN]`.
- Added FR-41 (Password Reset) and FR-42 (Guest Cart Browsing & Login Merging).
- Added FR-43 & FR-44 (Customer & Admin Order Cancellation and Razorpay Refund API processing).
- Added FR-45 to FR-48 (Admin CRUD for categories, collections with batch caps, customization blueprints, and signed media uploads).
- Added FR-49 (Transactional Emails) and FR-50 (Mandatory Legal & Compliance Pages).
- Replaced unconfirmed category examples with neutral placeholders ("Heels", "Flats" marked as `[ASSUMPTION - confirm with client]`).

### `docs/ARCHITECTURE.md` (Draft v1.1)
- Re-architected checkout flow 4.2 with 15-minute atomic stock reservations inside MongoDB replica set multi-document transactions.
- Unified `/verify` and `/webhook` into a single shared atomic `finalizeOrderPayment` routine gated by `findOneAndUpdate({ paymentStatus: "pending" })`.
- Documented late-payment edge case after reservation expiry with automated Razorpay refund and admin alert.
- Specified mandatory `express.raw()` body parser mounted before `express.json()` for cryptographic Razorpay webhook signature validation.
- Defined `api.<clientdomain>` subdomain requirement for `SameSite=Lax` cookies; updated deployment decision table accordingly.
- Expanded REST API catalog with admin CRUD (categories, collections, customization, media, refunds) and customer cancellation endpoints.

### `docs/DATABASE_SCHEMA.md` (Draft v1.1)
- Renamed all money fields with the `Paise` suffix (`basePricePaise`, `priceOverridePaise`, `priceDeltaPaise`, `unitPricePaise`, `subtotalPaise`, `shippingFeePaise`, `taxAmountPaise`, `totalAmountPaise`, `amountPaise`) and eliminated ambiguity.
- Added `reservedQuantity` to `product_variants` and introduced new `stock_reservations` collection.
- Added `batchReservedCount` and `batchSoldCount` to `collections` for atomic Limited Edition batch cap enforcement.
- Added `counters` collection for sequential `orderNumber` generation.
- Documented unified status transition matrix and valid-only state diagram.
- Configured `users.password` with `select: false` and added unique partial index on `payments.razorpayPaymentId`.

### `docs/SECURITY_PLAN.md` (Draft v1.1)
- Configured single atomic payment gate preventing callback/webhook race conditions and double stock reductions.
- Specified `api.` subdomain requirement for cross-origin `SameSite=Lax` cookie delivery.
- Added CSRF defense via required `X-Aurevella-Request: 1` header + Origin/Referer verification on state-changing endpoints.
- Configured dynamic DB re-fetch in auth middleware for immediate role updates and revocation enforcement.
- Documented `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD`, and `RAZORPAY_WEBHOOK_SECRET` environment variables.
- Added security and availability assessment of free-tier database/hosting limitations (`[VERIFY before quoting to client]`).

### `docs/TESTING_PLAN.md` (Draft v1.1)
- Standardized all monetary figures to integer PAISE and updated order/payment status assertions.
- Appended test cases `TN-11` (concurrent purchase of last pair) and `TN-12` (late payment post-expiry refund).
- Appended `TN-13` (callback/webhook race condition), `TN-14` (amount mismatch), `TN-15` (cross-user order hijack), `TN-16` (bad webhook signature), and `TN-17` (webhook replay).
- Appended `TN-18` (multi-item partial out-of-stock rollback), `TN-19` (cancellation stock restore), `TN-20` (CSRF header check), `TN-21` (password reset token abuse), `TN-22` (immediate privilege revocation), and `TN-23` (Limited Edition batch cap limit).
- Appended `TL-06` (subdomain cookie cross-origin behavior) and labeled all test environments (`LOCAL`, `WEBHOOK TUNNEL`, `LIVE ONLY`).

---

## c) Step 2 Consistency-Check Outputs (Raw)

```text
=== Search for prohibited terms across patched documents ===
ZERO HITS: payment_pending
ZERO HITS: Payment Pending
ZERO HITS: rupees or paise
ZERO HITS: Aurelius
ZERO HITS: Heritage
ZERO HITS: Blake
ZERO HITS: calfskin
ZERO HITS: Atelier
ZERO HITS: Oxford
ZERO HITS: Loafers
FOUND: crafting in:
C:\Users\dell\OneDrive\Desktop\AureVeLla\docs\PROJECT_REQUIREMENTS.md:106: *Acceptance Criterion*: Each transition appends an entry to the order status history array with timestamp, actor (customer/admin/system), and notes. Note: `crafting` status is only included if the client confirms pairs are made to order `[OPEN]`.
C:\Users\dell\OneDrive\Desktop\AureVeLla\docs\PROJECT_REQUIREMENTS.md:209: | **Q-9** | **Crafting Lifecycle Status** | *Are your shoes made to order upon purchase, or are finished pairs maintained in stock for immediate dispatch?* `[OPEN]` | If shoes are made to order, we will activate the `crafting` status in the order lifecycle; otherwise, standard `processing -> shipped` is used. |
C:\Users\dell\OneDrive\Desktop\AureVeLla\docs\PROJECT_REQUIREMENTS.md:218: - **Unified Status Enums**: Aligned order statuses to `pending_payment`, `placed`, `processing`, `shipped`, `delivered`, `cancelled`, `expired`. Added `crafting` as an `[OPEN]` item dependent on client confirmation.
C:\Users\dell\OneDrive\Desktop\AureVeLla\docs\DATABASE_SCHEMA.md:220: | `orderStatus` | String | Enum: `['pending_payment', 'placed', 'processing', 'shipped', 'delivered', 'cancelled', 'expired']` | `'pending_payment'` | **Index**. Store fulfillment state. Note: `crafting` status is only included if client confirms pairs are made to order `[OPEN]`. |
C:\Users\dell\OneDrive\Desktop\AureVeLla\docs\DATABASE_SCHEMA.md:284: *(Note: `crafting` status is reserved as an `[OPEN]` item if the client confirms pairs are made to order)*.
C:\Users\dell\OneDrive\Desktop\AureVeLla\docs\DATABASE_SCHEMA.md:340: - **Unified Status Enums**: Formally defined `paymentStatus` (`pending`, `paid`, `failed`, `refunded`, `partially_refunded`) and `orderStatus` (`pending_payment`, `placed`, `processing`, `shipped`, `delivered`, `cancelled`, `expired`). Documented single transition table and state diagram. Marked `crafting` as `[OPEN]`.

Remaining money fields without "Paise" suffix in DATABASE_SCHEMA.md: NONE.

Status Enums Across Documents:
- orderStatus: ['pending_payment', 'placed', 'processing', 'shipped', 'delivered', 'cancelled', 'expired']
- paymentStatus: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded']
Status Consistency: 100% Identical.

git diff --stat phase-0b HEAD -- backend frontend: (empty)
```

---

## d) New `[OPEN]` and `[ASSUMPTION]` Items

### New `[OPEN]` Items
1. **`[OPEN]` Crafting Lifecycle Status**: Are footwear products made to order upon purchase, or are finished pairs maintained in inventory for immediate dispatch? (Determines whether `crafting` status is included in the fulfillment lifecycle).
2. **`[OPEN]` Transactional Email Provider**: Which email delivery service should be utilized for transactional receipts and password resets (e.g., Resend, SendGrid, Amazon SES [VERIFY before quoting to client])?
3. **`[OPEN]` Mandatory Legal Policy Copy**: Client must supply verified copy for Privacy Policy, Terms & Conditions, Shipping Policy, and Return & Refund Policy (prerequisite for merchant payment gateway account activation).
4. **`[OPEN]` Backups & Production Hosting SLA**: Decision and budget allocation for managed database backups (Atlas free tier lacks automated snapshot backups) and dedicated non-sleeping backend runtime [VERIFY before quoting to client].
5. **`[OPEN]` Order Cancellation Window**: What is the allowable cancellation window and fee structure for customer-initiated cancellations prior to dispatch?

### New `[ASSUMPTION]` Items
1. **`[ASSUMPTION]` Stock Reservation Duration**: Unpaid checkout stock reservations hold variant inventory for exactly 15 minutes before expiring and returning to the available inventory pool.
2. **`[ASSUMPTION]` Password Reset Token Expiration**: Password recovery tokens expire 30 minutes after issuance and are single-use.
3. **`[ASSUMPTION]` Session Lifetimes**: Customer authentication sessions persist for 7 days; admin authentication sessions persist for 24 hours.
4. **`[ASSUMPTION - confirm with client]` Initial Women's Footwear Categories**: "Heels" and "Flats" are assumed as the initial category taxonomy based on visible brand showcases.

---

## e) Deviations, Contradictions, or Changes
- **Skipped**: None. No application code was altered.
- **Modifications**: `docs/DESIGN_SYSTEM.md` was left strictly untouched as instructed.
- **Uncertain Details**: None. All open requirements are formally marked and organized.

---

## f) Git Metadata
- **Phase 0A Initial Commit**: `1fc1bc1acd8266f82e038498993eb349f45acc3c` (`1fc1bc1`)
- **Phase 0A Verified Commit**: `af27ca0472e399589a19c52fe1c5fa631fbafba7` (`af27ca0`)
- **Phase 0B Planning Documents Commit**: `eb22b2e841fe746a89cfa2c54cf469ea7d9fca88` (`eb22b2e`)
- **Phase 0B Report Commit**: `e06c5d3d4b684bc9c7e0b57e7c8ec17d0d0f73f1` (`e06c5d3`)
- **Phase 0C Patch Commit**: `60cde0d5d1c37b92bb7db1358d3fe7c9c0490bcf` (`60cde0d`)
- **Active Branch**: `main`
- **Remote Origin**: `https://github.com/AshishCodes-dev/aurevella-luxury-footwear.git`
- **Tags**:
  - `phase-0a` (pointing to `1fc1bc1`)
  - `phase-0a-verified` (pointing to `af27ca0`)
  - `phase-0b` (pointing to `e06c5d3`)
  - `phase-0c` (created on final HEAD)
