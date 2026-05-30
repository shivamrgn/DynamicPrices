# Enterprise Dynamic Pricing Engine (DPE)

> AI-powered real-time pricing optimization platform. Combines Prophet + XGBoost demand forecasting, price elasticity analysis, and a Q-Learning reinforcement agent to maximize profit margins automatically.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│  Next.js 15 · React 18 · TypeScript · Tailwind · Zustand   │
│                                                             │
│  ┌──────────────┐  ┌─────────────────────────────────────┐ │
│  │  Sidebar Nav │  │         Page Content Area           │ │
│  │  ─────────── │  │  Dashboard / Competitor / Revenue / │ │
│  │  Command Ctr │  │  Forecasting / Inventory+Approvals  │ │
│  │  Competitor  │  └─────────────────────────────────────┘ │
│  │  Revenue     │                                          │
│  │  Forecast    │                                          │
│  │  Inventory   │                                          │
│  └──────────────┘                                          │
└────────────────────────────┬────────────────────────────────┘
                             │ REST API (axios)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                              │
│          FastAPI · Uvicorn · Motor (Async) · Pydantic       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   API Layer                         │   │
│  │  /dashboard  /products  /competitors  /forecasting  │   │
│  │  /inventory  /elasticity  /rl  /prices              │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
│  ┌──────────────────────┴──────────────────────────────┐   │
│  │                   ML / AI Layer                     │   │
│  │                                                     │   │
│  │  ┌───────────────┐  ┌──────────────┐  ┌─────────┐  │   │
│  │  │   Forecaster  │  │  Elasticity  │  │ Q-Agent │  │   │
│  │  │ Prophet+XGBst │  │  Log-Log OLS │  │Tabular  │  │   │
│  │  └───────────────┘  └──────────────┘  │Q-Learning│  │   │
│  │                                        └─────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  APScheduler Jobs                                    │  │
│  │  ├── competitor_scraper  (every 2 hours)             │  │
│  │  ├── rl_decision_job     (every 4 hours)             │  │
│  │  └── forecast_refresh    (every 24 hours)            │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────┘
                             │
          ┌──────────────────┴────────────────────┐
          ▼                                       ▼
┌─────────────────┐                   ┌──────────────────────┐
│    MongoDB 7    │                   │     Redis Cache       │
│  dynamic_pricing│                   │  (response caching)  │
│  ─────────────  │                   └──────────────────────┘
│  products       │
│  price_history  │
│  sales_history  │
│  comp_prices    │
│  forecasts      │
│  rl_decisions   │
└─────────────────┘
```

---

## File Structure

```
dynamic-pricing-engine/
├── docker-compose.yml
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env
│   ├── mongo-init.js
│   └── app/
│       ├── main.py                  ← FastAPI app entry point
│       ├── core/
│       │   ├── config.py            ← Pydantic settings
│       │   └── scheduler.py         ← APScheduler jobs
│       ├── db/
│       │   ├── mongodb.py           ← Motor async client + indexes
│       │   └── seed.py              ← Sample data generator
│       ├── api/routes/
│       │   ├── dashboard.py
│       │   ├── products.py
│       │   ├── prices.py
│       │   ├── competitors.py
│       │   ├── forecasting.py
│       │   ├── elasticity.py
│       │   ├── inventory.py
│       │   └── rl_engine.py
│       ├── ml/
│       │   ├── forecasting/
│       │   │   └── prophet_xgb.py   ← Ensemble forecaster
│       │   ├── elasticity/
│       │   │   └── engine.py        ← Price elasticity OLS
│       │   └── reinforcement/
│       │       └── q_agent.py       ← Q-Learning RL agent
│       ├── scrapers/
│       │   └── competitor_scraper.py ← Multi-strategy scraper
│       ├── services/
│       │   ├── pricing_service.py
│       │   └── forecasting_service.py
│       └── schemas/
│           └── models.py            ← All Pydantic schemas
│
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── next.config.js
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── .env.local
    └── src/
        ├── app/
        │   ├── layout.tsx           ← Root layout with sidebar
        │   ├── globals.css          ← Tailwind + custom styles
        │   ├── page.tsx             ← Dashboard (Command Center)
        │   ├── competitor/page.tsx  ← Competitor Radar
        │   ├── revenue/page.tsx     ← Revenue & Trends
        │   ├── forecasting/page.tsx ← Demand Forecasting
        │   └── inventory/page.tsx   ← Inventory + AI Approvals
        ├── components/
        │   ├── layout/
        │   │   ├── Sidebar.tsx
        │   │   └── TopBar.tsx
        │   ├── charts/
        │   │   ├── RevenueChart.tsx
        │   │   ├── CompetitorMatrix.tsx
        │   │   ├── CompetitorTrendChart.tsx
        │   │   ├── ForecastChart.tsx
        │   │   ├── SeasonalChart.tsx
        │   │   └── MarginTrendChart.tsx
        │   ├── ui/
        │   │   └── index.tsx        ← Reusable components
        │   └── shared/
        │       └── QueryProvider.tsx
        ├── lib/
        │   └── api.ts               ← Axios API client
        └── store/
            └── appStore.ts          ← Zustand global state
