# AUREVELLA — Production Deployment Runbook & Environment Specification

> **Hostinger & Cloud Architecture**: Comprehensive deployment guide for the AUREVELLA luxury footwear platform (`myaurevella.in`).  
> **Status**: Verified for Production Readiness (Loop 4 Audit Gate).

---

## 1. Domain Architecture & Network Topology

To maintain secure, seamless session persistence with `httpOnly`, `SameSite=Lax` cookies across decoupled services, deploy with a unified parent domain architecture:

| Component | Recommended Domain / URL | Deployment Type | Hostinger Tier / Environment |
| :--- | :--- | :--- | :--- |
| **Storefront & Admin UI** | `https://myaurevella.in` (and `https://www.myaurevella.in`) | Static SPA (`dist/`) | Hostinger Web Hosting / Cloud (`public_html/`) |
| **API & Webhooks** | `https://api.myaurevella.in` | Node.js Process | Hostinger VPS or Node.js Application Manager |
| **Database** | `mongodb+srv://...` | Managed Cloud | MongoDB Atlas (M0 Free Tier or M10+ Dedicated) |
| **Identity Provider** | Firebase Auth / Identity Platform | SaaS | Google Cloud / Firebase Console |
| **Payment Gateway** | Razorpay Gateway & Webhooks | SaaS | Razorpay Merchant Dashboard |

> [!IMPORTANT]
> **Same-Site Cookie Boundary**: Because the storefront is on `myaurevella.in` and the API is on `api.myaurevella.in`, they share the same registrable domain (`myaurevella.in`). The backend's `httpOnly; SameSite=Lax; Secure` session cookies are correctly accepted and sent on browser requests with `credentials: 'include'`.

---

## 2. Environment Variables Specification

### A. Backend Production Variables (`backend/.env`)

| Variable Name | Purpose & Description | Example Format *(NO REAL SECRETS)* | Required in Prod? |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment mode. Masks 5xx error stacks, enables HTTPS secure cookies, enforces strict validation. | `production` | **YES** |
| `PORT` | Listening port for the Express application. | `5000` (or injected by Hostinger process manager) | **YES** |
| `MONGODB_URI` | Full connection URI to MongoDB Atlas replica set with auth credentials and database name. | `mongodb+srv://<db_user>:<db_pass>@<cluster>.mongodb.net/aurevella?retryWrites=true&w=majority` | **YES** |
| `JWT_SECRET` | Cryptographic secret for signing session JWT tokens. Must be a high-entropy string $\ge$ 32 characters. | `generate-random-base64-or-hex-at-least-64-characters` | **YES** |
| `ALLOWED_ORIGINS` | Comma-delimited list of authorized frontend origins allowed to make CORS requests. | `https://myaurevella.in,https://www.myaurevella.in` | **YES** |
| `CLIENT_URL` | Primary customer storefront origin used for redirects and canonical links. | `https://myaurevella.in` | **YES** |
| `TRUST_PROXY` | Configures Express reverse-proxy trust for accurate client IP resolution in rate limiters. Set to `1` behind a single reverse proxy (LiteSpeed/Nginx/Cloudflare), or `true`. | `1` | **YES** (behind reverse proxy) |
| `RAZORPAY_KEY_ID` | Razorpay production merchant key ID. | `rzp_live_xxxxxxxxxxxxxxxx` | **YES** |
| `RAZORPAY_KEY_SECRET` | Razorpay production merchant secret for HMAC SHA-256 signature verification. | `xxxxxxxxxxxxxxxxxxxxxxxx` | **YES** |
| `RAZORPAY_WEBHOOK_SECRET` | Secret configured in Razorpay Webhooks dashboard for verifying payload signatures. | `whsec_xxxxxxxxxxxxxxxxxxxxxxxx` | **YES** |
| `FIREBASE_PROJECT_ID` | Google Cloud / Firebase project identifier. | `aurevella-prod-xxxx` | **YES** |
| `FIREBASE_CLIENT_EMAIL` | Firebase Service Account email address. | `firebase-adminsdk-xxxx@aurevella-prod-xxxx.iam.gserviceaccount.com` | **YES** |
| `FIREBASE_PRIVATE_KEY` | Firebase Service Account private key PEM string (with `\n` escaping preserved). | `"-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQD...\n-----END PRIVATE KEY-----\n"` | **YES** |
| `ADMIN_BOOTSTRAP_SECRET` | One-time administrative bootstrap token for running initial setup utilities if needed. | `high-entropy-secret-token` | Optional (Recommended) |

