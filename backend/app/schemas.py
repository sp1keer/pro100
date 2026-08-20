from datetime import date, datetime, time
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models import LessonStatus, LessonType, PaymentStatus, UserRole


class UserBase(BaseModel):
    login: str = Field(min_length=3, max_length=64)
    role: UserRole
    full_name: str | None = None
    phone: str | None = None
    telegram: str | None = None
    whatsapp: str | None = None


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserUpdate(BaseModel):
    login: str = Field(min_length=3, max_length=64)
    role: UserRole
    password: str | None = Field(default=None, min_length=8, max_length=128)
    full_name: str | None = None
    phone: str | None = None
    telegram: str | None = None
    whatsapp: str | None = None


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime



class LoginRequest(BaseModel):
    login: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserRead


class TutorBase(BaseModel):
    user_id: int | None = None
    name: str = Field(min_length=1, max_length=160)
    gender: str | None = None
    phone: str | None = None
    telegram: str | None = None
    whatsapp: str | None = None
    rate_per_hour: Decimal = Decimal("0")


class TutorCreate(TutorBase):
    pass


class TutorUpdate(TutorBase):
    pass


class TutorRead(TutorBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class ClientBase(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    parent_id: int | None = None
    tutor_id: int | None = None
    phone: str | None = None
    telegram: str | None = None
    whatsapp: str | None = None
    subject: str | None = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(ClientBase):
    pass


class ClientRead(ClientBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class LessonBase(BaseModel):
    type: LessonType
    date: date
    start_time: time
    duration_minutes: int = Field(gt=0, le=480)
    classroom: str | None = None
    subject: str = Field(min_length=1, max_length=120)
    topic: str | None = None
    tutor_id: int = Field(gt=0)
    client_id: int = Field(gt=0)
    status: LessonStatus = LessonStatus.PLANNED
    payment_status: PaymentStatus = PaymentStatus.UNPAID


class LessonCreate(LessonBase):
    pass


class LessonUpdate(LessonBase):
    pass


class LessonRead(LessonBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class PaymentBase(BaseModel):
    client_id: int
    amount: Decimal
    status: PaymentStatus


class PaymentCreate(PaymentBase):
    pass


class PaymentRead(PaymentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class SalaryReportItem(BaseModel):
    tutor_id: int
    tutor_name: str
    lessons_count: int
    minutes: int
    hours: Decimal
    salary: Decimal


class LessonsReport(BaseModel):
    total: int
    planned: int
    done: int
    cancelled: int
    trial_total: int
    trial_converted: int
    trial_conversion_percent: Decimal
