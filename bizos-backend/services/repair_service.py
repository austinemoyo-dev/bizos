from datetime import datetime
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from models.expense import Expense, ExpenseCategory
from models.inventory import Item, MovementType, StockMovement
from models.repair import JobPart, RepairJob, RepairStatus, DepositResolution
from schemas.repair import RepairProfitOut


def add_part_to_job(
    db: Session,
    job_id: UUID,
    item_id: UUID,
    quantity: int,
    unit_cost: Decimal,
    damaged: bool,
    selling_price: Decimal | None = None,
) -> JobPart:
    job = db.query(RepairJob).filter_by(id=job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    if job.status in [RepairStatus.completed, RepairStatus.delivered]:
        raise HTTPException(400, "Cannot modify parts on a completed or delivered job")

    item = db.query(Item).filter_by(id=item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
    if item.quantity_in_stock < quantity:
        raise HTTPException(400, f"Insufficient stock. Available: {item.quantity_in_stock}")

    item.quantity_in_stock -= quantity

    movement_type = MovementType.damage if damaged else MovementType.repair_use
    movement = StockMovement(
        item_id=item_id,
        movement_type=movement_type,
        quantity=-quantity,
        unit_cost=unit_cost,
        reference_id=job_id,
        note=f"{'Damaged in' if damaged else 'Used in'} job #{job.job_number}",
    )
    db.add(movement)

    if damaged:
        loss_amount = unit_cost * quantity
        damage_expense = Expense(
            category=ExpenseCategory.damage_loss,
            amount=loss_amount,
            description=f"Damaged: {item.name} ×{quantity} in Job #{job.job_number}",
            reference_id=job_id,
        )
        db.add(damage_expense)

    part = JobPart(
        job_id=job_id,
        item_id=item_id,
        quantity=quantity,
        unit_cost=unit_cost,
        selling_price=selling_price,
        damaged=damaged,
    )
    db.add(part)

    # Auto-increase total_charge by the customer-facing selling price
    charge_add = (selling_price or unit_cost) * quantity
    job.total_charge = (job.total_charge or Decimal("0")) + charge_add

    db.commit()
    db.refresh(part)
    return part


def remove_part_from_job(db: Session, job_id: UUID, part_id: UUID) -> None:
    job = db.query(RepairJob).filter_by(id=job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    if job.status in [RepairStatus.completed, RepairStatus.delivered]:
        raise HTTPException(400, "Cannot modify parts on a completed or delivered job")

    part = db.query(JobPart).filter_by(id=part_id, job_id=job_id).first()
    if not part:
        raise HTTPException(404, "Part not found")

    item = db.query(Item).filter_by(id=part.item_id).first()
    if item:
        item.quantity_in_stock += part.quantity
        reversal = StockMovement(
            item_id=part.item_id,
            movement_type=MovementType.adjustment,
            quantity=part.quantity,
            unit_cost=part.unit_cost,
            reference_id=job_id,
            note=f"Part removed from job #{job.job_number}",
        )
        db.add(reversal)

    # Decrease total_charge by the selling price that was added
    charge_sub = (part.selling_price or part.unit_cost) * part.quantity
    job.total_charge = max(Decimal("0"), (job.total_charge or Decimal("0")) - charge_sub)

    db.delete(part)
    db.commit()


def update_job_status(db: Session, job_id: UUID, new_status: RepairStatus) -> RepairJob:
    job = db.query(RepairJob).filter_by(id=job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")

    if new_status == RepairStatus.cancelled:
        raise HTTPException(400, "Use the cancel endpoint to cancel a job")

    if job.status == RepairStatus.cancelled:
        raise HTTPException(400, "Cannot update status of a cancelled job")

    status_order = [
        RepairStatus.received,
        RepairStatus.diagnosed,
        RepairStatus.in_progress,
        RepairStatus.completed,
        RepairStatus.delivered,
    ]

    current_idx = status_order.index(job.status)
    new_idx = status_order.index(new_status)

    if new_idx < current_idx:
        raise HTTPException(
            400, f"Cannot move job from {job.status} back to {new_status}"
        )

    if new_status == RepairStatus.completed:
        # Preserve a backdated completed_at set by the user; only default to now if unset.
        if not job.completed_at:
            job.completed_at = datetime.utcnow()

    if new_status == RepairStatus.delivered:
        job.delivered_at = datetime.utcnow()

    job.status = new_status
    db.commit()
    db.refresh(job)

    # Auto-recalculate monthly tithe for the month this job's revenue lands in.
    if new_status in (RepairStatus.completed, RepairStatus.delivered):
        try:
            from services.tithe_service import generate_monthly_tithe
            ref_dt = job.completed_at or job.delivered_at or datetime.utcnow()
            d = ref_dt.date() if hasattr(ref_dt, 'date') else ref_dt
            generate_monthly_tithe(db, d.year, d.month)
        except Exception:
            pass

    return job


def cancel_job(db: Session, job_id: UUID, cancel_reason: str | None = None) -> RepairJob:
    job = db.query(RepairJob).filter_by(id=job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")

    non_cancellable = [RepairStatus.completed, RepairStatus.delivered, RepairStatus.cancelled]
    if job.status in non_cancellable:
        raise HTTPException(400, f"Cannot cancel a job that is already {job.status}")

    for part in job.parts:
        item = db.query(Item).filter_by(id=part.item_id).first()
        if item:
            item.quantity_in_stock += part.quantity
            reversal = StockMovement(
                item_id=part.item_id,
                movement_type=MovementType.adjustment,
                quantity=part.quantity,
                unit_cost=part.unit_cost,
                reference_id=job_id,
                note=f"Returned from cancelled job #{job.job_number}",
            )
            db.add(reversal)

    job.status = RepairStatus.cancelled
    job.cancel_reason = cancel_reason
    db.commit()
    db.refresh(job)
    return job


def resolve_deposit(
    db: Session,
    job_id: UUID,
    resolution: DepositResolution,
) -> RepairJob:
    job = db.query(RepairJob).filter_by(id=job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    if job.status != RepairStatus.cancelled:
        raise HTTPException(400, "Deposit resolution only applies to cancelled jobs")
    if job.amount_paid <= 0:
        raise HTTPException(400, "This job has no recorded deposit to resolve")
    if job.deposit_resolution is not None:
        raise HTTPException(400, "Deposit has already been resolved")

    job.deposit_resolution = resolution
    # No expense is created for either resolution:
    # - 'refunded': the analytics query already excludes unresolved/refunded cancelled deposits
    #   from cash_collected, so the balance drops automatically. Creating an expense would
    #   double-subtract and incorrectly penalise profit even though the money was never revenue.
    # - 'kept': the analytics query re-includes the deposit in cash_collected AND adds it to
    #   kept_deposits revenue, so it correctly appears in both balance and profit.
    db.commit()
    db.refresh(job)
    return job


def compute_job_profit(job: RepairJob) -> RepairProfitOut:
    # Damaged parts are already recorded as damage_loss Expenses on the business ledger,
    # so they must NOT be subtracted here again — otherwise profit (and tithe) are understated.
    parts_cost = sum(p.unit_cost * p.quantity for p in job.parts if not p.damaged)
    profit = job.total_charge - parts_cost
    tithe = profit * Decimal("0.10") if profit > 0 else Decimal("0")
    return RepairProfitOut(
        revenue=job.total_charge,
        parts_cost=parts_cost,
        labor_charge=job.labor_charge,
        total_expenses=parts_cost,
        profit=profit,
        tithe_due=tithe,
        is_profitable=profit > 0,
    )
