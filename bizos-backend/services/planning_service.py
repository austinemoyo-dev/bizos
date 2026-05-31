"""
Financial intelligence services — burn rate, budget planning, debt timelines,
business recovery projections.
"""
from datetime import date, timedelta
from decimal import Decimal
from typing import Dict, List

from sqlalchemy import func
from sqlalchemy.orm import Session

from models.expense import Expense
from models.lending import DebtOwed
from models.personal import PersonalTransaction, PersonalTxType
from models.repair import RepairJob, RepairStatus
from models.sales import Sale


# ── Helpers ───────────────────────────────────────────────────────────────────

def _months_back(n: int) -> tuple[date, date]:
    today = date.today()
    end = today.replace(day=1) - timedelta(days=1)       # last day of prev month
    start = (end.replace(day=1) - timedelta(days=1)).replace(day=1)
    # Walk back n months
    cur = today.replace(day=1)
    for _ in range(n):
        cur = (cur - timedelta(days=1)).replace(day=1)
    return cur, today


def _this_month_bounds() -> tuple[date, date]:
    today = date.today()
    return today.replace(day=1), today


# ── Personal Planning ─────────────────────────────────────────────────────────

def get_monthly_burn_rate(db: Session, lookback_months: int = 3) -> dict:
    """Average monthly spend per category over the last N months."""
    start, end = _months_back(lookback_months)

    rows = (
        db.query(
            PersonalTransaction.category,
            func.sum(PersonalTransaction.amount).label("total"),
        )
        .filter(
            PersonalTransaction.type == PersonalTxType.expense,
            PersonalTransaction.transaction_date >= start,
            PersonalTransaction.transaction_date <= end,
        )
        .group_by(PersonalTransaction.category)
        .all()
    )

    category_totals: Dict[str, Decimal] = {r.category: r.total for r in rows}
    grand_total = sum(category_totals.values(), Decimal("0"))
    monthly_avg = grand_total / lookback_months if lookback_months else Decimal("0")

    category_monthly: Dict[str, Decimal] = {
        cat: total / lookback_months for cat, total in category_totals.items()
    }

    # This month so far
    month_start, today = _this_month_bounds()
    spent_this_month = (
        db.query(func.sum(PersonalTransaction.amount))
        .filter(
            PersonalTransaction.type == PersonalTxType.expense,
            PersonalTransaction.transaction_date >= month_start,
            PersonalTransaction.transaction_date <= today,
        )
        .scalar()
        or Decimal("0")
    )

    days_in_month = (date(today.year, today.month % 12 + 1, 1) - timedelta(days=1)).day if today.month < 12 else 31
    days_elapsed = today.day
    days_remaining = days_in_month - days_elapsed

    daily_rate = spent_this_month / days_elapsed if days_elapsed else Decimal("0")
    projected_total = spent_this_month + (daily_rate * days_remaining)

    return {
        "lookback_months": lookback_months,
        "average_monthly_burn": monthly_avg,
        "category_breakdown": {cat: float(amt) for cat, amt in category_monthly.items()},
        "this_month": {
            "spent_so_far": spent_this_month,
            "projected_total": projected_total,
            "remaining_estimated": max(monthly_avg - spent_this_month, Decimal("0")),
            "days_elapsed": days_elapsed,
            "days_remaining": days_remaining,
        },
    }


def get_monthly_income_avg(db: Session, lookback_months: int = 3) -> Decimal:
    start, end = _months_back(lookback_months)
    total = (
        db.query(func.sum(PersonalTransaction.amount))
        .filter(
            PersonalTransaction.type == PersonalTxType.income,
            PersonalTransaction.transaction_date >= start,
            PersonalTransaction.transaction_date <= end,
        )
        .scalar()
        or Decimal("0")
    )
    return total / lookback_months if lookback_months else Decimal("0")


def get_debt_payoff_plan(db: Session) -> dict:
    """
    Based on average disposable income (income - burn_rate), project when each
    personal debt will be cleared and how much to allocate per month.
    """
    burn = get_monthly_burn_rate(db)
    avg_income = get_monthly_income_avg(db)
    avg_burn = Decimal(str(burn["average_monthly_burn"]))
    disposable = max(avg_income - avg_burn, Decimal("0"))

    debts = (
        db.query(DebtOwed)
        .filter(DebtOwed.scope == "personal", DebtOwed.is_settled == False)
        .order_by(DebtOwed.due_date.asc().nullslast())
        .all()
    )

    total_owed = sum(Decimal(str(d.outstanding)) for d in debts)
    months_to_clear = None
    if disposable > 0 and total_owed > 0:
        months_to_clear = float(total_owed / disposable)

    debt_items = []
    for d in debts:
        outstanding = Decimal(str(d.outstanding))
        months = float(outstanding / disposable) if disposable > 0 else None
        debt_items.append({
            "id": str(d.id),
            "creditor_name": d.creditor_name,
            "outstanding": outstanding,
            "due_date": d.due_date,
            "months_to_clear_at_current_rate": round(months, 1) if months else None,
        })

    return {
        "avg_monthly_income": avg_income,
        "avg_monthly_expenses": avg_burn,
        "monthly_disposable": disposable,
        "total_personal_debt": total_owed,
        "months_to_clear_all": round(months_to_clear, 1) if months_to_clear else None,
        "debts": debt_items,
        "recommendation": _debt_recommendation(disposable, total_owed),
    }


