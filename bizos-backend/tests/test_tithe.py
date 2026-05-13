"""
Tithe tests:
- pay tithe creates expense, sets paid=True, sets expense_id
"""
from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from models.expense import Expense, ExpenseCategory
from models.tithe import TitheRecord, TitheScope
from services.tithe_service import (
    create_business_tithe,
    create_personal_tithe,
    get_unpaid_total,
    pay_tithe,
)


def test_create_business_tithe(db: Session):
    record = create_business_tithe(db, Decimal("50000"))
    assert record.scope == TitheScope.business
    assert record.tithe_amount == Decimal("5000")  # 10%
    assert record.paid == False
    assert record.expense_id is None


def test_create_personal_tithe(db: Session):
    record = create_personal_tithe(db, Decimal("30000"))
    assert record.scope == TitheScope.personal
    assert record.tithe_amount == Decimal("3000")
    assert record.paid == False


def test_pay_tithe_sets_paid_true(db: Session):
    record = create_business_tithe(db, Decimal("20000"))
    result = pay_tithe(db, record.id)
    assert result.paid == True
    assert result.paid_at is not None


def test_pay_tithe_creates_expense(db: Session):
    record = create_business_tithe(db, Decimal("20000"))
    pay_tithe(db, record.id)

    expenses = db.query(Expense).filter_by(category=ExpenseCategory.tithe).all()
    assert len(expenses) == 1
    assert expenses[0].amount == Decimal("2000")  # 10% of 20000


def test_pay_tithe_sets_expense_id(db: Session):
    record = create_business_tithe(db, Decimal("10000"))
    result = pay_tithe(db, record.id)
    assert result.expense_id is not None

    expense = db.query(Expense).filter_by(id=result.expense_id).first()
    assert expense is not None
    assert expense.amount == Decimal("1000")


def test_pay_tithe_already_paid_raises(db: Session):
    from fastapi import HTTPException
    record = create_business_tithe(db, Decimal("10000"))
    pay_tithe(db, record.id)

    with pytest.raises(HTTPException) as exc:
        pay_tithe(db, record.id)
    assert exc.value.status_code == 400


def test_get_unpaid_total(db: Session):
    create_business_tithe(db, Decimal("50000"))  # 5000 tithe
    create_business_tithe(db, Decimal("30000"))  # 3000 tithe
    record_paid = create_business_tithe(db, Decimal("10000"))  # 1000 — will be paid
    pay_tithe(db, record_paid.id)

    total = get_unpaid_total(db, TitheScope.business)
    assert total == Decimal("8000")  # 5000 + 3000, not the paid one
