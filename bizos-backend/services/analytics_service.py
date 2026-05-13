from datetime import date
from decimal import Decimal
from typing import List

from sqlalchemy import func
from sqlalchemy.orm import Session

from models.expense import Expense
from models.inventory import Item
from models.repair import RepairJob, RepairStatus
from models.sales import Sale
from models.tithe import TitheRecord, TitheScope
from schemas.analytics import (
    BusinessSummary,
    ExpenseBreakdown,
    PeriodComparison,
    PersonalSummaryAnalytics,
    RepairStats,
    RevenueTrendPoint,
    SpendingTrendPoint,
    TopItem,
)


def get_business_summary(
    db: Session, period_start: date, period_end: date
) -> BusinessSummary:
    repair_revenue = (
        db.query(func.sum(RepairJob.total_charge))
        .filter(
            RepairJob.status.in_([RepairStatus.completed, RepairStatus.delivered]),
            func.date(RepairJob.received_at) >= period_start,
            func.date(RepairJob.received_at) <= period_end,
        )
        .scalar()
        or Decimal("0")
    )

    sale_revenue = (
        db.query(func.sum(Sale.selling_price * Sale.quantity))
        .filter(
            func.date(Sale.sold_at) >= period_start,
            func.date(Sale.sold_at) <= period_end,
        )
        .scalar()
        or Decimal("0")
    )

    sale_profit = (
        db.query(func.sum((Sale.selling_price - Sale.cost_price) * Sale.quantity))
        .filter(
            func.date(Sale.sold_at) >= period_start,
            func.date(Sale.sold_at) <= period_end,
        )
        .scalar()
        or Decimal("0")
    )

    from models.repair import JobPart
    repair_parts_cost = (
        db.query(func.sum(JobPart.unit_cost * JobPart.quantity))
        .join(RepairJob, JobPart.job_id == RepairJob.id)
        .filter(
            RepairJob.status.in_([RepairStatus.completed, RepairStatus.delivered]),
            func.date(RepairJob.received_at) >= period_start,
            func.date(RepairJob.received_at) <= period_end,
        )
        .scalar()
        or Decimal("0")
    )

    repair_profit = repair_revenue - repair_parts_cost
    total_revenue = repair_revenue + sale_revenue

    cash_from_repairs = (
        db.query(func.sum(RepairJob.amount_paid))
        .filter(
            func.date(RepairJob.received_at) >= period_start,
            func.date(RepairJob.received_at) <= period_end,
        )
        .scalar()
        or Decimal("0")
    )

    cash_from_sales = (
        db.query(func.sum(Sale.amount_paid))
        .filter(
            func.date(Sale.sold_at) >= period_start,
            func.date(Sale.sold_at) <= period_end,
        )
        .scalar()
        or Decimal("0")
    )

    cash_collected = cash_from_repairs + cash_from_sales

    total_expenses = (
        db.query(func.sum(Expense.amount))
        .filter(
            Expense.expense_date >= period_start,
            Expense.expense_date <= period_end,
        )
        .scalar()
        or Decimal("0")
    )

    from models.expense import ExpenseCategory
    operating_expenses = (
        db.query(func.sum(Expense.amount))
        .filter(
            Expense.expense_date >= period_start,
            Expense.expense_date <= period_end,
            Expense.category != ExpenseCategory.inventory
        )
        .scalar()
        or Decimal("0")
    )

    # Actual pure profit (subtracts COGS and parts cost)
    net_profit = sale_profit + repair_profit - operating_expenses

    tithe_due = (
        db.query(func.sum(TitheRecord.tithe_amount))
        .filter(
            TitheRecord.scope == TitheScope.business,
            TitheRecord.paid == False,
            func.date(TitheRecord.created_at) >= period_start,
            func.date(TitheRecord.created_at) <= period_end,
        )
        .scalar()
        or Decimal("0")
    )

    # Tithe paid within this period (for display)
    tithe_paid = (
        db.query(func.sum(TitheRecord.tithe_amount))
        .filter(
            TitheRecord.scope == TitheScope.business,
            TitheRecord.paid == True,
            func.date(TitheRecord.created_at) >= period_start,
            func.date(TitheRecord.created_at) <= period_end,
        )
        .scalar()
        or Decimal("0")
    )

    from models.inventory import StockMovement, MovementType
    inventory_purchases = (
        db.query(func.sum(StockMovement.quantity * StockMovement.unit_cost))
        .filter(
            StockMovement.movement_type == MovementType.purchase,
            func.date(StockMovement.created_at) >= period_start,
            func.date(StockMovement.created_at) <= period_end,
        )
        .scalar()
        or Decimal("0")
    )

    # available_balance is all-time cumulative cash
    all_time_cash_repairs = db.query(func.sum(RepairJob.amount_paid)).scalar() or Decimal("0")
    all_time_cash_sales = db.query(func.sum(Sale.amount_paid)).scalar() or Decimal("0")
    all_time_expenses = db.query(func.sum(Expense.amount)).scalar() or Decimal("0")
    
    available_balance = (all_time_cash_repairs + all_time_cash_sales) - all_time_expenses

    repair_count = (
        db.query(func.count(RepairJob.id))
        .filter(
            func.date(RepairJob.received_at) >= period_start,
            func.date(RepairJob.received_at) <= period_end,
        )
        .scalar()
        or 0
    )

    sale_count = (
        db.query(func.count(Sale.id))
        .filter(
            func.date(Sale.sold_at) >= period_start,
            func.date(Sale.sold_at) <= period_end,
        )
        .scalar()
        or 0
    )

    pending_jobs = (
        db.query(func.count(RepairJob.id))
        .filter(
            RepairJob.status.notin_([RepairStatus.completed, RepairStatus.delivered, RepairStatus.cancelled]),
        )
        .scalar()
        or 0
    )

    low_stock_count = (
        db.query(func.count(Item.id))
        .filter(
            Item.is_active == True,
            Item.quantity_in_stock <= Item.reorder_level,
        )
        .scalar()
        or 0
    )

    inventory_value = inventory_purchases

    return BusinessSummary(
        period_start=period_start,
        period_end=period_end,
        total_revenue=total_revenue,
        total_expenses=total_expenses,
        net_profit=net_profit,
        cash_collected=cash_collected,
        tithe_due=tithe_due,
        tithe_paid=tithe_paid,
        available_balance=available_balance,
        repair_count=repair_count,
        sale_count=sale_count,
        pending_jobs=pending_jobs,
        low_stock_count=low_stock_count,
        inventory_value=inventory_value,
    )


