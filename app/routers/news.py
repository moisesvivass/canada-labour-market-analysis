from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import text

from app.dependencies import limiter, run_query

router = APIRouter(prefix="/api", tags=["news"])

CATEGORIES = {"statcan_release", "rate_decision", "policy"}


@router.get("/news")
@limiter.limit("30/minute")
async def get_news(
    request: Request,
    category: Optional[str] = Query(default=None),
    limit: int = Query(default=10, ge=1, le=50),
):
    """Latest official announcements: StatCan releases, BoC decisions, federal policy news."""
    if category is not None and category not in CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Invalid category. Valid options: {', '.join(sorted(CATEGORIES))}.")

    rows = run_query(text("""
        SELECT category, source, title, url, published, summary, key_points
        FROM news_items
        WHERE (CAST(:category AS TEXT) IS NULL OR category = :category)
        ORDER BY published DESC
        LIMIT :limit
    """).bindparams(category=category, limit=limit), "Database error fetching official news.")

    return [
        {
            "category": category, "source": source, "title": title, "url": url,
            "published": published.isoformat(), "summary": summary, "key_points": key_points or [],
        }
        for category, source, title, url, published, summary, key_points in rows
    ]


@router.get("/events")
@limiter.limit("30/minute")
async def get_events(
    request: Request,
    year_from: int = Query(default=2020),
    year_to: int = Query(default=2026),
):
    """Dated events for chart annotations: every Bank of Canada rate change plus federal policy news.

    Rate changes are derived from the official overnight rate series itself, so the
    full history is available even though the BoC press feed only covers recent weeks.
    """
    rows = run_query(text("""
        WITH rate AS (
            SELECT ref_date, value, LAG(value) OVER (ORDER BY ref_date) AS previous
            FROM bank_of_canada_indicators
            WHERE series = 'overnight_rate'
        )
        SELECT ref_date::date, 'rate_decision', 'Bank of Canada',
               CASE WHEN value > previous THEN 'Bank of Canada raises' ELSE 'Bank of Canada cuts' END
                   || ' overnight rate to ' || TRIM(TO_CHAR(value, 'FM990.00')) || '%',
               NULL
        FROM rate
        WHERE previous IS NOT NULL AND value <> previous
          AND EXTRACT(YEAR FROM ref_date) BETWEEN :year_from AND :year_to
        UNION ALL
        SELECT published, category, source, title, url
        FROM news_items
        WHERE category = 'policy' AND EXTRACT(YEAR FROM published) BETWEEN :year_from AND :year_to
        ORDER BY 1
    """).bindparams(year_from=year_from, year_to=year_to), "Database error fetching events.")

    return [
        {"date": day.isoformat(), "category": category, "source": source, "title": title, "url": url}
        for day, category, source, title, url in rows
    ]
