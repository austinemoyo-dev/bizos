from datetime import date, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from core.dependencies import get_current_user, get_db
from models.user import User
from models.settings import MonthlyGoal
from schemas.analytics import BusinessSummary, ExpenseBreakdown, DebtorItem
from schemas.settings import MonthlyGoalOut, MonthlyGoalCreate, MonthlyGoalUpdate
from services.analytics_service import get_business_summary, get_expense_breakdown, get_debtors

router = APIRouter()


def _default_period():
    today = date.today()
    return today.replace(day=1), today


@router.get("/business/goals", response_model=MonthlyGoalOut)
def get_monthly_goal(
    month: int = None,
    year: int = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if not month or not year:
        today = date.today()
        month = today.month
        year = today.year
        
    goal = db.query(MonthlyGoal).filter_by(month=month, year=year).first()
    if not goal:
        goal = MonthlyGoal(month=month, year=year, revenue_target=0, profit_target=0)
        db.add(goal)
        db.commit()
        db.refresh(goal)
    return goal


@router.put("/business/goals", response_model=MonthlyGoalOut)
def update_monthly_goal(
    month: int,
    year: int,
    payload: MonthlyGoalUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    goal = db.query(MonthlyGoal).filter_by(month=month, year=year).first()
    if not goal:
        goal = MonthlyGoal(month=month, year=year)
        db.add(goal)
        
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(goal, field, value)
        
    db.commit()
    db.refresh(goal)
    return goal


@router.get("/business/summary", response_model=BusinessSummary)
def business_summary(
    period_start: date = None,
    period_end: date = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if not period_start or not period_end:
        period_start, period_end = _default_period()
    return get_business_summary(db, period_start, period_end)


@router.get("/business/expense-breakdown", response_model=List[ExpenseBreakdown])
def expense_breakdown(
    period_start: date = None,
    period_end: date = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if not period_start or not period_end:
        period_start, period_end = _default_period()
    return get_expense_breakdown(db, period_start, period_end)


@router.get("/business/revenue-trend")
def revenue_trend(
    period_start: date = None,
    period_end: date = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from sqlalchemy import func, cast, Date as SADate
    from models.sales import Sale
    from models.repair import RepairJob, RepairStatus
    from models.expense import Expense
    from datetime import timedelta

    if not period_start or not period_end:
        period_start, period_end = _default_period()

    # Build day-by-day data
    results = []
    current = period_start
    while current <= period_end:
        day_sale_rev = (
            db.query(func.coalesce(func.sum(Sale.selling_price * Sale.quantity), 0))
            .filter(func.date(Sale.sold_at) == current)
            .scalar()
        )
        day_repair_rev = (
            db.query(func.coalesce(func.sum(RepairJob.total_charge), 0))
            .filter(
                RepairJob.status.in_([RepairStatus.completed, RepairStatus.delivered]),
                func.date(func.coalesce(RepairJob.completed_at, RepairJob.received_at)) == current,
            )
            .scalar()
        )
        day_expenses = (
            db.query(func.coalesce(func.sum(Expense.amount), 0))
            .filter(Expense.expense_date == current)
            .scalar()
        )

        revenue = float(day_sale_rev) + float(day_repair_rev)
        expenses = float(day_expenses)
        results.append({
            "date": current.isoformat(),
            "revenue": revenue,
            "expenses": expenses,
            "profit": revenue - expenses,
        })
        current += timedelta(days=1)

    return results


@router.get("/business/top-items")
def top_items(
    period_start: date = None,
    period_end: date = None,
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from sqlalchemy import func
    from models.sales import Sale
    from models.inventory import Item
    if not period_start or not period_end:
        period_start, period_end = _default_period()
    rows = (
        db.query(
            Sale.item_id,
            Item.name,
            func.sum(Sale.quantity).label("total_qty"),
            func.sum(Sale.selling_price * Sale.quantity).label("total_rev"),
            func.sum((Sale.selling_price - Sale.cost_price) * Sale.quantity).label("total_profit"),
        )
        .join(Item, Sale.item_id == Item.id)
        .filter(func.date(Sale.sold_at) >= period_start, func.date(Sale.sold_at) <= period_end)
        .group_by(Sale.item_id, Item.name)
        .order_by(func.sum(Sale.selling_price * Sale.quantity).desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "item_id": str(r.item_id),
            "item_name": r.name,
            "total_quantity": int(r.total_qty),
            "total_revenue": float(r.total_rev),
            "total_profit": float(r.total_profit),
        }
        for r in rows
    ]


@router.get("/business/repair-stats")
def repair_stats(
    period_start: date = None,
    period_end: date = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from sqlalchemy import func
    from models.repair import RepairJob
    if not period_start or not period_end:
        period_start, period_end = _default_period()
    from models.repair import RepairStatus
    rev_date = func.date(func.coalesce(RepairJob.completed_at, RepairJob.received_at))
    rows = (
        db.query(
            RepairJob.device_type,
            func.count(RepairJob.id).label("job_count"),
            func.sum(RepairJob.total_charge).label("total_revenue"),
        )
        .filter(
            RepairJob.status.in_([RepairStatus.completed, RepairStatus.delivered]),
            rev_date >= period_start,
            rev_date <= period_end,
        )
        .group_by(RepairJob.device_type)
        .all()
    )
    return [
        {"device_type": r.device_type.value, "job_count": r.job_count, "total_revenue": r.total_revenue or 0}
        for r in rows
    ]


@router.get("/personal/summary")
def personal_summary(
    period_start: date = None,
    period_end: date = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from sqlalchemy import func
    from models.personal import PersonalTransaction, PersonalTxType
    if not period_start or not period_end:
        period_start, period_end = _default_period()
    income = (
        db.query(func.sum(PersonalTransaction.amount))
        .filter(
            PersonalTransaction.type == PersonalTxType.income,
            PersonalTransaction.transaction_date >= period_start,
            PersonalTransaction.transaction_date <= period_end,
        )
        .scalar() or 0
    )
    expenses = (
        db.query(func.sum(PersonalTransaction.amount))
        .filter(
            PersonalTransaction.type == PersonalTxType.expense,
            PersonalTransaction.transaction_date >= period_start,
            PersonalTransaction.transaction_date <= period_end,
        )
        .scalar() or 0
    )
    return {"period_start": period_start, "period_end": period_end, "total_income": income, "total_expenses": expenses, "balance": income - expenses}


@router.get("/personal/spending-trend")
def spending_trend(
    period_start: date = None,
    period_end: date = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from sqlalchemy import func
    from models.personal import PersonalTransaction, PersonalTxType
    from datetime import timedelta

    if not period_start or not period_end:
        period_start, period_end = _default_period()

    results = []
    current = period_start
    while current <= period_end:
        day_income = (
            db.query(func.coalesce(func.sum(PersonalTransaction.amount), 0))
            .filter(
                PersonalTransaction.type == PersonalTxType.income,
                PersonalTransaction.transaction_date == current,
            )
            .scalar()
        )
        day_expense = (
            db.query(func.coalesce(func.sum(PersonalTransaction.amount), 0))
            .filter(
                PersonalTransaction.type == PersonalTxType.expense,
                PersonalTransaction.transaction_date == current,
            )
            .scalar()
        )
        day_savings = (
            db.query(func.coalesce(func.sum(PersonalTransaction.amount), 0))
            .filter(
                PersonalTransaction.type == PersonalTxType.savings,
                PersonalTransaction.transaction_date == current,
            )
            .scalar()
        )
        results.append({
            "date": current.isoformat(),
            "income": float(day_income),
            "expenses": float(day_expense),
            "savings": float(day_savings),
            "net": float(day_income) - float(day_expense) - float(day_savings),
        })
        current += timedelta(days=1)

    return results


@router.get("/personal/category-breakdown")
def personal_category_breakdown(
    period_start: date = None,
    period_end: date = None,
    tx_type: str = Query("expense"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from sqlalchemy import func
    from models.personal import PersonalTransaction, PersonalTxType

    if not period_start or not period_end:
        period_start, period_end = _default_period()

    try:
        type_filter = PersonalTxType(tx_type)
    except ValueError:
        raise HTTPException(400, f"Invalid tx_type '{tx_type}'. Valid values: {[e.value for e in PersonalTxType]}")

    rows = (
        db.query(
            PersonalTransaction.category,
            func.sum(PersonalTransaction.amount).label("total"),
            func.count(PersonalTransaction.id).label("count"),
        )
        .filter(
            PersonalTransaction.type == type_filter,
            PersonalTransaction.transaction_date >= period_start,
            PersonalTransaction.transaction_date <= period_end,
        )
        .group_by(PersonalTransaction.category)
        .order_by(func.sum(PersonalTransaction.amount).desc())
        .all()
    )
    return [
        {"category": r.category, "amount": float(r.total), "count": r.count}
        for r in rows
    ]


@router.get("/comparison")
def comparison(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return {}


@router.get("/business/debtors", response_model=List[DebtorItem])
def debtors(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return get_debtors(db)
