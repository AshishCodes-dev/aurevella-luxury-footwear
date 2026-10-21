# Security Plan: AUREVELLA

> **Purpose**: Establishes cybersecurity controls, authentication standards, payment defense mechanisms, and operational policies for AUREVELLA.  
> Ensures compliance with industry standards, OWASP top 10 safeguards, and zero-trust transaction validation.

- **Last updated**: October 22, 2026  
- **Status**: Draft v1

---

## 1. Authentication & Session Security

### 1.1 Password Hashing with `bcrypt`
- Passwords are never stored in plain text.
- Passwords must be hashed using `bcrypt` with a salt round cost factor of **12** before insertion into MongoDB.
- Registration and password changes require minimum 8 characters, at least 1 uppercase letter, and 1 numeric digit.

### 1.2 Authentication Tokens: `httpOnly` Cookies vs `localStorage`
AUREVELLA mandates storing JSON Web Tokens (JWT) inside **`httpOnly`, `Secure` cookies**, strictly rejecting `localStorage`.

| Dimension | `httpOnly`, `Secure` Cookies (Chosen) | `localStorage` (Rejected) |
| :--- | :--- | :--- |
| **Cross-Site Scripting (XSS)** | **Immune**: JavaScript running in browser cannot read or extract cookie tokens. | **Vulnerable**: Any malicious injected script or compromised third-party package can steal tokens. |
| **Cross-Site Request Forgery (CSRF)** | Mitigated via `SameSite=Lax`, strict CORS origin matching, and JSON POST requests. | Immune to native CSRF, but vulnerable to full token exfiltration via XSS. |
| **Transmission Security** | Guaranteed: `Secure` flag ensures cookie is transmitted only over encrypted HTTPS. | Can be transmitted over insecure connections if client script lacks guards. |
| **Session Expiration** | Enforced by both cookie `maxAge` (e.g., 7 days) and JWT payload expiration (`exp`). | Requires custom client code to track expiration and purge keys. |

### 1.3 Role-Based Access Control (RBAC)
- All incoming requests to protected routes pass through an `authenticate` middleware that parses the JWT cookie.
- Admin routes are protected by a dedicated `authorizeAdmin` middleware verifying `req.user.role === 'admin'`.
- If an unauthenticated user attempts access: return `401 Unauthorized`.
- If an authenticated non-admin attempts access to admin routes: return `403 Forbidden`.

### 1.4 Admin Account Provisioning (Seed Script Only)
- Admin accounts **cannot** be registered through public registration forms or APIs.
- The `role` field is stripped from public registration payloads.
- Admin credentials must be provisioned solely via a secured, CLI-executed backend seed script:
  ```bash
  node src/utils/seedAdmin.js
  ```
- The script checks if an admin with the designated email exists; if not, it prompts for credentials or reads an ephemeral administrative initialization key.

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
  - **Login / Registration**: Max 5 attempts per 15-minute window per IP.
  - **Payment Order Creation**: Max 10 attempts per hour per customer/IP.
  - **Contact Form Inquiries**: Max 3 submissions per hour per IP.

### 2.4 HTTP Header Security via `helmet`
- Integrated `helmet` middleware configures standard defensive HTTP headers:
  - `Content-Security-Policy`: Restricts script and resource origins (allowing Razorpay checkout scripts).
  - `X-Frame-Options: DENY`: Blocks clickjacking attacks.
  - `X-Content-Type-Options: nosniff`: Prevents MIME-type sniffing.
  - `Strict-Transport-Security` (HSTS): Enforces HTTPS connections.

### 2.5 Strict CORS Configuration
- CORS is configured to accept requests **only** from the exact origin specified in `CLIENT_URL` (e.g., `http://localhost:5173` in development, `https://aurevella.com` in production).
- Browser requests originating from any other domain are immediately rejected.
- `credentials: true` is strictly scoped to the authorized origin.

### 2.6 Error Handling & Stack Trace Obfuscation
- The central error-handling middleware intercepts all application errors.
- In production (`NODE_ENV === 'production'`), error responses return generic, sanitized messages (`"Internal Server Error"`) with **no stack traces**.
- Stack traces are logged exclusively to server-side stdout / log files for debugging.

---

## 3. Payment Processing & Gateway Defense (Razorpay)

### 3.1 Server-Authoritative Order Creation
- The client cannot propose order pricing or settlement totals.
- When `POST /api/payments/create-order` is invoked:
  1. The server reads the customer's cart directly from MongoDB.
  2. The server queries active product variants to obtain authorized prices.
  3. The server computes `subtotal`, `shippingFee` `[OPEN]`, and `taxAmount` `[OPEN]`.
  4. The server converts the total to INR paise and calls Razorpay Orders API:
     ```javascript
     razorpay.orders.create({
       amount: calculatedTotalInPaise,
       currency: "INR",
       receipt: internalOrderNumber
     });
     ```
  5. The official Razorpay Order ID is associated with an internal pending order.

