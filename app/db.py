import os
from typing import Optional

from dotenv import load_dotenv
from sqlalchemy import Engine, create_engine
from sqlalchemy.engine import make_url

load_dotenv()

# Kept separate from app.dependencies so the ETL cron services only need
# DATABASE_URL, not the API's Anthropic key or admin secret.
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable is not set. "
        "Add it to .env (local) or Railway environment variables (production)."
    )

_LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}


def connect_args(url: str, statement_timeout_ms: Optional[int] = None) -> dict[str, str]:
    args: dict[str, str] = {}
    parsed = make_url(url)
    # Refuse unencrypted connections to remote databases unless the URL sets its own sslmode.
    if parsed.host not in _LOCAL_HOSTS and "sslmode" not in parsed.query:
        args["sslmode"] = "require"
    if statement_timeout_ms:
        args["options"] = f"-c statement_timeout={statement_timeout_ms}"
    return args


def make_engine(statement_timeout_ms: Optional[int] = None) -> Engine:
    return create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=1800,
        connect_args=connect_args(DATABASE_URL, statement_timeout_ms),
    )
