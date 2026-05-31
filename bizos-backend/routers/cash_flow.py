from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.dependencies import get_current_user, get_db, role_required
from models.cash_flow import FinanceScope
from models.user import User, UserRole
from schemas.cash_flow import (
    CashBalanceOut,
    CashFlowTimeline,
    LiquidityForecast,
    NetWorth,
    OpeningBalanceSet,
)
from services.cash_flow_service import (
    get_cash_flow_timeline,
    get_cash_position,
    get_liquidity_forecast,
    get_net_worth,
    set_opening_balance,
)

router = APIRouter()


@router.post("/opening-balance", response_model=CashBalanceOut)
def set_balance(
    payload: OpeningBalanceSet,
    db: Session = Depends(get_db),
    _: User = Depends(role_required(UserRole.owner, UserRole.super_admin)),
):
    """Set or update the opening balance for a scope. Safe to call multiple times."""
    return set_opening_balance(db, payload.scope, payload.opening_balance, payload.opened_at)


@router.get("/position/{scope}", response_model=CashBalanceOut)
def cash_position(
    scope: FinanceScope,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Current cash position for a scope: opening balance + all events since."""
    return get_cash_position(db, scope)


@router.get("/timeline/{scope}", response_model=CashFlowTimeline)
def cash_flow_timeline(
    scope: FinanceScope,
    period_start: Optional[date] = None,
    period_end: Optional[date] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if not period_start:
        period_start = date.today().replace(day=1)
    if not period_end:
        period_end = date.today()
    return get_cash_flow_timeline(db, scope, period_start, period_end)


@router.get("/forecast/{scope}", response_model=LiquidityForecast)
def liquidity_forecast(
    scope: FinanceScope,
    days: int = 30,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if days < 1 or days > 365:
        raise HTTPException(400, "days must be between 1 and 365")
    return get_liquidity_forecast(db, scope, days)


@router.get("/net-worth", response_model=NetWorth)
def net_worth(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return get_net_worth(db)


@router.get("/planning/burn-rate")
def burn_rate(
    lookback_months: int = 3,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from services.planning_service import get_monthly_burn_rate
    if lookback_months < 1 or lookback_months > 12:
        raise HTTPException(400, "lookback_months must be 1–12")
    return get_monthly_burn_rate(db, lookback_months)


@router.get("/planning/debt-plan")
def debt_plan(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from services.planning_service import get_debt_payoff_plan
    return get_debt_payoff_plan(db)


@router.get("/planning/business-recovery")
def business_recovery(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from services.planning_service import get_business_recovery_plan
    return get_business_recovery_plan(db)
