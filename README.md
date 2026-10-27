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

**Frontend:** React 19 · TypeScript · Vite 5 · Tailwind CSS v4 · Chart.js

**Testing:** pytest · httpx (integration tests + database-free security tests) · GitHub Actions CI

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
│   ├── main.py              # App init, middleware, security headers, router registration
│   ├── db.py                # Database engine factory (TLS, statement timeout)
│   ├── dependencies.py      # Shared: API engine, rate limiter, validation helpers
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
├── .github/                 # CI workflow and Dependabot config
├── frontend/
│   ├── vercel.json          # Security headers (CSP, framing, referrer)
│   └── src/
│       ├── components/      # Header, AIInsight, chart components
│       ├── hooks/useApi.ts
│       ├── lib/             # constants, chartConfig, utils
│       └── types/api.ts
├── tests/
│   ├── conftest.py
│   ├── test_api.py          # Integration tests (need a database)
│   └── test_security.py     # Security tests (no database needed)
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

## Railway Memory Notes

Low-traffic portfolio demo with a tight Railway memory budget.

- `--limit-max-requests 500` is set in both `Procfile` and `railway.json` so uvicorn recycles the worker periodically. Bounds SlowAPI's in-memory storage (IP × bucket × timestamps) from growing unbounded on public endpoints.
- SQLAlchemy engines from `app/db.py` use `pool_pre_ping=True` and `pool_recycle=1800` to rotate stale connections.
- `pandas` lives in `requirements.txt` for the ETL scripts in `src/` and `scripts/` only. **Do not `import pandas` from inside `app/`** — it would add ~150 MB of resident memory to the web service for no runtime benefit (the ETL runs in separate Railway cron services).
- No `APScheduler` or background tasks in the web service. If you add one, revisit `--limit-max-requests` because worker recycles will kill it.

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

| Variable | Needed by | Description |
|---|---|---|
| `DATABASE_URL` | API, ETL | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | API only | Claude API key for AI insights |
| `REFRESH_SECRET` | API only | Secret for the manual data refresh endpoint |
| `CORS_ORIGINS` | API only | Allowed frontend origins (exact, no wildcard) |

The ETL cron services only need `DATABASE_URL`: they import `app/db.py`, never the API's secrets.

---

## Security & Data Handling

This is a portfolio demo, but it runs in production on the public internet, so it is built and operated like one.

**Credentials**
- Secrets live only in Railway environment variables; `.env` is git-ignored and `.env.example` holds placeholders. Git history contains no real credentials.
- GitHub secret scanning and push protection are enabled; the published frontend bundle contains no keys (only the public API URL).
- Each service gets only the secrets it needs: the ETL services run with the database URL alone.
- The admin refresh endpoint compares its secret in constant time and is hidden from the public API docs.

**Database**
- Every query is parameterized; geography inputs are checked against a fixed allow-list.
- Remote connections require TLS (`sslmode=require`), and API queries are capped by a 10-second `statement_timeout`.
- Database errors are logged server-side and never returned to the client.
- The database holds only public, aggregated Statistics Canada and Bank of Canada data — no personal data.

**API and abuse protection**
- Per-client rate limiting (Railway's `X-Real-IP`), with a tighter limit on the AI endpoint; duplicate inputs are dropped before building the AI prompt.
- CORS allows only the dashboard's origin, read-only (`GET`), without credentials.
- Security headers on the API (`nosniff`, `DENY` framing, no referrer) and the frontend (Content-Security-Policy, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`).

**Privacy**
- No accounts, cookies, analytics or trackers.
- Fonts are self-hosted, so visiting the dashboard sends no data to third parties such as Google.
- The AI feature sends only public aggregate statistics to Anthropic — never anything about the visitor.

**Supply chain**
- Exact version pins for every dependency, a committed lockfile, and Dependabot for weekly updates.
- CI on every push and pull request: `pip-audit`, security tests, lint and a production build. GitHub Actions are pinned to commit SHAs with a read-only token.

**Known limitations (next steps)**
- The API should connect with a read-only database role over Railway's private network instead of the default role over the public proxy.
- Rate-limit counters are in memory and reset when the worker recycles; a shared store (e.g. Redis) would be needed at real traffic levels.

---

## Running Tests

```bash
pytest tests/                       # all tests (integration tests need DATABASE_URL)
pytest tests/test_security.py      # security tests, no database needed
```

---

## Author

**Moises Vivas** — Data and analytics tools · Python · SQL · React · AI-assisted development · Toronto, Canada

- GitHub: [github.com/moisesvivass](https://github.com/moisesvivass)
- LinkedIn: [linkedin.com/in/moisesvivas](https://linkedin.com/in/moisesvivas)
