from datetime import date
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from core.dependencies import get_current_user, get_db, role_required
from models.tithe import TitheRecord, TitheScope
from models.user import User, UserRole
from schemas.tithe import TithePayRequest, TitheRecordOut, TitheUnpaidTotal
from services.tithe_service import generate_monthly_tithe, get_unpaid_total, pay_tithe

router = APIRouter()


@router.get("", response_model=List[TitheRecordOut])
def list_tithe(
    scope: Optional[str] = None,
    paid: Optional[bool] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from sqlalchemy import func
    q = db.query(TitheRecord)
    if scope:
        q = q.filter(TitheRecord.scope == scope)
    if paid is not None:
        q = q.filter(TitheRecord.paid == paid)
    if date_from:
        if paid is True:
            q = q.filter(func.date(TitheRecord.paid_at) >= date_from)
        else:
            earned = func.coalesce(TitheRecord.period_start, func.date(TitheRecord.created_at))
            q = q.filter(earned >= date_from)
    if date_to:
        if paid is True:
            q = q.filter(func.date(TitheRecord.paid_at) <= date_to)
        else:
            earned = func.coalesce(TitheRecord.period_start, func.date(TitheRecord.created_at))
            q = q.filter(earned <= date_to)
    return q.order_by(TitheRecord.created_at.desc()).all()


@router.get("/unpaid-total", response_model=TitheUnpaidTotal)
def unpaid_total(
    scope: str = TitheScope.business,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return TitheUnpaidTotal(
        scope=scope,
        total=get_unpaid_total(db, scope),
    )


@router.post("/generate", response_model=Optional[TitheRecordOut])
def generate(
    year: int,
    month: int,
    scope: str = TitheScope.business,
    db: Session = Depends(get_db),
    _: User = Depends(role_required(UserRole.owner, UserRole.super_admin, UserRole.accountant)),
):
    """Calculate 10 % of net profit/income for the given month and create/refresh a tithe record."""
    record = generate_monthly_tithe(db, year, month, scope=scope)
    return record


@router.post("/{tithe_id}/pay", response_model=TitheRecordOut)
def pay(
    tithe_id: UUID,
    payload: TithePayRequest = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(UserRole.owner, UserRole.super_admin)),
):
    return pay_tithe(db, tithe_id, payload.paid_date if payload else None)
