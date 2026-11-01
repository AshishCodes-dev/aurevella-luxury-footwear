# AUREVELLA — Production Deployment Runbook & Environment Specification

> **Hostinger & Cloud Architecture**: Comprehensive deployment guide for the AUREVELLA luxury footwear platform (`myaurevella.in`).  
> **Status**: Verified for Production Readiness.

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
| `RAZORPAY_KEY_ID` | Razorpay production merchant key ID. Read by backend and returned to client during order creation. | `rzp_live_xxxxxxxxxxxxxxxx` | **YES** |
| `RAZORPAY_KEY_SECRET` | Razorpay production merchant secret for HMAC SHA-256 signature verification. | `xxxxxxxxxxxxxxxxxxxxxxxx` | **YES** |
| `RAZORPAY_WEBHOOK_SECRET` | Secret configured in Razorpay Webhooks dashboard for verifying payload signatures. | `whsec_xxxxxxxxxxxxxxxxxxxxxxxx` | **YES** |
| `FIREBASE_PROJECT_ID` | Google Cloud / Firebase project identifier. | `aurevella-prod-xxxx` | **YES** |
| `FIREBASE_CLIENT_EMAIL` | Firebase Service Account email address. Required if not using `FIREBASE_SERVICE_ACCOUNT_PATH`. | `firebase-adminsdk-xxxx@aurevella-prod-xxxx.iam.gserviceaccount.com` | Conditional |
| `FIREBASE_PRIVATE_KEY` | Firebase Service Account private key PEM string. Required if not using `FIREBASE_SERVICE_ACCOUNT_PATH`. | `"-----BEGIN PRIVATE KEY-----\nMIIEvg...-----END PRIVATE KEY-----\n"` | Conditional |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Absolute filesystem path to Firebase Service Account JSON keyfile located OUTSIDE the project folder. **The backend and checkEnv strictly reject paths inside the repository** to prevent accidental git leakage. **Preferred over inline keys** in production. | `/home/<user>/secrets/aurevella-firebase.json` | **Preferred** |
| `DISABLE_RATE_LIMITER` | Emergency rate-limit kill switch. **NEVER set in production**. When `NODE_ENV === 'production'`, this switch is strictly IGNORED and logs a security warning. | Do not define in production | **NEVER** in prod |
| `MONGODB_LOCAL_URI` | Development-only fallback connection string for local MongoDB instances. | `mongodb://127.0.0.1:27017/aurevella` | Dev only |
| `MONGODB_TEST_URI` | Test-suite-only connection string strictly targeting isolated `aurevella_test` database. | `mongodb://127.0.0.1:27017/aurevella_test` | Test only |
| `USE_LOCAL_DB` | Development/testing switch forcing connection to local DB instead of Atlas. | `false` | Dev/Test only |

> [!NOTE]
> **Razorpay Public Key Handling**: The frontend does **NOT** read `VITE_RAZORPAY_KEY_ID` from build environment variables. Instead, when a customer initiates checkout, the backend route `POST /api/payments/create-order` dynamically and securely supplies `{ keyId: process.env.RAZORPAY_KEY_ID, razorpayOrderId, amount, currency }` to the frontend `Razorpay()` checkout modal.

### B. Admin Provisioning Variables (Used by `npm run seed:admin`)

| Variable Name | Purpose & Description | Example Value | Required for Seed? |
| :--- | :--- | :--- | :--- |
| `ADMIN_SEED_EMAIL` | Unique email address for the initial executive administrator account. Normalized to lowercase. | `concierge@myaurevella.in` | **YES** |
| `ADMIN_SEED_PASSWORD` | Strong password ($\ge$ 8 characters) for Firebase authentication. Required when creating new account or resetting. | `<strong-unique-password>` | Required for new or reset |
| `ADMIN_SEED_NAME` | Display name for the administrative user. Defaults to `Aurevella Admin` if omitted. | `Managing Director` | Optional |
| `CONFIRM_PROD_SEED` | **Mandatory production safety lock**. Must be set to `true` when running seeder in `NODE_ENV=production`. | `true` | **YES** in production |
| `ADMIN_RESET_PASSWORD` | Explicit flag to overwrite existing Firebase admin password. Preserves existing password when omitted or `false`. | `true` | Optional (Reset only) |

