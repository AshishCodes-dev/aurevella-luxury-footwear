# Security Plan: AUREVELLA

> **Purpose**: Establishes cybersecurity controls, authentication standards, payment defense mechanisms, and operational policies for AUREVELLA.  
> Ensures compliance with industry standards, OWASP top 10 safeguards, and zero-trust transaction validation.

- **Last updated**: October 22, 2026  
- **Status**: Draft v1.1

---

## 1. Authentication & Session Security

### 1.1 Password Hashing with `bcrypt` & Schema Protection
- Passwords are never stored in plain text.
- Passwords must be hashed using `bcrypt` with a salt round cost factor of **12** before insertion into MongoDB.
- In the Mongoose schema, `users.password` must specify `select: false` so hashes are never returned by default queries.
- Registration and password changes require minimum 8 characters, at least 1 uppercase letter, and 1 numeric digit.

### 1.2 Authentication Tokens: `httpOnly` Cookies vs `localStorage`
AUREVELLA mandates storing JSON Web Tokens (JWT) inside **`httpOnly`, `Secure` cookies**, strictly rejecting `localStorage`.

| Dimension | `httpOnly`, `Secure` Cookies (Chosen) | `localStorage` (Rejected) |
| :--- | :--- | :--- |
| **Cross-Site Scripting (XSS)** | **Immune**: JavaScript running in browser cannot read or extract cookie tokens. | **Vulnerable**: Any malicious injected script or compromised third-party package can steal tokens. |
| **Cross-Site Request Forgery (CSRF)** | Mitigated via `SameSite=Lax`, strict CORS origin matching, custom request headers, and JSON requests. | Immune to native CSRF, but vulnerable to full token exfiltration via XSS. |
| **Transmission Security** | Guaranteed: `Secure` flag ensures cookie is transmitted only over encrypted HTTPS. | Can be transmitted over insecure connections if client script lacks guards. |
| **Session Expiration** | Enforced by both cookie `maxAge` and JWT payload expiration (`exp`). | Requires custom client code to track expiration and purge keys. |

> **Domain & Subdomain Architecture Rule**: For `httpOnly`, `SameSite=Lax` cookies to work reliably across browser requests, the Express API **must** reside on a subdomain of the client's primary domain (e.g. `api.aurevella.com` where the storefront is `aurevella.com`).

### 1.3 Role-Based Access Control (RBAC) & Dynamic User Refresh
- All incoming requests to protected routes pass through an `authenticate` middleware that parses the JWT cookie.
- **Dynamic Re-Fetch**: The middleware re-queries the user record from MongoDB on every protected request. If an admin modifies a user's role or sets `isActive: false`, access is granted or revoked immediately without waiting for token expiration.
- **Session Lifetimes `[ASSUMPTION]`**:
  - Customer sessions: 7 days.
  - Admin sessions: 24 hours.
- Admin routes are protected by a dedicated `authorizeAdmin` middleware verifying `req.user.role === 'admin'`.
- Unauthenticated requests return `401 Unauthorized`; authenticated non-admin requests return `403 Forbidden`.

### 1.4 Admin Account Provisioning (Seed Script Only)
- Admin accounts **cannot** be registered through public registration forms or APIs (`role` field is stripped from registration bodies).
- Admin credentials must be provisioned solely via a secured, CLI-executed backend seed script:
  ```bash
  node src/utils/seedAdmin.js
  ```
- `seedAdmin.js` must read credentials exclusively from environment variables (`ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD`) or an interactive CLI prompt. It must never hardcode or log credentials.

---

## 2. API & Infrastructure Security Controls

### 2.1 Input Validation & Sanitization
- All API inputs are strictly validated against defined schemas before controller execution.
- Malformed inputs are rejected with `400 Bad Request` including specific field validation errors.