def get_expense_breakdown(
    db: Session, period_start: date, period_end: date
) -> List[ExpenseBreakdown]:
    rows = (
        db.query(
            Expense.category,
            func.sum(Expense.amount).label("total"),
            func.count(Expense.id).label("count"),
        )
        .filter(
            Expense.expense_date >= period_start,
            Expense.expense_date <= period_end,
        )
        .group_by(Expense.category)
        .all()
    )

    grand_total = sum(r.total for r in rows) or Decimal("1")
    return [
        ExpenseBreakdown(
            category=r.category.value if hasattr(r.category, "value") else r.category,
            total=r.total,
            percentage=float(r.total / grand_total * 100),
            count=r.count,
        )
        for r in rows
    ]


def get_debtors(db: Session) -> List[dict]:
    # Sales where balance > 0
    sales = db.query(Sale, Item).join(Item, Sale.item_id == Item.id).all()
    debtors = []
    for sale, item in sales:
        total = sale.selling_price * sale.quantity
        balance = total - sale.amount_paid
        if balance > 0:
            debtors.append({
                "id": str(sale.id),
                "type": "sale",
                "customer_name": sale.customer or "Walk-in Customer",
                "reference": item.name,
                "total_amount": total,
                "amount_paid": sale.amount_paid,
                "balance": balance,
                "date": sale.sold_at.date() if sale.sold_at else date.today()
            })

    # Repairs where balance > 0
    repairs = db.query(RepairJob).all()
    for job in repairs:
        balance = job.total_charge - job.amount_paid
        if balance > 0:
            debtors.append({
                "id": str(job.id),
                "type": "repair",
                "customer_name": job.customer_name,
                "reference": f"#{job.job_number} - {job.device_type.value}",
                "total_amount": job.total_charge,
                "amount_paid": job.amount_paid,
                "balance": balance,
                "date": job.received_at.date() if job.received_at else date.today()
            })

    # Sort by date descending
    debtors.sort(key=lambda x: x["date"], reverse=True)
    return debtors
