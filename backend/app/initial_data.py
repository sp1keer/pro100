from sqlalchemy import select

from app.core.config import get_settings
from app.core.security import get_password_hash
from app.db import SessionLocal
from app.models import User, UserRole


def main() -> None:
    settings = get_settings()
    with SessionLocal() as db:
        # If any super admin already exists, do nothing
        super_admin = db.scalar(select(User).where(User.role == UserRole.SUPER_ADMIN))
        if super_admin:
            return

        # Check if first_admin_login user exists
        existing_user = db.scalar(select(User).where(User.login == settings.first_admin_login))
        if existing_user:
            existing_user.role = UserRole.SUPER_ADMIN
            db.commit()
            return

        db.add(
            User(
                login=settings.first_admin_login,
                password_hash=get_password_hash(settings.first_admin_password),
                role=UserRole.SUPER_ADMIN,
            )
        )
        db.commit()


if __name__ == "__main__":
    main()