### 2.2 NoSQL Injection Protection
- Mongoose schema typing provides native defense against query selector injection (e.g., `{ $ne: null }`).
- Express inputs (`req.body`, `req.query`, `req.params`) are sanitized to strip dollar sign (`$`) and dot (`.`) operators before query compilation.

### 2.3 Strict Rate Limiting
- Sensitive public endpoints are guarded by IP-based rate limiters using `express-rate-limit`:
  - **Login / Registration / Password Reset**: Max 5 attempts per 15-minute window per IP.
  - **Payment Order Creation**: Max 10 attempts per hour per customer/IP.
  - **Contact Form Inquiries**: Max 3 submissions per hour per IP.

### 2.4 HTTP Header Security via `helmet` & Content Security Policy (CSP)
- Integrated `helmet` middleware configures standard defensive HTTP headers:
  - `X-Frame-Options: DENY`: Blocks clickjacking attacks.
  - `X-Content-Type-Options: nosniff`: Prevents MIME-type sniffing.
  - `Strict-Transport-Security` (HSTS): Enforces HTTPS connections.
- **CSP Scope Note**: Helmet on the API protects API responses. The Content Security Policy governing HTML pages (specifically allowing the Razorpay checkout script `https://checkout.razorpay.com`) must be configured where the frontend HTML is served (web server headers or Vite HTML meta tags).

### 2.5 Strict CORS & CSRF Defense
- CORS allows requests **only** from the origin in `CLIENT_URL` (e.g., `http://localhost:5173` in development, `https://aurevella.com` in production).
- **CSRF Protection on State-Changing Endpoints**:
  - All mutating requests (`POST`, `PUT`, `DELETE`) require a custom request header: `X-Aurevella-Request: 1`.
  - Browsers cannot attach custom headers on cross-origin form submissions or image pings without triggering a preflight check that CORS rejects.
  - Backend verifies `Origin` and `Referer` headers match `CLIENT_URL`.

### 2.6 Error Handling & Stack Trace Obfuscation
- The central error-handling middleware intercepts all application errors.
- In production (`NODE_ENV === 'production'`), error responses return generic, sanitized messages (`"Internal Server Error"`) with **no stack traces**.

---

## 3. Payment Processing & Gateway Defense (Razorpay)

### 3.1 Server-Authoritative Pricing & 15-Minute Stock Reservation
- All prices and calculations operate in integer PAISE (`amountPaise`, `totalAmountPaise`). Client-submitted prices are ignored.
- When `POST /api/payments/create-order` is called:
  1. The server reads the active cart and re-queries prices in paise from the database.
  2. Inside a MongoDB transaction, stock is atomically reserved for each variant (`stock - reservedQuantity >= quantity`, `reservedQuantity += quantity`).
  3. A `stock_reservations` document is created with a 15-minute expiration `[ASSUMPTION]`.
  4. The server creates a Razorpay order via official SDK:
     ```javascript
     razorpay.orders.create({
       amount: totalAmountPaise,
       currency: "INR",
       receipt: internalOrderNumber
     });
     ```
  5. An internal order document is initialized with `orderStatus: "pending_payment"` and `paymentStatus: "pending"`.

### 3.2 Cryptographic Signature Verification
- The frontend payment callback returns: `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature`.
- The backend verifies authenticity using HMAC SHA-256:
  $$\text{Expected Signature} = \text{HMAC-SHA256}(\text{order\_id} + "|" + \text{payment\_id}, \text{RAZORPAY\_KEY\_SECRET})$$
- Verified using timing-safe comparison (`crypto.timingSafeEqual`) to prevent timing side-channel attacks.

### 3.3 Raw Webhook Parsing & Replay Protection
- The webhook endpoint (`POST /api/payments/webhook`) **must** receive the raw, unparsed request body (`express.raw({ type: 'application/json' })`) mounted **before** `express.json()`, because the signature is computed over the raw payload bytes.
- The webhook validates the `x-razorpay-signature` header against `RAZORPAY_WEBHOOK_SECRET` (which is kept separate from `RAZORPAY_KEY_SECRET`).
- Webhooks store processed event IDs (`x-razorpay-event-id`) in MongoDB to ignore replayed webhook payloads.

