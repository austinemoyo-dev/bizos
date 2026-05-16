"""add deposit_resolution to repair_jobs

Revision ID: f3c9d2e1a4b8
Revises: a1f3c2e8b9d5
Create Date: 2026-05-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'f3c9d2e1a4b8'
down_revision: Union[str, None] = 'a1f3c2e8b9d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the enum type first
    deposit_resolution_enum = sa.Enum('refunded', 'kept', name='depositresolution')
    deposit_resolution_enum.create(op.get_bind(), checkfirst=True)

    op.add_column(
        'repair_jobs',
        sa.Column(
            'deposit_resolution',
            sa.Enum('refunded', 'kept', name='depositresolution'),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column('repair_jobs', 'deposit_resolution')
    sa.Enum(name='depositresolution').drop(op.get_bind(), checkfirst=True)
