from fastapi import APIRouter, Query, Request
from sqlalchemy import text

from app.dependencies import limiter, run_query

router = APIRouter(prefix="/api/macro", tags=["macro"])


@router.get("/overnight-rate")
@limiter.limit("30/minute")
async def get_overnight_rate(
    request: Request,
    year_from: int = Query(default=2020),
    year_to: int = Query(default=2026),
):
    query = text("""
        SELECT TO_CHAR(ref_date, 'YYYY-MM') AS month, value
        FROM bank_of_canada_indicators
        WHERE series = 'overnight_rate'
        AND EXTRACT(YEAR FROM ref_date) BETWEEN :year_from AND :year_to
        ORDER BY ref_date
    """).bindparams(year_from=year_from, year_to=year_to)

    rows = run_query(query, "Database error fetching overnight rate data.")
    if not rows:
        return []
    return [{"month": r[0], "value": float(r[1])} for r in rows]


@router.get("/cpi")
@limiter.limit("30/minute")
async def get_cpi(
    request: Request,
    year_from: int = Query(default=2020),
    year_to: int = Query(default=2026),
):
    query = text("""
        SELECT TO_CHAR(ref_date, 'YYYY-MM') AS month, value
        FROM bank_of_canada_indicators
        WHERE series = 'cpi'
        AND EXTRACT(YEAR FROM ref_date) BETWEEN :year_from AND :year_to
        ORDER BY ref_date
    """).bindparams(year_from=year_from, year_to=year_to)

    rows = run_query(query, "Database error fetching CPI data.")
    if not rows:
        return []
    return [{"month": r[0], "value": float(r[1])} for r in rows]
