from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.dependencies import get_current_user, get_db
from models.user import User
from services.analytics_service import get_business_summary, get_expense_breakdown

router = APIRouter()


def _default_period():
    today = date.today()
    return today.replace(day=1), today


@router.get("/profit-loss")
def profit_loss_report(
    period_start: date = None,
    period_end: date = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if not period_start or not period_end:
        period_start, period_end = _default_period()
    summary = get_business_summary(db, period_start, period_end)
    breakdown = get_expense_breakdown(db, period_start, period_end)
    return {"summary": summary.model_dump(), "expense_breakdown": [e.model_dump() for e in breakdown]}


@router.get("/inventory")
def inventory_report(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from models.inventory import Item
    items = db.query(Item).filter(Item.is_active == True).all()
    return {
        "items": [
            {
                "id": str(i.id),
                "name": i.name,
                "category": i.category,
                "quantity_in_stock": i.quantity_in_stock,
                "reorder_level": i.reorder_level,
                "purchase_price": str(i.purchase_price),
                "selling_price": str(i.selling_price) if i.selling_price else None,
                "low_stock": i.quantity_in_stock <= i.reorder_level,
            }
            for i in items
        ]
    }


@router.get("/repairs")
def repairs_report(
    period_start: date = None,
    period_end: date = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if not period_start or not period_end:
        period_start, period_end = _default_period()
    from sqlalchemy import func
    from models.repair import RepairJob
    jobs = (
        db.query(RepairJob)
        .filter(
            func.date(RepairJob.received_at) >= period_start,
            func.date(RepairJob.received_at) <= period_end,
        )
        .all()
    )
    return {
        "period_start": str(period_start),
        "period_end": str(period_end),
        "jobs": [
            {
                "job_number": j.job_number,
                "customer_name": j.customer_name,
                "device_type": j.device_type.value,
                "status": j.status.value,
                "total_charge": str(j.total_charge),
                "received_at": str(j.received_at),
            }
            for j in jobs
        ],
    }


@router.get("/personal")
def personal_report(
    period_start: date = None,
    period_end: date = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if not period_start or not period_end:
        period_start, period_end = _default_period()
    from models.personal import PersonalTransaction
    txs = (
        db.query(PersonalTransaction)
        .filter(
            PersonalTransaction.transaction_date >= period_start,
            PersonalTransaction.transaction_date <= period_end,
        )
        .all()
    )
    return {
        "period_start": str(period_start),
        "period_end": str(period_end),
        "transactions": [
            {
                "type": t.type.value,
                "category": t.category,
                "amount": str(t.amount),
                "description": t.description,
                "date": str(t.transaction_date),
            }
            for t in txs
        ],
    }
