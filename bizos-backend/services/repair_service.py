from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from models.expense import Expense, ExpenseCategory
from models.inventory import Item, MovementType, StockMovement
from models.repair import JobPart, RepairJob, RepairStatus
from schemas.repair import RepairProfitOut
from services.tithe_service import create_business_tithe


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
        earned_date: date = job.completed_at.date() if job.completed_at else date.today()
        profit_data = compute_job_profit(job)
        if profit_data.profit > 0:
            create_business_tithe(db, profit_data.profit, reference_id=job.id, earned_date=earned_date)

    if new_status == RepairStatus.delivered:
        job.delivered_at = datetime.utcnow()

    job.status = new_status
    db.commit()
    db.refresh(job)
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
