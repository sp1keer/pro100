"""add contacts and fullname to users and clients

Revision ID: 202608200002
Revises: 202608200001
Create Date: 2026-08-20
"""
from alembic import op
import sqlalchemy as sa


revision = "202608200002"
down_revision = "202608200001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("full_name", sa.String(length=160), nullable=True))
    op.add_column("users", sa.Column("phone", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("telegram", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("whatsapp", sa.String(length=64), nullable=True))

    op.add_column("clients", sa.Column("telegram", sa.String(length=64), nullable=True))
    op.add_column("clients", sa.Column("whatsapp", sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column("clients", "whatsapp")
    op.drop_column("clients", "telegram")

    op.drop_column("users", "whatsapp")
    op.drop_column("users", "telegram")
    op.drop_column("users", "phone")
    op.drop_column("users", "full_name")
