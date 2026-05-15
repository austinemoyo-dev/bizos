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
    record = TitheRecord(
        scope=TitheScope.business,
        calculated_from=profit,
        tithe_amount=tithe_amount,
        paid=False,
        reference_id=reference_id,
        period_start=earned_date,  # date the repair was completed (for correct period attribution)
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


def get_unpaid_total(db: Session, scope: TitheScope) -> Decimal:
    result = (
        db.query(func.sum(TitheRecord.tithe_amount))
        .filter_by(scope=scope, paid=False)
        .scalar()
    )
    return result or Decimal("0")
