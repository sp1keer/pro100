import enum
from datetime import date, datetime, time
from decimal import Decimal

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, Time, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    TUTOR = "TUTOR"
    PARENT = "PARENT"


class LessonType(str, enum.Enum):
    GROUP = "GROUP"
    INDIVIDUAL = "INDIVIDUAL"
    TRIAL = "TRIAL"


class LessonStatus(str, enum.Enum):
    PLANNED = "PLANNED"
    DONE = "DONE"
    CANCELLED = "CANCELLED"


class PaymentStatus(str, enum.Enum):
    PAID = "PAID"
    UNPAID = "UNPAID"
    PARTIAL = "PARTIAL"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    login: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role"), index=True)
    full_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    telegram: Mapped[str | None] = mapped_column(String(64), nullable=True)
    whatsapp: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    tutor: Mapped["Tutor | None"] = relationship(back_populates="user")
    children: Mapped[list["Client"]] = relationship(back_populates="parent")


class Tutor(Base):
    __tablename__ = "tutors"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), unique=True)
    name: Mapped[str] = mapped_column(String(160), index=True)
    gender: Mapped[str | None] = mapped_column(String(32))
    phone: Mapped[str | None] = mapped_column(String(64))
    telegram: Mapped[str | None] = mapped_column(String(64))
    whatsapp: Mapped[str | None] = mapped_column(String(64))
    rate_per_hour: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)

    user: Mapped[User | None] = relationship(back_populates="tutor")
    lessons: Mapped[list["Lesson"]] = relationship(back_populates="tutor")
    work_logs: Mapped[list["TutorWorkLog"]] = relationship(back_populates="tutor")


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160), index=True)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    tutor_id: Mapped[int | None] = mapped_column(ForeignKey("tutors.id", ondelete="SET NULL"), index=True)
    phone: Mapped[str | None] = mapped_column(String(64))
    telegram: Mapped[str | None] = mapped_column(String(64), nullable=True)
    whatsapp: Mapped[str | None] = mapped_column(String(64), nullable=True)
    subject: Mapped[str | None] = mapped_column(String(120), index=True)

    parent: Mapped[User | None] = relationship(back_populates="children")
    tutor: Mapped[Tutor | None] = relationship()
    lessons: Mapped[list["Lesson"]] = relationship(back_populates="client")
    payments: Mapped[list["Payment"]] = relationship(back_populates="client")


class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[int] = mapped_column(primary_key=True)
    type: Mapped[LessonType] = mapped_column(Enum(LessonType, name="lesson_type"), index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    start_time: Mapped[time] = mapped_column(Time)
    duration_minutes: Mapped[int] = mapped_column(Integer)
    classroom: Mapped[str | None] = mapped_column(String(80))
    subject: Mapped[str] = mapped_column(String(120), index=True)
    topic: Mapped[str | None] = mapped_column(String(255))
    tutor_id: Mapped[int] = mapped_column(ForeignKey("tutors.id", ondelete="RESTRICT"), index=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id", ondelete="RESTRICT"), index=True)
    status: Mapped[LessonStatus] = mapped_column(Enum(LessonStatus, name="lesson_status"), default=LessonStatus.PLANNED)
    payment_status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus, name="payment_status"), default=PaymentStatus.UNPAID)

    tutor: Mapped[Tutor] = relationship(back_populates="lessons")
    client: Mapped[Client] = relationship(back_populates="lessons")
    work_log: Mapped["TutorWorkLog | None"] = relationship(back_populates="lesson", cascade="all, delete-orphan")


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus, name="payment_status"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    client: Mapped[Client] = relationship(back_populates="payments")


class TutorWorkLog(Base):
    __tablename__ = "tutor_work_logs"
    __table_args__ = (UniqueConstraint("lesson_id", name="uq_tutor_work_logs_lesson_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    tutor_id: Mapped[int] = mapped_column(ForeignKey("tutors.id", ondelete="CASCADE"), index=True)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id", ondelete="CASCADE"), index=True)
    minutes: Mapped[int] = mapped_column(Integer)

    tutor: Mapped[Tutor] = relationship(back_populates="work_logs")
    lesson: Mapped[Lesson] = relationship(back_populates="work_log")
