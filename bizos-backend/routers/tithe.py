from datetime import date
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.dependencies import get_current_user, get_db, role_required
from models.tithe import TitheRecord, TitheScope
from models.user import User, UserRole
from schemas.tithe import TitheRecordOut, TitheUnpaidTotal
from services.tithe_service import get_unpaid_total, pay_tithe

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
        q = q.filter(func.date(TitheRecord.created_at) >= date_from)
    if date_to:
        q = q.filter(func.date(TitheRecord.created_at) <= date_to)
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


@router.post("/{tithe_id}/pay", response_model=TitheRecordOut)
def pay(
    tithe_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(UserRole.owner, UserRole.super_admin)),
):
    return pay_tithe(db, tithe_id)
