from typing import Optional

from fastapi import APIRouter, Query, Request
from sqlalchemy import text

from app.dependencies import limiter, run_query, validate_geo

router = APIRouter(prefix="/api", tags=["industries"])


@router.get("/industries")
@limiter.limit("30/minute")
async def get_industries(
    request: Request,
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
