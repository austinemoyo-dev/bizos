"""
Full repair job lifecycle:
create → add parts → mark damaged → complete → verify profit + tithe created
"""
from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from models.inventory import Item
from models.repair import RepairJob, RepairStatus, DeviceType
from models.tithe import TitheRecord, TitheScope
from services.repair_service import add_part_to_job, compute_job_profit, update_job_status
from services.tithe_service import create_business_tithe


def make_item(db: Session, name="Screen", price=Decimal("10000"), qty=5) -> Item:
    item = Item(
        name=name,
        purchase_price=price,
        selling_price=price * Decimal("1.5"),
        quantity_in_stock=qty,
        reorder_level=2,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def make_job(db: Session, total_charge=Decimal("25000"), labor=Decimal("5000")) -> RepairJob:
    job = RepairJob(
        customer_name="Alice",
        device_type=DeviceType.phone,
        device_model="iPhone 13",
        fault_description="Cracked screen",
        labor_charge=labor,
        total_charge=total_charge,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def test_create_repair_job(db: Session):
    job = make_job(db)
    assert job.job_number is not None
    assert job.status == RepairStatus.received


def test_add_part_deducts_stock(db: Session):
    item = make_item(db, qty=5)
    job = make_job(db)

    add_part_to_job(db, job.id, item.id, quantity=2, unit_cost=Decimal("10000"), damaged=False)

    db.refresh(item)
    assert item.quantity_in_stock == 3
    assert len(job.parts) == 1


def test_damaged_part_creates_expense(db: Session):
    from models.expense import Expense, ExpenseCategory
    item = make_item(db, qty=5)
    job = make_job(db)

    add_part_to_job(db, job.id, item.id, quantity=1, unit_cost=Decimal("10000"), damaged=True)

    expenses = db.query(Expense).filter_by(category=ExpenseCategory.damage_loss).all()
    assert len(expenses) == 1
    assert expenses[0].amount == Decimal("10000")


def test_complete_job_creates_tithe(db: Session):
    item = make_item(db, price=Decimal("8000"), qty=5)
    job = make_job(db, total_charge=Decimal("25000"), labor=Decimal("3000"))

    add_part_to_job(db, job.id, item.id, quantity=1, unit_cost=Decimal("8000"), damaged=False)

    # Advance status to completed
    update_job_status(db, job.id, RepairStatus.diagnosed)
    update_job_status(db, job.id, RepairStatus.in_progress)
    update_job_status(db, job.id, RepairStatus.completed)

    tithe_records = db.query(TitheRecord).filter_by(scope=TitheScope.business).all()
    assert len(tithe_records) == 1
    # profit = 25000 - 8000 (parts) - 3000 (labor) = 14000; tithe = 1400
    assert tithe_records[0].tithe_amount == Decimal("1400.00")
    assert tithe_records[0].paid == False


def test_completed_job_parts_locked(db: Session):
    from fastapi import HTTPException
    item = make_item(db, qty=10)
    job = make_job(db)

    update_job_status(db, job.id, RepairStatus.diagnosed)
    update_job_status(db, job.id, RepairStatus.in_progress)
    update_job_status(db, job.id, RepairStatus.completed)

    with pytest.raises(HTTPException) as exc:
        add_part_to_job(db, job.id, item.id, quantity=1, unit_cost=Decimal("5000"), damaged=False)
    assert exc.value.status_code == 400


def test_status_cannot_go_backward(db: Session):
    from fastapi import HTTPException
    job = make_job(db)
    update_job_status(db, job.id, RepairStatus.diagnosed)

    with pytest.raises(HTTPException):
        update_job_status(db, job.id, RepairStatus.received)


def test_compute_job_profit(db: Session):
    item = make_item(db, price=Decimal("8000"), qty=5)
    job = make_job(db, total_charge=Decimal("20000"), labor=Decimal("2000"))
    add_part_to_job(db, job.id, item.id, quantity=1, unit_cost=Decimal("8000"), damaged=False)

    db.refresh(job)
    profit_data = compute_job_profit(job)

    assert profit_data.revenue == Decimal("20000")
    assert profit_data.parts_cost == Decimal("8000")
    assert profit_data.labor_charge == Decimal("2000")
    assert profit_data.profit == Decimal("10000")
    assert profit_data.tithe_due == Decimal("1000")
    assert profit_data.is_profitable is True
