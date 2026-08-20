"""initial schema

Revision ID: 202607300001
Revises:
Create Date: 2026-07-30
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "202607300001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    user_role = postgresql.ENUM("ADMIN", "TUTOR", "PARENT", name="user_role", create_type=False)
    lesson_type = postgresql.ENUM("GROUP", "INDIVIDUAL", "TRIAL", name="lesson_type", create_type=False)
    lesson_status = postgresql.ENUM("PLANNED", "DONE", "CANCELLED", name="lesson_status", create_type=False)
    payment_status = postgresql.ENUM("PAID", "UNPAID", "PARTIAL", name="payment_status", create_type=False)
    user_role.create(op.get_bind(), checkfirst=True)
    lesson_type.create(op.get_bind(), checkfirst=True)
    lesson_status.create(op.get_bind(), checkfirst=True)
    payment_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("login", sa.String(length=64), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("login"),
    )
    op.create_index("ix_users_login", "users", ["login"])
    op.create_index("ix_users_role", "users", ["role"])

    op.create_table(
        "tutors",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("gender", sa.String(length=32), nullable=True),
        sa.Column("phone", sa.String(length=64), nullable=True),
        sa.Column("telegram", sa.String(length=64), nullable=True),
        sa.Column("whatsapp", sa.String(length=64), nullable=True),
        sa.Column("rate_per_hour", sa.Numeric(10, 2), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index("ix_tutors_name", "tutors", ["name"])

    op.create_table(
        "clients",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("parent_id", sa.Integer(), nullable=True),
        sa.Column("tutor_id", sa.Integer(), nullable=True),
        sa.Column("phone", sa.String(length=64), nullable=True),
        sa.Column("subject", sa.String(length=120), nullable=True),
        sa.ForeignKeyConstraint(["parent_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["tutor_id"], ["tutors.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_clients_name", "clients", ["name"])
    op.create_index("ix_clients_parent_id", "clients", ["parent_id"])
    op.create_index("ix_clients_subject", "clients", ["subject"])
    op.create_index("ix_clients_tutor_id", "clients", ["tutor_id"])

    op.create_table(
        "lessons",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("type", lesson_type, nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("classroom", sa.String(length=80), nullable=True),
        sa.Column("subject", sa.String(length=120), nullable=False),
        sa.Column("topic", sa.String(length=255), nullable=True),
        sa.Column("tutor_id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("status", lesson_status, nullable=False),
        sa.Column("payment_status", payment_status, nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["tutor_id"], ["tutors.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_lessons_client_id", "lessons", ["client_id"])
    op.create_index("ix_lessons_date", "lessons", ["date"])
    op.create_index("ix_lessons_payment_status", "lessons", ["payment_status"])
    op.create_index("ix_lessons_subject", "lessons", ["subject"])
    op.create_index("ix_lessons_tutor_id", "lessons", ["tutor_id"])
    op.create_index("ix_lessons_type", "lessons", ["type"])

    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("status", payment_status, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_payments_client_id", "payments", ["client_id"])

    op.create_table(
        "tutor_work_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tutor_id", sa.Integer(), nullable=False),
        sa.Column("lesson_id", sa.Integer(), nullable=False),
        sa.Column("minutes", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tutor_id"], ["tutors.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("lesson_id", name="uq_tutor_work_logs_lesson_id"),
    )
    op.create_index("ix_tutor_work_logs_lesson_id", "tutor_work_logs", ["lesson_id"])
    op.create_index("ix_tutor_work_logs_tutor_id", "tutor_work_logs", ["tutor_id"])


def downgrade() -> None:
    op.drop_index("ix_tutor_work_logs_tutor_id", table_name="tutor_work_logs")
    op.drop_index("ix_tutor_work_logs_lesson_id", table_name="tutor_work_logs")
    op.drop_table("tutor_work_logs")
    op.drop_index("ix_payments_client_id", table_name="payments")
    op.drop_table("payments")
    op.drop_index("ix_lessons_type", table_name="lessons")
    op.drop_index("ix_lessons_tutor_id", table_name="lessons")
    op.drop_index("ix_lessons_subject", table_name="lessons")
    op.drop_index("ix_lessons_payment_status", table_name="lessons")
    op.drop_index("ix_lessons_date", table_name="lessons")
    op.drop_index("ix_lessons_client_id", table_name="lessons")
    op.drop_table("lessons")
    op.drop_index("ix_clients_tutor_id", table_name="clients")
    op.drop_index("ix_clients_subject", table_name="clients")
    op.drop_index("ix_clients_parent_id", table_name="clients")
    op.drop_index("ix_clients_name", table_name="clients")
    op.drop_table("clients")
    op.drop_index("ix_tutors_name", table_name="tutors")
    op.drop_table("tutors")
    op.drop_index("ix_users_role", table_name="users")
    op.drop_index("ix_users_login", table_name="users")
    op.drop_table("users")
    sa.Enum(name="payment_status").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="lesson_status").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="lesson_type").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="user_role").drop(op.get_bind(), checkfirst=True)
