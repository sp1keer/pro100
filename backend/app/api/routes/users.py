from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.security import get_password_hash
from app.db import get_db
from app.models import User, UserRole
from app.schemas import UserCreate, UserRead, UserUpdate


router = APIRouter(dependencies=[Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN))])


@router.get("", response_model=list[UserRead])
def list_users(
    role: UserRole | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[User]:
    stmt = select(User).order_by(User.created_at.desc())

    if current_user.role == UserRole.ADMIN:
        # Regular admin only sees TUTOR and PARENT
        if role in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав для просмотра администраторов")
        if role:
            stmt = stmt.where(User.role == role)
        else:
            stmt = stmt.where(User.role.in_([UserRole.TUTOR, UserRole.PARENT]))
    else:
        # SUPER_ADMIN can filter by any role or see all
        if role:
            stmt = stmt.where(User.role == role)

    return list(db.scalars(stmt))


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    if payload.role == UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="В системе может быть только один Супер Администратор",
        )

    if current_user.role == UserRole.ADMIN and payload.role not in (UserRole.TUTOR, UserRole.PARENT):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Обычный администратор может создавать только преподавателей и родителей",
        )

    if db.scalar(select(User).where(User.login == payload.login)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Пользователь с таким логином уже существует")

    user = User(login=payload.login, role=payload.role, password_hash=get_password_hash(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")

    # Protection for SUPER_ADMIN
    if user.role == UserRole.SUPER_ADMIN:
        if current_user.id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Нельзя редактировать Супер Администратора")
        if payload.role != UserRole.SUPER_ADMIN:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Нельзя изменить роль Супер Администратора")

    if payload.role == UserRole.SUPER_ADMIN and user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя назначить роль Супер Администратора. В системе может быть только один Супер Администратор.",
        )

    # Protection for regular ADMIN
    if current_user.role == UserRole.ADMIN:
        if user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав для редактирования администратора")
        if payload.role not in (UserRole.TUTOR, UserRole.PARENT):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Администратор может назначать только роли преподавателя или родителя")

    existing = db.scalar(select(User).where(User.login == payload.login, User.id != user_id))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Логин уже занят другим пользователем")

    user.login = payload.login
    user.role = payload.role
    if payload.password and payload.password.strip():
        user.password_hash = get_password_hash(payload.password)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    if current_user.id == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Нельзя удалить собственного пользователя")

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")

    if user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Нельзя удалить Супер Администратора")

    if current_user.role == UserRole.ADMIN and user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав для удаления администратора")

    db.delete(user)
    db.commit()

