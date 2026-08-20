from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import Select, or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db import get_db
from app.models import Client, Lesson, Tutor, User, UserRole
from app.schemas import ClientCreate, ClientRead, ClientUpdate


router = APIRouter()


def client_scope(stmt: Select[tuple[Client]], user: User, db: Session) -> Select[tuple[Client]]:
    if user.role == UserRole.ADMIN:
        return stmt
    if user.role == UserRole.PARENT:
        return stmt.where(Client.parent_id == user.id)
    tutor = db.scalar(select(Tutor).where(Tutor.user_id == user.id))
    if tutor:
        return stmt.where(or_(Client.tutor_id == tutor.id, Client.lessons.any(tutor_id=tutor.id)))
    return stmt.where(False)


@router.get("", response_model=list[ClientRead])
def list_clients(
    search: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Client]:
    stmt = select(Client).order_by(Client.name)
    if search:
        stmt = stmt.where(Client.name.ilike(f"%{search}%"))
    return list(db.scalars(client_scope(stmt, user, db)))


@router.post("", response_model=ClientRead, status_code=status.HTTP_201_CREATED)
def create_client(
    payload: ClientCreate,
    _: User = Depends(require_roles(UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> Client:
    data = payload.model_dump()
    if data.get("parent_id") == 0:
        data["parent_id"] = None
    if data.get("tutor_id") == 0:
        data["tutor_id"] = None

    if data.get("parent_id") is not None and db.get(User, data["parent_id"]) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Родитель не найден")
    if data.get("tutor_id") is not None and db.get(Tutor, data["tutor_id"]) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Педагог не найден")

    client = Client(**data)
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@router.put("/{client_id}", response_model=ClientRead)
def update_client(
    client_id: int,
    payload: ClientUpdate,
    _: User = Depends(require_roles(UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> Client:
    client = db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Клиент не найден")
    data = payload.model_dump()
    if data.get("parent_id") == 0:
        data["parent_id"] = None
    if data.get("tutor_id") == 0:
        data["tutor_id"] = None

    if data.get("parent_id") is not None and db.get(User, data["parent_id"]) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Родитель не найден")
    if data.get("tutor_id") is not None and db.get(Tutor, data["tutor_id"]) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Педагог не найден")

    for key, value in data.items():
        setattr(client, key, value)
    db.commit()
    db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(
    client_id: int,
    _: User = Depends(require_roles(UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> None:
    client = db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Клиент не найден")
    if db.scalar(select(Lesson).where(Lesson.client_id == client_id)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя удалить клиента, у которого есть занятия. Сначала удалите занятия.",
        )
    db.delete(client)
    db.commit()