### C. Frontend Build-Time Variables (`frontend/.env`)

Baked into the compiled client JavaScript bundle at build time (`npm run build`):

| Variable Name | Purpose & Description | Example Value | Required at Build? |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | Base endpoint for the backend API. Must be a valid remote HTTPS URL in production (e.g. `https://api.myaurevella.in`). Production build strictly FAILS if missing, empty, or pointing to localhost. | `https://api.myaurevella.in` | **YES** |
| `VITE_FIREBASE_API_KEY` | Public Firebase Web API Key for client-side Auth initialization. | `AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | **YES** |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Web Auth domain. | `aurevella-prod-xxxx.firebaseapp.com` | **YES** |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID. | `aurevella-prod-xxxx` | **YES** |
| `VITE_FIREBASE_APP_ID` | Firebase Web Application ID. | `1:xxxxxxxxxxxx:web:xxxxxxxxxxxxxxxx` | **YES** |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Cloud Messaging sender identifier. | `123456789012` | **YES** |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket domain. | `aurevella-prod-xxxx.appspot.com` | Optional |

---

## 3. Executive Admin Provisioning Runbook (`backend/src/utils/seedAdmin.js`)

To create or promote an administrative account safely in production, execute the administrative provisioning utility.

### Step-by-Step Production Provisioning Procedure:
1. SSH into the backend production server.
2. Navigate to the backend directory:
   ```bash
   cd /var/www/aurevella-backend
   ```
3. Execute the seed command with explicit production confirmation:
   ```bash
   CONFIRM_PROD_SEED=true \
   ADMIN_SEED_EMAIL="concierge@myaurevella.in" \
   ADMIN_SEED_PASSWORD="<strong-unique-password>" \
   ADMIN_SEED_NAME="Managing Director" \
   npm run seed:admin
   ```
4. **Expected Console Output**:
   ```text
   [Database] Connected to: ...
   [Firebase] Admin SDK initialized successfully via service account file.
   [SeedAdmin] Found existing Firebase account for concierge@myaurevella.in.
   [SeedAdmin] Preserving existing user credentials (password will not be overwritten).
   [SeedAdmin] Updating existing MongoDB user to admin role...
   [SeedAdmin] SUCCESS: Administrator account [concierge@myaurevella.in] initialized with admin privileges.
   ```
   *(Or `[SeedAdmin] Creating new Firebase account...` and `[SeedAdmin] Creating new MongoDB admin user record...` if provisioning a first-time administrator).*

### Safety Safeguards Enforced by Seeder:
1. **Production Guard**: If `NODE_ENV === 'production'` and `CONFIRM_PROD_SEED !== 'true'`, the seeder immediately aborts:
   `[SeedAdmin] ABORT: Running admin seeder in production environment requires CONFIRM_PROD_SEED=true.`
2. **Email Normalization**: Validates non-empty string and trims/lowercases (`email.trim().toLowerCase()`).
3. **Password Preservation**: If the account already exists in Firebase, the existing password is preserved intact unless `ADMIN_RESET_PASSWORD=true` is explicitly passed with a valid $\ge$ 8 character password.
4. **Identity Conflict Abort**: If a MongoDB user with this email exists but is bound to a different `firebaseUid`, the seeder strictly aborts to prevent identity theft or account clobbering:
   `[SeedAdmin] ABORT: Identity conflict detected. MongoDB user <email> is linked to firebaseUid "<uid1>", but Firebase account has UID "<uid2>". Automatic relinking is blocked for safety.`

---

## 4. Common Deployment Mistakes & Prevention

Here are the top 5 ways an operator or deployment engineer could misconfigure this platform, and how each is prevented:

1. **Building the Frontend with Empty or Localhost `VITE_API_URL`**:
   - *Risk*: Vite bakes environment variables at compilation time. If built without `VITE_API_URL` or with `http://localhost:5000`, customer browsers in production will attempt to send API requests to their own personal computer.
   - *Prevention*: `frontend/vite.config.js` enforces a strict compile-time assertion during production builds (`mode === 'production' && command === 'build'`). The build halts immediately with an error if `VITE_API_URL` is omitted, blank, or contains `localhost`, `127.0.0.1`, or `0.0.0.0`.
