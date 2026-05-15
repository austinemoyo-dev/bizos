import csv
import io
from datetime import datetime, timezone, date as date_type
from decimal import Decimal, InvalidOperation
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload

from core.dependencies import get_current_user, get_db, role_required
from models.repair import RepairJob, RepairStatus
from models.user import User, UserRole
from schemas.repair import (
    CancelJobRequest,
    JobPartCreate,
    RepairJobCreate,
    RepairJobOut,
    RepairJobUpdate,
    RepairProfitOut,
    RepairStatusUpdate,
    RepairPaymentUpdate,
)
from services.repair_service import (
    add_part_to_job,
    cancel_job,
    compute_job_profit,
    remove_part_from_job,
    update_job_status,
)

router = APIRouter()

NON_VIEWER = (
    UserRole.super_admin,
    UserRole.owner,
    UserRole.accountant,
    UserRole.technician,
    UserRole.staff,
)
PART_ROLES = (UserRole.super_admin, UserRole.owner, UserRole.accountant, UserRole.technician)
UPDATE_ROLES = (UserRole.super_admin, UserRole.owner, UserRole.accountant, UserRole.technician)

REPAIR_CSV_HEADERS = (
    "customer_name,customer_phone,device_type,device_model,fault_description,"
    "labor_charge,total_charge,amount_paid,status,received_at,completed_at,notes\n"
)
REPAIR_CSV_EXAMPLE = (
    "John Doe,08012345678,phone,iPhone 14,Cracked screen,"
    "5000,22000,22000,received,2026-05-14,,Screen replacement\n"
)
VALID_DEVICE_TYPES = {
    "phone", "tablet", "laptop", "computer", "fan",
    "extension", "iron", "washing_machine", "tv", "gadget", "other",
}
VALID_STATUSES = {"received", "diagnosed", "in_progress", "completed", "delivered", "cancelled"}


@router.get("/template/csv")
def download_repair_csv_template():
    return Response(
        content=REPAIR_CSV_HEADERS + REPAIR_CSV_EXAMPLE,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=repairs_template.csv"},
    )


@router.post("/import/csv", status_code=201)
def import_repairs_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(*NON_VIEWER)),
):
    try:
        content = file.file.read().decode("utf-8-sig")
    except Exception:
        raise HTTPException(400, "Could not read file — ensure it is UTF-8 encoded")

    reader = csv.DictReader(io.StringIO(content))
    if "customer_name" not in (reader.fieldnames or []):
        raise HTTPException(400, "CSV must have at least a 'customer_name' column")

    created_count = 0
    errors: list[dict] = []

    for row_num, row in enumerate(reader, start=2):
        try:
            customer_name = row.get("customer_name", "").strip()
            if not customer_name:
                raise ValueError("customer_name is required")

            raw_device = row.get("device_type", "phone").strip().lower() or "phone"
            if raw_device not in VALID_DEVICE_TYPES:
                raise ValueError(f"device_type '{raw_device}' must be one of: {', '.join(sorted(VALID_DEVICE_TYPES))}")

            raw_status = row.get("status", "received").strip().lower() or "received"
            if raw_status not in VALID_STATUSES:
                raise ValueError(f"status '{raw_status}' must be one of: {', '.join(sorted(VALID_STATUSES))}")

            def to_dec(val: str) -> Decimal:
                v = val.strip().replace(",", "") if val else "0"
                return Decimal(v) if v else Decimal("0")

            def to_date_dt(val: str) -> datetime | None:
                v = val.strip() if val else ""
                if not v:
                    return None
                d = date_type.fromisoformat(v)
                return datetime.combine(d, datetime.min.time()).replace(tzinfo=timezone.utc)

            received_dt = to_date_dt(row.get("received_at", "")) or datetime.now(timezone.utc)
            completed_dt = to_date_dt(row.get("completed_at", ""))

            labor = to_dec(row.get("labor_charge", ""))
            total = to_dec(row.get("total_charge", ""))
            paid_raw = row.get("amount_paid", "").strip()
            paid = Decimal(paid_raw.replace(",", "")) if paid_raw else total

            job = RepairJob(
                customer_name=customer_name,
                customer_phone=row.get("customer_phone", "").strip() or None,
                device_type=raw_device,
                device_model=row.get("device_model", "").strip() or None,
                fault_description=row.get("fault_description", "").strip() or None,
                labor_charge=labor,
                total_charge=total,
                amount_paid=paid,
                status=raw_status,
                received_at=received_dt,
                completed_at=completed_dt,
                notes=row.get("notes", "").strip() or None,
                created_by=current_user.id,
            )
            db.add(job)
            created_count += 1
        except (InvalidOperation, ValueError) as exc:
            errors.append({"row": row_num, "customer": row.get("customer_name", ""), "error": str(exc)})
        except Exception as exc:
            errors.append({"row": row_num, "customer": row.get("customer_name", ""), "error": str(exc)})

    if created_count:
        db.commit()

    return {"created": created_count, "errors": errors}


