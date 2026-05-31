from datetime import date
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from core.dependencies import get_current_user, get_db, role_required
from models.expense import Expense
from models.user import User, UserRole
from schemas.expense import ExpenseCreate, ExpenseOut, ExpenseSummaryItem, ExpenseUpdate

router = APIRouter()


@router.get("", response_model=List[ExpenseOut])
def list_expenses(
    category: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Expense)
    if category:
        q = q.filter(Expense.category == category)
    if date_from:
        q = q.filter(Expense.expense_date >= date_from)
    if date_to:
        q = q.filter(Expense.expense_date <= date_to)
    return q.order_by(Expense.expense_date.desc()).all()


@router.post("", response_model=ExpenseOut, status_code=201)
def create_expense(
    payload: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(UserRole.owner, UserRole.accountant, UserRole.super_admin)),
):
    data = payload.model_dump()
    if data.get("expense_date") is None:
        from datetime import date as _date
        data["expense_date"] = _date.today()
    expense = Expense(**data, created_by=current_user.id)
    db.add(expense)
    db.commit()
    db.refresh(expense)

    try:
        from services.tithe_service import generate_monthly_tithe
        d = expense.expense_date
        generate_monthly_tithe(db, d.year, d.month)
    except Exception:
        pass

    try:
        from models.cash_flow import CashEventType, FinanceScope
        from services.cash_flow_service import emit_cash_event
        emit_cash_event(
            db,
            scope=FinanceScope.business,
            event_type=CashEventType.expense,
            signed_amount=-expense.amount,
            description=expense.description or expense.category.value,
            event_date=expense.expense_date,
            reference_id=expense.id,
            reference_type="expense",
            auto_commit=True,
        )
    except Exception:
        pass

    return expense


@router.get("/summary", response_model=List[ExpenseSummaryItem])
def expense_summary(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(
        Expense.category,
        func.sum(Expense.amount).label("total"),
        func.count(Expense.id).label("count"),
    )
    if date_from:
        q = q.filter(Expense.expense_date >= date_from)
    if date_to:
        q = q.filter(Expense.expense_date <= date_to)
    rows = q.group_by(Expense.category).all()
    return [
        ExpenseSummaryItem(category=r.category.value, total=r.total, count=r.count)
        for r in rows
    ]


@router.get("/{expense_id}", response_model=ExpenseOut)
def get_expense(
    expense_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    expense = db.query(Expense).filter_by(id=expense_id).first()
    if not expense:
        raise HTTPException(404, "Expense not found")
    return expense


@router.put("/{expense_id}", response_model=ExpenseOut)
def update_expense(
    expense_id: UUID,
    payload: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(UserRole.owner, UserRole.accountant, UserRole.super_admin)),
):
    expense = db.query(Expense).filter_by(id=expense_id).first()
    if not expense:
        raise HTTPException(404, "Expense not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(expense, field, value)
    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/{expense_id}", status_code=204)
def delete_expense(
    expense_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(UserRole.owner, UserRole.super_admin)),
):
    expense = db.query(Expense).filter_by(id=expense_id).first()
    if not expense:
        raise HTTPException(404, "Expense not found")
    d = expense.expense_date
    db.delete(expense)
    db.commit()

    try:
        from services.tithe_service import generate_monthly_tithe
        generate_monthly_tithe(db, d.year, d.month)
    except Exception:
        pass
