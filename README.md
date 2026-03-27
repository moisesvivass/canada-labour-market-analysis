# Canada Labour Market Analysis (2020–2026)

[![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-blue?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-analytics-blue?logo=postgresql)](https://postgresql.org)
[![Claude AI](https://img.shields.io/badge/Claude-Haiku-orange)](https://anthropic.com)

Interactive dashboard tracking Canada's labour market trends (2020–2026). ETL pipeline from Statistics Canada, REST API with FastAPI, React + TypeScript frontend, deployed on Railway and Vercel.

## 🚀 Live

| | URL |
|---|---|
| 📊 Frontend | [canada-labour-market-analysis.vercel.app](https://canada-labour-market-analysis.vercel.app) |
| 🔌 Backend API | [web-production-6f4de.up.railway.app](https://web-production-6f4de.up.railway.app) |
| 🤖 AI Insights | Powered by Claude Haiku — click "Analyze" on any chart |
| 📅 Data updated | Automatically every 1st of the month via Statistics Canada API |

**The problem:** Canada's labour market data is publicly available but scattered across Statistics Canada tables, making it hard to quickly understand employment trends by province or industry.

**What this solves:** An end-to-end pipeline that ingests official Statistics Canada data, loads it into PostgreSQL, and surfaces the answers through an interactive React dashboard with AI-generated insights per chart.

## 📊 What This Project Does

- **ETL Pipeline:** Extracts raw CSV data from Statistics Canada (tables 14100287 and 14100355), transforms and filters it with Pandas, and loads it into PostgreSQL. Automatic monthly scheduler via APScheduler fetches live data from the StatCan API on the 1st of every month
- **REST API:** FastAPI backend with APIRouter — 5 routers covering unemployment, industries, summary, insights, and admin endpoints
- **React Dashboard:** React 18 + TypeScript + Vite 5 + Tailwind CSS v4 + shadcn/ui — 4 interactive charts with province/industry filters
- **AI Insights:** Claude Haiku generates contextual analysis per chart on demand
- **Integration Tests:** 14 tests with pytest + httpx covering all API endpoints

## 🗂️ Data Sources

| Table | Description |
|---|---|
| `14100287` | Monthly unemployment rate by province |
| `14100355` | Monthly employment by industry (NAICS classification) |

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
│   ├── main.py                 # FastAPI app entry point
│   ├── dependencies.py         # Shared DB dependencies
│   └── routers/
│       ├── admin.py            # Manual refresh endpoint
│       ├── industries.py       # Employment by industry
│       ├── insights.py         # Claude AI insights
│       ├── summary.py          # Summary stats
│       └── unemployment.py     # Unemployment by province
├── frontend/
│   └── src/
│       ├── App.tsx
│       ├── components/
│       │   ├── AIInsight.tsx
│       │   ├── Header.tsx
│       │   └── charts/
│       │       ├── CompareChart.tsx
│       │       ├── IndustryChart.tsx
│       │       ├── ProvincialGapChart.tsx
│       │       └── UnemploymentChart.tsx
│       ├── hooks/useApi.ts
│       ├── lib/                # chartConfig, chartSetup, constants, utils
│       └── types/api.ts
├── src/
│   └── statcan_fetcher.py      # Live StatCan API fetcher + APScheduler
├── scripts/
│   └── manual_etl.py           # One-time ETL for initial data load
├── tests/
│   ├── conftest.py
│   └── test_api.py             # 14 integration tests
├── data/raw/                   # Original StatCan CSV files
├── notebooks/                  # Exploratory analysis
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
# Production: https://your-app.onrender.com
CORS_ORIGINS=http://localhost:5173
```

Run the ETL to load initial data:
```bash
python scripts/manual_etl.py
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

14 integration tests covering all routers — unemployment, industries, summary, insights, and admin endpoints.

## 🔄 Manual Data Refresh

To trigger an immediate data refresh from the StatCan API:
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