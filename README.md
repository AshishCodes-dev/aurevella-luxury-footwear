# AUREVELLA — Luxury Footwear E-Commerce

A luxury footwear e-commerce platform crafted with a modern, scalable web stack.

> **Note on Development Workflow**: Development for this project is executed strictly phase-by-phase. Phase 0A establishes the foundation setup only (no features, authentication, catalog, cart, or payment systems).

---

## 📁 Folder Structure

```text
AureVeLla/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js
│   │   ├── controllers/
│   │   │   └── .gitkeep
│   │   ├── middleware/
│   │   │   └── .gitkeep
│   │   ├── models/
│   │   │   └── .gitkeep
│   │   ├── routes/
│   │   │   └── .gitkeep
│   │   ├── utils/
│   │   │   └── .gitkeep
│   │   └── app.js
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── docs/
│   └── PHASE_LOG.md
├── .gitignore
└── README.md
```

---

## ⚙️ Prerequisites

- **Node.js**: v20+ LTS (Tested on v24.15.0)
- **npm**: v10+ (Tested on v12.0.0)
- **Git**: v2+ (Tested on v2.55.0)
- **MongoDB**: Active MongoDB instance or MongoDB Atlas cluster connection string

---

## 🚀 Setup Steps

### 1. Clone & Navigate
```bash
git clone https://github.com/AshishCodes-dev/aurevella-luxury-footwear.git
cd AureVeLla
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
```
Open `backend/.env` and supply your actual credentials (especially `MONGODB_URI`).

### 3. Frontend Setup
```bash
cd ../frontend
npm install
cp .env.example .env
```
Ensure `VITE_API_URL` points to your running backend (`http://localhost:5000` by default).

---

## 🏃 Run Commands

### Backend
```bash
cd backend

# Start development server with live reload (nodemon)
npm run dev

# Start production server
npm start
```
The backend server starts on `http://localhost:5000` (or the configured `PORT`).
- Health Check: `GET http://localhost:5000/api/health`

### Frontend
```bash
cd frontend

# Start development server (Vite)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```
The frontend Vite server typically runs at `http://localhost:5173`.

---

## 🔐 Environment Variables

Environment files (`.env`) contain local configuration and credentials. They are ignored by Git for security.

### Backend (`backend/.env.example`)
| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Port the backend server listens on | `5000` |
| `NODE_ENV` | Runtime environment (`development` or `production`) | `development` |
| `MONGODB_URI` | MongoDB connection URI | Required |
| `CLIENT_URL` | Allowed origin for CORS | `http://localhost:5173` |
| `JWT_SECRET` | Secret key for JWT signing *(Used in later phases)* | — |
| `RAZORPAY_KEY_ID` | Razorpay payment key ID *(Used in later phases)* | — |
| `RAZORPAY_KEY_SECRET` | Razorpay payment key secret *(Used in later phases)* | — |

### Frontend (`frontend/.env.example`)
| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base URL of the backend API | `http://localhost:5000` |

---

## 🏗️ Architecture & Stack

- **Frontend**: React, Vite, Tailwind CSS (ES Modules, plain JavaScript)
- **Backend**: Node.js, Express, Mongoose (MongoDB), Helmet, Morgan, CORS (ES Modules, plain JavaScript)

---

## 📚 Documentation

Comprehensive architectural and planning specifications are maintained in the [`docs/`](docs/) directory:

- [**Documentation Index**](docs/README.md) (`docs/README.md`) — Overview and directory of all project specifications.
- [**Project Requirements**](docs/PROJECT_REQUIREMENTS.md) (`docs/PROJECT_REQUIREMENTS.md`) — Functional requirements (FR-1 to FR-40), non-functional standards, and client questions.
- [**System Architecture**](docs/ARCHITECTURE.md) (`docs/ARCHITECTURE.md`) — System topology diagrams, REST API endpoint catalog, Razorpay flows, and deployment options.
- [**Database Schema**](docs/DATABASE_SCHEMA.md) (`docs/DATABASE_SCHEMA.md`) — MongoDB collections, field constraints, compound indexes, and order lifecycle rules.
- [**Security Plan**](docs/SECURITY_PLAN.md) (`docs/SECURITY_PLAN.md`) — Authentication (httpOnly cookies), bcrypt, Razorpay HMAC defense, rate limiting, and threat matrix.
- [**Testing Plan**](docs/TESTING_PLAN.md) (`docs/TESTING_PLAN.md`) — End-to-end verification checklists, negative edge cases, bug report template, and sign-off criteria.
- [**Design System**](docs/DESIGN_SYSTEM.md) (`docs/DESIGN_SYSTEM.md`) — Brand philosophy, luxury color tokens, Cormorant Garamond typography scale, and responsive guidelines.
- [**Phase Execution Log**](docs/PHASE_LOG.md) (`docs/PHASE_LOG.md`) — Detailed audit logs and milestone verification records for each project phase.
