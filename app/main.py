import logging
import os
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.dependencies import engine, limiter
from app.routers import admin, industries, insights, summary, unemployment
from src.statcan_fetcher import fetch_and_load_all

logger = logging.getLogger(__name__)

# load_dotenv() is called in dependencies.py at import time; CORS_ORIGINS is
# safe to read here because dependencies is imported above.
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the in-process scheduler. The job runs on day 1 of each month at
    # 06:00 UTC and is dispatched to a thread pool (fetch_and_load_all is sync).
    # replace_existing=True prevents duplicate job registration on hot-reload.
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        fetch_and_load_all,
        CronTrigger(day=1, hour=6, minute=0),
        args=[engine],
        id="monthly_statcan_fetch",
        replace_existing=True
    )
    scheduler.start()
    logger.info("Scheduler started — StatCan refresh runs on the 1st of each month at 06:00 UTC.")
    yield
    # wait=True (default) blocks until any running job finishes before exiting.
    scheduler.shutdown()


app = FastAPI(title="Canada Labour Market Dashboard", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/docs")


@app.get("/health")
async def health():
    return {"status": "ok"}


app.include_router(unemployment.router)
app.include_router(industries.router)
app.include_router(insights.router)
app.include_router(summary.router)
app.include_router(admin.router)
