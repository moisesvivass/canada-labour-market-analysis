from fastapi import FastAPI, Request, Query, HTTPException
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from typing import Optional
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import anthropic
import os

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable is not set. "
        "Add it to .env (local) or Railway environment variables (production)."
    )
engine = create_engine(DATABASE_URL)

limiter = Limiter(key_func=get_remote_address)
anthropic_client = anthropic.Anthropic()

app = FastAPI(title="Canada Labour Market Dashboard")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

templates = Jinja2Templates(directory="app/templates")
app.mount("/static", StaticFiles(directory="app/static"), name="static")

VALID_GEOS = {"Canada", "Ontario", "Alberta"}


def validate_geo(geo: str) -> None:
    if geo not in VALID_GEOS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid geography '{geo}'. Allowed values: Canada, Ontario, Alberta."
        )


def parse_extra_years(extra: str) -> tuple:
    parts = [p.strip() for p in extra.split(",")]
    if len(parts) != 2:
        raise HTTPException(
            status_code=400,
            detail="'extra' must be exactly two comma-separated years, e.g. '2023,2026'."
        )
    try:
        return int(parts[0]), int(parts[1])
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Both values in 'extra' must be integers."
        )


def run_query(query, error_detail: str = "Database query failed."):
    try:
        with engine.connect() as conn:
            return conn.execute(query).fetchall()
    except Exception:
        raise HTTPException(status_code=500, detail=error_detail)