```

---

## Setup Instructions

### Option C: GitHub self-hosted runner deployment (Docker Compose)

This uses the GitHub Actions workflow in `.github/workflows/deploy.yml` to run `docker compose up -d --build` on a self-hosted runner.

1) Register a self-hosted runner labeled `self-hosted` and `linux`.
2) Add these repo secrets in GitHub:
   - `MONGODB_URL`
   - `REDIS_URL`
   - `SECRET_KEY`
   - `ENVIRONMENT`
   - `NEXT_PUBLIC_API_URL` (e.g. `http://YOUR_BACKEND_HOST:8000`)
3) Push commits to `main`.

Docs: `.github/README_DEPLOY_SELF_HOSTED.md`

### Option A: Docker Compose (Recommended)

**Prerequisites:** Docker 24+ and Docker Compose v2+

```bash
# 1. Clone / place the project
cd dynamic-pricing-engine

# 2. Start all services
docker compose up -d --build

# 3. Seed the database with sample data
docker exec dpe_backend python -m app.db.seed

# 4. Access the app
open http://localhost:3000       # Frontend
open http://localhost:8000/api/docs  # API docs (Swagger)
```

That's it. All 4 services (MongoDB, Redis, Backend, Frontend) start automatically.

---

### Option B: Local Development

#### 1. MongoDB & Redis (via Docker)

```bash
# MongoDB
docker run -d --name dpe_mongo \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=dpe_secret_2024 \
  -e MONGO_INITDB_DATABASE=dynamic_pricing \
  -p 27017:27017 \
  mongo:7.0

# Redis
docker run -d --name dpe_redis -p 6379:6379 redis:7.2-alpine
```

#### 2. Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env .env.local  # Already has correct defaults for local dev

# Seed database
python -m app.db.seed

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```

Backend runs at: `http://localhost:8000`
API docs at: `http://localhost:8000/api/docs`

#### 3. Frontend

```bash
cd frontend

# Install packages
npm install

# Start dev server
npm run dev
```

Frontend runs at: `http://localhost:3000`

---

## Database Schema

### `products`
```json
{
  "_id": ObjectId,
  "sku": "DYSON-V15",
  "name": "Dyson V15 Detect",
  "category": "appliances",
  "brand": "Dyson",
  "current_price": 52999,
  "cost_price": 38000,
  "min_price": 44000,
  "max_price": 62000,
  "stock_quantity": 87,
  "status": "active",
  "tags": ["appliances", "dyson"],
  "created_at": ISODate,
  "last_updated": ISODate
}
```

### `price_history`
```json
{
  "product_id": "string",
  "price": 52999,
  "ai_price": 54500,
  "action": "increase",
  "reason": "Competitor stockout detected",
  "manual_override": false,
  "confidence": 0.91,
  "timestamp": ISODate
}
```

### `competitor_prices`
```json
{
  "product_id": "string",
  "competitor_name": "amazon",
  "competitor_price": 55000,
  "our_price": 52999,
  "price_delta": 2001,
  "price_delta_pct": 3.77,
  "in_stock": true,
  "scraped_at": ISODate,
  "url": "https://amazon.in/..."
}
```

