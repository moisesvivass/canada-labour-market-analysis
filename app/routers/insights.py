from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.dependencies import anthropic_client, engine, limiter, parse_extra_years, validate_geo

router = APIRouter(prefix="/api", tags=["insights"])

_PROMPT_TEMPLATE = (
    "You are a sharp, opinionated Canadian labour market economist. "
    "You don't hedge, you don't repeat the obvious, you always find the angle nobody else is talking about.\n\n"
    "Data:\n{data_summary}\n\n"
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


def _build_unemployment_summary(conn: Connection, geo: str, year_from: int, year_to: int) -> str:
    rows = conn.execute(text("""
        SELECT geography, TO_CHAR(ref_date, 'YYYY-MM') as month, value
        FROM unemployment_monthly
        WHERE geography = :geo
        AND EXTRACT(YEAR FROM ref_date) BETWEEN :year_from AND :year_to
        ORDER BY ref_date
    """).bindparams(geo=geo, year_from=year_from, year_to=year_to)).fetchall()

    if not rows:
        raise HTTPException(status_code=404, detail="No data found for the given parameters.")

    summary = f"Unemployment rate for {geo} — ONLY the period {year_from} to {year_to}:\n"
    summary += f"Start: {rows[0][2]}% ({rows[0][1]})\n"
    summary += f"End: {rows[-1][2]}% ({rows[-1][1]})\n"
    summary += f"Peak: {max(r[2] for r in rows)}%\n"
    summary += f"Low: {min(r[2] for r in rows)}%\n"
    summary += f"Total change: {round(rows[-1][2] - rows[0][2], 1)} percentage points\n"
    summary += f"Number of months analyzed: {len(rows)}\n"
    summary += "Monthly data: " + ", ".join([f"{r[1]}:{r[2]}%" for r in rows])
    return summary


def _build_compare_summary(conn: Connection, geo: str, extra: str) -> str:
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
    summary = f"Year comparison for {geo} — ONLY {year_a} vs {year_b}:\n"
    summary += f"{year_a} average: {round(avg_a, 1)}%\n"
    summary += f"{year_b} average: {round(avg_b, 1)}%\n"
    summary += f"Change: {round(avg_b - avg_a, 1)} percentage points\n"
    if rows_a:
        summary += f"{year_a} monthly: " + ", ".join([f"{r[0]}:{r[1]}%" for r in rows_a]) + "\n"
    if rows_b:
        summary += f"{year_b} monthly: " + ", ".join([f"{r[0]}:{r[1]}%" for r in rows_b])
    return summary


def _build_gap_summary(conn: Connection, geo: str, extra: str, year_from: int, year_to: int) -> str:
    # geo = primary province; extra = reference province (defaults to Canada)
    geo_b = extra if extra else "Canada"
    validate_geo(geo_b)

    rows = conn.execute(text("""
        SELECT TO_CHAR(ref_date, 'YYYY-MM') as month,
        MAX(CASE WHEN geography = :geo_b THEN value END) as ref_rate,
        MAX(CASE WHEN geography = :geo_a THEN value END) as prov_rate
        FROM unemployment_monthly
        WHERE geography IN (:geo_a, :geo_b)
        AND EXTRACT(YEAR FROM ref_date) BETWEEN :year_from AND :year_to
        GROUP BY ref_date ORDER BY ref_date
    """).bindparams(
        geo_a=geo, geo_b=geo_b, year_from=year_from, year_to=year_to
    )).fetchall()

    gaps = [round(r[2] - r[1], 1) for r in rows if r[1] is not None and r[2] is not None]
    if not gaps:
        raise HTTPException(status_code=404, detail="No gap data found for the given parameters.")

    summary = f"{geo} vs {geo_b} gap — ONLY {year_from} to {year_to}:\n"
    summary += f"Current gap: {gaps[-1]} pts\n"
    summary += f"Max gap: {max(gaps)} pts\n"
    summary += f"Average gap: {round(sum(gaps)/len(gaps), 1)} pts\n"
    summary += "Monthly gaps: " + ", ".join(
        [f"{r[0]}:{round(r[2]-r[1],1)}pts" for r in rows if r[1] is not None and r[2] is not None]
    )
    return summary


def _build_industry_summary(conn: Connection, geo: str, year_from: int, year_to: int) -> str:
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

    summary = f"Industry employment change in {geo} — ONLY {year_from} vs {year_to}:\n"
    for r in rows:
        summary += f"{r[0].split('[')[0].strip()}: {r[1]:+}%\n"
    return summary


@router.get("/insights")
@limiter.limit("5/minute")
async def get_insights(
    request: Request,
    chart: str = Query(...),
    geo: str = Query(default="Canada"),
    year_from: int = Query(default=2020),
    year_to: int = Query(default=2026),
    extra: str = Query(default="")
):
    validate_geo(geo)

    try:
        with engine.connect() as conn:
            if chart == "unemployment":
                data_summary = _build_unemployment_summary(conn, geo, year_from, year_to)
            elif chart == "compare":
                data_summary = _build_compare_summary(conn, geo, extra)
            elif chart == "gap":
                data_summary = _build_gap_summary(conn, geo, extra, year_from, year_to)
            elif chart == "industry":
                data_summary = _build_industry_summary(conn, geo, year_from, year_to)
            else:
                raise HTTPException(status_code=400, detail=f"Unknown chart type '{chart}'.")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Database error generating insight data.")

    try:
        message = anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=500,
            messages=[{"role": "user", "content": _PROMPT_TEMPLATE.format(data_summary=data_summary)}]
        )
    except Exception:
        raise HTTPException(status_code=502, detail="Error calling AI service. Please try again.")

    return {"insight": message.content[0].text}