@app.get("/")
async def dashboard(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/api/unemployment")
async def get_unemployment(
    geo: Optional[str] = Query(None),
    year_from: Optional[int] = Query(None),
    year_to: Optional[int] = Query(None)
):
    if geo and geo != "all":
        validate_geo(geo)

    conditions = ["1=1"]
    params: dict = {}
    if geo and geo != "all":
        conditions.append("geography = :geo")
        params["geo"] = geo
    if year_from:
        conditions.append("EXTRACT(YEAR FROM ref_date) >= :year_from")
        params["year_from"] = year_from
    if year_to:
        conditions.append("EXTRACT(YEAR FROM ref_date) <= :year_to")
        params["year_to"] = year_to

    where = " AND ".join(conditions)
    query = text(f"""
        SELECT
            geography,
            TO_CHAR(ref_date, 'YYYY-MM') AS month,
            value AS unemployment_rate
        FROM unemployment_monthly
        WHERE {where}
        ORDER BY ref_date, geography
    """).bindparams(**params)

    rows = run_query(query, "Database error fetching unemployment data.")

    data = {"Canada": [], "Ontario": [], "Alberta": [], "labels": []}
    labels_set: list = []

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
    validate_geo(geo)

    query = text("""
        WITH base AS (
            SELECT industry, ROUND(AVG(value)::numeric, 0) AS employment_base
            FROM employment_by_industry
            WHERE geography = :geo
            AND EXTRACT(YEAR FROM ref_date) = :year_from
            GROUP BY industry
        ),
        current AS (
            SELECT industry, ROUND(AVG(value)::numeric, 0) AS employment_current
            FROM employment_by_industry
            WHERE geography = :geo
            AND EXTRACT(YEAR FROM ref_date) = :year_to
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
    """).bindparams(geo=geo, year_from=year_from, year_to=year_to)

    rows = run_query(query, "Database error fetching industry data.")

    if not rows:
        return {"industries": [], "pct_change": [], "base": [], "current": []}

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
    query = text("""
        SELECT
            TO_CHAR(ref_date, 'YYYY-MM') AS month,
            MAX(CASE WHEN geography = 'Canada' THEN value END) AS canada_rate,
            MAX(CASE WHEN geography = 'Ontario' THEN value END) AS ontario_rate,
            ROUND((MAX(CASE WHEN geography = 'Ontario' THEN value END) -
            MAX(CASE WHEN geography = 'Canada' THEN value END))::numeric, 1) AS ontario_gap
        FROM unemployment_monthly
        WHERE EXTRACT(YEAR FROM ref_date) BETWEEN :year_from AND :year_to
        GROUP BY ref_date
        ORDER BY ref_date
    """).bindparams(year_from=year_from, year_to=year_to)

    rows = run_query(query, "Database error fetching Ontario gap data.")

    if not rows:
        return {"labels": [], "canada": [], "ontario": [], "gap": []}

    return {
        "labels": [r[0] for r in rows],
        "canada": [float(r[1]) if r[1] is not None else None for r in rows],
        "ontario": [float(r[2]) if r[2] is not None else None for r in rows],
        "gap": [float(r[3]) if r[3] is not None else None for r in rows]
    }


@app.get("/api/compare")
async def compare_periods(
    geo: Optional[str] = Query(default="Canada"),
    year_a: Optional[int] = Query(default=2023),
    year_b: Optional[int] = Query(default=2026)
):
    validate_geo(geo)

    query = text("""
        SELECT
            TO_CHAR(ref_date, 'MM') AS month_num,
            TO_CHAR(ref_date, 'Mon') AS month_name,
            EXTRACT(YEAR FROM ref_date) AS year,
            value
        FROM unemployment_monthly
        WHERE geography = :geo
        AND EXTRACT(YEAR FROM ref_date) IN (:year_a, :year_b)
        ORDER BY year, ref_date
    """).bindparams(geo=geo, year_a=year_a, year_b=year_b)

    rows = run_query(query, "Database error fetching comparison data.")

    data = {str(year_a): [], str(year_b): [], "labels": []}
    labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    data["labels"] = labels

    for row in rows:
        year_key = str(int(row[2]))
        if year_key in data:
            data[year_key].append(float(row[3]))

    return data


@app.get("/api/insights")
@limiter.limit("5/minute")
async def get_insights(
    request: Request,
    chart: str = Query(...),
    geo: str = Query(default="Canada"),
    year_from: int = Query(default=2020),
    year_to: int = Query(default=2026),
    extra: str = Query(default=""),
    full: bool = Query(default=False)
):
    validate_geo(geo)

    try:
        with engine.connect() as conn:
            if chart == "unemployment":
                rows = conn.execute(text("""
                    SELECT geography, TO_CHAR(ref_date, 'YYYY-MM') as month, value
                    FROM unemployment_monthly
                    WHERE geography = :geo
                    AND EXTRACT(YEAR FROM ref_date) BETWEEN :year_from AND :year_to
                    ORDER BY ref_date
                """).bindparams(geo=geo, year_from=year_from, year_to=year_to)).fetchall()

                if not rows:
                    raise HTTPException(status_code=404, detail="No data found for the given parameters.")

                data_summary = f"Unemployment rate for {geo} — ONLY the period {year_from} to {year_to}:\n"
                data_summary += f"Start: {rows[0][2]}% ({rows[0][1]})\n"
                data_summary += f"End: {rows[-1][2]}% ({rows[-1][1]})\n"
                data_summary += f"Peak: {max(r[2] for r in rows)}%\n"
                data_summary += f"Low: {min(r[2] for r in rows)}%\n"
                data_summary += f"Total change: {round(rows[-1][2] - rows[0][2], 1)} percentage points\n"
                data_summary += f"Number of months analyzed: {len(rows)}\n"
                data_summary += "Monthly data: " + ", ".join([f"{r[1]}:{r[2]}%" for r in rows])

            elif chart == "compare":
                year_a, year_b = parse_extra_years(extra) if extra else (2023, 2026)

                rows = conn.execute(text("""
                    SELECT EXTRACT(YEAR FROM ref_date) AS year,
                           TO_CHAR(ref_date, 'Mon') AS month,
                           value
                    FROM unemployment_monthly
                    WHERE geography = :geo
                    AND EXTRACT(YEAR FROM ref_date) IN (:year_a, :year_b)
                    ORDER BY ref_date
                """).bindparams(geo=geo, year_a=year_a, year_b=year_b)).fetchall()

                rows_a = [(r[1], r[2]) for r in rows if int(r[0]) == year_a]
                rows_b = [(r[1], r[2]) for r in rows if int(r[0]) == year_b]

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
                rows = conn.execute(text("""
                    SELECT TO_CHAR(ref_date, 'YYYY-MM') as month,
                    MAX(CASE WHEN geography = 'Canada' THEN value END) as canada,
                    MAX(CASE WHEN geography = 'Ontario' THEN value END) as ontario
                    FROM unemployment_monthly
                    WHERE EXTRACT(YEAR FROM ref_date) BETWEEN :year_from AND :year_to
                    GROUP BY ref_date ORDER BY ref_date
                """).bindparams(year_from=year_from, year_to=year_to)).fetchall()

                gaps = [round(r[2] - r[1], 1) for r in rows if r[1] is not None and r[2] is not None]
                if not gaps:
                    raise HTTPException(status_code=404, detail="No gap data found for the given parameters.")

                data_summary = f"Ontario vs Canada gap — ONLY {year_from} to {year_to}:\n"
                data_summary += f"Current gap: {gaps[-1]} pts\n"
                data_summary += f"Max gap: {max(gaps)} pts\n"
                data_summary += f"Average gap: {round(sum(gaps)/len(gaps), 1)} pts\n"
                data_summary += "Monthly gaps: " + ", ".join(
                    [f"{r[0]}:{round(r[2]-r[1],1)}pts" for r in rows if r[1] is not None and r[2] is not None]
                )

            elif chart == "industry":
                rows = conn.execute(text("""
                    WITH base AS (
                        SELECT industry, ROUND(AVG(value)::numeric, 0) AS emp_base
                        FROM employment_by_industry
                        WHERE geography = :geo
                        AND EXTRACT(YEAR FROM ref_date) = :year_from
                        GROUP BY industry
                    ),
                    curr AS (
                        SELECT industry, ROUND(AVG(value)::numeric, 0) AS emp_curr
                        FROM employment_by_industry
                        WHERE geography = :geo
                        AND EXTRACT(YEAR FROM ref_date) = :year_to
                        GROUP BY industry
                    )
                    SELECT b.industry,
                        ROUND(((c.emp_curr - b.emp_base) / b.emp_base * 100)::numeric, 1) AS pct_change
                    FROM base b JOIN curr c ON b.industry = c.industry
                    WHERE b.industry != 'Total employed, all industries'
                    ORDER BY pct_change DESC
                """).bindparams(geo=geo, year_from=year_from, year_to=year_to)).fetchall()

                if not rows:
                    raise HTTPException(status_code=404, detail="No industry data found for the given parameters.")

                data_summary = f"Industry employment change in {geo} — ONLY {year_from} vs {year_to}:\n"
                for r in rows:
                    data_summary += f"{r[0].split('[')[0].strip()}: {r[1]:+}%\n"

            else:
                raise HTTPException(status_code=400, detail=f"Unknown chart type '{chart}'.")

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Database error generating insight data.")

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

    try:
        message = anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}]
        )
    except Exception:
        raise HTTPException(status_code=502, detail="Error calling AI service. Please try again.")

    return {"insight": message.content[0].text}