### 3.4 The Single Atomic Payment Finalization Gate (`finalizeOrderPayment`)
Both the client callback (`/api/payments/verify`) and the webhook (`/api/payments/webhook`) delegate execution to ONE shared atomic routine:
1. **Validation Checks**:
   - Verify HMAC signature.
   - Verify paid amount in paise equals order `totalAmountPaise`.
   - Verify currency is `INR`.
   - Verify `razorpay_order_id` belongs to this order.
   - For `/verify`, verify the order belongs to `req.user._id`.
2. **Single Atomic Gate**:
   ```javascript
   const order = await Order.findOneAndUpdate(
     { _id: orderId, paymentStatus: "pending" },
     {
       $set: {
         paymentStatus: "paid",
         orderStatus: "placed",
         "paymentDetails.razorpayPaymentId": razorpay_payment_id
       },
       $push: { statusHistory: { status: "placed", timestamp: new Date(), actor: "system" } }
     },
     { new: true }
   );
   ```
   *If `order` is null, the order was already processed by the concurrent callback or webhook; return existing status immediately.*
3. **Inventory Consumption**:
   - `stock -= quantity` and `reservedQuantity -= quantity`.
   - Reservation status set to `consumed`.
   - Batch sold counters incremented for Limited Edition runs.
   - Cart is cleared.
4. **Late-Payment Edge Case (Payment Captured After Reservation Expired)**:
   - If payment arrives after reservation timeout has released stock:
     - System attempts to re-reserve stock.
     - If available: fulfill order (`orderStatus: "placed"`).
     - If unavailable: flag order as `needs_attention: true`, mark `orderStatus: "cancelled"`, automatically trigger Razorpay Refund API (`razorpay.payments.refund`), and notify admin concierge.

---

## 4. Media Upload & File Security `[OPEN]`

If local disk uploads or Cloudinary proxy uploads are implemented:
1. **File Type Whitelisting**: Accept only validated image MIME types (`image/jpeg`, `image/png`, `image/webp`).
2. **File Size Limits**: Strictly enforce a maximum file size of 5 MB per image.
3. **Magic Number Inspection**: Verify the file buffer's magic bytes (not merely file extension).
4. **Filename Sanitization**: Uploaded files are renamed using cryptographically random UUIDs; original client filenames are discarded.
5. **Direct Execution Disabled**: If stored locally, media folders must be served as static assets with script execution disabled.

---

## 5. Secrets Management & Operational Security

### 5.1 Environment Isolation Rules
- Secrets must exist exclusively in `backend/.env` and never be committed to Git.
- Documented environment variables for implementation phases:
  - `PORT`, `NODE_ENV`, `MONGODB_URI`, `CLIENT_URL`, `JWT_SECRET`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
  - *TODO for Phase 2*: `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD`
  - *TODO for Phase 5*: `RAZORPAY_WEBHOOK_SECRET`
- Frontend environment (`frontend/.env`) must never contain private keys or secrets. Only public identifiers (e.g. `VITE_API_URL`, `VITE_RAZORPAY_KEY_ID`) are permitted.

### 5.2 Dependency Vulnerability Audits
- Continuous dependency scanning via `npm audit` prior to each phase release.
- Immediate patching of high or critical severity CVEs.

### 5.3 Logging & PII Protection
- Morgan and application loggers must **never** log sensitive customer data, raw authorization tokens, passwords, or full credit card numbers.
- Razorpay handles raw cardholder data; AUREVELLA never processes or stores card PANs, CVVs, or bank credentials.

