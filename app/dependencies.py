import logging
import os
from collections import defaultdict

import anthropic
from fastapi import HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import text

from app.db import make_engine

logger = logging.getLogger(__name__)

# API reads are small; cap each statement so a slow query can't tie up the pool.
engine = make_engine(statement_timeout_ms=10_000)

ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')
if not ANTHROPIC_API_KEY:
    raise RuntimeError(
        "ANTHROPIC_API_KEY environment variable is not set. "
        "Add it to .env (local) or Railway environment variables (production)."
    )

REFRESH_SECRET = os.getenv('REFRESH_SECRET')
if not REFRESH_SECRET:
    raise RuntimeError(
        "REFRESH_SECRET environment variable is not set. "
        "Add it to .env (local) or Railway environment variables (production)."
    )

def client_ip(request: Request) -> str:
    # Railway's edge proxy sets X-Real-IP to the caller's address. The socket
    # peer is the proxy itself (100.64.x.x), so keying on it would make every
    # visitor share one rate-limit bucket.
    return request.headers.get("x-real-ip") or get_remote_address(request)


limiter = Limiter(key_func=client_ip)
anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

VALID_GEOS = {
    "Canada", "Ontario", "Quebec", "British Columbia", "Alberta",
    "Manitoba", "Saskatchewan", "Nova Scotia", "New Brunswick",
    "Newfoundland and Labrador", "Prince Edward Island"
}
# Pre-sorted once; used in validate_geo error messages.
_VALID_GEOS_LIST = ', '.join(sorted(VALID_GEOS))


def validate_geo(geo: str) -> None:
    if geo not in VALID_GEOS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid geography '{geo}'. Valid options: {_VALID_GEOS_LIST}."
        )


VALID_RATES = {"Employment rate", "Participation rate", "Unemployment rate"}


def validate_rate(characteristic: str) -> None:
    if characteristic not in VALID_RATES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid characteristic '{characteristic}'. Valid options: {', '.join(sorted(VALID_RATES))}."
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


def aligned_series(rows) -> tuple[list[str], dict[str, list]]:
    """Rows of (month, key, value) -> sorted month labels and one aligned list per key (None for gaps)."""
    labels = sorted({r[0] for r in rows})
    index = {m: i for i, m in enumerate(labels)}
    series: dict[str, list] = defaultdict(lambda: [None] * len(labels))
    for month, key, value in rows:
        series[key][index[month]] = float(value)
    return labels, dict(series)


def run_query(query, error_detail: str = "Database query failed."):
    try:
        with engine.connect() as conn:
            return conn.execute(query).fetchall()
    except Exception:
        # Full error goes to the server log only; the client gets a generic message.
        logger.exception(error_detail)
        raise HTTPException(status_code=500, detail=error_detail)
