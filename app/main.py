import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.dependencies import limiter
from app.routers import (
    admin, industries, insights, labour, labour_indicators, macro, news, prices, summary, unemployment,
)

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


# Data changes a few times a month, so browsers may reuse successful reads for
# an hour; this keeps repeat visits off the database (and the Railway bill).
_CACHE_SECONDS = 3600


@app.middleware("http")
async def add_response_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.update(_SECURITY_HEADERS)
    path = request.url.path
    # AI insights are generated per request and rate-limited, so they are never cached.
    if request.method == "GET" and path.startswith("/api/") and not path.startswith("/api/insights") \
            and response.status_code == 200:
        response.headers["Cache-Control"] = f"public, max-age={_CACHE_SECONDS}"
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
app.include_router(labour.router)
app.include_router(prices.router)
app.include_router(news.router)
app.include_router(admin.router)
