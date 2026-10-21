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
