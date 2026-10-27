from fastapi import APIRouter, Query, Request
from sqlalchemy import text

from app.dependencies import aligned_series, limiter, run_query, validate_geo, validate_rate

router = APIRouter(prefix="/api", tags=["labour"])

AGE_GROUPS = ["15 to 24 years", "25 to 54 years", "55 years and over"]
GENDERS = ["Men+", "Women+"]


@router.get("/demographics")
@limiter.limit("30/minute")
async def get_demographics(
    request: Request,
    geo: str = Query(default="Canada"),
    characteristic: str = Query(default="Unemployment rate"),
    year_from: int = Query(default=2020),
    year_to: int = Query(default=2026),
):
    """A rate by age group and by gender, plus the part-time share of employment."""
    validate_geo(geo)
    validate_rate(characteristic)

    rows = run_query(text("""
        SELECT TO_CHAR(ref_date, 'YYYY-MM') AS month,
               CASE WHEN gender = 'Total - Gender' THEN age_group ELSE gender END AS series,
               value
        FROM lfs_demographics
        WHERE geography = :geo
          AND characteristic = :characteristic
          AND ((gender = 'Total - Gender' AND age_group = ANY(:ages))
               OR (age_group = '15 years and over' AND gender = ANY(:genders)))
          AND EXTRACT(YEAR FROM ref_date) BETWEEN :year_from AND :year_to
    """).bindparams(geo=geo, characteristic=characteristic, ages=AGE_GROUPS, genders=GENDERS,
                    year_from=year_from, year_to=year_to),
        "Database error fetching demographic data.")

    part_time = run_query(text("""
        SELECT TO_CHAR(ref_date, 'YYYY-MM') AS month, 'part_time_share' AS series,
               ROUND((100 * MAX(value) FILTER (WHERE characteristic = 'Part-time employment')
                      / NULLIF(MAX(value) FILTER (WHERE characteristic = 'Employment'), 0))::numeric, 1)
        FROM lfs_demographics
        WHERE geography = :geo AND gender = 'Total - Gender' AND age_group = '15 years and over'
          AND characteristic IN ('Part-time employment', 'Employment')
          AND EXTRACT(YEAR FROM ref_date) BETWEEN :year_from AND :year_to
        GROUP BY ref_date
    """).bindparams(geo=geo, year_from=year_from, year_to=year_to),
        "Database error fetching part-time data.")

    labels, series = aligned_series(rows)
    _, part_time_series = aligned_series([r for r in part_time if r[2] is not None])
    return {
        "labels": labels,
        "by_age": {age: series.get(age, []) for age in AGE_GROUPS},
        "by_gender": {gender: series.get(gender, []) for gender in GENDERS},
        "part_time_share": part_time_series.get("part_time_share", []),
    }


@router.get("/cities")
@limiter.limit("30/minute")
async def get_cities(
    request: Request,
    characteristic: str = Query(default="Unemployment rate"),
    year_from: int = Query(default=2020),
    year_to: int = Query(default=2026),
):
    """Toronto, Montréal and Vancouver with standard errors, next to their provinces and Canada."""
    validate_rate(characteristic)

    city_rows = run_query(text("""
        SELECT TO_CHAR(ref_date, 'YYYY-MM') AS month, city, province, statistic, value
        FROM lfs_cities
        WHERE characteristic = :characteristic
          AND EXTRACT(YEAR FROM ref_date) BETWEEN :year_from AND :year_to
    """).bindparams(characteristic=characteristic, year_from=year_from, year_to=year_to),
        "Database error fetching city data.")

    provinces = sorted({r[2] for r in city_rows}) + ["Canada"]
    region_rows = run_query(text("""
        SELECT TO_CHAR(ref_date, 'YYYY-MM') AS month, geography, value
        FROM labour_force_indicators
        WHERE characteristic = :characteristic AND geography = ANY(:regions)
          AND EXTRACT(YEAR FROM ref_date) BETWEEN :year_from AND :year_to
    """).bindparams(characteristic=characteristic, regions=provinces, year_from=year_from, year_to=year_to),
        "Database error fetching regional data.")

    labels, estimates = aligned_series([(m, city, v) for m, city, _, stat, v in city_rows if stat == "Estimate"])
    _, errors = aligned_series([(m, city, v) for m, city, _, stat, v in city_rows if stat != "Estimate"])
    city_months = set(labels)
    _, regions = aligned_series([r for r in region_rows if r[0] in city_months])
    province_of = {city: province for _, city, province, _, _ in city_rows}
    return {
        "labels": labels,
        "cities": {
            city: {"province": province_of[city], "estimate": values, "standard_error": errors.get(city, [])}
            for city, values in sorted(estimates.items())
        },
        "regions": regions,
    }


