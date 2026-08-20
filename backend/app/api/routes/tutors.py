from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db import get_db
from app.models import Lesson, LessonStatus, Tutor, TutorWorkLog, User, UserRole
from app.schemas import SalaryReportItem, TutorCreate, TutorRead, TutorUpdate


router = APIRouter()


def tutor_scope(stmt: Select[tuple[Tutor]], user: User) -> Select[tuple[Tutor]]:
    if user.role in (UserRole.ADMIN, UserRole.PARENT, UserRole.TUTOR):
        return stmt
    return stmt.where(False)


@router.get("", response_model=list[TutorRead])
def list_tutors(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[Tutor]:
    stmt = tutor_scope(select(Tutor).order_by(Tutor.name), user)
    return list(db.scalars(stmt))


@router.post("", response_model=TutorRead, status_code=status.HTTP_201_CREATED)
def create_tutor(
    payload: TutorCreate,
    _: User = Depends(require_roles(UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> Tutor:
    data = payload.model_dump()
    if data.get("user_id") == 0:
        data["user_id"] = None

    if data.get("user_id") is not None:
        if db.get(User, data["user_id"]) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
        existing = db.scalar(select(Tutor).where(Tutor.user_id == data["user_id"]))
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Этот пользователь уже привязан к другому педагогу")

    tutor = Tutor(**data)
    db.add(tutor)
    db.commit()
    db.refresh(tutor)
    return tutor


@router.put("/{tutor_id}", response_model=TutorRead)
def update_tutor(
    tutor_id: int,
    payload: TutorUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Tutor:
    tutor = db.get(Tutor, tutor_id)
    if tutor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Педагог не найден")
    if user.role != UserRole.ADMIN and not (user.role == UserRole.TUTOR and tutor.user_id == user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    data = payload.model_dump()
    if "user_id" in data:
        if data["user_id"] == 0:
            data["user_id"] = None
        if data["user_id"] is not None and data["user_id"] != tutor.user_id:
            if db.get(User, data["user_id"]) is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
            existing = db.scalar(select(Tutor).where(Tutor.user_id == data["user_id"], Tutor.id != tutor_id))
            if existing:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Этот пользователь уже привязан к другому педагогу")

    for key, value in data.items():
        if key == "user_id" and user.role != UserRole.ADMIN:
            continue
        setattr(tutor, key, value)
    db.commit()
    db.refresh(tutor)
    return tutor


@router.delete("/{tutor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tutor(
    tutor_id: int,
    _: User = Depends(require_roles(UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> None:
    tutor = db.get(Tutor, tutor_id)
    if tutor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Педагог не найден")
    if db.scalar(select(Lesson).where(Lesson.tutor_id == tutor_id)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя удалить педагога, у которого есть занятия. Сначала удалите или переназначьте занятия.",
        )
    db.delete(tutor)
    db.commit()



@router.get("/{tutor_id}/stats", response_model=SalaryReportItem)
def tutor_stats(
    tutor_id: int,
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SalaryReportItem:
    tutor = db.get(Tutor, tutor_id)
    if tutor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tutor not found")
    if user.role != UserRole.ADMIN and tutor.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    stmt = select(func.count(Lesson.id), func.coalesce(func.sum(TutorWorkLog.minutes), 0)).join(
        TutorWorkLog, TutorWorkLog.lesson_id == Lesson.id, isouter=True
    ).where(Lesson.tutor_id == tutor_id, Lesson.status == LessonStatus.DONE)
    if date_from:
        stmt = stmt.where(Lesson.date >= date_from)
    if date_to:
        stmt = stmt.where(Lesson.date <= date_to)
    lessons_count, minutes = db.execute(stmt).one()
    hours = Decimal(minutes) / Decimal(60)
    salary = hours * tutor.rate_per_hour
    return SalaryReportItem(
        tutor_id=tutor.id,
        tutor_name=tutor.name,
        lessons_count=lessons_count,
        minutes=minutes,
        hours=hours,
        salary=salary,
    )