def _debt_recommendation(disposable: Decimal, total_owed: Decimal) -> str:
    if total_owed == 0:
        return "You have no outstanding personal debts."
    if disposable <= 0:
        return "Your expenses exceed your income. Reduce spending before aggressively paying debt."
    months = float(total_owed / disposable)
    if months <= 3:
        return f"At your current income/expense rate you can clear all debt in about {round(months, 1)} months."
    if months <= 12:
        return f"You can clear all debt in about {round(months, 1)} months. Consider allocating more disposable income to fastest-due debts first."
    return f"At current rate it will take {round(months, 1)} months. Look for ways to increase income or cut expenses."


# ── Business Recovery ─────────────────────────────────────────────────────────

def get_business_recovery_plan(db: Session) -> dict:
    """
    Current month P&L snapshot + how many more jobs needed to break even / hit targets.
    """
    month_start, today = _this_month_bounds()

    # Revenue this month (completed + delivered jobs)
    repair_rev = (
        db.query(func.sum(RepairJob.total_charge))
        .filter(
            RepairJob.status.in_([RepairStatus.completed, RepairStatus.delivered]),
            func.date(RepairJob.completed_at) >= month_start,
            func.date(RepairJob.completed_at) <= today,
        )
        .scalar()
        or Decimal("0")
    )

    sale_rev = (
        db.query(func.sum(Sale.selling_price * Sale.quantity))
        .filter(
            func.date(Sale.sold_at) >= month_start,
            func.date(Sale.sold_at) <= today,
        )
        .scalar()
        or Decimal("0")
    )

    total_revenue = repair_rev + sale_rev

    # Expenses this month
    expenses_mtd = (
        db.query(func.sum(Expense.amount))
        .filter(
            Expense.expense_date >= month_start,
            Expense.expense_date <= today,
        )
        .scalar()
        or Decimal("0")
    )

    profit_mtd = total_revenue - expenses_mtd

    # Average revenue per completed job (last 30 days for a rolling view)
    thirty_ago = today - timedelta(days=30)
    recent_jobs = (
        db.query(RepairJob)
        .filter(
            RepairJob.status.in_([RepairStatus.completed, RepairStatus.delivered]),
            func.date(RepairJob.completed_at) >= thirty_ago,
            func.date(RepairJob.completed_at) <= today,
        )
        .all()
    )

    avg_job_revenue = Decimal("0")
    if recent_jobs:
        avg_job_revenue = sum(j.total_charge for j in recent_jobs) / len(recent_jobs)

    # How many more jobs to break even (if in loss)
    jobs_to_break_even = None
    jobs_to_target = None

    if profit_mtd < 0 and avg_job_revenue > 0:
        jobs_to_break_even = int(abs(profit_mtd) / avg_job_revenue) + 1

    # Monthly target (from MonthlyGoal if set, else default to match last month's revenue)
    try:
        from models.settings import MonthlyGoal
        goal = db.query(MonthlyGoal).filter_by(
            year=today.year, month=today.month
        ).first()
        target_revenue = goal.target_revenue if goal else None
    except Exception:
        target_revenue = None

    if target_revenue and avg_job_revenue > 0:
        gap = target_revenue - total_revenue
        if gap > 0:
            jobs_to_target = int(gap / avg_job_revenue) + 1

    # Pending jobs (in-progress revenue about to materialise)
    pending_count = (
        db.query(func.count(RepairJob.id))
        .filter(RepairJob.status.in_([
            RepairStatus.received,
            RepairStatus.diagnosed,
            RepairStatus.in_progress,
        ]))
        .scalar()
        or 0
    )

    # Business debt load
    biz_debt = (
        db.query(func.sum(DebtOwed.principal_amount - DebtOwed.amount_repaid))
        .filter(DebtOwed.scope == "business", DebtOwed.is_settled == False)
        .scalar()
        or Decimal("0")
    )

    jobs_to_clear_debt = None
    if biz_debt > 0 and avg_job_revenue > 0:
        jobs_to_clear_debt = int(biz_debt / avg_job_revenue) + 1

    return {
        "period": {"start": month_start, "end": today},
        "revenue_mtd": total_revenue,
        "expenses_mtd": expenses_mtd,
        "profit_mtd": profit_mtd,
        "profit_status": "profit" if profit_mtd >= 0 else "loss",
        "avg_job_revenue": avg_job_revenue,
        "recent_job_count": len(recent_jobs),
        "pending_jobs": pending_count,
        "jobs_to_break_even": jobs_to_break_even,
        "jobs_to_hit_target": jobs_to_target,
        "target_revenue": target_revenue,
        "business_debt_outstanding": biz_debt,
        "jobs_to_clear_business_debt": jobs_to_clear_debt,
        "summary": _recovery_summary(profit_mtd, jobs_to_break_even, avg_job_revenue, pending_count),
    }


def _recovery_summary(profit_mtd: Decimal, jobs_to_break_even, avg_rev: Decimal, pending: int) -> str:
    if profit_mtd >= 0:
        return f"You're profitable this month (₦{profit_mtd:,.2f} profit). Keep going."
    if jobs_to_break_even is None:
        return f"You're ₦{abs(profit_mtd):,.2f} in the red this month. Complete more jobs to recover."
    pending_note = f" You have {pending} job(s) in progress that could help." if pending else ""
    return (
        f"You're ₦{abs(profit_mtd):,.2f} in the red. "
        f"At ₦{avg_rev:,.2f} avg per job, you need {jobs_to_break_even} more job(s) to break even.{pending_note}"
    )