@router.get("", response_model=List[RepairJobOut])
def list_jobs(
    status: Optional[str] = None,
    device_type: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    q: Optional[str] = Query(None, max_length=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(RepairJob).options(joinedload(RepairJob.parts))
    if status:
        try:
            statuses = [RepairStatus(s.strip()) for s in status.split(",")]
        except ValueError:
            raise HTTPException(400, "Invalid status value")
        query = query.filter(RepairJob.status.in_(statuses))
    if device_type:
        query = query.filter(RepairJob.device_type == device_type)
    if date_from:
        query = query.filter(RepairJob.received_at >= date_from)
    if date_to:
        query = query.filter(RepairJob.received_at <= date_to)
    if q:
        from sqlalchemy import cast, String
        like = f"%{q}%"
        query = query.filter(
            RepairJob.customer_name.ilike(like) |
            RepairJob.customer_phone.ilike(like) |
            RepairJob.device_model.ilike(like) |
            cast(RepairJob.device_type, String).ilike(like) |
            cast(RepairJob.job_number, String).ilike(like)
        )
    jobs = query.order_by(RepairJob.received_at.desc()).all()
    return [RepairJobOut.from_orm_with_profit(j) for j in jobs]


@router.post("", response_model=RepairJobOut, status_code=201)
def create_job(
    payload: RepairJobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(*NON_VIEWER)),
):
    payload_dict = payload.model_dump(exclude={"parts", "received_at", "completed_at"})
    job = RepairJob(**payload_dict, created_by=current_user.id)
    if payload.received_at:
        job.received_at = datetime.combine(payload.received_at, datetime.min.time()).replace(tzinfo=timezone.utc)
    if payload.completed_at:
        job.completed_at = datetime.combine(payload.completed_at, datetime.min.time()).replace(tzinfo=timezone.utc)
    db.add(job)
    db.flush()  # To get the job id
    
    if payload.parts:
        for part_data in payload.parts:
            add_part_to_job(
                db,
                job_id=job.id,
                item_id=part_data.item_id,
                quantity=part_data.quantity,
                unit_cost=part_data.unit_cost,
                selling_price=part_data.selling_price,
                damaged=part_data.damaged,
            )

    db.commit()
    db.refresh(job)
    return RepairJobOut.from_orm_with_profit(job)


@router.get("/{job_id}", response_model=RepairJobOut)
def get_job(
    job_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    job = db.query(RepairJob).filter_by(id=job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    return RepairJobOut.from_orm_with_profit(job)


@router.put("/{job_id}", response_model=RepairJobOut)
def update_job(
    job_id: UUID,
    payload: RepairJobUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(*UPDATE_ROLES)),
):
    job = db.query(RepairJob).filter_by(id=job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    for field, value in payload.model_dump(exclude_none=True, exclude={"completed_at"}).items():
        setattr(job, field, value)
    if payload.completed_at is not None:
        job.completed_at = datetime.combine(payload.completed_at, datetime.min.time()).replace(tzinfo=timezone.utc)
    db.commit()
    db.refresh(job)
    return RepairJobOut.from_orm_with_profit(job)


@router.patch("/{job_id}/status", response_model=RepairJobOut)
def change_status(
    job_id: UUID,
    payload: RepairStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(*NON_VIEWER)),
):
    job = update_job_status(db, job_id, payload.status)
    return RepairJobOut.from_orm_with_profit(job)


@router.post("/{job_id}/parts", response_model=RepairJobOut, status_code=201)
def add_part(
    job_id: UUID,
    payload: JobPartCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(*PART_ROLES)),
):
    add_part_to_job(
        db,
        job_id=job_id,
        item_id=payload.item_id,
        quantity=payload.quantity,
        unit_cost=payload.unit_cost,
        selling_price=payload.selling_price,
        damaged=payload.damaged,
    )
    job = db.query(RepairJob).filter_by(id=job_id).first()
    return RepairJobOut.from_orm_with_profit(job)


@router.post("/{job_id}/cancel", response_model=RepairJobOut)
def cancel_repair_job(
    job_id: UUID,
    payload: CancelJobRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(*UPDATE_ROLES)),
):
    job = cancel_job(db, job_id, cancel_reason=payload.cancel_reason)
    return RepairJobOut.from_orm_with_profit(job)


@router.delete("/{job_id}/parts/{part_id}", status_code=204)
def remove_part(
    job_id: UUID,
    part_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(*PART_ROLES)),
):
    remove_part_from_job(db, job_id, part_id)


@router.get("/{job_id}/profit", response_model=RepairProfitOut)
def get_profit(
    job_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    job = db.query(RepairJob).filter_by(id=job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    return compute_job_profit(job)


@router.patch("/{job_id}/payment", response_model=RepairJobOut)
def update_payment(
    job_id: UUID,
    payload: RepairPaymentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(*UPDATE_ROLES)),
):
    job = db.query(RepairJob).filter_by(id=job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
        
    job.amount_paid = payload.amount_paid
    db.commit()
    db.refresh(job)
    return RepairJobOut.from_orm_with_profit(job)
