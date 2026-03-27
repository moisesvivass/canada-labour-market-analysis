import asyncio
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Request

from app.dependencies import REFRESH_SECRET, engine, limiter
from src.boc_fetcher import fetch_and_load_boc
from src.statcan_fetcher import fetch_and_load_all

router = APIRouter(prefix="/api", tags=["admin"])


@router.post("/admin/refresh")
@limiter.limit("5/minute")
async def manual_refresh(
    request: Request,
    x_refresh_secret: Optional[str] = Header(default=None)
):
    if x_refresh_secret != REFRESH_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden.")
    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(None, fetch_and_load_all, engine)
        await loop.run_in_executor(None, fetch_and_load_boc, engine)
        return {"status": "ok", "message": "Data refreshed successfully."}
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Refresh failed. Check server logs.")
