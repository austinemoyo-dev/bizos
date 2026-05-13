from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import models  # noqa: F401 — ensure all models are registered before create_all
from core.database import Base, engine
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
    settings,
    tithe,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="BizOS API",
    description="Dash & Co. Business + Personal Finance Operating System",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "https://your-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api/v1"

app.include_router(auth.router,         prefix=f"{API_PREFIX}/auth",         tags=["Auth"])
app.include_router(inventory.router,    prefix=f"{API_PREFIX}/inventory",     tags=["Inventory"])
app.include_router(repairs.router,      prefix=f"{API_PREFIX}/repairs",       tags=["Repairs"])
app.include_router(sales.router,        prefix=f"{API_PREFIX}/sales",         tags=["Sales"])
app.include_router(purchases.router,    prefix=f"{API_PREFIX}/purchases",     tags=["Purchases"])
app.include_router(expenses.router,     prefix=f"{API_PREFIX}/expenses",      tags=["Expenses"])
app.include_router(investments.router,  prefix=f"{API_PREFIX}/investments",   tags=["Investments"])
app.include_router(tithe.router,        prefix=f"{API_PREFIX}/tithe",         tags=["Tithe"])
app.include_router(market_list.router,  prefix=f"{API_PREFIX}/market-list",   tags=["Market List"])
app.include_router(personal.router,     prefix=f"{API_PREFIX}/personal",      tags=["Personal"])
app.include_router(food_vendor.router,  prefix=f"{API_PREFIX}/food-vendor",   tags=["Food Vendor"])
app.include_router(settings.router,     prefix=f"{API_PREFIX}/settings",      tags=["Settings"])
app.include_router(analytics.router,    prefix=f"{API_PREFIX}/analytics",     tags=["Analytics"])
app.include_router(reports.router,      prefix=f"{API_PREFIX}/reports",       tags=["Reports"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "BizOS API"}
