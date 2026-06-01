"""fix personal tithe records misplaced in expenses table

Revision ID: c7e4b1a2d3f5
Revises: f3c9d2e1a4b8
Create Date: 2026-06-01 00:00:00.000000

Personal tithe payments were incorrectly creating Expense rows, which contaminated
the business available_balance. This migration:
  1. Creates a PersonalTransaction(type=expense, category=tithe) for each affected row.
  2. Clears tithe_records.expense_id for those records.
  3. Deletes the bad Expense rows.
"""
from typing import Sequence, Union

import uuid
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision: str = 'c7e4b1a2d3f5'
down_revision: Union[str, None] = 'f3c9d2e1a4b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Find all Expense rows tied to a personal tithe record
    bad_expenses = conn.execute(sa.text("""
        SELECT e.id        AS expense_id,
               e.amount,
               e.description,
               e.expense_date,
               tr.id       AS tithe_id
        FROM   expenses e
        JOIN   tithe_records tr ON tr.id = e.reference_id
        WHERE  e.category = 'tithe'
          AND  tr.scope   = 'personal'
    """)).fetchall()

    for row in bad_expenses:
        # 1. Create the correct PersonalTransaction
        conn.execute(sa.text("""
            INSERT INTO personal_transactions
                (id, type, category, amount, description, transaction_date, created_at)
            VALUES
                (:id, 'expense', 'tithe', :amount, :description, :tx_date, now())
        """), {
            "id":          str(uuid.uuid4()),
            "amount":      row.amount,
            "description": row.description or "Personal tithe payment",
            "tx_date":     row.expense_date,
        })

        # 2. Clear the expense_id foreign key on the tithe record
        conn.execute(sa.text("""
            UPDATE tithe_records SET expense_id = NULL WHERE id = :tithe_id
        """), {"tithe_id": str(row.tithe_id)})

        # 3. Delete the misplaced Expense row
        conn.execute(sa.text("""
            DELETE FROM expenses WHERE id = :expense_id
        """), {"expense_id": str(row.expense_id)})


def downgrade() -> None:
    # No safe rollback — the original bad data is not recoverable without a backup.
    pass
