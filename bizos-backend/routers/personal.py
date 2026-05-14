from datetime import date
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from core.dependencies import get_current_user, get_db
from models.personal import PersonalTransaction, PersonalTxType, SavingsGoal
from models.tithe import TitheRecord, TitheScope
from models.user import User
from schemas.personal import (
    PersonalSummary,
    PersonalTransactionCreate,
    PersonalTransactionOut,
    SavingsGoalCreate,
    SavingsGoalOut,
    SavingsGoalUpdate,
)
from schemas.tithe import TitheRecordOut, TitheUnpaidTotal
from services.tithe_service import get_unpaid_total, pay_tithe

router = APIRouter()


@router.get("/transactions", response_model=List[PersonalTransactionOut])
def list_transactions(
    type: Optional[str] = Query(None, max_length=50),
    category: Optional[str] = Query(None, max_length=100),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(PersonalTransaction)
    if type:
        try:
            PersonalTxType(type)
        except ValueError:
            raise HTTPException(400, "Invalid transaction type")
        q = q.filter(PersonalTransaction.type == type)
    if category:
        q = q.filter(PersonalTransaction.category == category)
    if date_from:
        q = q.filter(PersonalTransaction.transaction_date >= date_from)
    if date_to:
        q = q.filter(PersonalTransaction.transaction_date <= date_to)
    return q.order_by(PersonalTransaction.transaction_date.desc()).all()


@router.post("/transactions", response_model=PersonalTransactionOut, status_code=201)
def create_transaction(
    payload: PersonalTransactionCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    data = payload.model_dump()
    if data.get("transaction_date") is None:
        data["transaction_date"] = date.today()
    tx = PersonalTransaction(**data)
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


@router.get("/transactions/{tx_id}", response_model=PersonalTransactionOut)
def get_transaction(
    tx_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    tx = db.query(PersonalTransaction).filter_by(id=tx_id).first()
    if not tx:
        raise HTTPException(404, "Transaction not found")
    return tx


@router.delete("/transactions/{tx_id}", status_code=204)
def delete_transaction(
    tx_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    tx = db.query(PersonalTransaction).filter_by(id=tx_id).first()
    if not tx:
        raise HTTPException(404, "Transaction not found")
    db.delete(tx)
    db.commit()


@router.get("/summary", response_model=PersonalSummary)
def summary(
    period_start: date,
    period_end: date,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    income = (
        db.query(func.sum(PersonalTransaction.amount))
        .filter(
            PersonalTransaction.type == PersonalTxType.income,
            PersonalTransaction.transaction_date >= period_start,
            PersonalTransaction.transaction_date <= period_end,
        )
        .scalar()
        or 0
    )
    expenses = (
        db.query(func.sum(PersonalTransaction.amount))
        .filter(
            PersonalTransaction.type == PersonalTxType.expense,
            PersonalTransaction.transaction_date >= period_start,
            PersonalTransaction.transaction_date <= period_end,
        )
        .scalar()
        or 0
    )
    return PersonalSummary(
        period_start=period_start,
        period_end=period_end,
        total_income=income,
        total_expenses=expenses,
        balance=income - expenses,
    )


@router.get("/savings-goals", response_model=List[SavingsGoalOut])
def list_goals(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(SavingsGoal).all()


@router.post("/savings-goals", response_model=SavingsGoalOut, status_code=201)
def create_goal(
    payload: SavingsGoalCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    goal = SavingsGoal(**payload.model_dump())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.put("/savings-goals/{goal_id}", response_model=SavingsGoalOut)
def update_goal(
    goal_id: UUID,
    payload: SavingsGoalUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    goal = db.query(SavingsGoal).filter_by(id=goal_id).first()
    if not goal:
        raise HTTPException(404, "Goal not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(goal, field, value)
    db.commit()
    db.refresh(goal)
    return goal


@router.get("/tithe", response_model=List[TitheRecordOut])
def personal_tithe(
    paid: Optional[bool] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(TitheRecord).filter_by(scope=TitheScope.personal)
    if paid is not None:
        q = q.filter(TitheRecord.paid == paid)
    return q.order_by(TitheRecord.created_at.desc()).all()


@router.get("/tithe/unpaid-total", response_model=TitheUnpaidTotal)
def personal_tithe_unpaid(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return TitheUnpaidTotal(
        scope=TitheScope.personal,
        total=get_unpaid_total(db, TitheScope.personal),
    )


@router.post("/tithe/{tithe_id}/pay", response_model=TitheRecordOut)
def pay_personal_tithe(
    tithe_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return pay_tithe(db, tithe_id)
