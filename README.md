# Canada Labour Market Analysis

Full-stack labour market dashboard — React + TypeScript + FastAPI + PostgreSQL. Dual-source ETL from Statistics Canada and Bank of Canada APIs with AI-generated insights.

**Live Dashboard:** https://canada-labour-market-analysis.vercel.app  
**API:** https://web-production-6f4de.up.railway.app

---

## Overview

A full-stack dashboard reporting Canadian employment trends by province (2020–2026) using live data from Statistics Canada and the Bank of Canada. The backend runs automated ETL pipelines via Railway cron services, stores normalized data in PostgreSQL, and serves a React frontend with AI-generated narrative insights per chart.

---

## Stack

**Backend:** Python 3.12 · FastAPI · SQLAlchemy · PostgreSQL · Pandas · Claude Haiku · slowapi

**Frontend:** React 18 · TypeScript · Vite 5 · Tailwind CSS v4 · shadcn/ui

**Testing:** pytest · httpx (14+ integration tests)

**Deploy:** Railway (backend + DB + cron services) · Vercel (frontend)

---

## Data Sources

| Source | Tables / Series | Refresh Schedule |
|---|---|---|
| Statistics Canada API | 14100287 — Unemployment by province | 1st, 8th, 15th of each month |
| Statistics Canada API | 14100355 — Employment by industry | 1st, 8th, 15th of each month |
| Bank of Canada Valet API | V39079 — Overnight rate | 2nd, 9th, 16th of each month |
| Bank of Canada Valet API | STATIC_INFLATIONCALC — CPI | 2nd, 9th, 16th of each month |

---

## Features

- Automated ETL pipelines from two government APIs via Railway cron services
- Multi-province dashboard (Canada, Ontario, Alberta) with interactive charts
- AI-generated narrative insights per chart (Claude Haiku)
- Macroeconomic overlay: overnight rate vs. unemployment correlation
- KPI cards: Employment Rate, Participation Rate, monthly unemployment delta
- Rate limiting via slowapi
- 14+ integration tests covering all critical endpoints

**Industries tracked:** Total employed · Construction · Manufacturing · Professional/Scientific/Technical Services · Health Care · Wholesale/Retail Trade · Transportation/Warehousing · Public Administration

---

## Project Structure

```
canada-labour-market-analysis/
├── app/
│   ├── main.py              # App init, middleware, router registration
│   ├── dependencies.py      # Shared: engine, limiter, helpers
│   └── routers/
│       ├── unemployment.py
│       ├── industries.py
│       ├── insights.py
│       ├── summary.py
│       ├── macro.py         # Bank of Canada endpoints
│       └── admin.py
├── src/
│   ├── etl.py               # Standalone ETL runner — invoked by Railway cron services
│   ├── statcan_fetcher.py   # StatsCan ETL + API fetcher
│   └── boc_fetcher.py       # Bank of Canada Valet API fetcher
├── frontend/
│   └── src/
│       ├── components/      # Header, AIInsight, chart components
│       ├── hooks/useApi.ts
│       ├── lib/             # constants, chartConfig, utils
│       └── types/api.ts
├── tests/
│   ├── conftest.py
│   └── test_api.py
├── railway.json             # Web service config (uvicorn)
├── railway.boc.json         # Cron config — Bank of Canada ETL
├── railway.statcan.json     # Cron config — Statistics Canada ETL
├── .env.example
├── requirements.txt
└── Procfile
```

---

## Railway Cron Services

ETL runs are handled by two dedicated Railway cron services, each pointing to its own config file:

| Service | Config File | Schedule | Command |
|---|---|---|---|
| `bountiful-liberation` | `src/railway.statcan.json` | `0 6 1,8,15 * *` | `python src/etl.py statcan` |
| `unique-nature` | `src/railway.boc.json` | `0 6 2,9,16 * *` | `python src/etl.py boc` |

The ETL runner (`src/etl.py`) can also be run locally:

```bash
python src/etl.py statcan
python src/etl.py boc
python src/etl.py all
```

---

## Setup

### Backend

```bash
git clone https://github.com/moisesvivass/canada-labour-market-analysis
cd canada-labour-market-analysis
pip install -r requirements.txt
cp .env.example .env  # add your environment variables
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | Claude API key for AI insights |
| `REFRESH_SECRET` | Secret key for manual data refresh endpoint |
| `CORS_ORIGINS` | Allowed frontend origins |

In Railway, `DATABASE_URL` and `REFRESH_SECRET` are configured as shared variables available to all services including cron jobs.

---

## Running Tests

```bash
pytest tests/
```

---

## Author

**Moises Vivas** — AI Application Developer · Python · FastAPI · React · PostgreSQL · Claude API · Toronto, Canada

- GitHub: [github.com/moisesvivass](https://github.com/moisesvivass)
- LinkedIn: [linkedin.com/in/moisesvivas](https://linkedin.com/in/moisesvivas)
