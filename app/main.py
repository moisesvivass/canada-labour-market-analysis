import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.dependencies import limiter
from app.routers import admin, industries, insights, labour_indicators, macro, summary, unemployment

logger = logging.getLogger(__name__)

load_dotenv()
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")]

# ETL scheduling is handled by Railway cron services (see src/etl.py).
# Manual refresh is available via POST /api/admin/refresh.
app = FastAPI(title="Canada Labour Market Dashboard")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,  # the API uses no cookies or auth headers from browsers
    allow_methods=["GET"],
    allow_headers=["*"],
)

_SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
}


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.update(_SECURITY_HEADERS)
    return response
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
app.include_router(labour_indicators.router)
app.include_router(macro.router)
app.include_router(insights.router)
app.include_router(summary.router)
app.include_router(admin.router)
