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