2. **Multiline PEM Escaping Errors in `FIREBASE_PRIVATE_KEY`**:
   - *Risk*: Copying raw RSA private keys with real newlines into cloud dashboard environment variables or `.env` files breaks parser tokens, causing Firebase Admin SDK initialization crashes (`Error: Invalid PEM formatted message`).
   - *Prevention*: Set `FIREBASE_SERVICE_ACCOUNT_PATH=/home/<user>/secrets/aurevella-firebase.json` (an absolute path outside the project folder; the backend and checkEnv strictly reject any path resolving inside the project repository). Reading the JSON keyfile directly from the filesystem bypasses string-escaping pitfalls completely.
3. **Omitting `TRUST_PROXY=1` Behind Reverse Proxy (LiteSpeed / Nginx / Cloudflare)**:
   - *Risk*: If `TRUST_PROXY` is missing or `0`, Express cannot read `X-Forwarded-For`. Express sees every request originating from internal loopback IP `127.0.0.1`. All global visitors share a single client IP bucket, triggering false-positive 429 "Too Many Requests" rate limiter lockouts for legitimate customers.
   - *Prevention*: Always set `TRUST_PROXY=1` in production environments behind a reverse proxy.
4. **CORS / Cookie Domain Mismatches**:
   - *Risk*: If `ALLOWED_ORIGINS` is configured as `https://myaurevella.in` but the operator accesses `https://www.myaurevella.in`, or if the API is hosted on a completely different base domain (e.g. `onrender.com`), browsers block `SameSite=Lax` cookies with credentials, preventing user login and cart persistence.
   - *Prevention*: Keep Storefront (`myaurevella.in`) and API (`api.myaurevella.in`) on the same root domain. Always include both apex and `www` origins in `ALLOWED_ORIGINS=https://myaurevella.in,https://www.myaurevella.in`.
5. **Accidental Rate Limiter Disablement in Production**:
   - *Risk*: An operator copies a development `.env` containing `DISABLE_RATE_LIMITER=true` to the production server, leaving the checkout, auth, and contact endpoints unprotected against brute force or volumetric spam.
   - *Prevention*: `backend/src/middleware/rateLimiter.js` and `backend/scripts/checkEnv.js` strictly ignore `DISABLE_RATE_LIMITER` whenever `NODE_ENV === 'production'`. The rate limiter remains fully active, and `checkEnv.js` fails with a fatal error if the variable is detected in production mode.

---

## 5. MongoDB Atlas Infrastructure & Database Runbook

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

## 6. Frontend Build & Hostinger Deployment Steps

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
   - `.htaccess` (Apache/LiteSpeed SPA fallback, HSTS, and caching rules)
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

## 7. Backend Deployment & Process Management

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

### Scenario B: Dedicated Node.js PaaS (Alternative)
If the client holds a Hostinger Shared Web Hosting plan without native Node.js process manager support:
- Deploy backend to a managed Node.js container (Render, Railway, or DigitalOcean App Platform).
- Configure custom domain CNAME: `api.myaurevella.in`.
- Set all production environment variables through the platform dashboard.

---

## 8. Post-Deployment Smoke Test Checklist

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
