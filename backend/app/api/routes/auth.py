from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_token, decode_token, verify_password
from app.db import get_db
from app.models import User
from app.schemas import LoginRequest, RefreshRequest, TokenPair, UserRead


router = APIRouter()


def build_tokens(user: User) -> TokenPair:
    return TokenPair(
        access_token=create_token(str(user.id), user.role.value, "access"),
        refresh_token=create_token(str(user.id), user.role.value, "refresh"),
        user=UserRead.model_validate(user),
    )


@router.post("/login", response_model=TokenPair)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenPair:
    user = db.scalar(select(User).where(User.login == payload.login))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid login or password")
    return build_tokens(user)


@router.post("/refresh", response_model=TokenPair)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> TokenPair:
    try:
        token_payload = decode_token(payload.refresh_token, "refresh")
        user_id = int(token_payload["sub"])
    except (ValueError, KeyError, TypeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return build_tokens(user)
