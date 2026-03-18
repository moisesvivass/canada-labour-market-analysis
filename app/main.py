from fastapi import FastAPI, Request, Query
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from typing import Optional
import anthropic
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
async def get_unemployment(
    geo: Optional[str] = Query(None),
    year_from: Optional[int] = Query(None),
    year_to: Optional[int] = Query(None)
):
    conditions = ["1=1"]
    if geo and geo != "all":
        conditions.append(f"geography = '{geo}'")
    if year_from:
        conditions.append(f"EXTRACT(YEAR FROM ref_date) >= {year_from}")
    if year_to:
        conditions.append(f"EXTRACT(YEAR FROM ref_date) <= {year_to}")

    where = " AND ".join(conditions)

    query = text(f"""
        SELECT
            geography,
            TO_CHAR(ref_date, 'YYYY-MM') AS month,
            value AS unemployment_rate
        FROM unemployment_monthly
        WHERE {where}
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
        if row[0] in data:
            data[row[0]].append(float(row[2]))

    data["labels"] = labels_set
    return data

@app.get("/api/industries")
async def get_industries(
    geo: Optional[str] = Query(default="Canada"),
    year_from: Optional[int] = Query(default=2023),
    year_to: Optional[int] = Query(default=2026)
):
    query = text(f"""
        WITH base AS (
            SELECT industry, ROUND(AVG(value)::numeric, 0) AS employment_base
            FROM employment_by_industry
            WHERE geography = '{geo}'
            AND EXTRACT(YEAR FROM ref_date) = {year_from}
            GROUP BY industry
        ),
        current AS (
            SELECT industry, ROUND(AVG(value)::numeric, 0) AS employment_current
            FROM employment_by_industry
            WHERE geography = '{geo}'
            AND EXTRACT(YEAR FROM ref_date) = {year_to}
            GROUP BY industry
        )
        SELECT
            b.industry,
            b.employment_base,
            c.employment_current,
            ROUND(((c.employment_current - b.employment_base) / b.employment_base * 100)::numeric, 1) AS pct_change
        FROM base b
        JOIN current c ON b.industry = c.industry
        WHERE b.industry != 'Total employed, all industries'
        ORDER BY pct_change DESC
    """)

    with engine.connect() as conn:
        rows = conn.execute(query).fetchall()

    return {
        "industries": [r[0].split('[')[0].strip() for r in rows],
        "pct_change": [float(r[3]) for r in rows],
        "base": [float(r[1]) for r in rows],
        "current": [float(r[2]) for r in rows]
    }

@app.get("/api/ontario-gap")
async def get_ontario_gap(
    year_from: Optional[int] = Query(default=2022),
    year_to: Optional[int] = Query(default=2026)
):
    query = text(f"""
        SELECT
            TO_CHAR(ref_date, 'YYYY-MM') AS month,
            MAX(CASE WHEN geography = 'Canada' THEN value END) AS canada_rate,
            MAX(CASE WHEN geography = 'Ontario' THEN value END) AS ontario_rate,
            ROUND((MAX(CASE WHEN geography = 'Ontario' THEN value END) -
            MAX(CASE WHEN geography = 'Canada' THEN value END))::numeric, 1) AS ontario_gap
        FROM unemployment_monthly
        WHERE EXTRACT(YEAR FROM ref_date) BETWEEN {year_from} AND {year_to}
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

@app.get("/api/compare")
async def compare_periods(
    geo: Optional[str] = Query(default="Canada"),
    year_a: Optional[int] = Query(default=2023),
    year_b: Optional[int] = Query(default=2026)
):
    query = text(f"""
        SELECT
            TO_CHAR(ref_date, 'MM') AS month_num,
            TO_CHAR(ref_date, 'Mon') AS month_name,
            EXTRACT(YEAR FROM ref_date) AS year,
            value
        FROM unemployment_monthly
        WHERE geography = '{geo}'
        AND EXTRACT(YEAR FROM ref_date) IN ({year_a}, {year_b})
        ORDER BY year, ref_date
    """)

    with engine.connect() as conn:
        rows = conn.execute(query).fetchall()

    data = {str(year_a): [], str(year_b): [], "labels": []}
    labels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    data["labels"] = labels

    for row in rows:
        year_key = str(int(row[2]))
        if year_key in data:
            data[year_key].append(float(row[3]))

    return data

@app.get("/api/insights")
async def get_insights(
    chart: str = Query(...),
    geo: str = Query(default="Canada"),
    year_from: int = Query(default=2020),
    year_to: int = Query(default=2026),
    extra: str = Query(default=""),
    full: bool = Query(default=False)
):
    with engine.connect() as conn:
        if chart == "unemployment":
            rows = conn.execute(text(f"""
                SELECT geography, TO_CHAR(ref_date, 'YYYY-MM') as month, value
                FROM unemployment_monthly
                WHERE geography = '{geo}'
                AND EXTRACT(YEAR FROM ref_date) BETWEEN {year_from} AND {year_to}
                ORDER BY ref_date
            """)).fetchall()
            data_summary = f"Unemployment rate for {geo} — ONLY the period {year_from} to {year_to}:\n"
            data_summary += f"Start: {rows[0][2]}% ({rows[0][1]})\n"
            data_summary += f"End: {rows[-1][2]}% ({rows[-1][1]})\n"
            data_summary += f"Peak: {max(r[2] for r in rows)}%\n"
            data_summary += f"Low: {min(r[2] for r in rows)}%\n"
            data_summary += f"Total change: {round(rows[-1][2] - rows[0][2], 1)} percentage points\n"
            data_summary += f"Number of months analyzed: {len(rows)}\n"
            data_summary += "Monthly data: " + ", ".join([f"{r[1]}:{r[2]}%" for r in rows])

        elif chart == "compare":
            parts = extra.split(",") if extra else ["2023", "2026"]
            year_a, year_b = parts[0], parts[1]
            rows_a = conn.execute(text(f"""
                SELECT TO_CHAR(ref_date, 'Mon') as month, value
                FROM unemployment_monthly
                WHERE geography = '{geo}'
                AND EXTRACT(YEAR FROM ref_date) = {year_a}
                ORDER BY ref_date
            """)).fetchall()
            rows_b = conn.execute(text(f"""
                SELECT TO_CHAR(ref_date, 'Mon') as month, value
                FROM unemployment_monthly
                WHERE geography = '{geo}'
                AND EXTRACT(YEAR FROM ref_date) = {year_b}
                ORDER BY ref_date
            """)).fetchall()
            avg_a = sum(r[1] for r in rows_a) / len(rows_a) if rows_a else 0
            avg_b = sum(r[1] for r in rows_b) / len(rows_b) if rows_b else 0
            data_summary = f"Year comparison for {geo} — ONLY {year_a} vs {year_b}:\n"
            data_summary += f"{year_a} average: {round(avg_a, 1)}%\n"
            data_summary += f"{year_b} average: {round(avg_b, 1)}%\n"
            data_summary += f"Change: {round(avg_b - avg_a, 1)} percentage points\n"
            if rows_a:
                data_summary += f"{year_a} monthly: " + ", ".join([f"{r[0]}:{r[1]}%" for r in rows_a]) + "\n"
            if rows_b:
                data_summary += f"{year_b} monthly: " + ", ".join([f"{r[0]}:{r[1]}%" for r in rows_b])

        elif chart == "gap":
            rows = conn.execute(text(f"""
                SELECT TO_CHAR(ref_date, 'YYYY-MM') as month,
                MAX(CASE WHEN geography = 'Canada' THEN value END) as canada,
                MAX(CASE WHEN geography = 'Ontario' THEN value END) as ontario
                FROM unemployment_monthly
                WHERE EXTRACT(YEAR FROM ref_date) BETWEEN {year_from} AND {year_to}
                GROUP BY ref_date ORDER BY ref_date
            """)).fetchall()
            gaps = [round(r[2] - r[1], 1) for r in rows if r[1] and r[2]]
            data_summary = f"Ontario vs Canada gap — ONLY {year_from} to {year_to}:\n"
            data_summary += f"Current gap: {gaps[-1]} pts\n"
            data_summary += f"Max gap: {max(gaps)} pts\n"
            data_summary += f"Average gap: {round(sum(gaps)/len(gaps), 1)} pts\n"
            data_summary += "Monthly gaps: " + ", ".join([f"{r[0]}:{round(r[2]-r[1],1)}pts" for r in rows if r[1] and r[2]])

        elif chart == "industry":
            rows = conn.execute(text(f"""
                WITH base AS (
                    SELECT industry, ROUND(AVG(value)::numeric, 0) AS emp_base
                    FROM employment_by_industry
                    WHERE geography = '{geo}'
                    AND EXTRACT(YEAR FROM ref_date) = {year_from}
                    GROUP BY industry
                ),
                curr AS (
                    SELECT industry, ROUND(AVG(value)::numeric, 0) AS emp_curr
                    FROM employment_by_industry
                    WHERE geography = '{geo}'
                    AND EXTRACT(YEAR FROM ref_date) = {year_to}
                    GROUP BY industry
                )
                SELECT b.industry,
                    ROUND(((c.emp_curr - b.emp_base) / b.emp_base * 100)::numeric, 1) AS pct_change
                FROM base b JOIN curr c ON b.industry = c.industry
                WHERE b.industry != 'Total employed, all industries'
                ORDER BY pct_change DESC
            """)).fetchall()
            data_summary = f"Industry employment change in {geo} — ONLY {year_from} vs {year_to}:\n"
            for r in rows:
                data_summary += f"{r[0].split('[')[0].strip()}: {r[1]:+}%\n"

    prompt = (
        "You are a sharp, opinionated Canadian labour market economist. "
        "You don't hedge, you don't repeat the obvious, you always find the angle nobody else is talking about.\n\n"
        f"Data:\n{data_summary}\n\n"
        "CRITICAL RULES:\n"
        "1. Analyze ONLY the specific period and data provided above. Do NOT reference any other time periods.\n"
        "2. Every claim must be directly supported by the numbers above. No invented trends.\n"
        "3. If the data only covers a short period, say what you can honestly say about that period only.\n\n"
        "Write exactly this structure, separated by the marker [MORE]:\n"
        "BEFORE [MORE]: One punchy sentence capturing the real story of THIS specific period. "
        "Then on a new line write: → followed by one brutal specific implication for Canadian workers based on THIS data.\n"
        "AFTER [MORE]: Two more paragraphs going deeper into THIS period only. "
        "Who won, who lost, what the numbers reveal. Bold specific predictions grounded only in what the data shows.\n\n"
        "Rules: No bullet points. No em-dashes. No hedging. "
        "Use specific numbers from the data above. Plain text only. "
        "Write like you are briefing a smart busy executive who has zero patience for corporate speak."
    )

    client = anthropic.Anthropic()
    message = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}]
    )

    return {"insight": message.content[0].text}