### 5.4 Backups & Hosting Reliability `[OPEN]`
- **Free Tier Warning [VERIFY before quoting to client]**: Free database instances (e.g., MongoDB Atlas M0 free tier) do not include automated backup snapshots, point-in-time recovery, or high-availability SLAs. Free backend hosts may sleep after inactivity, causing incoming Razorpay webhooks to fail. Client should budget for production database backup plans and dedicated hosting `[OPEN]`.

---

## 6. Threat Modeling & Mitigation Matrix

| # | Threat / Attack Vector | Risk Level | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **T-1** | **Price Tampering in Checkout** | High | Prices computed server-side in integer paise from MongoDB. Client values ignored. |
| **T-2** | **Payment Spoofing / Fake Success** | Critical | Server calculates HMAC SHA-256 signature using `RAZORPAY_KEY_SECRET`. Orders fulfill only on cryptographic match. |
| **T-3** | **Concurrent Callback & Webhook Race** | High | Shared `finalizeOrderPayment` routine with atomic `findOneAndUpdate({ paymentStatus: "pending" })` gate. |
| **T-4** | **Credential Stuffing / Brute Force** | High | Rate limit auth routes to 5 attempts per 15 min; bcrypt hashing with cost factor 12. |
| **T-5** | **XSS Token Stealing** | High | Store session JWT in `httpOnly`, `Secure`, `SameSite=Lax` cookies scoped to `api.` subdomain. |
| **T-6** | **Cross-Site Request Forgery (CSRF)** | Medium | Required custom header (`X-Aurevella-Request: 1`) + Origin/Referer matching. |
| **T-7** | **NoSQL Injection** | Medium | Mongoose typed schemas and strict sanitization stripping `$` and `.` operators from query payloads. |
| **T-8** | **Privilege Escalation** | High | Admin accounts created only via backend CLI seed script. `role` field ignored on user registration API. Dynamic re-fetch of user on each request. |
| **T-9** | **Inventory Race Condition (Overselling)**| High | 15-min atomic stock reservations via MongoDB replica set transactions (`stock - reservedQuantity >= quantity`). |
| **T-10**| **Late-Payment After Timeout** | Medium | Re-reservation check; if stock exhausted, automatic full refund via Razorpay Refund API and admin notification. |
| **T-11**| **Webhook Signature Mismatch via JSON Parsing**| High | Webhook route mounted with `express.raw()` before `express.json()`. |
| **T-12**| **Sensitive Data Leak via Errors** | Medium | Central error handler strips stack traces and internal exceptions in production. |

---

## Changelog v1.1
- **Money Unit Standard**: Specified integer PAISE validation for all payment totals and verification checks.
- **Unified Status Enums**: Removed all instances of non-standard statuses; adopted `pending_payment`, `placed`, `processing`, `shipped`, `delivered`, `cancelled`, `expired` for orders, and `pending`, `paid`, `failed`, `refunded`, `partially_refunded` for payments.
- **Stock Reservation Model**: Integrated 15-minute atomic stock reservations inside MongoDB transactions on order creation, with automatic release on cancel/expiry and consumption on payment.
- **Single Atomic Payment Gate**: Unified payment callback and webhook processing under `finalizeOrderPayment` gated by atomic `findOneAndUpdate({ paymentStatus: "pending" })`. Added late-payment refund automation.
- **Raw Webhook Parser**: Specified `express.raw()` middleware mounted before `express.json()` for exact HMAC webhook signature verification. Added webhook replay protection.
- **Subdomain Cookie & CSRF Rules**: Defined `api.<clientdomain>` subdomain requirement for `SameSite=Lax` cookies. Added `X-Aurevella-Request: 1` custom header CSRF protection.
- **Admin & Account Hardening**: Configured `users.password` with `select: false`. Added dynamic DB re-fetch in auth middleware. Added session lifetimes (7d customer, 24h admin `[ASSUMPTION]`). Documented `seedAdmin.js` environment variables.
- **Backups & Hosting Reliability**: Added security and availability notes regarding free-tier database and hosting limitations (`[VERIFY before quoting to client]`).
