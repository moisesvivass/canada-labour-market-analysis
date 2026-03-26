import logging
import os

import anthropic
from dotenv import load_dotenv
from fastapi import HTTPException
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import create_engine, text

load_dotenv()

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable is not set. "
        "Add it to .env (local) or Railway environment variables (production)."
    )
engine = create_engine(DATABASE_URL)

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

limiter = Limiter(key_func=get_remote_address)
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


def run_query(query, error_detail: str = "Database query failed."):
    try:
        with engine.connect() as conn:
            return conn.execute(query).fetchall()
    except Exception:
        raise HTTPException(status_code=500, detail=error_detail)
