import csv
import io
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.orm import Session

from core.dependencies import get_current_user, get_db, role_required
from models.inventory import Item, StockMovement
from models.user import User, UserRole
from schemas.inventory import ItemCreate, ItemOut, ItemUpdate, RestockRequest, StockMovementOut
from services.inventory_service import get_low_stock, restock_item, search_items

router = APIRouter()


@router.get("", response_model=List[ItemOut])
def list_items(
    category: Optional[str] = None,
    low_stock: bool = False,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if low_stock:
        return get_low_stock(db)
    q = db.query(Item).filter(Item.is_active == True)
    if category:
        q = q.filter(Item.category == category)
    return q.all()


@router.post("", response_model=ItemOut, status_code=201)
def create_item(
    payload: ItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(UserRole.super_admin, UserRole.owner, UserRole.accountant, UserRole.technician)),
):
    item = Item(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    
    if item.quantity_in_stock > 0:
        from models.inventory import StockMovement, MovementType
        from models.expense import Expense, ExpenseCategory
        
        movement = StockMovement(
            item_id=item.id,
            movement_type=MovementType.purchase,
            quantity=item.quantity_in_stock,
            unit_cost=item.purchase_price,
            note=f"Initial stock: {item.quantity_in_stock} units at ₦{item.purchase_price} each",
        )
        db.add(movement)

        expense = Expense(
            category=ExpenseCategory.inventory,
            amount=item.purchase_price * item.quantity_in_stock,
            description=f"Purchased initial stock of {item.quantity_in_stock}× {item.name} at ₦{item.purchase_price}/unit",
            created_by=current_user.id
        )
        db.add(expense)
        db.commit()
        db.refresh(item)

    return item


@router.get("/low-stock", response_model=List[ItemOut])
def low_stock_items(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return get_low_stock(db)


@router.get("/search", response_model=List[ItemOut])
def search(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return search_items(db, q)


@router.get("/{item_id}", response_model=ItemOut)
def get_item(
    item_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    item = db.query(Item).filter_by(id=item_id, is_active=True).first()
    if not item:
        from fastapi import HTTPException
        raise HTTPException(404, "Item not found")
    return item


@router.put("/{item_id}", response_model=ItemOut)
def update_item(
    item_id: UUID,
    payload: ItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(UserRole.super_admin, UserRole.owner, UserRole.accountant, UserRole.technician)),
):
    item = db.query(Item).filter_by(id=item_id, is_active=True).first()
    if not item:
        from fastapi import HTTPException
        raise HTTPException(404, "Item not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def delete_item(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(UserRole.owner)),
):
    item = db.query(Item).filter_by(id=item_id, is_active=True).first()
    if not item:
        from fastapi import HTTPException
        raise HTTPException(404, "Item not found")
    item.is_active = False
    db.commit()


@router.post("/{item_id}/restock", response_model=ItemOut)
def restock(
    item_id: UUID,
    payload: RestockRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(UserRole.super_admin, UserRole.owner, UserRole.accountant, UserRole.technician)),
):
    return restock_item(db, item_id, payload.quantity, payload.unit_cost, payload.restock_date)


CSV_TEMPLATE_HEADERS = "name,category,sku,purchase_price,selling_price,quantity_in_stock,reorder_level,supplier\n"
CSV_TEMPLATE_EXAMPLE = "iPhone Screen,Spare Parts,SCR-IP14,15000,22000,10,3,TechParts Ltd\n"


@router.get("/template/csv")
def download_csv_template():
    content = CSV_TEMPLATE_HEADERS + CSV_TEMPLATE_EXAMPLE
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=inventory_template.csv"},
    )


@router.post("/import/csv", status_code=201)
def import_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(UserRole.super_admin, UserRole.owner, UserRole.accountant, UserRole.technician)),
):
    from models.inventory import StockMovement, MovementType
    from models.expense import Expense, ExpenseCategory

    try:
        content = file.file.read().decode("utf-8-sig")  # utf-8-sig strips Excel BOM
    except Exception:
        raise HTTPException(400, "Could not read file — ensure it is UTF-8 encoded")

    reader = csv.DictReader(io.StringIO(content))
    required = {"name", "purchase_price"}
    if not required.issubset(set(reader.fieldnames or [])):
        raise HTTPException(400, f"CSV must have columns: {', '.join(sorted(required))} (got: {reader.fieldnames})")

    created_names: list[str] = []
    errors: list[dict] = []

    for row_num, row in enumerate(reader, start=2):
        try:
            name = row["name"].strip()
            if not name:
                raise ValueError("name is required")

            purchase_price = Decimal(row["purchase_price"].strip().replace(",", ""))
            selling_price = None
            if row.get("selling_price", "").strip():
                selling_price = Decimal(row["selling_price"].strip().replace(",", ""))

            qty = int(row.get("quantity_in_stock", "0").strip() or 0)
            reorder = int(row.get("reorder_level", "5").strip() or 5)

            item = Item(
                name=name,
                category=row.get("category", "").strip() or None,
                sku=row.get("sku", "").strip() or None,
                purchase_price=purchase_price,
                selling_price=selling_price,
                quantity_in_stock=qty,
                reorder_level=reorder,
                supplier=row.get("supplier", "").strip() or None,
            )
            db.add(item)
            db.flush()

            if qty > 0:
                db.add(StockMovement(
                    item_id=item.id,
                    movement_type=MovementType.purchase,
                    quantity=qty,
                    unit_cost=purchase_price,
                    note=f"CSV import: {qty} units at ₦{purchase_price} each",
                ))
                db.add(Expense(
                    category=ExpenseCategory.inventory,
                    amount=purchase_price * qty,
                    description=f"CSV import — initial stock of {qty}× {name}",
                    created_by=current_user.id,
                ))

            created_names.append(name)
        except (InvalidOperation, ValueError) as exc:
            errors.append({"row": row_num, "name": row.get("name", ""), "error": str(exc)})
        except Exception as exc:
            errors.append({"row": row_num, "name": row.get("name", ""), "error": str(exc)})

    if created_names:
        db.commit()

    return {"created": len(created_names), "errors": errors}


@router.get("/{item_id}/movements", response_model=List[StockMovementOut])
def get_movements(
    item_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return (
        db.query(StockMovement)
        .filter_by(item_id=item_id)
        .order_by(StockMovement.created_at.desc())
        .all()
    )