> [!CAUTION]
> **Zero Live Secrets in Version Control**: Never commit `.env` or paste live credentials into Git. All secrets must be populated strictly through the production hosting server's environment dashboard or `.env` file with restrictive `600` filesystem permissions.

### B. Frontend Build-Time Variables (`frontend/.env.production`)

| Variable Name | Purpose & Description | Example Value | Required at Build? |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | Base endpoint for the backend API. Baked into the compiled JS bundle at build time. | `https://api.myaurevella.in` | **YES** |
| `VITE_FIREBASE_API_KEY` | Public Firebase Web API Key for client-side Auth initialization. | `AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | **YES** |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Web Auth domain. | `aurevella-prod-xxxx.firebaseapp.com` | **YES** |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID. | `aurevella-prod-xxxx` | **YES** |
| `VITE_FIREBASE_APP_ID` | Firebase Web Application ID. | `1:xxxxxxxxxxxx:web:xxxxxxxxxxxxxxxx` | **YES** |
| `VITE_RAZORPAY_KEY_ID` | Public Razorpay Key ID initialized in the browser checkout modal. | `rzp_live_xxxxxxxxxxxxxxxx` | **YES** |

---

## 3. MongoDB Atlas Infrastructure & Database Runbook

### A. Replica Set & ACID Transactions
- **Strict Requirement**: In production (`NODE_ENV=production`), the payment service executes inventory decrements and order state mutations inside multi-document ACID transactions (`session.withTransaction`).
- MongoDB Atlas free tier (M0) and dedicated tiers (M10+) run as 3-node replica sets by default, fully satisfying this requirement.
- *Do not attempt to run standalone local MongoDB in production mode.*

### B. Network Access & IP Allowlist
- In the MongoDB Atlas Console:
  - Add the static outbound IP address of the Hostinger backend VPS/server to the **Network Access** IP Access List.
  - If using serverless/dynamic hosting where static IPs are unavailable, allow access only with strong username/password and TLS 1.3 encryption, or configure a VPC peering connection.

### C. Database Indexes & Migrations
Before processing live traffic, run the idempotent index migration script from the backend directory:
```bash
node scripts/migratePaymentIdIndex.js
```
This ensures:
1. `paymentId` sparse unique index is built (`paymentId_1`).
2. `orderNumber` unique index is built.
3. `user` and `createdAt` compound indexes on Orders and Inquiries are created.

### D. Initial Seeding Commands
Run the product catalogue seeder once during staging:
```bash
node src/utils/seedProducts.js
```
> [!CAUTION]
> **WHAT MUST NEVER BE RUN IN PRODUCTION**:
> - Never run `seedTestDB.js` or `testOfflineMock.js` against the production database (they will flush collections).
> - Never execute test suites (`npm run test:...`) with `NODE_ENV=production` pointing to live Atlas. All test scripts include fail-safes that prevent execution if the target database name is not `aurevella_test`.

---

## 4. Frontend Build & Hostinger Deployment Steps

1. **Clean Production Build**:
   ```bash
   cd frontend
   npm ci
   npm run build
   ```
2. **Verify Distribution Folder**:
   Confirm `frontend/dist/` contains:
   - `index.html` (entry point)
   - `assets/` (code-split, hashed chunks: `index-*.js`, `index-*.css`, lazy chunks)
   - `.htaccess` (Apache/LiteSpeed SPA fallback and caching rules)
   - `robots.txt`, `sitemap.xml`, `favicon.ico`
   - `brand/` and `images/products/`
3. **Upload to Hostinger**:
   - Access Hostinger File Manager or SFTP for `myaurevella.in`.
   - Upload the **contents** of `frontend/dist/` into `public_html/`.
   - Ensure the `.htaccess` file is visible in `public_html/` (enable "Show hidden files" in file manager).
4. **HTTPS SSL Certificate**:
   - In Hostinger hPanel, verify that Lifetime Free SSL (Let's Encrypt) is installed and active for `myaurevella.in` and `www.myaurevella.in`.
   - Enable "Force HTTPS Redirect" in hPanel.

---

## 5. Backend Deployment & Process Management

Depending on the client's Hostinger tier:

### Scenario A: Hostinger Cloud / VPS (Recommended)
1. **Node.js Environment**:
   - Install Node.js LTS (v20.x or v22.x).
2. **Clone & Install**:
   ```bash
   cd /var/www/aurevella-backend
   npm ci --omit=dev
   ```
3. **Configure Environment**:
   - Copy `.env.example` to `.env` and fill all production secrets.
   - Run environment verification:
     ```bash
     npm run check-env
     ```
4. **Process Manager (PM2)**:
   ```bash
   npm install -g pm2
   pm2 start server.js --name "aurevella-api" -i max
   pm2 save
   pm2 startup
   ```
5. **Reverse Proxy (Nginx / LiteSpeed)**:
   - Route `https://api.myaurevella.in` to `http://127.0.0.1:5000`.
   - Ensure `X-Forwarded-For` and `X-Forwarded-Proto` headers are passed.

