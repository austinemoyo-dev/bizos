"""cancel_status_device_types_selling_price

Revision ID: 0ad47171f576
Revises: 
Create Date: 2026-05-11 15:09:24.734364

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0ad47171f576'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # New device types
    for val in ('tablet', 'laptop', 'computer', 'iron', 'washing_machine', 'tv'):
        op.execute(f"ALTER TYPE devicetype ADD VALUE IF NOT EXISTS '{val}'")

    # New repair status
    op.execute("ALTER TYPE repairstatus ADD VALUE IF NOT EXISTS 'cancelled'")

    op.add_column('job_parts', sa.Column('selling_price', sa.Numeric(precision=12, scale=2), nullable=True))
    op.add_column('repair_jobs', sa.Column('cancel_reason', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('repair_jobs', 'cancel_reason')
    op.drop_column('job_parts', 'selling_price')
    # Note: PostgreSQL does not support removing enum values; downgrade leaves them in place