### `rl_decisions`
```json
{
  "product_id": "string",
  "product_name": "Dyson V15",
  "sku": "DYSON-V15",
  "action": "increase",
  "current_price": 52999,
  "recommended_price": 54599,
  "price_change_pct": 3.02,
  "expected_profit_impact": 4.2,
  "expected_revenue_impact": 8.1,
  "reasoning": "Low inventory supports price premium...",
  "confidence": 0.883,
  "approved": false,
  "created_at": ISODate
}
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | System health check |
| GET | `/api/dashboard/overview` | KPIs, revenue chart, live decisions |
| GET | `/api/dashboard/live-feed` | Real-time decision stream |
| GET | `/api/products/` | Paginated product list |
| GET | `/api/products/{id}` | Single product |
| POST | `/api/products/` | Create product |
| PATCH | `/api/products/{id}` | Update product |
| GET | `/api/competitors/matrix` | Full competitor price matrix |
| GET | `/api/competitors/summary` | Aggregated competitor stats |
| GET | `/api/competitors/history/{id}` | Price trend history |
| GET | `/api/forecasting/product/{id}` | Demand forecast for product |
| GET | `/api/forecasting/all` | All products forecast summary |
| GET | `/api/elasticity/product/{id}` | Elasticity analysis |
| GET | `/api/inventory/alerts` | Stock alerts with AI prices |
| GET | `/api/rl/decisions` | Pending AI pricing decisions |
| POST | `/api/rl/approve/{id}` | Approve and apply decision |
| POST | `/api/rl/simulate` | Q-Learning sandbox simulation |
| POST | `/api/rl/generate/{id}` | Generate decision for product |
| GET | `/api/prices/history/{id}` | Price change history |
| POST | `/api/prices/update` | Manual price override |

---

## Environment Variables

### Backend (`backend/.env`)
| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URL` | `mongodb://admin:...` | MongoDB connection string |
| `DATABASE_NAME` | `dynamic_pricing` | Database name |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection |
| `SCRAPER_INTERVAL_HOURS` | `2` | Competitor scrape frequency |
| `FORECAST_HORIZON_DAYS` | `30` | Days to forecast ahead |
| `CONFIDENCE_THRESHOLD` | `0.75` | Min confidence to auto-apply |
| `MIN_MARGIN_FLOOR` | `0.08` | Minimum gross margin (8%) |
| `MAX_PRICE_CHANGE_PCT` | `0.25` | Max price change per cycle |
| `RL_LEARNING_RATE` | `0.1` | Q-Learning alpha |
| `RL_DISCOUNT_FACTOR` | `0.95` | Q-Learning gamma |

### Frontend (`frontend/.env.local`)
| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API URL |

---

## Key Design Decisions

### Cold-Start Mitigation
New products with fewer than 14 days of sales data fall back to **category-level demand priors** (`CATEGORY_PRIORS` in `prophet_xgb.py`). This gives the system realistic starting forecasts instead of returning errors.

### Scraper Resilience
The competitor scraper uses a **4-strategy cascade**: structured API → JSON-LD → CSS selectors → cached last-known price. If all strategies fail, it logs the error and skips that product/competitor pair rather than crashing.

### RL Agent Bootstrap
The Q-Learning agent runs 1,000 **simulated training episodes** at startup before any real data is used. This bootstraps the Q-table with reasonable initial values instead of random behavior.

### Pricing Guardrails
Every RL decision is clamped to:
- `product.min_price` ≤ price ≤ `product.max_price`
- price ≥ `cost_price × (1 + MIN_MARGIN_FLOOR)`
- |change| ≤ `MAX_PRICE_CHANGE_PCT` per cycle

Human managers can override these via the approval queue.

---

## Adding Real Scrapers (Production)

In `backend/app/scrapers/competitor_scraper.py`, replace the simulation block in `_scrape_single_competitor()` with real HTTP requests:

```python
async with self.session.get(url) as response:
    html = await response.text()
    price = (
        self._parse_json_ld(html) or
        self._parse_css_selector(html, competitor_name) or
        self._fallback_price(product, competitor_name)
    )
```

Add parsing strategies per competitor site. The fallback chain handles structure changes gracefully.
