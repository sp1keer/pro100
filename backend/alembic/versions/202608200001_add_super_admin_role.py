"""add super admin role

Revision ID: 202608200001
Revises: 202607300001
Create Date: 2026-08-20
"""
from alembic import op


revision = "202608200001"
down_revision = "202607300001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN'")


def downgrade() -> None:
    pass
