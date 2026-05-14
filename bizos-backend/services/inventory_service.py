from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from models.expense import Expense, ExpenseCategory
from models.inventory import Item, MovementType, StockMovement


def restock_item(
    db: Session,
    item_id: UUID,
    quantity: int,
    unit_cost: Decimal,
    restock_date: Optional[date] = None,
) -> Item:
    item = db.query(Item).filter_by(id=item_id, is_active=True).first()
    if not item:
        raise HTTPException(404, "Item not found")

    item.quantity_in_stock += quantity

    movement_time = (
        datetime.combine(restock_date, datetime.min.time()).replace(tzinfo=timezone.utc)
        if restock_date else datetime.utcnow()
    )

    movement = StockMovement(
        item_id=item_id,
        movement_type=MovementType.purchase,
        quantity=quantity,
        unit_cost=unit_cost,
        note=f"Restocked: {quantity} units at ₦{unit_cost} each",
        created_at=movement_time,
    )
    db.add(movement)

    expense = Expense(
        category=ExpenseCategory.inventory,
        amount=unit_cost * quantity,
        description=f"Purchased {quantity}× {item.name} at ₦{unit_cost}/unit",
        expense_date=restock_date or date.today(),
    )
    db.add(expense)

    db.commit()
    db.refresh(item)
    return item


def get_low_stock(db: Session):
    return (
        db.query(Item)
        .filter(
            Item.is_active == True,
            Item.quantity_in_stock <= Item.reorder_level,
        )
        .all()
    )


def search_items(db: Session, query: str):
    return (
        db.query(Item)
        .filter(
            Item.is_active == True,
            Item.name.ilike(f"%{query}%"),
        )
        .limit(10)
        .all()
    )
