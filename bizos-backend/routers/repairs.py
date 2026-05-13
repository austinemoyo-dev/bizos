from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
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


@router.get("", response_model=List[RepairJobOut])
def list_jobs(
    status: Optional[str] = None,
    device_type: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(RepairJob).options(joinedload(RepairJob.parts))
    if status:
        statuses = [s.strip() for s in status.split(",")]
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
    payload_dict = payload.model_dump(exclude={"parts"})
    job = RepairJob(**payload_dict, created_by=current_user.id)
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
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(job, field, value)
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