### Scenario B: Hostinger Shared Hosting (Decision Pending)
> [!NOTE]
> **DECISION PENDING**: If the client has a standard Hostinger Shared/Web Hosting plan without Node.js daemon support, the Express API cannot run natively on that plan. The frontend can remain on Hostinger, but the backend API should be deployed to a dedicated Node.js service (such as Render, Railway, DigitalOcean App Platform, or a Hostinger KVM VPS) pointed to the DNS record `api.myaurevella.in`.

---

## 6. Post-Deployment Smoke Test Checklist

Execute these 10 real checks immediately following production deployment:

- [ ] **1. SSL & Security Headers**: Load `https://myaurevella.in` in browser; verify green padlock, HTTPS redirect, and absence of mixed content warnings.
- [ ] **2. Static Asset Delivery**: Verify `/robots.txt` and `/sitemap.xml` return HTTP 200 plain text/XML without rewrite to `index.html`.
- [ ] **3. SPA Routing Fallback**: Navigate directly to `https://myaurevella.in/shop` and refresh browser; verify page re-renders correctly (HTTP 200, no 404).
- [ ] **4. Backend Health Check**: Perform `GET https://api.myaurevella.in/api/health`; verify response `{ "status": "ok", "database": "connected" }`.
- [ ] **5. CORS Preflight Check**: Open browser developer console on storefront; execute `fetch('https://api.myaurevella.in/api/products')`; verify HTTP 200 with `access-control-allow-origin: https://myaurevella.in`.
- [ ] **6. Authentication Lifecycle**:
  - Sign up with a new customer email.
  - Verify `httpOnly` cookie `token` is set with `Secure; SameSite=Lax`.
  - Log out; verify cookie is cleared.
- [ ] **7. Concierge Contact Form**:
  - Submit an inquiry via `https://myaurevella.in/contact`.
  - Verify success notification and verify record appears in admin inquiries (`/admin?tab=inquiries`).
- [ ] **8. Admin Role Guard**:
  - Attempt accessing `/admin` as normal customer $\rightarrow$ verify immediate redirect and 403 Forbidden.
  - Log in with designated admin credentials $\rightarrow$ access Atelier Dashboard, Products, Orders, and Inquiries.
- [ ] **9. Razorpay Gateway Modal**:
  - Add product to bag, enter shipping address, proceed to checkout payment step.
  - Verify Razorpay payment modal opens in live mode with correct rupee amount (`amount_in_paise / 100`).
- [ ] **10. Webhook Delivery**:
  - In Razorpay Dashboard $\rightarrow$ Webhooks, trigger a test ping to `https://api.myaurevella.in/api/payments/webhook`; verify HTTP 200 response and cryptographic verification.
