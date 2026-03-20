# Canada Labour Market Analysis (2020–2026)

[![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-dashboard-green?logo=fastapi)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-analytics-blue?logo=postgresql)](https://postgresql.org)
[![Claude AI](https://img.shields.io/badge/Claude-AI%20Insights-orange)](https://anthropic.com)

**The problem:** Canada's labour market data is publicly available but scattered across Statistics Canada tables, making it hard to quickly understand employment trends by province or industry.

**What this solves:** An end-to-end pipeline that ingests official Statistics Canada data, loads it into PostgreSQL, and surfaces the answers through an interactive dashboard with AI-generated insights per chart.

End-to-end data analysis of Canada's labour market using official Statistics Canada data, built during the country's worst job crisis since the pandemic. Covers unemployment trends, employment by industry, and provincial comparisons across Canada, Ontario, and Alberta from January 2020 to 2026.

## 📊 What This Project Does

- **ETL Pipeline:** Extracts raw CSV data from Statistics Canada (tables 14100287 and 14100355), transforms and filters it with Pandas, and loads it into PostgreSQL
- **SQL Analytics:** Pre-built queries analyzing unemployment trends, industry-level employment shifts, and provincial comparisons
- **Interactive Dashboard:** FastAPI + Chart.js dashboard with filters, multi-province selection, and dynamic visualizations
- **AI Insights:** Claude AI generates contextual analysis per chart, with expandable "read more" summaries
- **Jupyter Notebooks:** Exploratory data analysis and visualization

## 🗂️ Data Sources

| Table | Description |
|---|---|
| `14100287` | Monthly unemployment rate by province, gender, and age group |
| `14100355` | Monthly employment by industry (NAICS classification) |

Data is seasonally adjusted, filtered for ages 15+, and covers Canada, Ontario, and Alberta from January 2020 onward.

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Language | Python 3.12 |
| ETL | Pandas + SQLAlchemy |
| Database | PostgreSQL |
| API / Dashboard | FastAPI + Jinja2 |
| Charts | Chart.js |
| AI Insights | Anthropic Claude |
| Notebooks | Jupyter |
| Config | python-dotenv |

## 📁 Project Structure

```
canada-labour-market-analysis/
├── src/
│   ├── etl.py                 # Extract, transform, load pipeline
│   └── queries.sql            # SQL analytics queries
├── app/
│   ├── main.py                # FastAPI app + dashboard endpoints
│   ├── static/                # CSS and JS assets
│   └── templates/             # Jinja2 HTML templates
├── notebooks/                 # Jupyter EDA notebooks
├── .env.example               # Environment variable template
└── requirements.txt
```

## ⚙️ Setup

```bash
git clone https://github.com/moisesvivass/canada-labour-market-analysis.git
cd canada-labour-market-analysis
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
```

Create a `.env` file:

```env
DATABASE_URL=postgresql://postgres@localhost:5432/labour_market
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Run the ETL to load data into PostgreSQL:

```bash
python src/etl.py
```

Start the dashboard:

```bash
uvicorn app.main:app --reload
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

**Moises Vivas** — CS graduate building backend systems in Python · Toronto, Canada

- GitHub: [github.com/moisesvivass](https://github.com/moisesvivass)
