from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import text

from app.dependencies import limiter, run_query

router = APIRouter(prefix="/api", tags=["summary"])


@router.get("/summary")
@limiter.limit("30/minute")
async def get_summary(request: Request):
    summary_query = text("""
        WITH latest AS (
            SELECT MAX(ref_date) AS max_date
            FROM unemployment_monthly
            WHERE geography = 'Canada'
        ),
        canada AS (
            SELECT u.value, TO_CHAR(l.max_date, 'Mon YYYY') AS month_label
            FROM unemployment_monthly u
            JOIN latest l ON u.ref_date = l.max_date
            WHERE u.geography = 'Canada'
        ),
        worst AS (
            SELECT u.geography, u.value
            FROM unemployment_monthly u
            JOIN latest l ON u.ref_date = l.max_date
            WHERE u.geography != 'Canada'
            ORDER BY u.value DESC
            LIMIT 1
        )
        SELECT c.month_label, c.value, w.geography, w.value
        FROM canada c, worst w
    """)

    # Single LAG query instead of two correlated subqueries with identical filters.
    jobs_query = text("""
        WITH ordered AS (
            SELECT ref_date, value,
                   LAG(value) OVER (ORDER BY ref_date) AS prev_value
            FROM employment_by_industry
            WHERE geography = 'Canada'
            AND industry = 'Total employed, all industries'
            AND data_type = 'Seasonally adjusted'
        )
        SELECT ROUND((value - prev_value)::numeric, 0)
        FROM ordered
        WHERE prev_value IS NOT NULL
        ORDER BY ref_date DESC
        LIMIT 1
    """)

    labour_query = text("""
        WITH latest AS (
            SELECT MAX(ref_date) AS max_date
            FROM labour_force_indicators
            WHERE geography = 'Canada'
        )
        SELECT characteristic, value
        FROM labour_force_indicators
        JOIN latest ON ref_date = max_date
        WHERE geography = 'Canada'
        AND characteristic IN ('Employment rate', 'Participation rate')
    """)

    delta_query = text("""
        WITH ordered AS (
            SELECT ref_date, value,
                   LAG(value) OVER (ORDER BY ref_date) AS prev_value
            FROM unemployment_monthly
            WHERE geography = 'Canada'
        )
        SELECT ROUND((value - prev_value)::numeric, 1)
        FROM ordered
        WHERE prev_value IS NOT NULL
        ORDER BY ref_date DESC
        LIMIT 1
    """)

    rows = run_query(summary_query, "Database error fetching summary data.")
    if not rows:
        raise HTTPException(status_code=404, detail="No summary data available.")

    jobs_rows = run_query(jobs_query, "Database error fetching jobs data.")
    jobs_lost = int(jobs_rows[0][0]) if jobs_rows and jobs_rows[0][0] is not None else None

    # Graceful fallback while labour_force_indicators is being populated
    employment_rate = None
    participation_rate = None
    try:
        labour_rows = run_query(labour_query, "labour_force_indicators unavailable")
        labour_data = {r[0]: float(r[1]) for r in labour_rows}
        employment_rate = labour_data.get('Employment rate')
        participation_rate = labour_data.get('Participation rate')
    except HTTPException:
        pass

    delta_rows = run_query(delta_query, "Database error fetching monthly delta.")
    monthly_delta = (
        float(delta_rows[0][0]) if delta_rows and delta_rows[0][0] is not None else None
    )

    cpi_yoy_query = text("""
        WITH ordered AS (
            SELECT ref_date, value,
                   LAG(value, 12) OVER (ORDER BY ref_date) AS prev_year_value
            FROM bank_of_canada_indicators
            WHERE series = 'cpi'
        )
        SELECT ROUND(((value - prev_year_value) / prev_year_value * 100)::numeric, 1)
        FROM ordered
        WHERE prev_year_value IS NOT NULL
        ORDER BY ref_date DESC
        LIMIT 1
    """)

    cpi_yoy = None
    try:
        cpi_rows = run_query(cpi_yoy_query, "bank_of_canada_indicators unavailable")
        cpi_yoy = float(cpi_rows[0][0]) if cpi_rows and cpi_rows[0][0] is not None else None
    except HTTPException:
        pass

    row = rows[0]
    return {
        "most_recent_month": row[0],
        "canada_rate": float(row[1]),
        "employment_rate": employment_rate,
        "participation_rate": participation_rate,
        "monthly_delta": monthly_delta,
        "cpi_yoy": cpi_yoy,
        "worst_province": {"name": row[2], "rate": float(row[3])},
        "jobs_lost": jobs_lost,
    }
