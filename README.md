# Canada Labour Market Analysis

Full-stack labour market dashboard — React + TypeScript + FastAPI + PostgreSQL. Dual-source ETL from Statistics Canada and Bank of Canada APIs with AI-generated insights.

**Live Dashboard:** https://canada-labour-market-analysis.vercel.app  
**API:** https://web-production-6f4de.up.railway.app

---

## Overview

A full-stack dashboard reporting Canadian employment trends by province (2020–2026) using live data from Statistics Canada and the Bank of Canada. The backend runs automated ETL pipelines on a scheduled basis, stores normalized data in PostgreSQL, and serves a React frontend with AI-generated narrative insights per chart.

---

## Stack

**Backend:** Python 3.12 · FastAPI · SQLAlchemy · PostgreSQL · Pandas · APScheduler · Claude Haiku · slowapi

**Frontend:** React 18 · TypeScript · Vite 5 · Tailwind CSS v4 · shadcn/ui

**Testing:** pytest · httpx (14+ integration tests)

**Deploy:** Railway (backend + DB) · Vercel (frontend)

---

## Data Sources

| Source | Tables / Series | Refresh Schedule |
|---|---|---|
| Statistics Canada API | 14100287 — Unemployment by province | 1st of each month |
| Statistics Canada API | 14100355 — Employment by industry | 1st of each month |
| Bank of Canada Valet API | V39079 — Overnight rate | 2nd of each month |
| Bank of Canada Valet API | STATIC_INFLATIONCALC — CPI | 2nd of each month |

---

## Features

- Automated ETL pipelines from two government APIs
- APScheduler-driven data refresh (StatsCan on the 1st, Bank of Canada on the 2nd)
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
│   ├── main.py              # App init, middleware, scheduler, router registration
│   ├── dependencies.py      # Shared: engine, limiter, helpers
│   └── routers/
│       ├── unemployment.py
│       ├── industries.py
│       ├── insights.py
│       ├── summary.py
│       ├── macro.py         # Bank of Canada endpoints
│       └── admin.py
├── src/
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
├── .env.example
├── requirements.txt
└── Procfile
```

---

## Setup

### Backend

```bash
git clone https://github.com/moisesvivass/canada-labour-market-analysis
cd canada-labour-market-analysis
pip install -r requirements.txt
cp .env.example .env  # add your DATABASE_URL and ANTHROPIC_API_KEY
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Running Tests

```bash
pytest tests/
```

---

## Author

**Moises Vivas** — Operations professional building data tools and web applications with Python and AI-assisted development · Toronto, Canada

- GitHub: [github.com/moisesvivass](https://github.com/moisesvivass)
