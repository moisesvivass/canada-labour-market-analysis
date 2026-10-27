from typing import Optional

from fastapi import APIRouter, Query, Request
from sqlalchemy import text

from app.dependencies import limiter, run_query, validate_geo, validate_rate

router = APIRouter(prefix="/api", tags=["labour-indicators"])


@router.get("/labour-indicators")
@limiter.limit("30/minute")
async def get_labour_indicators(
    request: Request,
    characteristic: str = Query(default="Employment rate"),
    geo: Optional[str] = Query(None),
    year_from: Optional[int] = Query(None),
    year_to: Optional[int] = Query(None),
):
    validate_rate(characteristic)

    conditions = ["characteristic = :characteristic"]
    params: dict = {"characteristic": characteristic}

    if geo and geo != "all":
        validate_geo(geo)
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
            value
        FROM labour_force_indicators
        WHERE {where}
        ORDER BY ref_date, geography
    """).bindparams(**params)

    rows = run_query(query, "Database error fetching labour indicator data.")

    data: dict = {}
    labels_seen: dict[str, None] = {}  # ordered set — O(1) lookup, insertion-order preserved
    for row in rows:
        month = row[1]
        labels_seen[month] = None
        province = row[0]
        if province not in data:
            data[province] = []
        data[province].append(float(row[2]))

    data["labels"] = list(labels_seen)
    return data
