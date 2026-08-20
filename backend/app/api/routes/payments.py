from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db import get_db
from app.models import Client, Payment, UserRole
from app.schemas import PaymentCreate, PaymentRead


router = APIRouter(dependencies=[Depends(require_roles(UserRole.ADMIN))])


@router.get("", response_model=list[PaymentRead])
def list_payments(db: Session = Depends(get_db)) -> list[Payment]:
    return list(db.scalars(select(Payment).order_by(Payment.created_at.desc())))


@router.post("", response_model=PaymentRead, status_code=status.HTTP_201_CREATED)
def create_payment(payload: PaymentCreate, db: Session = Depends(get_db)) -> Payment:
    if db.get(Client, payload.client_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    payment = Payment(**payload.model_dump())
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment
