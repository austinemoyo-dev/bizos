# BizOS Backend — Claude Code Master Prompt
**Dash & Co. Business + Personal Finance Operating System**
**Stack: FastAPI + PostgreSQL + SQLAlchemy + Alembic**

---

## INSTRUCTIONS FOR AI AGENT

You are building the complete backend for BizOS, a financial operating system for a small business (Dash & Co.) that handles both business operations and personal finance. Read this entire document before writing a single line of code. Follow every specification exactly. Do not invent features, skip sections, or simplify logic.

---

## PROJECT STRUCTURE TO CREATE

```
bizos-backend/
├── main.py
├── requirements.txt
├── .env.example
├── alembic.ini
├── alembic/
│   ├── env.py
│   └── versions/          (empty, alembic generates these)
├── core/
│   ├── __init__.py
│   ├── config.py           ← env vars via pydantic BaseSettings
│   ├── database.py         ← SQLAlchemy engine, SessionLocal, Base
│   ├── security.py         ← JWT creation/verification, password hashing
│   └── dependencies.py     ← get_db, get_current_user, role_required
├── models/
│   ├── __init__.py         ← import all models here
│   ├── user.py
│   ├── inventory.py        ← Item, StockMovement
│   ├── repair.py           ← RepairJob, JobPart
│   ├── sales.py
│   ├── expense.py
│   ├── investment.py
│   ├── tithe.py
│   ├── market_list.py
│   ├── personal.py         ← PersonalTransaction, Savings
│   └── food_vendor.py      ← FoodVendorCredit
├── schemas/
│   ├── __init__.py
│   ├── auth.py
│   ├── inventory.py
│   ├── repair.py
│   ├── sales.py
│   ├── expense.py
│   ├── investment.py
│   ├── tithe.py
│   ├── market_list.py
│   ├── personal.py
│   ├── food_vendor.py
│   └── analytics.py
├── routers/
│   ├── __init__.py
│   ├── auth.py
│   ├── inventory.py
│   ├── repairs.py
│   ├── sales.py
│   ├── purchases.py
│   ├── expenses.py
│   ├── investments.py
│   ├── tithe.py
│   ├── market_list.py
│   ├── personal.py
│   ├── food_vendor.py
│   ├── analytics.py
│   └── reports.py
├── services/
│   ├── __init__.py
│   ├── inventory_service.py
│   ├── repair_service.py
│   ├── tithe_service.py
│   ├── analytics_service.py
│   └── notification_service.py
└── tests/
    ├── __init__.py
    ├── conftest.py
    ├── test_inventory.py
    ├── test_repairs.py
    ├── test_tithe.py
    └── test_personal.py
```

---

## REQUIREMENTS.TXT

```
fastapi==0.111.0
uvicorn[standard]==0.29.0
sqlalchemy==2.0.30
alembic==1.13.1
psycopg2-binary==2.9.9
pydantic==2.7.1
pydantic-settings==2.2.1
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.9
python-dotenv==1.0.1
pytest==8.2.0
pytest-asyncio==0.23.6
httpx==0.27.0
```

---

## ENVIRONMENT VARIABLES (.env.example)

```env
DATABASE_URL=postgresql://bizos_user:password@localhost:5432/bizos_db
SECRET_KEY=your-secret-key-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30
```

---

## CORE/CONFIG.PY

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    class Config:
        env_file = ".env"

settings = Settings()
```

---

## DATABASE MODELS (EXACT SPECIFICATIONS)

### models/user.py

```python
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from core.database import Base
import enum

class UserRole(str, enum.Enum):
    super_admin = "super_admin"
    owner = "owner"
    accountant = "accountant"
    technician = "technician"
    staff = "staff"
    viewer = "viewer"

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(SAEnum(UserRole), nullable=False, default=UserRole.staff)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
```

### models/inventory.py

```python
import uuid, enum
from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey, Boolean, Text, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from core.database import Base

class MovementType(str, enum.Enum):
    purchase = "purchase"
    sale = "sale"
    repair_use = "repair_use"
    damage = "damage"
    adjustment = "adjustment"

class Item(Base):
    __tablename__ = "items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    category = Column(String)
    sku = Column(String, unique=True, nullable=True)
    purchase_price = Column(Numeric(12, 2), nullable=False)
    selling_price = Column(Numeric(12, 2), nullable=True)
    quantity_in_stock = Column(Integer, default=0, nullable=False)
    reorder_level = Column(Integer, default=5, nullable=False)
    supplier = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    movements = relationship("StockMovement", back_populates="item")

class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    item_id = Column(UUID(as_uuid=True), ForeignKey("items.id"), nullable=False)
    movement_type = Column(SAEnum(MovementType), nullable=False)
    quantity = Column(Integer, nullable=False)  # positive=in, negative=out
    unit_cost = Column(Numeric(12, 2), nullable=True)
    reference_id = Column(UUID(as_uuid=True), nullable=True)  # job_id or sale_id
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    item = relationship("Item", back_populates="movements")
```

### models/repair.py

```python
import uuid, enum
from datetime import datetime
from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey, Boolean, Text, Enum as SAEnum, Sequence
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from core.database import Base

class RepairStatus(str, enum.Enum):
    received = "received"
    diagnosed = "diagnosed"
    in_progress = "in_progress"
    completed = "completed"
    delivered = "delivered"

class DeviceType(str, enum.Enum):
    phone = "phone"
    fan = "fan"
    extension = "extension"
    gadget = "gadget"
    other = "other"

job_number_seq = Sequence("job_number_seq", start=1)

class RepairJob(Base):
    __tablename__ = "repair_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_number = Column(Integer, job_number_seq, server_default=job_number_seq.next_value(), unique=True)
    customer_name = Column(String, nullable=False)
    customer_phone = Column(String, nullable=True)
    device_type = Column(SAEnum(DeviceType), nullable=False)
    device_model = Column(String, nullable=True)
    fault_description = Column(Text, nullable=True)
    labor_charge = Column(Numeric(12, 2), default=0)
    total_charge = Column(Numeric(12, 2), default=0)
    status = Column(SAEnum(RepairStatus), default=RepairStatus.received, nullable=False)
    received_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    parts = relationship("JobPart", back_populates="job", cascade="all, delete-orphan")
    created_by_user = relationship("User")