@router.get("/tightness")
@limiter.limit("30/minute")
async def get_tightness(request: Request):
    """Unemployed people per job vacancy, by province, for the latest vacancy month."""
    rows = run_query(text("""
        WITH vac AS (
            SELECT ref_date, geography,
                   MAX(value) FILTER (WHERE statistic = 'Job vacancies') AS vacancies,
                   MAX(value) FILTER (WHERE statistic = 'Job vacancy rate') AS vacancy_rate
            FROM job_vacancies
            GROUP BY ref_date, geography
        ),
        unemployed AS (
            SELECT ref_date, geography, value * 1000 AS unemployed
            FROM lfs_demographics
            WHERE characteristic = 'Unemployment' AND gender = 'Total - Gender'
              AND age_group = '15 years and over'
        )
        SELECT TO_CHAR(v.ref_date, 'YYYY-MM'), v.geography, v.vacancies, v.vacancy_rate, u.unemployed,
               ROUND((u.unemployed / NULLIF(v.vacancies, 0))::numeric, 2)
        FROM vac v JOIN unemployed u USING (ref_date, geography)
        ORDER BY v.ref_date
    """), "Database error fetching labour market tightness.")

    if not rows:
        return {"month": None, "provinces": [], "canada": {"labels": [], "unemployed_per_vacancy": []}}

    latest = rows[-1][0]
    provinces = [
        {
            "geography": geo,
            "vacancies": int(vacancies),
            "vacancy_rate": float(rate),
            "unemployed": int(unemployed),
            "unemployed_per_vacancy": float(ratio),
        }
        for month, geo, vacancies, rate, unemployed, ratio in rows
        if month == latest and ratio is not None
    ]
    canada = [(month, float(ratio)) for month, geo, *_, ratio in rows if geo == "Canada" and ratio is not None]
    return {
        "month": latest,
        "provinces": sorted(provinces, key=lambda p: p["unemployed_per_vacancy"], reverse=True),
        "canada": {"labels": [m for m, _ in canada], "unemployed_per_vacancy": [r for _, r in canada]},
    }


@router.get("/provinces/latest")
@limiter.limit("30/minute")
async def get_provinces_latest(request: Request):
    """Each region's latest unemployment rate against the same month a year earlier."""
    rows = run_query(text("""
        WITH ranked AS (
            SELECT geography, ref_date, value,
                   LAG(value, 12) OVER (PARTITION BY geography ORDER BY ref_date) AS year_ago
            FROM unemployment_monthly
        )
        SELECT geography, TO_CHAR(ref_date, 'YYYY-MM'), value, year_ago
        FROM ranked
        WHERE ref_date = (SELECT MAX(ref_date) FROM unemployment_monthly)
        ORDER BY value DESC
    """), "Database error fetching provincial data.")

    return {
        "month": rows[0][1] if rows else None,
        "regions": [
            {
                "geography": geo,
                "rate": float(rate),
                "year_ago": float(year_ago) if year_ago is not None else None,
                "change": round(float(rate - year_ago), 1) if year_ago is not None else None,
            }
            for geo, _, rate, year_ago in rows
        ],
    }
