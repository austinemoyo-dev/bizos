"""add completed_at to repair_jobs

Revision ID: a1f3c2e8b9d5
Revises: 93be37e52cfc
Create Date: 2026-05-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1f3c2e8b9d5'
down_revision: Union[str, None] = '93be37e52cfc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'repair_jobs',
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('repair_jobs', 'completed_at')