class JobPart(Base):
    __tablename__ = "job_parts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("repair_jobs.id", ondelete="CASCADE"), nullable=False)
    item_id = Column(UUID(as_uuid=True), ForeignKey("items.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    unit_cost = Column(Numeric(12, 2), nullable=False)  # snapshot cost at time of use
    damaged = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    job = relationship("RepairJob", back_populates="parts")
    item = relationship("Item")
```

### models/sales.py

```python
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from core.database import Base

class Sale(Base):
    __tablename__ = "sales"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    item_id = Column(UUID(as_uuid=True), ForeignKey("items.id"), nullable=False)
    customer = Column(String, nullable=True)
    quantity = Column(Integer, nullable=False)
    selling_price = Column(Numeric(12, 2), nullable=False)   # per unit
    cost_price = Column(Numeric(12, 2), nullable=False)      # snapshot
    # profit = (selling_price - cost_price) * quantity — NEVER store, always compute
    sold_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    item = relationship("Item")
```

### models/expense.py

```python
import uuid, enum
from datetime import datetime, date
from sqlalchemy import Column, String, Numeric, DateTime, Date, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from core.database import Base

class ExpenseCategory(str, enum.Enum):
    inventory = "inventory"
    transport = "transport"
    utilities = "utilities"
    equipment = "equipment"
    tithe = "tithe"
    salary = "salary"
    maintenance = "maintenance"
    damage_loss = "damage_loss"
    loan_repayment = "loan_repayment"
    miscellaneous = "miscellaneous"

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category = Column(SAEnum(ExpenseCategory), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    description = Column(Text, nullable=True)
    reference_id = Column(UUID(as_uuid=True), nullable=True)
    expense_date = Column(Date, default=date.today, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
```

### models/investment.py

```python
import uuid, enum
from datetime import datetime, date
from sqlalchemy import Column, String, Numeric, DateTime, Date, Text, Enum as SAEnum, Boolean
from sqlalchemy.dialects.postgresql import UUID
from core.database import Base

class InvestmentType(str, enum.Enum):
    loan = "loan"
    investment = "investment"

class Investment(Base):
    __tablename__ = "investments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    party_name = Column(String, nullable=False)
    type = Column(SAEnum(InvestmentType), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    expected_return = Column(Numeric(12, 2), nullable=True)
    amount_repaid = Column(Numeric(12, 2), default=0)
    due_date = Column(Date, nullable=True)
    purpose = Column(Text, nullable=True)
    is_settled = Column(Boolean, default=False)
    received_at = Column(Date, default=date.today)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Computed property (in service layer): balance_outstanding = amount - amount_repaid
```

### models/tithe.py

```python
import uuid, enum
from datetime import datetime, date
from sqlalchemy import Column, String, Numeric, DateTime, Date, Boolean, Enum as SAEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from core.database import Base

class TitheScope(str, enum.Enum):
    business = "business"
    personal = "personal"

class TitheRecord(Base):
    __tablename__ = "tithe_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scope = Column(SAEnum(TitheScope), nullable=False)
    calculated_from = Column(Numeric(12, 2), nullable=False)  # profit or income
    tithe_amount = Column(Numeric(12, 2), nullable=False)      # always 10% of calculated_from
    paid = Column(Boolean, default=False)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    expense_id = Column(UUID(as_uuid=True), ForeignKey("expenses.id"), nullable=True)  # set when paid
    period_start = Column(Date, nullable=True)
    period_end = Column(Date, nullable=True)
    reference_id = Column(UUID(as_uuid=True), nullable=True)  # job_id that triggered it
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
```

### models/market_list.py

```python
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DateTime, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from core.database import Base

class MarketList(Base):
    __tablename__ = "market_lists"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    items = relationship("MarketListItem", back_populates="list", cascade="all, delete-orphan")

class MarketListItem(Base):
    __tablename__ = "market_list_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    list_id = Column(UUID(as_uuid=True), ForeignKey("market_lists.id", ondelete="CASCADE"))
    item_name = Column(String, nullable=False)
    inventory_item_id = Column(UUID(as_uuid=True), ForeignKey("items.id"), nullable=True)  # if from inventory
    quantity_needed = Column(Integer, default=1)
    estimated_cost = Column(Numeric(12, 2), nullable=True)
    purchased = Column(Boolean, default=False)
    purchased_at = Column(DateTime(timezone=True), nullable=True)

    list = relationship("MarketList", back_populates="items")
    inventory_item = relationship("Item")
```

### models/personal.py

```python
import uuid, enum
from datetime import datetime, date
from sqlalchemy import Column, String, Numeric, DateTime, Date, Text, Enum as SAEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from core.database import Base

class PersonalTxType(str, enum.Enum):
    income = "income"
    expense = "expense"
    savings = "savings"

class PersonalIncomeCategory(str, enum.Enum):
    salary = "salary"
    side_income = "side_income"
    gift = "gift"
    other = "other"

class PersonalExpenseCategory(str, enum.Enum):
    food = "food"
    transport = "transport"
    data = "data"
    airtime = "airtime"
    bills = "bills"
    savings = "savings"
    tithe = "tithe"
    miscellaneous = "miscellaneous"

class PersonalTransaction(Base):
    __tablename__ = "personal_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type = Column(SAEnum(PersonalTxType), nullable=False)
    category = Column(String, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    description = Column(Text, nullable=True)
    transaction_date = Column(Date, default=date.today, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

class SavingsGoal(Base):
    __tablename__ = "savings_goals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    target_amount = Column(Numeric(12, 2), nullable=False)
    current_amount = Column(Numeric(12, 2), default=0)
    target_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
```

### models/food_vendor.py

```python
import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Numeric, DateTime, Date, Boolean, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from core.database import Base

class FoodVendorCredit(Base):
    __tablename__ = "food_vendor_credits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_name = Column(String, nullable=False)
    meal_description = Column(String, nullable=True)
    amount = Column(Numeric(12, 2), nullable=False)
    purchase_date = Column(Date, default=date.today, nullable=False)
    paid = Column(Boolean, default=False)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    payment_batch_id = Column(UUID(as_uuid=True), nullable=True)  # group payments by batch
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

class FoodVendorPayment(Base):
    __tablename__ = "food_vendor_payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_name = Column(String, nullable=False)
    amount_paid = Column(Numeric(12, 2), nullable=False)
    paid_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    note = Column(Text, nullable=True)
```

---

## BUSINESS LOGIC RULES (CRITICAL — DO NOT DEVIATE)

### Rule 1: Profit Formula
```
Profit = Revenue - Expenses
Revenue = RepairJob.total_charge + (Sale.selling_price × quantity)
Expenses = sum of all Expense records in period
NEVER store profit — always compute on query
```

### Rule 2: Tithe Formula
```
Tithe = 10% × Profit
Tithe is UNPAID by default when created
Tithe becomes an Expense record ONLY when marked paid
Available Balance = Profit - sum(paid tithe amounts)
```

### Rule 3: Repair Job Part Usage
When a part is added to a job (JobPart created):
- Deduct quantity from Item.quantity_in_stock
- Create StockMovement(type=repair_use, quantity=-n)
- If damaged=True: ALSO create StockMovement(type=damage) AND create Expense(category=damage_loss)

### Rule 4: Completing a Repair Job
When status changes to "completed":
- Calculate profit = total_charge - sum(part costs) - labor_charge
- If profit > 0: call tithe_service.create_tithe_record(scope=business, profit=profit)
- Status "completed" → parts list is LOCKED (no adds/removes)
- Status "delivered" can only be set after "completed"

### Rule 5: Recording a Sale
When a Sale is created:
- Deduct quantity from Item.quantity_in_stock
- Create StockMovement(type=sale, quantity=-n)
- Create Expense? NO — cost of goods is tracked via StockMovement, not Expense
- Revenue is tracked via Sale record

### Rule 6: Recording a Purchase (inventory restock)
When a purchase is recorded:
- Increase Item.quantity_in_stock
- Create StockMovement(type=purchase, quantity=+n)
- Create Expense(category=inventory, amount=unit_cost×quantity)

### Rule 7: Low Stock
Item is low stock if: quantity_in_stock <= reorder_level
Return these in GET /inventory/low-stock

### Rule 8: Food Vendor Payment
When food credits are marked as paid (batch):
- Set paid=True, paid_at=now(), payment_batch_id=new UUID on all selected records
- Create FoodVendorPayment record with total
- Create PersonalTransaction(type=expense, category=food, amount=total)

### Rule 9: Investment Balance
balance_outstanding = amount - amount_repaid
is_settled = True when amount_repaid >= amount (auto-update)

### Rule 10: Tithe Payment
When TitheRecord is marked paid:
- Set paid=True, paid_at=now()
- Create Expense(category=tithe, amount=tithe_amount, reference_id=tithe_record.id)
- Set TitheRecord.expense_id = new expense id

---

## API ENDPOINTS (COMPLETE LIST)

### AUTH
```
POST   /api/v1/auth/register          ← super_admin only
POST   /api/v1/auth/login             ← returns access_token + refresh_token
POST   /api/v1/auth/refresh           ← returns new access_token
POST   /api/v1/auth/logout
GET    /api/v1/auth/me                ← current user
PUT    /api/v1/auth/me                ← update own profile
```

### INVENTORY
```
GET    /api/v1/inventory              ← list all items (filterable: category, low_stock)
POST   /api/v1/inventory              ← create item [owner, accountant]
GET    /api/v1/inventory/low-stock    ← items at/below reorder level
GET    /api/v1/inventory/{id}         ← item detail
PUT    /api/v1/inventory/{id}         ← update item [owner, accountant]
DELETE /api/v1/inventory/{id}         ← soft delete (set is_active=False) [owner]
POST   /api/v1/inventory/{id}/restock ← add stock (creates movement + expense)
GET    /api/v1/inventory/{id}/movements ← stock movement history
GET    /api/v1/inventory/search       ← ?q=term (for autocomplete in forms)
```

### REPAIRS
```
GET    /api/v1/repairs                ← list jobs (filterable: status, device_type, date range)
POST   /api/v1/repairs                ← create job [all except viewer]
GET    /api/v1/repairs/{id}           ← job detail with parts
PUT    /api/v1/repairs/{id}           ← update job fields [owner, accountant, technician]
PATCH  /api/v1/repairs/{id}/status    ← change status {status: "in_progress"} [all except viewer]
POST   /api/v1/repairs/{id}/parts     ← add part to job [technician, owner] ← BLOCKED if completed
DELETE /api/v1/repairs/{id}/parts/{part_id} ← remove part ← BLOCKED if completed
GET    /api/v1/repairs/{id}/profit    ← compute and return profit breakdown
```

### SALES
```
GET    /api/v1/sales                  ← list (filterable: date range, item)
POST   /api/v1/sales                  ← record sale [all except viewer]
GET    /api/v1/sales/{id}
DELETE /api/v1/sales/{id}             ← [owner only] — reverses stock movement
```

### EXPENSES
```
GET    /api/v1/expenses               ← list (filterable: category, date range)
POST   /api/v1/expenses               ← manual expense [owner, accountant]
GET    /api/v1/expenses/{id}
PUT    /api/v1/expenses/{id}          ← [owner, accountant]
DELETE /api/v1/expenses/{id}          ← [owner only]
GET    /api/v1/expenses/summary       ← grouped by category for period
```

### INVESTMENTS
```
GET    /api/v1/investments
POST   /api/v1/investments            ← [owner]
GET    /api/v1/investments/{id}
PUT    /api/v1/investments/{id}       ← [owner]
POST   /api/v1/investments/{id}/repay ← record repayment {amount: ...}
```

### TITHE (BUSINESS)
```
GET    /api/v1/tithe                  ← list (scope=business, filterable: paid)
GET    /api/v1/tithe/unpaid-total     ← sum of unpaid business tithe
POST   /api/v1/tithe/{id}/pay         ← mark as paid → creates expense [owner]
```

### MARKET LIST
```
GET    /api/v1/market-list            ← active lists
POST   /api/v1/market-list            ← create list
GET    /api/v1/market-list/{id}       ← list with items
POST   /api/v1/market-list/{id}/items ← add item
PATCH  /api/v1/market-list/{id}/items/{item_id}/purchased ← mark purchased → adds to inventory
DELETE /api/v1/market-list/{id}
GET    /api/v1/market-list/suggestions ← returns low stock items as suggestions
```

### PERSONAL FINANCE
```
GET    /api/v1/personal/transactions         ← list (filterable: type, category, date)
POST   /api/v1/personal/transactions         ← record income or expense
GET    /api/v1/personal/transactions/{id}
DELETE /api/v1/personal/transactions/{id}
GET    /api/v1/personal/summary              ← income, expenses, balance for period
GET    /api/v1/personal/savings-goals        ← list goals
POST   /api/v1/personal/savings-goals        ← create goal
PUT    /api/v1/personal/savings-goals/{id}   ← update goal amount
GET    /api/v1/personal/tithe                ← personal tithe records
GET    /api/v1/personal/tithe/unpaid-total
POST   /api/v1/personal/tithe/{id}/pay
```

### FOOD VENDOR
```
GET    /api/v1/food-vendor/credits            ← list (filterable: paid, vendor, week)
POST   /api/v1/food-vendor/credits            ← record meal
GET    /api/v1/food-vendor/outstanding        ← total unpaid by vendor
POST   /api/v1/food-vendor/pay               ← bulk pay {credit_ids: [...], vendor_name: "..."}
GET    /api/v1/food-vendor/payments           ← payment history
GET    /api/v1/food-vendor/analytics          ← weekly totals, avg/day, by vendor
```

### ANALYTICS
```
GET    /api/v1/analytics/business/summary     ← ?period_start=&period_end=
GET    /api/v1/analytics/business/revenue-trend ← daily/weekly revenue for chart
GET    /api/v1/analytics/business/expense-breakdown ← by category
GET    /api/v1/analytics/business/top-items   ← best selling items
GET    /api/v1/analytics/business/repair-stats ← jobs per device, profit per type
GET    /api/v1/analytics/personal/summary     ← personal income/expense for period
GET    /api/v1/analytics/personal/spending-trend ← daily expenses for chart
GET    /api/v1/analytics/comparison           ← this period vs previous period
```

### REPORTS
```
GET    /api/v1/reports/profit-loss            ← ?format=json|pdf
GET    /api/v1/reports/inventory              ← ?format=json|pdf
GET    /api/v1/reports/repairs                ← ?format=json|pdf
GET    /api/v1/reports/personal               ← ?format=json|pdf
```

---

## PYDANTIC SCHEMAS (KEY EXAMPLES)

```python
# schemas/repair.py

from pydantic import BaseModel, UUID4
from typing import Optional, List
from datetime import datetime
from models.repair import RepairStatus, DeviceType
from decimal import Decimal

class JobPartCreate(BaseModel):
    item_id: UUID4
    quantity: int
    unit_cost: Decimal
    damaged: bool = False

class JobPartOut(JobPartCreate):
    id: UUID4
    created_at: datetime
    item_name: str  # from join

class RepairJobCreate(BaseModel):
    customer_name: str
    customer_phone: Optional[str]
    device_type: DeviceType
    device_model: Optional[str]
    fault_description: Optional[str]
    labor_charge: Decimal = Decimal("0")
    total_charge: Decimal = Decimal("0")
    notes: Optional[str]

class RepairJobUpdate(BaseModel):
    customer_name: Optional[str]
    customer_phone: Optional[str]
    device_model: Optional[str]
    fault_description: Optional[str]
    labor_charge: Optional[Decimal]
    total_charge: Optional[Decimal]
    notes: Optional[str]

class RepairStatusUpdate(BaseModel):
    status: RepairStatus

class RepairJobOut(BaseModel):
    id: UUID4
    job_number: int
    customer_name: str
    customer_phone: Optional[str]
    device_type: DeviceType
    device_model: Optional[str]
    fault_description: Optional[str]
    labor_charge: Decimal
    total_charge: Decimal
    status: RepairStatus
    received_at: datetime
    delivered_at: Optional[datetime]
    parts: List[JobPartOut] = []
    created_at: datetime

    class Config:
        from_attributes = True

class RepairProfitOut(BaseModel):
    revenue: Decimal
    parts_cost: Decimal
    labor_charge: Decimal
    total_expenses: Decimal
    profit: Decimal
    tithe_due: Decimal
    is_profitable: bool
```

```python
# schemas/analytics.py

class BusinessSummary(BaseModel):
    period_start: date
    period_end: date
    total_revenue: Decimal
    total_expenses: Decimal
    gross_profit: Decimal
    tithe_due: Decimal
    tithe_paid: Decimal
    available_balance: Decimal
    repair_count: int
    sale_count: int
    inventory_value: Decimal

class RevenueTrendPoint(BaseModel):
    date: date
    revenue: Decimal
    expenses: Decimal
    profit: Decimal

class ExpenseBreakdown(BaseModel):
    category: str
    total: Decimal
    percentage: float
    count: int
```

---

## SERVICE LAYER (COMPLETE IMPLEMENTATIONS)

### services/repair_service.py

```python
from decimal import Decimal
from uuid import UUID, uuid4
from datetime import datetime
from sqlalchemy.orm import Session
from models.repair import RepairJob, JobPart, RepairStatus
from models.inventory import Item, StockMovement, MovementType
from models.expense import Expense, ExpenseCategory
from services.tithe_service import create_business_tithe
from fastapi import HTTPException

def add_part_to_job(db: Session, job_id: UUID, item_id: UUID, quantity: int,
                     unit_cost: Decimal, damaged: bool) -> JobPart:
    job = db.query(RepairJob).filter_by(id=job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    if job.status in [RepairStatus.completed, RepairStatus.delivered]:
        raise HTTPException(400, "Cannot modify parts on a completed or delivered job")

    item = db.query(Item).filter_by(id=item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
    if item.quantity_in_stock < quantity:
        raise HTTPException(400, f"Insufficient stock. Available: {item.quantity_in_stock}")

    # Deduct from stock
    item.quantity_in_stock -= quantity

    movement_type = MovementType.damage if damaged else MovementType.repair_use
    movement = StockMovement(
        item_id=item_id,
        movement_type=movement_type,
        quantity=-quantity,
        unit_cost=unit_cost,
        reference_id=job_id,
        note=f"{'Damaged in' if damaged else 'Used in'} job #{job.job_number}"
    )
    db.add(movement)

    if damaged:
        loss_amount = unit_cost * quantity
        damage_expense = Expense(
            category=ExpenseCategory.damage_loss,
            amount=loss_amount,
            description=f"Damaged: {item.name} ×{quantity} in Job #{job.job_number}",
            reference_id=job_id
        )
        db.add(damage_expense)

    part = JobPart(
        job_id=job_id,
        item_id=item_id,
        quantity=quantity,
        unit_cost=unit_cost,
        damaged=damaged
    )
    db.add(part)
    db.commit()
    db.refresh(part)
    return part


def remove_part_from_job(db: Session, job_id: UUID, part_id: UUID) -> None:
    job = db.query(RepairJob).filter_by(id=job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    if job.status in [RepairStatus.completed, RepairStatus.delivered]:
        raise HTTPException(400, "Cannot modify parts on a completed or delivered job")

    part = db.query(JobPart).filter_by(id=part_id, job_id=job_id).first()
    if not part:
        raise HTTPException(404, "Part not found")

    # Reverse stock deduction
    item = db.query(Item).filter_by(id=part.item_id).first()
    if item:
        item.quantity_in_stock += part.quantity
        reversal = StockMovement(
            item_id=part.item_id,
            movement_type=MovementType.adjustment,
            quantity=part.quantity,
            unit_cost=part.unit_cost,
            reference_id=job_id,
            note=f"Part removed from job #{job.job_number}"
        )
        db.add(reversal)

    db.delete(part)
    db.commit()


def update_job_status(db: Session, job_id: UUID, new_status: RepairStatus) -> RepairJob:
    job = db.query(RepairJob).filter_by(id=job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")

    status_order = [
        RepairStatus.received,
        RepairStatus.diagnosed,
        RepairStatus.in_progress,
        RepairStatus.completed,
        RepairStatus.delivered
    ]

    current_idx = status_order.index(job.status)
    new_idx = status_order.index(new_status)

    if new_idx < current_idx:
        raise HTTPException(400, f"Cannot move job from {job.status} back to {new_status}")

    if new_status == RepairStatus.completed:
        # Calculate and record tithe
        profit = compute_job_profit(job)
        if profit.profit > 0:
            create_business_tithe(db, profit.profit, reference_id=job.id)

    if new_status == RepairStatus.delivered:
        job.delivered_at = datetime.utcnow()

    job.status = new_status
    db.commit()
    db.refresh(job)
    return job


def compute_job_profit(job: RepairJob):
    from schemas.repair import RepairProfitOut
    parts_cost = sum(p.unit_cost * p.quantity for p in job.parts if not p.damaged)
    # Damaged parts are already recorded as expenses separately
    damaged_cost = sum(p.unit_cost * p.quantity for p in job.parts if p.damaged)
    total_expenses = parts_cost + job.labor_charge + damaged_cost
    profit = job.total_charge - total_expenses
    tithe = profit * Decimal("0.10") if profit > 0 else Decimal("0")
    return RepairProfitOut(
        revenue=job.total_charge,
        parts_cost=parts_cost + damaged_cost,
        labor_charge=job.labor_charge,
        total_expenses=total_expenses,
        profit=profit,
        tithe_due=tithe,
        is_profitable=profit > 0
    )
```

### services/tithe_service.py

```python
from decimal import Decimal
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session
from models.tithe import TitheRecord, TitheScope
from models.expense import Expense, ExpenseCategory
from fastapi import HTTPException

def create_business_tithe(db: Session, profit: Decimal, reference_id: UUID = None) -> TitheRecord:
    tithe_amount = profit * Decimal("0.10")
    record = TitheRecord(
        scope=TitheScope.business,
        calculated_from=profit,
        tithe_amount=tithe_amount,
        paid=False,
        reference_id=reference_id
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def create_personal_tithe(db: Session, income: Decimal) -> TitheRecord:
    tithe_amount = income * Decimal("0.10")
    record = TitheRecord(
        scope=TitheScope.personal,
        calculated_from=income,
        tithe_amount=tithe_amount,
        paid=False
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def pay_tithe(db: Session, tithe_id: UUID) -> TitheRecord:
    record = db.query(TitheRecord).filter_by(id=tithe_id).first()
    if not record:
        raise HTTPException(404, "Tithe record not found")
    if record.paid:
        raise HTTPException(400, "Tithe already paid")

    expense = Expense(
        category=ExpenseCategory.tithe,
        amount=record.tithe_amount,
        description=f"{record.scope.value.capitalize()} tithe payment",
        reference_id=record.id
    )
    db.add(expense)
    db.flush()  # get expense.id

    record.paid = True
    record.paid_at = datetime.utcnow()
    record.expense_id = expense.id

    db.commit()
    db.refresh(record)
    return record


def get_unpaid_total(db: Session, scope: TitheScope) -> Decimal:
    from sqlalchemy import func
    result = db.query(func.sum(TitheRecord.tithe_amount)).filter_by(
        scope=scope, paid=False
    ).scalar()
    return result or Decimal("0")
```

### services/inventory_service.py

```python
from decimal import Decimal
from uuid import UUID
from sqlalchemy.orm import Session
from models.inventory import Item, StockMovement, MovementType
from models.expense import Expense, ExpenseCategory
from fastapi import HTTPException

def restock_item(db: Session, item_id: UUID, quantity: int, unit_cost: Decimal) -> Item:
    item = db.query(Item).filter_by(id=item_id, is_active=True).first()
    if not item:
        raise HTTPException(404, "Item not found")

    item.quantity_in_stock += quantity

    movement = StockMovement(
        item_id=item_id,
        movement_type=MovementType.purchase,
        quantity=quantity,
        unit_cost=unit_cost,
        note=f"Restocked: {quantity} units at ₦{unit_cost} each"
    )
    db.add(movement)

    expense = Expense(
        category=ExpenseCategory.inventory,
        amount=unit_cost * quantity,
        description=f"Purchased {quantity}× {item.name} at ₦{unit_cost}/unit"
    )
    db.add(expense)

    db.commit()
    db.refresh(item)
    return item


def get_low_stock(db: Session):
    return db.query(Item).filter(
        Item.is_active == True,
        Item.quantity_in_stock <= Item.reorder_level
    ).all()


def search_items(db: Session, query: str):
    return db.query(Item).filter(
        Item.is_active == True,
        Item.name.ilike(f"%{query}%")
    ).limit(10).all()
```

---

## ROLE-BASED ACCESS CONTROL

```python
# core/dependencies.py

from functools import wraps
from fastapi import Depends, HTTPException, status
from models.user import UserRole

def role_required(*allowed_roles: UserRole):
    def decorator(current_user = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' not authorized"
            )
        return current_user
    return Depends(decorator)

# Usage in router:
# @router.post("/", dependencies=[role_required(UserRole.owner, UserRole.accountant)])
```

Role permissions matrix:
```
Endpoint type          | super_admin | owner | accountant | technician | staff | viewer
-----------------------|-------------|-------|------------|------------|-------|-------
View all data          | ✓           | ✓     | ✓          | partial    | partial| ✓
Create repair job      | ✓           | ✓     | ✓          | ✓          | ✓     | ✗
Update repair status   | ✓           | ✓     | ✓          | ✓          | ✓     | ✗
Add parts to job       | ✓           | ✓     | ✓          | ✓          | ✗     | ✗
Create inventory item  | ✓           | ✓     | ✓          | ✗          | ✗     | ✗
Record sale            | ✓           | ✓     | ✓          | ✗          | ✓     | ✗
Create expense         | ✓           | ✓     | ✓          | ✗          | ✗     | ✗
Pay tithe              | ✓           | ✓     | ✗          | ✗          | ✗     | ✗
Manage investments     | ✓           | ✓     | ✗          | ✗          | ✗     | ✗
User management        | ✓           | ✓     | ✗          | ✗          | ✗     | ✗
Delete records         | ✓           | ✓     | ✗          | ✗          | ✗     | ✗
```

---

## MAIN.PY

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import (
    auth, inventory, repairs, sales, expenses,
    investments, tithe, market_list, personal,
    food_vendor, analytics, reports
)
from core.database import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="BizOS API",
    description="Dash & Co. Business + Personal Finance Operating System",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api/v1"

app.include_router(auth.router,         prefix=f"{API_PREFIX}/auth",         tags=["Auth"])
app.include_router(inventory.router,    prefix=f"{API_PREFIX}/inventory",     tags=["Inventory"])
app.include_router(repairs.router,      prefix=f"{API_PREFIX}/repairs",       tags=["Repairs"])
app.include_router(sales.router,        prefix=f"{API_PREFIX}/sales",         tags=["Sales"])
app.include_router(expenses.router,     prefix=f"{API_PREFIX}/expenses",      tags=["Expenses"])
app.include_router(investments.router,  prefix=f"{API_PREFIX}/investments",   tags=["Investments"])
app.include_router(tithe.router,        prefix=f"{API_PREFIX}/tithe",         tags=["Tithe"])
app.include_router(market_list.router,  prefix=f"{API_PREFIX}/market-list",   tags=["Market List"])
app.include_router(personal.router,     prefix=f"{API_PREFIX}/personal",      tags=["Personal"])
app.include_router(food_vendor.router,  prefix=f"{API_PREFIX}/food-vendor",   tags=["Food Vendor"])
app.include_router(analytics.router,    prefix=f"{API_PREFIX}/analytics",     tags=["Analytics"])
app.include_router(reports.router,      prefix=f"{API_PREFIX}/reports",       tags=["Reports"])

@app.get("/health")
def health(): return {"status": "ok", "service": "BizOS API"}
```

---

## TESTING REQUIREMENTS

Write pytest tests for:

1. `test_repairs.py` — full job lifecycle: create → add parts → mark damaged → complete → verify profit + tithe created
2. `test_inventory.py` — restock creates movement + expense; low stock query; search
3. `test_tithe.py` — pay tithe creates expense, sets paid=True, sets expense_id
4. `test_personal.py` — food vendor batch payment creates payment record + personal transaction

Each test must use a fresh in-memory SQLite DB (via conftest.py).

---

## WHAT NOT TO BUILD

- Do NOT build a frontend
- Do NOT build WebSocket/real-time features
- Do NOT build email sending
- Do NOT build PDF generation (leave reports endpoint returning JSON only)
- Do NOT add any features not listed in this document
- Do NOT use async SQLAlchemy (use sync for simplicity)

---

## BUILD ORDER FOR THIS SESSION

1. `requirements.txt`
2. `.env.example`
3. `core/config.py`, `core/database.py`, `core/security.py`, `core/dependencies.py`
4. All `models/` files
5. `alembic.ini` + `alembic/env.py`
6. All `schemas/` files
7. All `services/` files (with full logic)
8. All `routers/` files (wiring services to endpoints)
9. `main.py`
10. `tests/conftest.py` + all test files

Do not skip steps. Do not combine steps. Build in this exact order.
