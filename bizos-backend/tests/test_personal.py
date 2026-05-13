"""
Personal finance tests:
- food vendor batch payment creates payment record + personal transaction
"""
from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from models.food_vendor import FoodVendorCredit, FoodVendorPayment
from models.personal import PersonalTransaction, PersonalTxType


def make_credit(db: Session, vendor="Mama Put", amount=Decimal("500")) -> FoodVendorCredit:
    credit = FoodVendorCredit(
        vendor_name=vendor,
        meal_description="Jollof rice",
        amount=amount,
        purchase_date=date.today(),
    )
    db.add(credit)
    db.commit()
    db.refresh(credit)
    return credit


def simulate_pay(db: Session, credits, vendor_name):
    """Replicate food vendor pay logic without hitting the router."""
    from datetime import datetime
    from uuid import uuid4

    total = sum(c.amount for c in credits)
    batch_id = uuid4()
    now = datetime.utcnow()

    for credit in credits:
        credit.paid = True
        credit.paid_at = now
        credit.payment_batch_id = batch_id

    payment = FoodVendorPayment(
        vendor_name=vendor_name,
        amount_paid=total,
        paid_at=now,
    )
    db.add(payment)

    personal_tx = PersonalTransaction(
        type=PersonalTxType.expense,
        category="food",
        amount=total,
        description=f"Food vendor payment — {vendor_name}",
        transaction_date=now.date(),
    )
    db.add(personal_tx)
    db.commit()
    db.refresh(payment)
    return payment


def test_batch_payment_marks_credits_paid(db: Session):
    c1 = make_credit(db, amount=Decimal("500"))
    c2 = make_credit(db, amount=Decimal("800"))

    simulate_pay(db, [c1, c2], "Mama Put")

    db.refresh(c1)
    db.refresh(c2)
    assert c1.paid == True
    assert c2.paid == True
    assert c1.payment_batch_id == c2.payment_batch_id


def test_batch_payment_creates_payment_record(db: Session):
    c1 = make_credit(db, amount=Decimal("500"))
    c2 = make_credit(db, amount=Decimal("800"))

    simulate_pay(db, [c1, c2], "Mama Put")

    payments = db.query(FoodVendorPayment).all()
    assert len(payments) == 1
    assert payments[0].amount_paid == Decimal("1300")
    assert payments[0].vendor_name == "Mama Put"


def test_batch_payment_creates_personal_transaction(db: Session):
    c1 = make_credit(db, amount=Decimal("600"))

    simulate_pay(db, [c1], "Iya Beji")

    tx = db.query(PersonalTransaction).filter_by(type=PersonalTxType.expense).first()
    assert tx is not None
    assert tx.amount == Decimal("600")
    assert tx.category == "food"


def test_multiple_vendors_separate_batches(db: Session):
    c1 = make_credit(db, vendor="Mama Put", amount=Decimal("500"))
    c2 = make_credit(db, vendor="Iya Beji", amount=Decimal("700"))

    simulate_pay(db, [c1], "Mama Put")
    simulate_pay(db, [c2], "Iya Beji")

    payments = db.query(FoodVendorPayment).all()
    assert len(payments) == 2

    txs = db.query(PersonalTransaction).filter_by(category="food").all()
    assert len(txs) == 2
    assert sum(t.amount for t in txs) == Decimal("1200")