### 3.2 Cryptographic Signature Verification
- The frontend payment callback returns: `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature`.
- The backend verifies authenticity using an HMAC SHA-256 calculation:
  $$\text{Expected Signature} = \text{HMAC-SHA256}(\text{order\_id} + "|" + \text{payment\_id}, \text{RAZORPAY\_KEY\_SECRET})$$
- Verification is performed using timing-safe comparison (`crypto.timingSafeEqual`) to prevent timing attack vulnerabilities.
- If signatures do not match, payment is marked failed and inventory is untouched.

### 3.3 Webhook Verification & Fallback
- In cases where the customer's browser closes before the client callback executes, Razorpay sends an asynchronous server-to-server webhook event (e.g. `payment.captured`).
- The backend webhook route (`/api/payments/webhook`) validates the `x-razorpay-signature` header against `RAZORPAY_WEBHOOK_SECRET` before processing.

### 3.4 Idempotency & Stock Protection
- Each payment can finalize an order **exactly once**.
- The payment verification routine verifies that the order status is currently `payment_pending`.
- If an order is already marked `placed` or `paid` (e.g., duplicate webhook or concurrent callback), the operation immediately returns the existing order details without repeating stock reduction.
- Inventory reductions are executed atomically:
  ```javascript
  await ProductVariant.updateOne(
    { _id: item.variantId, stock: { $gte: item.quantity } },
    { $inc: { stock: -item.quantity } }
  );
  ```

---

## 4. Media Upload & File Security `[OPEN]`

If local disk uploads are enabled or Cloudinary upload proxies are implemented:
1. **File Type Whitelisting**: Accept only validated image MIME types (`image/jpeg`, `image/png`, `image/webp`).
2. **File Size Limits**: Strictly enforce a maximum file size of 5 MB per image.
3. **Magic Number Inspection**: Verify the file buffer's magic bytes (not merely the file extension) to ensure non-image executables are rejected.
4. **Filename Sanitization**: Uploaded files are renamed using cryptographically random UUIDs; original client filenames are discarded.
5. **Direct Execution Disabled**: If stored locally, media folders must be served as static files with script execution disabled.

---

## 5. Secrets Management & Operational Security

### 5.1 Environment Isolation Rules
- Secrets (`MONGODB_URI`, `JWT_SECRET`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`) must exist exclusively in `backend/.env`.
- Frontend code and environment variables (`frontend/.env`) must **never** contain private keys or secrets. Only public identifiers (e.g., `VITE_API_URL`, `VITE_RAZORPAY_KEY_ID`) are permitted.
- `.env` files are tracked in `.gitignore` and must **never** be committed to Git history.

### 5.2 Dependency Vulnerability Audits
- Continuous dependency scanning via `npm audit` prior to each phase release.
- Immediate patching of high or critical severity CVEs.

### 5.3 Logging & PII Protection
- Morgan and application loggers must **never** log sensitive customer data, raw authorization tokens, passwords, or full credit card numbers.
- Razorpay handles raw cardholder data; AUREVELLA never processes or stores card PANs, CVVs, or bank credentials.

---

## 6. Threat Modeling & Mitigation Matrix

| # | Threat / Attack Vector | Risk Level | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **T-1** | **Price Tampering in Checkout** | High | Prices are fetched and computed server-side directly from MongoDB. Client values are ignored. |
| **T-2** | **Payment Spoofing / Fake Success** | Critical | Server calculates HMAC SHA-256 signature using `RAZORPAY_KEY_SECRET`. Orders fulfill only on cryptographic match. |
| **T-3** | **Credential Stuffing / Brute Force** | High | Rate limit login routes to 5 attempts per 15 min; bcrypt hashing with cost factor 12. |
| **T-4** | **XSS Token Stealing** | High | Store session JWT in `httpOnly`, `Secure`, `SameSite=Lax` cookies inaccessible to JavaScript. |
| **T-5** | **NoSQL Injection** | Medium | Mongoose typed schemas and strict sanitization stripping `$` and `.` operators from query payloads. |
| **T-6** | **Privilege Escalation** | High | Admin accounts created only via backend CLI seed script. `role` field ignored on user registration API. |
| **T-7** | **Inventory Race Condition (Overselling)**| High | Atomic conditional decrements (`$inc` with `$gte`) ensuring stock cannot drop below zero. |
| **T-8** | **Sensitive Data Leak via Errors** | Medium | Central error handler strips stack traces and internal exceptions in production. |
