from typing import Optional

from fastapi import APIRouter, Query, Request
from sqlalchemy import text

from app.dependencies import limiter, run_query, validate_geo

router = APIRouter(prefix="/api", tags=["unemployment"])


@router.get("/unemployment")
@limiter.limit("30/minute")
async def get_unemployment(
    request: Request,
    geo: Optional[str] = Query(None),
    year_from: Optional[int] = Query(None),
    year_to: Optional[int] = Query(None)
):
    conditions = ["1=1"]
    params = {}
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
            value AS unemployment_rate
        FROM unemployment_monthly
        WHERE {where}
        ORDER BY ref_date, geography
    """).bindparams(**params)

    rows = run_query(query, "Database error fetching unemployment data.")

    data = {}
    labels_set = []
    for row in rows:
        month = row[1]
        if month not in labels_set:
            labels_set.append(month)
        province = row[0]
        if province not in data:
            data[province] = []
        data[province].append(float(row[2]))

    data["labels"] = labels_set
    return data


@router.get("/compare")
@limiter.limit("30/minute")
async def compare_periods(
    request: Request,
    geo: Optional[str] = Query(default="Canada"),
    year_a: Optional[int] = Query(default=2023),
    year_b: Optional[int] = Query(default=2026)
):
    validate_geo(geo)

    query = text("""
        SELECT
            EXTRACT(YEAR FROM ref_date) AS year,
            value
        FROM unemployment_monthly
        WHERE geography = :geo
        AND EXTRACT(YEAR FROM ref_date) IN (:year_a, :year_b)
        ORDER BY year, ref_date
    """).bindparams(geo=geo, year_a=year_a, year_b=year_b)

    rows = run_query(query, "Database error fetching comparison data.")

    labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    data = {str(year_a): [], str(year_b): [], "labels": labels}

    for row in rows:
        year_key = str(int(row[0]))
        if year_key in data:
            data[year_key].append(float(row[1]))

    return data


@router.get("/provinces-gap")
@limiter.limit("30/minute")
async def get_provinces_gap(
    request: Request,
    geo_a: str = Query(default="Ontario"),
    geo_b: str = Query(default="Canada"),
    year_from: Optional[int] = Query(default=2022),
    year_to: Optional[int] = Query(default=2026)
):
    validate_geo(geo_a)
    validate_geo(geo_b)

    query = text("""
        SELECT
            TO_CHAR(ref_date, 'YYYY-MM') AS month,
            MAX(CASE WHEN geography = :geo_b THEN value END) AS ref_rate,
            MAX(CASE WHEN geography = :geo_a THEN value END) AS prov_rate
        FROM unemployment_monthly
        WHERE geography IN (:geo_a, :geo_b)
        AND EXTRACT(YEAR FROM ref_date) BETWEEN :year_from AND :year_to
        GROUP BY ref_date
        ORDER BY ref_date
    """).bindparams(geo_a=geo_a, geo_b=geo_b, year_from=year_from, year_to=year_to)

    rows = run_query(query, "Database error fetching provinces gap data.")

    if not rows:
        return {"labels": [], "geo_a": [], "geo_b": [], "gap": []}

    return {
        "labels": [r[0] for r in rows],
        "geo_a": [float(r[2]) if r[2] is not None else None for r in rows],
        "geo_b": [float(r[1]) if r[1] is not None else None for r in rows],
        "gap": [
            round(float(r[2] - r[1]), 1) if r[1] is not None and r[2] is not None else None
            for r in rows
        ]
    }
