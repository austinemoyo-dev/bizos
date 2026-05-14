from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

import models  # noqa: F401 — ensure all models are registered before create_all
from core.config import settings
from core.database import Base, engine
from core.limiter import limiter
from routers import (
    analytics,
    auth,
    expenses,
    food_vendor,
    inventory,
    investments,
    market_list,
    personal,
    purchases,
    repairs,
    reports,
    sales,
    settings as settings_router,
    tithe,
)

Base.metadata.create_all(bind=engine)


class LimitBodySizeMiddleware(BaseHTTPMiddleware):
    MAX_BODY_SIZE = 10 * 1024 * 1024  # 10 MB

    async def dispatch(self, request: Request, call_next):
        cl = request.headers.get("content-length")
        if cl and int(cl) > self.MAX_BODY_SIZE:
            return PlainTextResponse("Request body too large (max 10 MB)", status_code=413)
        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers.update({
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
        })
        if settings.ENV == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


app = FastAPI(
    title="BizOS API",
    description="Dash & Co. Business + Personal Finance Operating System",
    version="1.0.0",
    debug=settings.DEBUG,
    docs_url=None if settings.ENV == "production" else "/docs",
    redoc_url=None if settings.ENV == "production" else "/redoc",
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Middleware — added inner-to-outer (last added runs outermost / first)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(LimitBodySizeMiddleware)

origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

API_PREFIX = "/api/v1"

app.include_router(auth.router,                prefix=f"{API_PREFIX}/auth",         tags=["Auth"])
app.include_router(inventory.router,           prefix=f"{API_PREFIX}/inventory",     tags=["Inventory"])
app.include_router(repairs.router,             prefix=f"{API_PREFIX}/repairs",       tags=["Repairs"])
app.include_router(sales.router,               prefix=f"{API_PREFIX}/sales",         tags=["Sales"])
app.include_router(purchases.router,           prefix=f"{API_PREFIX}/purchases",     tags=["Purchases"])
app.include_router(expenses.router,            prefix=f"{API_PREFIX}/expenses",      tags=["Expenses"])
app.include_router(investments.router,         prefix=f"{API_PREFIX}/investments",   tags=["Investments"])
app.include_router(tithe.router,               prefix=f"{API_PREFIX}/tithe",         tags=["Tithe"])
app.include_router(market_list.router,         prefix=f"{API_PREFIX}/market-list",   tags=["Market List"])
app.include_router(personal.router,            prefix=f"{API_PREFIX}/personal",      tags=["Personal"])
app.include_router(food_vendor.router,         prefix=f"{API_PREFIX}/food-vendor",   tags=["Food Vendor"])
app.include_router(settings_router.router,     prefix=f"{API_PREFIX}/settings",      tags=["Settings"])
app.include_router(analytics.router,           prefix=f"{API_PREFIX}/analytics",     tags=["Analytics"])
app.include_router(reports.router,             prefix=f"{API_PREFIX}/reports",       tags=["Reports"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "BizOS API"}
