from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from core.dependencies import get_current_user, get_db, role_required
from models.food_vendor import FoodVendorCredit, FoodVendorPayment
from models.personal import PersonalTransaction, PersonalTxType
from models.user import User, UserRole
from schemas.food_vendor import (
    FoodCreditCreate,
    FoodCreditOut,
    FoodMonthSummary,
    FoodVendorAnalytics,
    FoodVendorPaymentOut,
    FoodVendorPayRequest,
    FoodTrendPoint,
    VendorOutstanding,
    VendorSpendingSummary,
)

router = APIRouter()

_WRITE_ROLES = (UserRole.super_admin, UserRole.owner, UserRole.accountant)


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
    _: User = Depends(role_required(*_WRITE_ROLES)),
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
    _: User = Depends(role_required(*_WRITE_ROLES)),
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
    month_start = today.replace(day=1)

    weekly_total = (
        db.query(func.sum(FoodVendorCredit.amount))
        .filter(FoodVendorCredit.purchase_date >= week_start)
        .scalar() or Decimal("0")
    )
    monthly_total = (
        db.query(func.sum(FoodVendorCredit.amount))
        .filter(FoodVendorCredit.purchase_date >= month_start)
        .scalar() or Decimal("0")
    )
    days_so_far = (today - week_start).days + 1
    daily_avg = weekly_total / days_so_far if days_so_far else Decimal("0")
    outstanding = (
        db.query(func.sum(FoodVendorCredit.amount))
        .filter(FoodVendorCredit.paid == False)
        .scalar() or Decimal("0")
    )
    total_paid = (
        db.query(func.sum(FoodVendorCredit.amount))
        .filter(FoodVendorCredit.paid == True)
        .scalar() or Decimal("0")
    )
    total_credits = db.query(func.count(FoodVendorCredit.id)).scalar() or 0
    unpaid_count = db.query(func.count(FoodVendorCredit.id)).filter(FoodVendorCredit.paid == False).scalar() or 0

    return FoodVendorAnalytics(
        weekly_total=weekly_total,
        monthly_total=monthly_total,
        daily_average=daily_avg,
        total_outstanding=outstanding,
        total_paid=total_paid,
        total_credits=total_credits,
        unpaid_count=unpaid_count,
    )


@router.get("/trend", response_model=List[FoodTrendPoint])
def spending_trend(
    days: int = 30,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from datetime import timedelta
    today = date.today()
    start = today - timedelta(days=days - 1)

    rows = (
        db.query(
            FoodVendorCredit.purchase_date,
            func.sum(FoodVendorCredit.amount).label("total"),
            func.count(FoodVendorCredit.id).label("count"),
        )
        .filter(FoodVendorCredit.purchase_date >= start)
        .group_by(FoodVendorCredit.purchase_date)
        .order_by(FoodVendorCredit.purchase_date)
        .all()
    )
    day_map = {r.purchase_date: r for r in rows}
    result = []
    for i in range(days):
        d = start + timedelta(days=i)
        r = day_map.get(d)
        result.append(FoodTrendPoint(
            date=str(d),
            total=r.total if r else Decimal("0"),
            count=r.count if r else 0,
        ))
    return result


@router.get("/monthly-summary", response_model=List[FoodMonthSummary])
def monthly_summary(
    months: int = 6,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from sqlalchemy import case as sa_case
    today = date.today()
    # Walk back to the first day of `months` months ago
    start = today.replace(day=1)
    for _ in range(months - 1):
        from datetime import timedelta
        start = (start - timedelta(days=1)).replace(day=1)

    paid_case = sa_case(
        (FoodVendorCredit.paid == True, FoodVendorCredit.amount),
        else_=Decimal("0"),
    )
    rows = (
        db.query(
            func.to_char(FoodVendorCredit.purchase_date, "YYYY-MM").label("month"),
            func.sum(FoodVendorCredit.amount).label("total_spent"),
            func.coalesce(func.sum(paid_case), Decimal("0")).label("total_paid"),
            func.count(FoodVendorCredit.id).label("total_credits"),
        )
        .filter(FoodVendorCredit.purchase_date >= start)
        .group_by(func.to_char(FoodVendorCredit.purchase_date, "YYYY-MM"))
        .order_by(func.to_char(FoodVendorCredit.purchase_date, "YYYY-MM").asc())
        .all()
    )

    pay_rows = (
        db.query(
            func.to_char(func.date(FoodVendorPayment.paid_at), "YYYY-MM").label("month"),
            func.count(FoodVendorPayment.id).label("count"),
        )
        .filter(func.date(FoodVendorPayment.paid_at) >= start)
        .group_by(func.to_char(func.date(FoodVendorPayment.paid_at), "YYYY-MM"))
        .all()
    )
    pay_count_map = {r.month: r.count for r in pay_rows}

    return [
        FoodMonthSummary(
            month=r.month,
            total_spent=r.total_spent,
            total_paid=r.total_paid,
            total_credits=r.total_credits,
            payment_count=pay_count_map.get(r.month, 0),
        )
        for r in rows
    ]


@router.get("/vendor-breakdown", response_model=List[VendorSpendingSummary])
def vendor_breakdown(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    unpaid_case = case(
        (FoodVendorCredit.paid == False, FoodVendorCredit.amount),
        else_=None,
    )
    rows = (
        db.query(
            FoodVendorCredit.vendor_name,
            func.sum(FoodVendorCredit.amount).label("total_spent"),
            func.count(FoodVendorCredit.id).label("total_meals"),
            func.coalesce(func.sum(unpaid_case), Decimal("0")).label("unpaid_amount"),
        )
        .group_by(FoodVendorCredit.vendor_name)
        .order_by(func.sum(FoodVendorCredit.amount).desc())
        .all()
    )
    return [
        VendorSpendingSummary(
            vendor_name=r.vendor_name,
            total_spent=r.total_spent,
            total_meals=r.total_meals,
            unpaid_amount=r.unpaid_amount,
        )
        for r in rows
    ]
