from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.dependencies import get_current_user, get_db, role_required
from models.investment import Investment
from models.user import User, UserRole
from schemas.investment import InvestmentCreate, InvestmentOut, InvestmentUpdate, RepaymentRequest

router = APIRouter()


def _to_out(inv: Investment) -> InvestmentOut:
    return InvestmentOut.from_orm(inv)


@router.get("", response_model=List[InvestmentOut])
def list_investments(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return [_to_out(i) for i in db.query(Investment).order_by(Investment.created_at.desc()).all()]


@router.post("", response_model=InvestmentOut, status_code=201)
def create_investment(
    payload: InvestmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(UserRole.owner, UserRole.super_admin)),
):
    inv = Investment(**payload.model_dump())
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return _to_out(inv)


@router.get("/{inv_id}", response_model=InvestmentOut)
def get_investment(
    inv_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    inv = db.query(Investment).filter_by(id=inv_id).first()
    if not inv:
        raise HTTPException(404, "Investment not found")
    return _to_out(inv)


@router.put("/{inv_id}", response_model=InvestmentOut)
def update_investment(
    inv_id: UUID,
    payload: InvestmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(UserRole.owner, UserRole.super_admin)),
):
    inv = db.query(Investment).filter_by(id=inv_id).first()
    if not inv:
        raise HTTPException(404, "Investment not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(inv, field, value)
    db.commit()
    db.refresh(inv)
    return _to_out(inv)


@router.post("/{inv_id}/repay", response_model=InvestmentOut)
def record_repayment(
    inv_id: UUID,
    payload: RepaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(UserRole.owner, UserRole.super_admin)),
):
    inv = db.query(Investment).filter_by(id=inv_id).first()
    if not inv:
        raise HTTPException(404, "Investment not found")
    inv.amount_repaid += payload.amount
    if inv.amount_repaid >= inv.amount:
        inv.is_settled = True
    db.commit()
    db.refresh(inv)
    return _to_out(inv)
