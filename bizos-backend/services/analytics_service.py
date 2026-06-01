from datetime import date
from decimal import Decimal
from typing import List

from sqlalchemy import func
from sqlalchemy.orm import Session

from models.cash_flow import FinanceScope
from models.expense import Expense
from models.inventory import Item
from models.lending import DebtOwed, LoanGiven, LoanRepayment
from models.repair import RepairJob, RepairStatus, DepositResolution
from models.sales import Sale
from models.tithe import TitheRecord, TitheScope
from schemas.analytics import BusinessSummary, ExpenseBreakdown


def get_business_summary(
    db: Session, period_start: date, period_end: date
) -> BusinessSummary:
    # Revenue recognised on the date the repair was completed (service obligation discharged),
    # falling back to received_at for jobs that predate the completed_at column.
    _rev_date = func.date(func.coalesce(RepairJob.completed_at, RepairJob.received_at))

    repair_revenue = (
        db.query(func.sum(RepairJob.total_charge))
        .filter(
            RepairJob.status.in_([RepairStatus.completed, RepairStatus.delivered]),
            _rev_date >= period_start,
            _rev_date <= period_end,
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

    # Kept cancellation deposits count as earned income for the period.
    kept_deposits = (
        db.query(func.sum(RepairJob.amount_paid))
        .filter(
            RepairJob.status == RepairStatus.cancelled,
            RepairJob.deposit_resolution == DepositResolution.kept,
            func.date(RepairJob.received_at) >= period_start,
            func.date(RepairJob.received_at) <= period_end,
        )
        .scalar()
        or Decimal("0")
    )

    total_revenue = repair_revenue + sale_revenue + kept_deposits

    # Only count cash from non-cancelled jobs, plus cancelled jobs where the deposit
    # was explicitly kept (not refunded). Unresolved cancellations are liabilities.
    cash_from_repairs = (
        db.query(func.sum(RepairJob.amount_paid))
        .filter(
            func.date(RepairJob.received_at) >= period_start,
            func.date(RepairJob.received_at) <= period_end,
            (RepairJob.status != RepairStatus.cancelled) |
            (RepairJob.deposit_resolution == DepositResolution.kept),
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

    # Include inventory purchase expenses so dashboard and analytics match the expense ledger.
    operating_expenses = (
        db.query(func.sum(Expense.amount))
        .filter(
            Expense.expense_date >= period_start,
            Expense.expense_date <= period_end,
        )
        .scalar()
        or Decimal("0")
    )

    # Cash-basis accounting: inventory is expensed when purchased (in the expense table).
    # Do NOT also subtract repair_parts_cost / sale_cogs — those items were already expensed
    # at purchase time, so deducting them again doubles the count.
    net_profit = total_revenue - operating_expenses
    total_expenses = operating_expenses

    # Use period_start (the repair completion date) when set, fall back to created_at.
    # This ensures backdated repairs are attributed to the correct accounting period.
    _tithe_date = func.coalesce(TitheRecord.period_start, func.date(TitheRecord.created_at))
    tithe_due = (
        db.query(func.sum(TitheRecord.tithe_amount))
        .filter(
            TitheRecord.scope == TitheScope.business,
            TitheRecord.paid == False,
            _tithe_date >= period_start,
            _tithe_date <= period_end,
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
            func.date(TitheRecord.paid_at) >= period_start,
            func.date(TitheRecord.paid_at) <= period_end,
        )
        .scalar()
        or Decimal("0")
    )

    # Current market value of all active inventory (purchase_price × quantity_in_stock)
    inventory_value = (
        db.query(func.sum(Item.purchase_price * Item.quantity_in_stock))
        .filter(Item.is_active == True)
        .scalar()
        or Decimal("0")
    )

    # available_balance reflects actual physical cash.
    # Exclude cancelled jobs unless deposit was explicitly kept.
    all_time_cash_repairs = (
        db.query(func.sum(RepairJob.amount_paid))
        .filter(
            (RepairJob.status != RepairStatus.cancelled) |
            (RepairJob.deposit_resolution == DepositResolution.kept),
        )
        .scalar()
        or Decimal("0")
    )
    all_time_cash_sales = db.query(func.sum(Sale.amount_paid)).scalar() or Decimal("0")
    all_time_expenses = db.query(func.sum(Expense.amount)).scalar() or Decimal("0")

    # Loan adjustments — only business-scoped movements
    loans_given = (
        db.query(func.sum(LoanGiven.principal_amount))
        .filter(LoanGiven.scope == FinanceScope.business)
        .scalar()
        or Decimal("0")
    )
    loan_repayments_received = (
        db.query(func.sum(LoanRepayment.amount))
        .join(LoanGiven, LoanRepayment.loan_id == LoanGiven.id)
        .filter(LoanGiven.scope == FinanceScope.business)
        .scalar()
        or Decimal("0")
    )
    money_borrowed = (
        db.query(func.sum(DebtOwed.principal_amount))
        .filter(DebtOwed.scope == FinanceScope.business)
        .scalar()
        or Decimal("0")
    )
    # Note: debt repayments (paying creditors back) are already in all_time_expenses
    # via Expense(category=loan_repayment), so they are not added again here.

    available_balance = (
        (all_time_cash_repairs + all_time_cash_sales)
        - all_time_expenses
        - loans_given
        + loan_repayments_received
        + money_borrowed
    )

    repair_count = (
        db.query(func.count(RepairJob.id))
        .filter(
            func.date(RepairJob.received_at) >= period_start,  # intake KPI — not revenue recognition
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

    # Repairs where balance > 0 (exclude cancelled jobs)
    repairs = db.query(RepairJob).filter(RepairJob.status != 'cancelled').all()
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
