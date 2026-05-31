from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.dependencies import get_current_user, get_db, role_required
from models.inventory import Item, MovementType, StockMovement
from models.sales import Sale
from models.user import User, UserRole
from schemas.sales import SaleCreate, SaleOut, SalePaymentUpdate

router = APIRouter()

NON_VIEWER = (
    UserRole.super_admin,
    UserRole.owner,
    UserRole.accountant,
    UserRole.staff,
)


@router.get("", response_model=List[SaleOut])
def list_sales(
    item_id: Optional[UUID] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Sale)
    if item_id:
        q = q.filter(Sale.item_id == item_id)
    if date_from:
        q = q.filter(Sale.sold_at >= date_from)
    if date_to:
        q = q.filter(Sale.sold_at <= date_to)
    return q.order_by(Sale.sold_at.desc()).all()


@router.post("", response_model=SaleOut, status_code=201)
def record_sale(
    payload: SaleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(*NON_VIEWER)),
):
    item = db.query(Item).filter_by(id=payload.item_id, is_active=True).first()
    if not item:
        raise HTTPException(404, "Item not found")
    if item.quantity_in_stock < payload.quantity:
        raise HTTPException(400, f"Insufficient stock. Available: {item.quantity_in_stock}")

    item.quantity_in_stock -= payload.quantity

    movement = StockMovement(
        item_id=item.id,
        movement_type=MovementType.sale,
        quantity=-payload.quantity,
        unit_cost=item.purchase_price,
        note=f"Sale: {payload.quantity}× {item.name}",
    )
    db.add(movement)

    total_cost = payload.selling_price * payload.quantity
    sale = Sale(
        item_id=payload.item_id,
        customer=payload.customer,
        quantity=payload.quantity,
        selling_price=payload.selling_price,
        cost_price=item.purchase_price,
        amount_paid=payload.amount_paid if payload.amount_paid is not None else total_cost,
        sold_at=payload.sold_at or datetime.utcnow(),
        created_by=current_user.id,
    )
    db.add(sale)
    db.commit()
    db.refresh(sale)

    try:
        from services.tithe_service import generate_monthly_tithe
        d = sale.sold_at.date()
        generate_monthly_tithe(db, d.year, d.month)
    except Exception:
        pass

    try:
        from models.cash_flow import CashEventType, FinanceScope
        from services.cash_flow_service import emit_cash_event
        emit_cash_event(
            db,
            scope=FinanceScope.business,
            event_type=CashEventType.revenue,
            signed_amount=sale.amount_paid,
            description=f"Sale: {sale.quantity}× {item.name}",
            event_date=sale.sold_at.date(),
            reference_id=sale.id,
            reference_type="sale",
            auto_commit=True,
        )
    except Exception:
        pass

    return sale


@router.get("/{sale_id}", response_model=SaleOut)
def get_sale(
    sale_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    sale = db.query(Sale).filter_by(id=sale_id).first()
    if not sale:
        raise HTTPException(404, "Sale not found")
    return sale


@router.delete("/{sale_id}", status_code=204)
def delete_sale(
    sale_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(UserRole.owner, UserRole.super_admin)),
):
    sale = db.query(Sale).filter_by(id=sale_id).first()
    if not sale:
        raise HTTPException(404, "Sale not found")

    # Reverse the stock movement
    item = db.query(Item).filter_by(id=sale.item_id).first()
    if item:
        item.quantity_in_stock += sale.quantity
        reversal = StockMovement(
            item_id=sale.item_id,
            movement_type=MovementType.adjustment,
            quantity=sale.quantity,
            unit_cost=sale.cost_price,
            reference_id=sale.id,
            note="Sale deleted — stock reversed",
        )
        db.add(reversal)

    db.delete(sale)
    db.commit()


@router.patch("/{sale_id}/payment", response_model=SaleOut)
def update_sale_payment(
    sale_id: UUID,
    payload: SalePaymentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(*NON_VIEWER)),
):
    sale = db.query(Sale).filter_by(id=sale_id).first()
    if not sale:
        raise HTTPException(404, "Sale not found")
        
    sale.amount_paid = payload.amount_paid
    db.commit()
    db.refresh(sale)
    return sale
