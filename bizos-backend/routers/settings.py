import json
from typing import Any, Dict

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from core.dependencies import get_current_user, get_db, role_required
from models.settings import BusinessProfile
from models.user import User, UserRole
from schemas.settings import BusinessProfileOut, BusinessProfileUpdate

router = APIRouter()

_MAX_BACKUP_SIZE = 5 * 1024 * 1024  # 5 MB

# Only fields we explicitly trust for each model — never **kwargs from untrusted JSON
_SAFE_REPAIR_FIELDS = {
    "id", "job_number", "customer_name", "customer_phone", "device_type",
    "device_model", "fault_description", "labor_charge", "total_charge",
    "amount_paid", "status", "received_at", "delivered_at", "notes",
    "cancel_reason", "created_by",
}
_SAFE_ITEM_FIELDS = {
    "id", "name", "category", "sku", "purchase_price", "selling_price",
    "quantity_in_stock", "reorder_level", "supplier", "notes", "is_active",
}
_SAFE_SALE_FIELDS = {
    "id", "item_id", "customer", "quantity", "selling_price",
    "cost_price", "amount_paid", "sold_at",
}
_SAFE_EXPENSE_FIELDS = {
    "id", "category", "amount", "description", "reference_id",
    "expense_date", "created_by",
}
_SAFE_INVESTMENT_FIELDS = {
    "id", "party_name", "type", "amount", "expected_return",
    "amount_repaid", "due_date", "purpose", "is_settled", "received_at",
}
_SAFE_TITHE_FIELDS = {
    "id", "amount", "scope", "source_id", "paid", "paid_at", "created_at",
}
_SAFE_TX_FIELDS = {
    "id", "type", "category", "amount", "description", "transaction_date",
}


def _safe(row: Dict[str, Any], allowed: set) -> Dict[str, Any]:
    return {k: v for k, v in row.items() if k in allowed}


@router.get("/business-profile", response_model=BusinessProfileOut)
def get_profile(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    profile = db.query(BusinessProfile).first()
    if not profile:
        profile = BusinessProfile()
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.put("/business-profile", response_model=BusinessProfileOut)
def update_profile(
    payload: BusinessProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(UserRole.super_admin, UserRole.owner)),
):
    profile = db.query(BusinessProfile).first()
    if not profile:
        profile = BusinessProfile()
        db.add(profile)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile


@router.post("/restore")
async def restore_database(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(UserRole.super_admin)),
):
    if not file.filename or not file.filename.lower().endswith(".json"):
        raise HTTPException(400, "Invalid file format. Must be a .json backup file.")

    content = await file.read()
    if len(content) > _MAX_BACKUP_SIZE:
        raise HTTPException(413, "Backup file exceeds 5 MB limit.")

    try:
        data = json.loads(content)
    except json.JSONDecodeError as exc:
        raise HTTPException(400, f"Invalid JSON: {exc}")

    if not isinstance(data, dict):
        raise HTTPException(400, "Invalid backup structure: root must be an object")

    business = data.get("business") or {}
    personal = data.get("personal") or {}

    if not isinstance(business, dict) or not isinstance(personal, dict):
        raise HTTPException(400, "Invalid backup structure: 'business' and 'personal' must be objects")

    _ALLOWED_BIZ_KEYS = {"repairs", "inventory", "sales", "expenses", "investments", "tithe"}
    _ALLOWED_PER_KEYS = {"transactions", "tithe"}

    unknown_biz = set(business.keys()) - _ALLOWED_BIZ_KEYS
    unknown_per = set(personal.keys()) - _ALLOWED_PER_KEYS
    if unknown_biz or unknown_per:
        raise HTTPException(400, f"Unknown backup keys — business: {unknown_biz}, personal: {unknown_per}")

    # Validate all sections are lists before touching the DB
    for section, key, items in [
        ("business", "repairs",      business.get("repairs", [])),
        ("business", "inventory",    business.get("inventory", [])),
        ("business", "sales",        business.get("sales", [])),
        ("business", "expenses",     business.get("expenses", [])),
        ("business", "investments",  business.get("investments", [])),
        ("business", "tithe",        business.get("tithe", [])),
        ("personal", "transactions", personal.get("transactions", [])),
        ("personal", "tithe",        personal.get("tithe", [])),
    ]:
        if not isinstance(items, list):
            raise HTTPException(400, f"'{section}.{key}' must be an array")

    from models.food_vendor import FoodVendorCredit, FoodVendorPayment
    from models.inventory import Item, StockMovement
    from models.investment import Investment
    from models.expense import Expense
    from models.personal import PersonalTransaction, SavingsGoal
    from models.repair import JobPart, RepairJob
    from models.sales import Sale
    from models.tithe import TitheRecord

    try:
        # All-or-nothing: wipe then restore in one transaction
        db.query(JobPart).delete()
        db.query(FoodVendorPayment).delete()
        db.query(FoodVendorCredit).delete()
        db.query(Sale).delete()
        db.query(RepairJob).delete()
        db.query(TitheRecord).delete()
        db.query(Expense).delete()
        db.query(StockMovement).delete()
        db.query(PersonalTransaction).delete()
        db.query(SavingsGoal).delete()
        db.query(Investment).delete()
        db.query(Item).delete()

        for row in business.get("repairs", []):
            db.add(RepairJob(**_safe(row, _SAFE_REPAIR_FIELDS)))
        for row in business.get("inventory", []):
            db.add(Item(**_safe(row, _SAFE_ITEM_FIELDS)))
        for row in business.get("sales", []):
            db.add(Sale(**_safe(row, _SAFE_SALE_FIELDS)))
        for row in business.get("expenses", []):
            db.add(Expense(**_safe(row, _SAFE_EXPENSE_FIELDS)))
        for row in business.get("investments", []):
            db.add(Investment(**_safe(row, _SAFE_INVESTMENT_FIELDS)))
        for row in business.get("tithe", []):
            db.add(TitheRecord(**_safe(row, _SAFE_TITHE_FIELDS)))
        for row in personal.get("transactions", []):
            db.add(PersonalTransaction(**_safe(row, _SAFE_TX_FIELDS)))
        for row in personal.get("tithe", []):
            db.add(TitheRecord(**_safe(row, _SAFE_TITHE_FIELDS)))

        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(500, f"Restore failed: {exc}")

    return {"message": "Restore successful"}
