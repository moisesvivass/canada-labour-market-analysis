from fastapi import FastAPI, Request
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(title="Canada Labour Market Dashboard")

templates = Jinja2Templates(directory="app/templates")
app.mount("/static", StaticFiles(directory="app/static"), name="static")

engine = create_engine(os.getenv('DATABASE_URL'))

@app.get("/")
async def dashboard(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/unemployment")
async def get_unemployment():
    query = text("""
        SELECT
            geography,
            TO_CHAR(ref_date, 'YYYY-MM') AS month,
            value AS unemployment_rate
        FROM unemployment_monthly
        ORDER BY ref_date, geography
    """)
    with engine.connect() as conn:
        rows = conn.execute(query).fetchall()

    data = {"Canada": [], "Ontario": [], "Alberta": [], "labels": []}
    labels_set = []

    for row in rows:
        month = row[1]
        if month not in labels_set:
            labels_set.append(month)
        data[row[0]].append(row[2])

    data["labels"] = labels_set
    return data

@app.get("/api/industries")
async def get_industries():
    query = text("""
        WITH base_2023 AS (
            SELECT industry, ROUND(AVG(value)::numeric, 0) AS employment_2023
            FROM employment_by_industry
            WHERE geography = 'Canada'
            AND ref_date BETWEEN '2023-01-01' AND '2023-12-01'
            GROUP BY industry
        ),
        current_2026 AS (
            SELECT industry, ROUND(AVG(value)::numeric, 0) AS employment_2026
            FROM employment_by_industry
            WHERE geography = 'Canada'
            AND ref_date = '2026-02-01'
            GROUP BY industry
        )
        SELECT
            b.industry,
            b.employment_2023,
            c.employment_2026,
            ROUND(((c.employment_2026 - b.employment_2023) / b.employment_2023 * 100)::numeric, 1) AS pct_change
        FROM base_2023 b
        JOIN current_2026 c ON b.industry = c.industry
        WHERE b.industry != 'Total employed, all industries'
        ORDER BY pct_change DESC
    """)
    with engine.connect() as conn:
        rows = conn.execute(query).fetchall()

    return {
        "industries": [r[0].split('[')[0].strip() for r in rows],
        "pct_change": [float(r[3]) for r in rows]
    }

@app.get("/api/ontario-gap")
async def get_ontario_gap():
    query = text("""
        SELECT
            TO_CHAR(ref_date, 'YYYY-MM') AS month,
            MAX(CASE WHEN geography = 'Canada' THEN value END) AS canada_rate,
            MAX(CASE WHEN geography = 'Ontario' THEN value END) AS ontario_rate,
            ROUND((MAX(CASE WHEN geography = 'Ontario' THEN value END) -
            MAX(CASE WHEN geography = 'Canada' THEN value END))::numeric, 1) AS ontario_gap
        FROM unemployment_monthly
        WHERE ref_date >= '2022-01-01'
        GROUP BY ref_date
        ORDER BY ref_date
    """)
    with engine.connect() as conn:
        rows = conn.execute(query).fetchall()

    return {
        "labels": [r[0] for r in rows],
        "canada": [float(r[1]) for r in rows],
        "ontario": [float(r[2]) for r in rows],
        "gap": [float(r[3]) for r in rows]
    }