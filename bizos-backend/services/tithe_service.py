import calendar
from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from models.expense import Expense, ExpenseCategory
from models.tithe import TitheRecord, TitheScope


def create_business_tithe(
    db: Session, profit: Decimal, reference_id: UUID = None, earned_date: date = None
) -> TitheRecord:
    tithe_amount = profit * Decimal("0.10")
    # Set period to the full calendar month in which the repair was completed.
    # This groups all tithes by month so the display shows e.g. "For: April 2025".
    if earned_date:
        p_start = earned_date.replace(day=1)
        last_day = calendar.monthrange(earned_date.year, earned_date.month)[1]
        p_end = earned_date.replace(day=last_day)
        record_created_at = datetime.combine(p_start, datetime.min.time()).replace(tzinfo=timezone.utc)
    else:
        today = date.today()
        p_start = today.replace(day=1)
        last_day = calendar.monthrange(today.year, today.month)[1]
        p_end = today.replace(day=last_day)
        record_created_at = datetime.utcnow()

    record = TitheRecord(
        scope=TitheScope.business,
        calculated_from=profit,
        tithe_amount=tithe_amount,
        paid=False,
        reference_id=reference_id,
        period_start=p_start,
        period_end=p_end,
        created_at=record_created_at,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def create_personal_tithe(db: Session, income: Decimal) -> TitheRecord:
    tithe_amount = income * Decimal("0.10")
    record = TitheRecord(
        scope=TitheScope.personal,
        calculated_from=income,
        tithe_amount=tithe_amount,
        paid=False,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def pay_tithe(db: Session, tithe_id: UUID, paid_date: date = None) -> TitheRecord:
    record = db.query(TitheRecord).filter_by(id=tithe_id).first()
    if not record:
        raise HTTPException(404, "Tithe record not found")
    if record.paid:
        raise HTTPException(400, "Tithe already paid")

    paid_at = (
        datetime.combine(paid_date, datetime.min.time()).replace(tzinfo=timezone.utc)
        if paid_date else datetime.utcnow()
    )

    expense = Expense(
        category=ExpenseCategory.tithe,
        amount=record.tithe_amount,
        description=f"{record.scope.value.capitalize()} tithe payment",
        expense_date=paid_date or date.today(),
        reference_id=record.id,
    )
    db.add(expense)
    db.flush()  # get expense.id

    record.paid = True
    record.paid_at = paid_at
    record.expense_id = expense.id

    db.commit()
    db.refresh(record)
    return record


def generate_monthly_tithe(db: Session, year: int, month: int) -> TitheRecord | None:
    """Create (or refresh) one business tithe record for the given calendar month.

    The tithe amount is 10 % of net profit: total revenue − all expenses for the month.
    If a record for that month already exists and is unpaid, its amount is updated.
    Returns None when net profit is zero or negative.
    """
    from sqlalchemy import func
    from models.expense import Expense
    from models.repair import RepairJob, RepairStatus
    from models.sales import Sale

    p_start = date(year, month, 1)
    last_day = calendar.monthrange(year, month)[1]
    p_end = date(year, month, last_day)

    _rev_date = func.date(func.coalesce(RepairJob.completed_at, RepairJob.received_at))
    repair_rev = (
        db.query(func.coalesce(func.sum(RepairJob.total_charge), 0))
        .filter(
            RepairJob.status.in_([RepairStatus.completed, RepairStatus.delivered]),
            _rev_date >= p_start,
            _rev_date <= p_end,
        )
        .scalar()
    )
    sale_rev = (
        db.query(func.coalesce(func.sum(Sale.selling_price * Sale.quantity), 0))
        .filter(func.date(Sale.sold_at) >= p_start, func.date(Sale.sold_at) <= p_end)
        .scalar()
    )
    expenses = (
        db.query(func.coalesce(func.sum(Expense.amount), 0))
        .filter(
            Expense.expense_date >= p_start,
            Expense.expense_date <= p_end,
            Expense.category != "tithe",  # tithe payments are not an operating cost
        )
        .scalar()
    )

    net_profit = Decimal(str(repair_rev)) + Decimal(str(sale_rev)) - Decimal(str(expenses))

    if net_profit <= 0:
        return None

    tithe_amount = (net_profit * Decimal("0.10")).quantize(Decimal("0.01"))

    # Update existing unpaid record for this month rather than creating a duplicate.
    existing = (
        db.query(TitheRecord)
        .filter(
            TitheRecord.scope == TitheScope.business,
            TitheRecord.period_start == p_start,
            TitheRecord.paid == False,
        )
        .first()
    )
    if existing:
        existing.calculated_from = net_profit
        existing.tithe_amount = tithe_amount
        db.commit()
        db.refresh(existing)
        return existing

    record_created_at = datetime.combine(p_start, datetime.min.time()).replace(tzinfo=timezone.utc)
    record = TitheRecord(
        scope=TitheScope.business,
        calculated_from=net_profit,
        tithe_amount=tithe_amount,
        paid=False,
        period_start=p_start,
        period_end=p_end,
        created_at=record_created_at,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_unpaid_total(db: Session, scope: TitheScope) -> Decimal:
    result = (
        db.query(func.sum(TitheRecord.tithe_amount))
        .filter_by(scope=scope, paid=False)
        .scalar()
    )
    return result or Decimal("0")
