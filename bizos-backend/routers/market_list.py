from datetime import datetime
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.dependencies import get_current_user, get_db
from models.inventory import Item, MovementType, StockMovement
from models.market_list import MarketList, MarketListItem
from models.user import User
from schemas.market_list import (
    MarketListCreate,
    MarketListItemCreate,
    MarketListItemOut,
    MarketListOut,
)
from services.inventory_service import get_low_stock
from schemas.inventory import ItemOut

router = APIRouter()


@router.get("", response_model=List[MarketListOut])
def list_active(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(MarketList).filter_by(is_active=True).all()


@router.post("", response_model=MarketListOut, status_code=201)
def create_list(
    payload: MarketListCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ml = MarketList(name=payload.name, created_by=current_user.id)
    db.add(ml)
    db.commit()
    db.refresh(ml)
    return ml


@router.get("/suggestions", response_model=List[ItemOut])
def suggestions(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return get_low_stock(db)


@router.get("/{list_id}", response_model=MarketListOut)
def get_list(
    list_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    ml = db.query(MarketList).filter_by(id=list_id).first()
    if not ml:
        raise HTTPException(404, "Market list not found")
    return ml


@router.post("/{list_id}/items", response_model=MarketListItemOut, status_code=201)
def add_item(
    list_id: UUID,
    payload: MarketListItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ml = db.query(MarketList).filter_by(id=list_id).first()
    if not ml:
        raise HTTPException(404, "Market list not found")
    item = MarketListItem(list_id=list_id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{list_id}/items/{item_id}/purchased", response_model=MarketListItemOut)
def mark_purchased(
    list_id: UUID,
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    mli = db.query(MarketListItem).filter_by(id=item_id, list_id=list_id).first()
    if not mli:
        raise HTTPException(404, "Item not found")

    mli.purchased = True
    mli.purchased_at = datetime.utcnow()

    # If linked to inventory, add stock movement
    if mli.inventory_item_id and mli.estimated_cost:
        inv_item = db.query(Item).filter_by(id=mli.inventory_item_id).first()
        if inv_item:
            inv_item.quantity_in_stock += mli.quantity_needed
            movement = StockMovement(
                item_id=inv_item.id,
                movement_type=MovementType.purchase,
                quantity=mli.quantity_needed,
                unit_cost=mli.estimated_cost,
                note="From market list",
            )
            db.add(movement)

    db.commit()
    db.refresh(mli)
    return mli


@router.delete("/{list_id}", status_code=204)
def delete_list(
    list_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ml = db.query(MarketList).filter_by(id=list_id).first()
    if not ml:
        raise HTTPException(404, "Market list not found")
    db.delete(ml)
    db.commit()
