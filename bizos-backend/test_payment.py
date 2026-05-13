import os
import sys

# Add the project root to sys.path so we can import modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from core.database import SessionLocal
from models.inventory import Item
from models.sales import Sale
from decimal import Decimal

db = SessionLocal()
try:
    print("Testing Sale Update Payment...")
    # Create test item
    item = Item(
        name="Test Item",
        category="Test",
        purchase_price=Decimal("100"),
        selling_price=Decimal("200"),
        quantity_in_stock=10,
        reorder_level=2,
        is_active=True
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    
    # Create test sale
    sale = Sale(
        item_id=item.id,
        customer="Test Customer",
        quantity=1,
        selling_price=Decimal("200"),
        cost_price=Decimal("100"),
        amount_paid=Decimal("100")
    )
    db.add(sale)
    db.commit()
    db.refresh(sale)
    
    print(f"Created Sale: {sale.id}, amount_paid={sale.amount_paid}")
    
    # Try the update payment function from router
    from routers.sales import update_sale_payment
    from schemas.sales import SalePaymentUpdate
    from models.user import User
    
    # Mock user
    mock_user = db.query(User).first()
    if not mock_user:
        mock_user = User(email="test@test.com", password_hash="hash", name="Test", role="super_admin")
        db.add(mock_user)
        db.commit()
    
    try:
        updated_sale = update_sale_payment(
            sale_id=sale.id,
            payload=SalePaymentUpdate(amount_paid=Decimal("150")),
            db=db,
            current_user=mock_user
        )
        print(f"Success! Updated amount_paid to {updated_sale.amount_paid}")
    except Exception as e:
        print(f"Error in update_sale_payment: {e}")
        
except Exception as e:
    print(f"Test Setup Error: {e}")
finally:
    db.close()
