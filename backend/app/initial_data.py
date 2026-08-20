from sqlalchemy import select

from app.core.config import get_settings
from app.core.security import get_password_hash
from app.db import SessionLocal
from app.models import User, UserRole


def main() -> None:
    settings = get_settings()
    with SessionLocal() as db:
        exists = db.scalar(select(User).where(User.login == settings.first_admin_login))
        if exists:
            return
        db.add(
            User(
                login=settings.first_admin_login,
                password_hash=get_password_hash(settings.first_admin_password),
                role=UserRole.ADMIN,
            )
        )
        db.commit()


if __name__ == "__main__":
    main()
