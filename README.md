# Canada Labour Market & Macro Dashboard (2020–2026)

[![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-blue?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-analytics-blue?logo=postgresql)](https://postgresql.org)
[![Claude AI](https://img.shields.io/badge/Claude-Haiku-orange)](https://anthropic.com)

Interactive dashboard tracking Canada's labour market and macroeconomic trends (2020–2026). Automated ETL pipelines from Statistics Canada and the Bank of Canada, REST API with FastAPI, React + TypeScript frontend, deployed on Railway and Vercel.

## 🚀 Live

| | URL |
|---|---|
| 📊 Frontend | [canada-labour-market-analysis.vercel.app](https://canada-labour-market-analysis.vercel.app) |
| 🔌 Backend API | [web-production-6f4de.up.railway.app](https://web-production-6f4de.up.railway.app) |
| 🤖 AI Insights | Powered by Claude Haiku — multi-province comparative analysis per chart |
| 📅 Data updated | Automatically — StatCan on the 1st, Bank of Canada on the 2nd of each month |

**The problem:** Canada's labour market and macroeconomic data is publicly available but scattered across Statistics Canada and Bank of Canada sources, making it hard to quickly understand employment trends, monetary policy impact, and regional differences.

**What this solves:** End-to-end automated pipelines that ingest official data from Statistics Canada and the Bank of Canada Valet API, load it into PostgreSQL, and surface the answers through an interactive React dashboard with AI-generated insights per chart.

## 📊 What This Project Does

- **ETL Pipelines:** Two automated pipelines — one for Statistics Canada (tables 14100287 and 14100355), one for the Bank of Canada Valet API (overnight rate + CPI). Both run automatically on a monthly schedule via APScheduler.
- **REST API:** FastAPI backend with APIRouter — 7 routers covering unemployment, industries, labour indicators, macro, summary, insights, and admin endpoints
- **React Dashboard:** React 18 + TypeScript + Vite 5 + Tailwind CSS v4 + shadcn/ui — 5 interactive charts with province/industry filters and 6 real-time KPI cards
- **AI Insights:** Claude Haiku generates contextual analysis per chart on demand — supports multi-province comparative analysis and monetary policy context
- **Integration Tests:** 18 tests with pytest + httpx covering all API endpoints

## 📈 Dashboard KPIs

| Card | Description |
|---|---|
| Canada Unemployment | Latest national unemployment rate with month-over-month delta |
| Employment Rate | Share of population aged 15+ currently employed |
| Participation Rate | Share of population employed or actively seeking work |
| Highest Province | Province with the highest current unemployment rate |
| Jobs Change | Month-over-month net job change across Canada |
| Inflation (CPI YoY) | Year-over-year consumer price index change |

## 📉 Charts

| Chart | Description |
|---|---|
| Unemployment Rate Trend | Monthly unemployment by province (2020–2026), multi-province selection |
| Year-over-Year Comparison | Compare unemployment rates across two years for any province |
| Provincial Gap | Track the unemployment gap between any two provinces over time |
| Industry Winners & Losers | Employment % change by industry between two selected years |
| Interest Rate vs Unemployment | Bank of Canada overnight rate overlaid with unemployment rate — dual Y-axis |

## 🗂️ Data Sources

| Source | Table / Series | Description |
|---|---|---|
| Statistics Canada | `14100287` | Monthly unemployment, employment, and participation rates by province |
| Statistics Canada | `14100355` | Monthly employment by industry (NAICS classification) |
| Bank of Canada Valet API | `V39079` | Target overnight rate (policy interest rate) |
| Bank of Canada Valet API | `STATIC_INFLATIONCALC` | Total Consumer Price Index (CPI) |

Data is seasonally adjusted and covers 11 Canadian provinces from January 2020 onward.

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Language | Python 3.12 |
| ETL | Pandas + SQLAlchemy |
| Database | PostgreSQL |
| API | FastAPI 0.115 + APIRouter |
| Scheduler | APScheduler |
| Frontend | React 18 + TypeScript + Vite 5 |
| Styling | Tailwind CSS v4 + shadcn/ui |
| AI Insights | Claude Haiku (Anthropic) |
| Tests | pytest + httpx |
| Deploy | Railway (backend) + Vercel (frontend) |

## 📁 Project Structure
```
canada-labour-market-analysis/
├── app/
│   ├── main.py                 # FastAPI entry point, CORS, scheduler, rate limiter
│   ├── dependencies.py         # DB engine, Anthropic client, validators
│   └── routers/
│       ├── admin.py            # Manual refresh endpoint (StatCan + BoC)
│       ├── industries.py       # Employment by industry
│       ├── insights.py         # Claude AI insights — multi-province + macro
│       ├── labour_indicators.py # Employment rate + participation rate
│       ├── macro.py            # Overnight rate + CPI endpoints
│       ├── summary.py          # KPI cards — all 6 indicators
│       └── unemployment.py     # Unemployment by province
├── frontend/
│   └── src/
│       ├── App.tsx
│       ├── components/
│       │   ├── AIInsight.tsx   # Shared AI panel — split on [MORE], Read more/Show less
│       │   ├── Header.tsx      # 6 KPI cards with delta indicators
│       │   └── charts/
│       │       ├── CompareChart.tsx
│       │       ├── IndustryChart.tsx
│       │       ├── MacroChart.tsx
│       │       ├── ProvincialGapChart.tsx
│       │       └── UnemploymentChart.tsx
│       ├── hooks/useApi.ts
│       ├── lib/                # chartConfig, constants, utils
│       └── types/api.ts
├── src/
│   ├── statcan_fetcher.py      # StatCan ETL + APScheduler (day 1)
│   └── boc_fetcher.py          # Bank of Canada Valet API + APScheduler (day 2)
├── scripts/
│   └── manual_etl.py           # Manual ETL for local data load
├── tests/
│   ├── conftest.py
│   └── test_api.py             # 18 integration tests
├── .env.example
├── requirements.txt
├── Procfile
└── railway.json
```

## ⚙️ Setup

### Backend
```bash
git clone https://github.com/moisesvivass/canada-labour-market-analysis.git
cd canada-labour-market-analysis
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and fill in your values:
```env
# PostgreSQL connection string
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/canada_labour

# Anthropic API key — required for /api/insights (AI analysis)
# Get yours at https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-...

# Secret header value for /api/admin/refresh
# Set to any strong random string. Callers must send:
#   X-Refresh-Secret: <this value>
REFRESH_SECRET=change-me-to-a-strong-random-string

# Comma-separated list of allowed CORS origins
# Local dev: http://localhost:5173
# Production: https://canada-labour-market-analysis.vercel.app
CORS_ORIGINS=http://localhost:5173
```

Run the ETL to load initial data:
```bash
python -m scripts.manual_etl
```

Start the API:
```bash
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

The frontend expects the backend running at `http://localhost:8000`. To point it at a different URL, set `VITE_API_URL` in a `.env` file inside `frontend/`.

## 🧪 Tests
```bash
pytest tests/ -v
```

18 integration tests covering all routers — unemployment, industries, labour indicators, macro, summary, insights, and admin endpoints.

## 🔄 Manual Data Refresh

To trigger an immediate data refresh from both StatCan and Bank of Canada APIs:
```bash
curl -X POST https://web-production-6f4de.up.railway.app/api/admin/refresh \
  -H "x-refresh-secret: YOUR_REFRESH_SECRET"
```

## 🔍 Industries Tracked

- Total employed, all industries
- Construction
- Manufacturing
- Professional, scientific and technical services
- Health care and social assistance
- Wholesale and retail trade
- Transportation and warehousing
- Public administration

## 👨‍💻 Author

**Moises Vivas** — IT graduate and self-taught developer | Python · Data Analytics · AI integrations

- GitHub: [github.com/moisesvivass](https://github.com/moisesvivass)