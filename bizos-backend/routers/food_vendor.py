from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from core.dependencies import get_current_user, get_db
from models.food_vendor import FoodVendorCredit, FoodVendorPayment
from models.personal import PersonalTransaction, PersonalTxType
from models.user import User
from schemas.food_vendor import (
    FoodCreditCreate,
    FoodCreditOut,
    FoodVendorAnalytics,
    FoodVendorPaymentOut,
    FoodVendorPayRequest,
    VendorOutstanding,
)

router = APIRouter()


@router.get("/credits", response_model=List[FoodCreditOut])
def list_credits(
    paid: Optional[bool] = None,
    vendor: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(FoodVendorCredit)
    if paid is not None:
        q = q.filter(FoodVendorCredit.paid == paid)
    if vendor:
        q = q.filter(FoodVendorCredit.vendor_name == vendor)
    return q.order_by(FoodVendorCredit.purchase_date.desc()).all()


@router.post("/credits", response_model=FoodCreditOut, status_code=201)
def record_meal(
    payload: FoodCreditCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    data = payload.model_dump()
    if data.get("purchase_date") is None:
        data["purchase_date"] = date.today()
    credit = FoodVendorCredit(**data)
    db.add(credit)
    db.commit()
    db.refresh(credit)
    return credit


@router.get("/outstanding", response_model=List[VendorOutstanding])
def outstanding_by_vendor(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = (
        db.query(
            FoodVendorCredit.vendor_name,
            func.sum(FoodVendorCredit.amount).label("total"),
            func.count(FoodVendorCredit.id).label("count"),
        )
        .filter(FoodVendorCredit.paid == False)
        .group_by(FoodVendorCredit.vendor_name)
        .all()
    )
    return [
        VendorOutstanding(
            vendor_name=r.vendor_name,
            total_outstanding=r.total,
            credit_count=r.count,
        )
        for r in rows
    ]


@router.post("/pay", response_model=FoodVendorPaymentOut)
def pay_credits(
    payload: FoodVendorPayRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    credits = (
        db.query(FoodVendorCredit)
        .filter(
            FoodVendorCredit.id.in_(payload.credit_ids),
            FoodVendorCredit.paid == False,
        )
        .all()
    )
    if not credits:
        raise HTTPException(400, "No unpaid credits found for given IDs")

    total = sum(c.amount for c in credits)
    batch_id = uuid4()
    now = datetime.utcnow()

    for credit in credits:
        credit.paid = True
        credit.paid_at = now
        credit.payment_batch_id = batch_id

    payment = FoodVendorPayment(
        vendor_name=payload.vendor_name,
        amount_paid=total,
        paid_at=now,
    )
    db.add(payment)

    personal_tx = PersonalTransaction(
        type=PersonalTxType.expense,
        category="food",
        amount=total,
        description=f"Food vendor payment — {payload.vendor_name}",
        transaction_date=now.date(),
    )
    db.add(personal_tx)

    db.commit()
    db.refresh(payment)
    return payment


@router.get("/payments", response_model=List[FoodVendorPaymentOut])
def payment_history(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return db.query(FoodVendorPayment).order_by(FoodVendorPayment.paid_at.desc()).all()


@router.get("/analytics", response_model=FoodVendorAnalytics)
def analytics(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from datetime import timedelta
    today = date.today()
    week_start = today - timedelta(days=today.weekday())

    weekly_total = (
        db.query(func.sum(FoodVendorCredit.amount))
        .filter(FoodVendorCredit.purchase_date >= week_start)
        .scalar()
        or Decimal("0")
    )

    days_so_far = (today - week_start).days + 1
    daily_avg = weekly_total / days_so_far if days_so_far else Decimal("0")

    outstanding = (
        db.query(func.sum(FoodVendorCredit.amount))
        .filter(FoodVendorCredit.paid == False)
        .scalar()
        or Decimal("0")
    )

    return FoodVendorAnalytics(
        weekly_total=weekly_total,
        daily_average=daily_avg,
        total_outstanding=outstanding,
    )
