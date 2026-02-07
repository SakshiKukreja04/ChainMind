<p align="center">
  <img src="https://img.shields.io/badge/ChainMind-AI%20Powered%20Supply%20Chain-blueviolet?style=for-the-badge&logo=brain&logoColor=white" alt="ChainMind" />
</p>

<h1 align="center">ChainMind</h1>

<p align="center">
  <b>AI-Powered Supply Chain Management Platform for SMEs</b><br/>
  <i>3-Layer Intelligence · Cryptographic Audit Trails · Cooperative Buying</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Python-Flask-3776AB?logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/XGBoost-ML-FF6600?logo=xgboost&logoColor=white" />
  <img src="https://img.shields.io/badge/Groq-LLaMA%203.3--70B-4B0082" />
  <img src="https://img.shields.io/badge/Socket.IO-Realtime-010101?logo=socket.io&logoColor=white" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [3-Layer AI/ML Intelligence System](#3-layer-aiml-intelligence-system)
  - [Layer 1 — XGBoost ML Engine](#layer-1--xgboost-ml-engine)
  - [Layer 2 — Proactive Reorder Intelligence](#layer-2--proactive-reorder-intelligence)
  - [Layer 3 — LLM Context Awareness](#layer-3--llm-context-awareness)
- [Audit & Cryptography Layer](#audit--cryptography-layer)
- [Cooperative Buying](#cooperative-buying)
- [Data Model](#data-model)
- [User Roles & Access](#user-roles--access)
- [End-to-End Flow](#end-to-end-flow)
- [API Endpoints](#api-endpoints)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [License](#license)

---

## Overview

**ChainMind** is a full-stack, AI-powered supply chain management platform purpose-built for Small & Medium Enterprises (SMEs). It replaces manual stock monitoring and guesswork-based purchasing with an intelligent, automated system that:

- **Predicts demand** using an XGBoost ML model trained on 16 engineered features
- **Enriches predictions** with real-world context via a Large Language Model (Groq LLaMA 3.3-70B)
- **Automates reorder decisions** with proactive nudges, auto-suggestions, and vendor scoring
- **Guarantees order integrity** through a blockchain-inspired SHA-256 hash chain audit trail
- **Enables cooperative buying** across businesses for bulk purchasing power

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT (React + Vite)                        │
│  SME Owner Dashboard │ Inventory Manager │ Vendor Portal            │
│  TailwindCSS · Shadcn/UI · React Router v6 · TanStack React Query  │
└──────────┬──────────────────────┬───────────────────────┬───────────┘
           │ REST API             │ Socket.IO              │
           ▼                     ▼                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     SERVER (Node.js + Express)                       │
│                                                                      │
│  Auth (JWT+bcrypt) │ 13 Controllers │ 14 Services │ RBAC Middleware  │
│  Socket.IO Server  │ Cron Scheduler │ Nudge Scanner                  │
│                                                                      │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────────┐   │
│  │ Audit Trail Svc  │  │ AI Service Client│  │ LLM Context Svc   │   │
│  │ SHA-256 Chain    │  │ HTTP → Flask ML  │  │ Groq API Client   │   │
│  └─────────────────┘  └───────┬──────────┘  └───────────────────┘   │
└──────────┬────────────────────┼─────────────────────┬───────────────┘
           │                    │                     │
           ▼                    ▼                     ▼
┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐
│  MongoDB Atlas   │  │ AI Microservice  │  │  External APIs     │
│  14 Collections  │  │ Python Flask     │  │  Groq Cloud (LLM)  │
│                  │  │ XGBoost Model    │  │  Postmark (Email)  │
│                  │  │ 16 Features      │  │                    │
└──────────────────┘  └──────────────────┘  └────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18, TypeScript, Vite | Single-page application with role-based routing |
| **UI** | TailwindCSS, Shadcn/UI | Component library with responsive design |
| **State** | TanStack React Query, React Context | Server state caching and auth state management |
| **Backend** | Node.js, Express.js | REST API with 13 route groups |
| **Database** | MongoDB Atlas, Mongoose ODM | 14 document collections with indexes |
| **Real-time** | Socket.IO | Live notifications, AI suggestion events, vendor score updates |
| **ML Engine** | Python Flask, XGBoost, scikit-learn | Demand forecasting microservice |
| **LLM** | Groq Cloud, LLaMA 3.3-70B-versatile | Real-world context detection for demand adjustment |
| **Auth** | JWT, bcrypt | Token-based authentication with role middleware |
| **Email** | Postmark | Transactional vendor emails (reorder confirmations, delivery acks) |
| **Crypto** | SHA-256 (Node.js crypto) | Hash-chained immutable audit logs |
| **Reports** | PDFKit | PDF export for business reports |

---

## Features

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **AI Demand Forecasting** | XGBoost model with 16 engineered features predicts daily demand per product |
| **LLM Context Enrichment** | Groq LLaMA detects health outbreaks, festivals, weather events — boosts demand up to +35% |
| **Auto Reorder Suggestions** | Triggers automatically when stock drops below threshold with smart debouncing |
| **AI Nudge System** | 6-hourly scanner identifies forgotten low-stock products, sends proactive alerts |
| **Cryptographic Audit Trail** | SHA-256 hash chain with immutable Mongoose pre-hooks — tamper-proof order history |
| **Cooperative Buying** | Cross-business bulk purchasing matched by SHA-256 product spec hashing |
| **Vendor Scoring** | Real-time reliability scoring with delta updates and full recalculation |
| **Order Lifecycle** | Full status flow: Draft → Approved → Accepted → Dispatched → In Transit → Delivered |
| **Vendor Portal** | Vendors accept/reject orders, manage catalog, track performance, verify blockchain |
| **Reports Engine** | 4 report types (Sales, Inventory, Vendor Performance, Financial) with PDF export |
| **Real-time Notifications** | Socket.IO powered in-app bell notifications + Postmark vendor emails |
| **RBAC** | Role-based access control: Owner, Inventory Manager, Vendor |

---

## 3-Layer AI/ML Intelligence System

ChainMind uses a unique **3-layer intelligence pipeline** where each layer builds upon the previous:

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: XGBoost ML Engine (Python Flask)                       │
│ Sales History → 16 Features → XGBoost → Base Prediction         │
└────────────────────────┬────────────────────────────────────────┘
                         │ predictedDailyDemand, confidence
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3: LLM Context Awareness (Groq LLaMA 3.3-70B)            │
│ Product + City + Industry + Date → Groq API → Context Boost     │
│ Signal: YES/NO, Confidence: 0-1, Reason: explanation            │
│ If YES → demand × (1 + confidence × 0.35) — max +35% uplift    │
└────────────────────────┬────────────────────────────────────────┘
                         │ enrichedPrediction + llmContext
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2: Proactive Reorder Intelligence (Node.js Services)      │
│ Auto-Suggestion · Nudge Scanner · Vendor Scoring · Side-effects │
│ → AiSuggestion persisted → Socket.IO event → Bell notification  │
└─────────────────────────────────────────────────────────────────┘
```

### Layer 1 — XGBoost ML Engine

> **Location:** `ai-service/`

The ML microservice runs as a standalone **Python Flask** server on port 5001.

**Training Pipeline** (`ai-service/services/trainer.py`):
1. Loads real `SalesHistory` data from MongoDB (passed as JSON). Falls back to **synthetic data** if insufficient history (<14 days).
2. Synthetic data generator (`ai-service/utils/synthetic_data.py`) produces realistic daily sales with:
   - Poisson base demand with random variation
   - Weekly seasonality (weekend dip: Saturday 0.80×, Sunday 0.70×)
   - Monthly seasonality (12 monthly factors: summer/festive spikes)
   - City bias multipliers (Mumbai 1.35×, Delhi 1.15×, Chennai 0.85×)
   - Linear trend + Gaussian noise
3. Builds **sliding-window samples** (30-day input windows → next-day demand label)
4. Trains `XGBRegressor` with: `n_estimators=300`, `max_depth=6`, `learning_rate=0.06`, `subsample=0.8`
5. Evaluates with MAE and R² score, persists as `demand_model.pkl`

**16 Engineered Features** (`ai-service/utils/feature_engineering.py`):

| # | Feature | Description |
|---|---------|-------------|
| 1 | `rolling_mean_7` | 7-day moving average of sales |
| 2 | `rolling_mean_14` | 14-day moving average |
| 3 | `rolling_mean_30` | 30-day moving average |
| 4 | `rolling_std_7` | 7-day sales volatility |
| 5 | `rolling_std_14` | 14-day sales volatility |
| 6 | `lag_7` | Sales value 7 days ago |
| 7 | `lag_30` | Sales value 30 days ago |
| 8 | `trend` | Difference between recent-7 mean and first-7 mean |
| 9 | `last_day_sales` | Yesterday's sales |
| 10 | `day_of_week` | 0–6 (Monday–Sunday) |
| 11 | `month` | 1–12 |
| 12 | `week_of_year` | 1–52 |
| 13 | `city_encoded` | Numeric mapping for 5 Indian cities |
| 14 | `current_stock` | Product's current stock level |
| 15 | `lead_time_days` | Vendor's delivery lead time |
| 16 | `stock_demand_ratio` | current_stock / rolling_mean_7 |

**Inference** (`ai-service/services/predictor.py`):
- Extracts features → XGBoost predicts `predictedDailyDemand`
- Calculates `confidence` from rolling coefficient of variation
- Computes `daysToStockout = currentStock / predictedDailyDemand`
- Computes `suggestedReorderQty = leadTimeDays × demand × SAFETY_FACTOR`
- **Heuristic Fallback:** If model unavailable → 7-day simple moving average with lower confidence (0.6)

### Layer 2 — Proactive Reorder Intelligence

> **Location:** `server/src/services/`

Four interconnected Node.js services that orchestrate when and how predictions become actions:

| Service | Role |
|---------|------|
| **Auto-Suggestion** (`autoSuggestionService.js`) | Triggers when stock < threshold. 2-hour debounce, checks for in-flight orders, expires stale suggestions. Calls ML + LLM, persists `AiSuggestion`, emits Socket.IO event, sends bell notifications. |
| **Stock Memory / Nudge** (`stockMemoryService.js`) | In-memory tracker runs every **6 hours**. Finds products ≤1.5× threshold with no manual update in 7+ days. Sends `AI_NUDGE` alerts with urgency levels (critical/warning/info). 48-hour cooldown. |
| **Reorder Intelligence** (`reorderIntelligenceService.js`) | Handles order lifecycle side-effects. On **DELIVERED**: logs SalesHistory → triggers ML retrain → updates stock → emails vendor → notifies all users. On **APPROVED**: emails vendor → notifies business users. |
| **Vendor Score** (`vendorScore.service.js`) | Delta scoring (ON_TIME: +5, DELAYED: -10, CANCELLED: -20). Full recalculation on delivery. Updates reliability score (0-100) + `onTimeDeliveryRate`. Real-time Socket.IO updates. |

### Layer 3 — LLM Context Awareness

> **Location:** `server/src/services/llmContextService.js`

Augments statistical predictions with real-world context that ML cannot capture.

**How it works:**

1. **Prompt Construction:** Builds a detailed prompt including product name, category, city, industry, current date, stock level. Asks: *"Is there a current real-world situation (health outbreaks, festivals, weather, supply disruptions) that would meaningfully increase demand?"*

2. **API Call:** Groq Cloud with `model: "llama-3.3-70b-versatile"`, `temperature: 0.2`, 8-second timeout

3. **Response:** `{ "signal": "YES"|"NO", "confidence": 0.0-1.0, "reason": "brief explanation" }`

4. **Context Boost:** If signal is YES:
   ```
   boostMultiplier = 1 + (confidence × 0.35)     // max +35% uplift
   adjustedDemand  = predictedDailyDemand × boostMultiplier
   adjustedStockout = daysToStockout / boostMultiplier
   adjustedReorderQty = suggestedReorderQty × boostMultiplier
   ```

5. **Failure Safety:** If Groq API is down, key missing, or parse error → returns `{ signal: "NO", confidence: 0 }` — prediction remains unmodified

**Example:**
> Product: "Surgical Masks", City: "Mumbai", Industry: "Healthcare"  
> LLM detects: *"Rising respiratory infections during post-monsoon season"* (confidence: 0.85)  
> ML predicted 50 units/day → boosted to **65 units/day** (+29.75%)

---

## Audit & Cryptography Layer

ChainMind implements a **blockchain-inspired cryptographic audit trail** that guarantees tamper-proof order tracking.

> **Location:** `server/src/services/auditTrail.service.js` + `server/src/models/AuditLog.model.js`

### How the Hash Chain Works

```
                         ┌─────────────────────────────┐
Step 1: Snapshot         │ buildOrderSnapshot()         │
                         │ Order → canonical JSON       │
                         │ (sorted keys, deterministic) │
                         └─────────────┬───────────────┘
                                       │
Step 2: Chain Lookup     ┌─────────────▼───────────────┐
                         │ Find previous AuditLog entry │
                         │ for this orderId             │
                         │ previousHash (or "0x0")      │
                         └─────────────┬───────────────┘
                                       │
Step 3: Compute Hash     ┌─────────────▼───────────────┐
                         │ SHA-256(canonicalJSON +      │
                         │         previousHash)        │
                         │ Prefix with "0x"             │
                         └─────────────┬───────────────┘
                                       │
Step 4: Persist          ┌─────────────▼───────────────┐
                         │ AuditLog {                   │
                         │   orderId, action,           │
                         │   dataHash: "0xabc123...",   │
                         │   previousHash: "0x789...",  │
                         │   orderSnapshot: {...},      │
                         │   status: "VERIFIED"         │
                         │ }                            │
                         └─────────────────────────────┘
```

### Chain Formation

```
Entry 1 (CREATED):    prev = "0x0"            → hash₁ = SHA-256(snapshot₁ + "0x0")
Entry 2 (APPROVED):   prev = hash₁            → hash₂ = SHA-256(snapshot₂ + hash₁)
Entry 3 (DISPATCHED): prev = hash₂            → hash₃ = SHA-256(snapshot₃ + hash₂)
Entry 4 (DELIVERED):  prev = hash₃            → hash₄ = SHA-256(snapshot₄ + hash₃)
```

**Each entry's hash depends on ALL previous entries** — tampering with any single record breaks the entire chain.

### Immutability Enforcement

Mongoose pre-hooks on the `AuditLog` schema **throw errors** on any mutation attempt:
- `updateOne` → Error: *"Audit logs are immutable"*
- `findOneAndUpdate` → Error
- `deleteOne` → Error
- `findOneAndDelete` → Error

### Verification

**`verifyOrderChain(orderId)`** walks all entries oldest → newest, recomputes every SHA-256 hash, and compares:
- **Match** → `VERIFIED` ✅
- **Mismatch** → `TAMPERED` ❌

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/audit/logs` | List audit entries (filtered by business) |
| GET | `/api/audit/verify/:orderId` | Verify entire order chain |
| GET | `/api/audit/verify/entry/:entryId` | Verify single entry |

### Frontend

Both SME Owners and Vendors can view and verify audit chains through dedicated **Blockchain** pages in their respective dashboards.

---

## Cooperative Buying

A unique cross-business feature that enables SMEs to combine purchasing power.

**How it works:**

1. **Product Matching:** Products are matched across businesses using a **SHA-256 hash** of normalized `(productName + category + unitSize)` — ensuring only identical products are grouped

2. **Group Formation:** Any business owner can create a cooperative buy request. Other businesses with matching specs can discover and join.

3. **Participant Approval:** The initiator approves/rejects participants.

4. **Vendor Selection:** When a vendor is selected, an actual `Order` document is created with a `cooperativeBuyId` link, pricing is calculated from vendor catalog or product cost.

5. **Lifecycle:** The order follows the standard flow (Approved → Dispatched → Delivered), with **all participants across all businesses** receiving notifications at each stage.

**Status Flow:** `PROPOSED` → `APPROVED` → `ORDERED` → `DELIVERED` (or `CANCELLED`)

---

## Data Model

ChainMind uses **14 MongoDB collections**:

| Collection | Key Fields | Purpose |
|-----------|------------|---------|
| **User** | name, email, role (`OWNER`/`MANAGER`/`VENDOR`), businessId, vendorEntityId | Authentication & authorization |
| **Business** | businessName, industry, location, currency, ownerId | Company profile |
| **Product** | sku, currentStock, minThreshold, costPrice, sellingPrice, stockHistory[], vendorId | Inventory tracking |
| **Order** | status (10 states), vendorAction, totalValue, cooperativeBuyId, timestamps | Order lifecycle |
| **Vendor** | reliabilityScore (0-100), leadTimeDays, performanceMetrics, status | Supplier management |
| **VendorProduct** | vendorId, pricing, availability | Vendor catalog |
| **AiSuggestion** | predictedDailyDemand, daysToStockout, suggestedReorderQty, confidence, method, llmContext | ML predictions |
| **AuditLog** | dataHash, previousHash, orderSnapshot, action — **IMMUTABLE** | Cryptographic audit trail |
| **Alert** | type (LOW_STOCK/OUT_OF_STOCK/STOCK_CORRECTED), severity | Stock alerts |
| **Notification** | type (REORDER_ALERT/AI_NUDGE/STOCK_UPDATE/ORDER_STATUS), read | In-app notifications |
| **SalesHistory** | productId, city, dailySales — feeds ML training | Historical sales data |
| **CooperativeBuy** | productSpecHash, participants[], status, selectedVendorId | Cross-business buying groups |
| **ReportSnapshot** | reportType, data, TTL (1 hour) | Cached reports |
| **ReportSchedule** | cronExpression, reportType | Automated report scheduling |

---

## User Roles & Access

| Role | Access | Key Capabilities |
|------|--------|-----------------|
| **SME Owner** | `/sme/*` | Dashboard, analytics, AI insights, order approvals, blockchain audit, reports, cooperative buying, settings |
| **Inventory Manager** | `/inventory/*` | Products, orders, vendors, alerts, AI suggestions, reports |
| **Vendor** | `/vendor/*` | Incoming orders (accept/reject/delay), delivery updates, catalog, performance, blockchain verification |

**RBAC Middleware:** `ownerOnly`, `managerOnly`, `vendorOnly`, `ownerOrManager` — enforced at the route level.

---

## End-to-End Flow

```
 ┌── SIGNUP ──┐    ┌── PRODUCTS ──┐    ┌── STOCK DROPS ──┐
 │ Owner      │ →  │ Add products │ →  │ Below threshold  │
 │ registers  │    │ Set min      │    │                  │
 │ + Business │    │ thresholds   │    │                  │
 └────────────┘    └──────────────┘    └───────┬──────────┘
                                               │
                  ┌────────────────────────────┐│
                  │ AI AUTO-TRIGGERS           ││
                  │ 1. Flask ML → XGBoost      │◄┘
                  │ 2. Groq LLM → context boost│
                  │ 3. AiSuggestion created    │
                  │ 4. Socket.IO + notification │
                  └─────────────┬──────────────┘
                                │
 ┌── REVIEW ──┐    ┌── ORDER ──┐│   ┌── APPROVE ──┐
 │ Owner sees │ →  │ Create    │◄┘→ │ Owner       │
 │ AI suggest │    │ order     │    │ approves    │
 │ with LLM   │    │ (DRAFT)   │    │ + audit log │
 │ reasoning  │    │           │    │ + vendor    │
 └────────────┘    └───────────┘    │   email     │
                                    └──────┬──────┘
                                           │
 ┌── VENDOR ──────────────────────────────┐│
 │ Accepts order → DISPATCHED → IN_TRANSIT│◄┘
 │ → DELIVERED                            │
 │ (audit entry at EACH transition)       │
 └───────────────────┬────────────────────┘
                     │
 ┌── POST-DELIVERY ──▼──────────────────────┐
 │ • Stock auto-updated                     │
 │ • SalesHistory logged (ML training data) │
 │ • ML retrain triggered (background)      │
 │ • Vendor score recalculated              │
 │ • Delivery ack email to vendor           │
 │ • Notifications to all business users    │
 │ • Full audit chain complete & verifiable │
 └──────────────────────────────────────────┘
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register owner + create business |
| POST | `/api/auth/login` | Login → JWT token |

### Products & Inventory
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/products` | CRUD product management |
| PATCH | `/api/products/:id/stock` | Stock adjustment |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/orders` | Create and list orders |
| PATCH | `/api/orders/:id/approve` | Owner approval |
| PATCH | `/api/orders/:id/vendor-action` | Vendor accept/reject/delay |
| PATCH | `/api/orders/:id/delivery-status` | Update dispatch/transit/delivered |

### AI & Predictions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/predict/:productId` | Trigger demand forecast |
| GET | `/api/ai/suggestions` | List AI suggestions |

### Vendors
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/vendors` | Vendor management |
| PATCH | `/api/vendors/:id/approve` | Approve vendor onboarding |
| GET | `/api/vendor/products` | Vendor catalog |

### Audit (Blockchain)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/audit/logs` | List audit entries |
| GET | `/api/audit/verify/:orderId` | Verify full order chain |
| GET | `/api/audit/verify/entry/:entryId` | Verify single entry |

### Cooperative Buying
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/cooperative` | List/create cooperative groups |
| POST | `/api/cooperative/:id/join` | Join a group |
| POST | `/api/cooperative/:id/select-vendor` | Select vendor → creates order |

### Reports & Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/:type` | Generate report (PDF/JSON) |
| GET | `/api/notifications` | List user notifications |
| PATCH | `/api/notifications/:id/read` | Mark as read |

### AI Microservice (Flask)
| Method | Endpoint | Port | Description |
|--------|----------|------|-------------|
| POST | `/predict-demand` | 5001 | XGBoost demand forecast |
| POST | `/retrain` | 5001 | Trigger model retraining |
| GET | `/health` | 5001 | Health check |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.10
- **MongoDB Atlas** account (or local MongoDB)
- **Groq API Key** (free at [console.groq.com](https://console.groq.com))
- **Postmark API Key** (optional — for vendor emails)

### 1. Clone the Repository

```bash
git clone https://github.com/SakshiKukreja04/ChainMind.git
cd ChainMind
```

### 2. Start the Backend Server

```bash
cd server
npm install
# Create .env file (see Environment Variables below)
npm start
```

Server starts on `http://localhost:5000`

### 3. Start the AI Microservice

```bash
cd ai-service
pip install -r requirements.txt
python app.py
```

Flask server starts on `http://localhost:5001`. The model auto-trains on first launch.

### 4. Start the Frontend

```bash
cd Client
npm install    # or: bun install
npm run dev
```

Client starts on `http://localhost:5173`

---

## Environment Variables

Create a `.env` file in the `server/` directory:

```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/chainmind
JWT_SECRET=your-secret-key

# AI Microservice
ML_SERVICE_URL=http://localhost:5001

# LLM Context (Layer 3)
GROQ_API_KEY=gsk_your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile

# Email Notifications (optional)
POSTMARK_SERVER_TOKEN=your-postmark-token
EMAIL_FROM=noreply@yourdomain.com
```

---

## Project Structure

```
ChainMind/
├── Client/                          # React Frontend
│   └── src/
│       ├── App.tsx                  # Role-based routing (SME/Manager/Vendor)
│       ├── contexts/AuthContext.tsx  # JWT auth state management
│       ├── components/              # Reusable UI (Shadcn/UI, charts, layout)
│       ├── hooks/                   # useSocket, useNotifications, use-toast
│       ├── pages/
│       │   ├── sme/                 # Owner: Dashboard, AI Insights, Blockchain, Coop
│       │   ├── inventory/           # Manager: Products, Orders, Alerts, AI Suggestions
│       │   └── vendor/              # Vendor: Orders, Delivery, Catalog, Performance
│       ├── lib/api.ts               # Axios HTTP client
│       └── types/index.ts           # TypeScript interfaces
│
├── server/                          # Node.js Backend
│   └── src/
│       ├── app.js                   # Express app + 13 route mounts
│       ├── server.js                # Bootstrap: DB → Socket.IO → Nudge → Scheduler
│       ├── config/                  # db.js (Mongoose), env.js (environment)
│       ├── models/                  # 14 Mongoose schemas
│       ├── controllers/             # 13 REST controllers
│       ├── routes/                  # 13 route groups
│       ├── services/                # 14 business logic services
│       │   ├── aiService.js         # HTTP client to Flask ML
│       │   ├── llmContextService.js # Groq LLM integration (Layer 3)
│       │   ├── auditTrail.service.js# SHA-256 hash chain (Audit layer)
│       │   ├── autoSuggestionService.js # Auto AI suggestions (Layer 2)
│       │   ├── stockMemoryService.js    # Nudge scanner (Layer 2)
│       │   ├── reorderIntelligenceService.js # Lifecycle side-effects (Layer 2)
│       │   ├── vendorScore.service.js   # Reliability scoring
│       │   ├── cooperativeService.js    # Cooperative buying logic
│       │   ├── notificationService.js   # In-app + Socket.IO notifications
│       │   ├── vendorEmailService.js    # Postmark transactional emails
│       │   └── report.service.js        # 4 report types with aggregation
│       ├── middleware/              # auth.middleware.js, role.middleware.js
│       ├── sockets/                 # Socket.IO server initialization
│       └── utils/                   # productSpecHash.js, pdfExporter.js
│
├── ai-service/                      # Python ML Microservice
│   ├── app.py                       # Flask factory + auto-train on startup
│   ├── config.py                    # XGBoost hyperparameters
│   ├── requirements.txt             # Python dependencies
│   ├── services/
│   │   ├── predictor.py             # XGBoost inference + heuristic fallback
│   │   └── trainer.py               # Training pipeline (real + synthetic data)
│   ├── utils/
│   │   ├── feature_engineering.py   # 16 engineered features
│   │   └── synthetic_data.py        # Realistic sales data generator
│   └── routes/
│       └── predict.py               # /predict-demand, /health, /retrain
│
└── README.md                        # You are here
```

---

## License

This project is developed as part of an academic/research initiative. All rights reserved.

---

<p align="center">
  Built with ❤️ by the ChainMind Team
</p>
