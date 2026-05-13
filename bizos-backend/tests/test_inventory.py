"""
Inventory tests:
- restock creates movement + expense
- low stock query
- item search
"""
from decimal import Decimal

from sqlalchemy.orm import Session

from models.expense import Expense, ExpenseCategory
from models.inventory import Item, MovementType, StockMovement
from services.inventory_service import get_low_stock, restock_item, search_items


def make_item(db: Session, name="Battery", qty=10, reorder=5) -> Item:
    item = Item(
        name=name,
        purchase_price=Decimal("2000"),
        selling_price=Decimal("3000"),
        quantity_in_stock=qty,
        reorder_level=reorder,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def test_restock_increases_stock(db: Session):
    item = make_item(db, qty=3)
    restock_item(db, item.id, quantity=10, unit_cost=Decimal("2000"))
    db.refresh(item)
    assert item.quantity_in_stock == 13


def test_restock_creates_stock_movement(db: Session):
    item = make_item(db, qty=0)
    restock_item(db, item.id, quantity=5, unit_cost=Decimal("2000"))
    movements = db.query(StockMovement).filter_by(item_id=item.id).all()
    assert len(movements) == 1
    assert movements[0].movement_type == MovementType.purchase
    assert movements[0].quantity == 5


def test_restock_creates_expense(db: Session):
    item = make_item(db, qty=0)
    restock_item(db, item.id, quantity=5, unit_cost=Decimal("2000"))
    expenses = db.query(Expense).filter_by(category=ExpenseCategory.inventory).all()
    assert len(expenses) == 1
    assert expenses[0].amount == Decimal("10000")  # 5 * 2000


def test_low_stock_query(db: Session):
    make_item(db, name="ScreenA", qty=2, reorder=5)   # low stock
    make_item(db, name="ScreenB", qty=10, reorder=5)  # not low
    make_item(db, name="ScreenC", qty=5, reorder=5)   # exactly at reorder = low stock

    low = get_low_stock(db)
    names = {i.name for i in low}
    assert "ScreenA" in names
    assert "ScreenC" in names
    assert "ScreenB" not in names


def test_search_items(db: Session):
    make_item(db, name="iPhone Screen")
    make_item(db, name="Samsung Battery")
    make_item(db, name="iPhone Battery")

    results = search_items(db, "iphone")
    names = {i.name for i in results}
    assert "iPhone Screen" in names
    assert "iPhone Battery" in names
    assert "Samsung Battery" not in names


def test_search_case_insensitive(db: Session):
    make_item(db, name="IPHONE SCREEN")
    results = search_items(db, "iphone")
    assert len(results) == 1


def test_restock_unknown_item_raises(db: Session):
    from fastapi import HTTPException
    from uuid import uuid4
    import pytest
    with pytest.raises(HTTPException) as exc:
        restock_item(db, uuid4(), quantity=5, unit_cost=Decimal("1000"))
    assert exc.value.status_code == 404
