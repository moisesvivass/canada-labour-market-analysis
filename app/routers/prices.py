from fastapi import APIRouter, Query, Request
from sqlalchemy import text

from app.dependencies import aligned_series, limiter, run_query, validate_geo

router = APIRouter(prefix="/api", tags=["prices"])

# The Bank of Canada's inflation-control target (midpoint of its 1-3% range).
INFLATION_TARGET = 2.0
CORE_MEASURES = ("cpi_trim", "cpi_median", "cpi_common")


@router.get("/inflation")
@limiter.limit("30/minute")
async def get_inflation(
    request: Request,
    year_from: int = Query(default=2020),
    year_to: int = Query(default=2026),
):
    """Headline CPI inflation against the Bank of Canada's core measures and its 2% target."""
    # Headline CPI is an index, so its year-over-year change is computed here;
    # the core measures already arrive as year-over-year percentages.
    rows = run_query(text("""
        WITH headline AS (
            SELECT ref_date,
                   ROUND(((value / LAG(value, 12) OVER (ORDER BY ref_date) - 1) * 100)::numeric, 1) AS yoy
            FROM bank_of_canada_indicators
            WHERE series = 'cpi'
        )
        SELECT TO_CHAR(ref_date, 'YYYY-MM'), 'headline', yoy FROM headline
        WHERE yoy IS NOT NULL AND EXTRACT(YEAR FROM ref_date) BETWEEN :year_from AND :year_to
        UNION ALL
        SELECT TO_CHAR(ref_date, 'YYYY-MM'), series, value FROM bank_of_canada_indicators
        WHERE series IN ('cpi_trim', 'cpi_median', 'cpi_common')
          AND EXTRACT(YEAR FROM ref_date) BETWEEN :year_from AND :year_to
    """).bindparams(year_from=year_from, year_to=year_to), "Database error fetching inflation data.")

    labels, series = aligned_series(rows)
    return {
        "labels": labels,
        "target": INFLATION_TARGET,
        "headline": series.get("headline", []),
        **{measure: series.get(measure, []) for measure in CORE_MEASURES},
    }


@router.get("/wages")
@limiter.limit("30/minute")
async def get_wages(
    request: Request,
    geo: str = Query(default="Canada"),
    year_from: int = Query(default=2020),
    year_to: int = Query(default=2026),
):
    """Year-over-year growth in average weekly earnings against CPI inflation (real wage growth)."""
    validate_geo(geo)
    rows = run_query(text("""
        WITH earnings AS (
            SELECT ref_date, value,
                   ROUND(((value / LAG(value, 12) OVER (ORDER BY ref_date) - 1) * 100)::numeric, 1) AS growth
            FROM weekly_earnings
            WHERE geography = :geo
        ),
        cpi AS (
            SELECT ref_date,
                   ROUND(((value / LAG(value, 12) OVER (ORDER BY ref_date) - 1) * 100)::numeric, 1) AS yoy
            FROM bank_of_canada_indicators
            WHERE series = 'cpi'
        )
        SELECT TO_CHAR(e.ref_date, 'YYYY-MM'), e.value, e.growth, c.yoy
        FROM earnings e JOIN cpi c USING (ref_date)
        WHERE e.growth IS NOT NULL AND c.yoy IS NOT NULL
          AND EXTRACT(YEAR FROM e.ref_date) BETWEEN :year_from AND :year_to
        ORDER BY e.ref_date
    """).bindparams(geo=geo, year_from=year_from, year_to=year_to), "Database error fetching wage data.")

    return {
        "labels": [r[0] for r in rows],
        "weekly_earnings": [float(r[1]) for r in rows],
        "wage_growth": [float(r[2]) for r in rows],
        "inflation": [float(r[3]) for r in rows],
        "real_wage_growth": [round(float(r[2] - r[3]), 1) for r in rows],
    }
