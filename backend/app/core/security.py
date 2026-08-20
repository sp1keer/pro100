from datetime import UTC, datetime, timedelta
from typing import Any, Literal

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
TokenKind = Literal["access", "refresh"]


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_token(subject: str, role: str, kind: TokenKind) -> str:
    settings = get_settings()
    if kind == "access":
        expires = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
        secret = settings.jwt_secret_key
    else:
        expires = datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days)
        secret = settings.jwt_refresh_secret_key
    payload = {"sub": subject, "role": role, "type": kind, "exp": expires}
    return jwt.encode(payload, secret, algorithm="HS256")


def decode_token(token: str, kind: TokenKind) -> dict[str, Any]:
    settings = get_settings()
    secret = settings.jwt_secret_key if kind == "access" else settings.jwt_refresh_secret_key
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
    except JWTError as exc:
        raise ValueError("Invalid token") from exc
    if payload.get("type") != kind:
        raise ValueError("Invalid token type")
    return payload
