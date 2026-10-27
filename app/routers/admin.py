import asyncio
import hmac
import logging
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Request

from app.db import make_engine
from app.dependencies import REFRESH_SECRET, limiter
from src.boc_fetcher import fetch_and_load_boc
from src.statcan_fetcher import fetch_and_load_all

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["admin"])


@router.post("/admin/refresh", include_in_schema=False)
@limiter.limit("5/minute")
async def manual_refresh(
    request: Request,
    x_refresh_secret: Optional[str] = Header(default=None)
):
    # Constant-time comparison so response timing doesn't leak the secret.
    if not x_refresh_secret or not hmac.compare_digest(
        x_refresh_secret.encode(), REFRESH_SECRET.encode()
    ):
        raise HTTPException(status_code=403, detail="Forbidden.")
    loop = asyncio.get_running_loop()
    # Full reloads run long, so they get a short-lived engine without the API's
    # statement timeout, closed afterwards so no idle pool stays open.
    etl_engine = make_engine()
    try:
        await loop.run_in_executor(None, fetch_and_load_all, etl_engine)
        await loop.run_in_executor(None, fetch_and_load_boc, etl_engine)
        return {"status": "ok", "message": "Data refreshed successfully."}
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception:
        logger.exception("Manual refresh failed")
        raise HTTPException(status_code=500, detail="Refresh failed. Check server logs.")
    finally:
        etl_engine.dispose()
