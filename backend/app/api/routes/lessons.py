from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db import get_db
from app.models import Client, Lesson, LessonStatus, LessonType, PaymentStatus, Tutor, TutorWorkLog, User, UserRole
from app.schemas import LessonCreate, LessonRead, LessonUpdate


router = APIRouter()


def lesson_scope(stmt: Select[tuple[Lesson]], user: User, db: Session) -> Select[tuple[Lesson]]:
    if user.role in (UserRole.SUPER_ADMIN, UserRole.ADMIN):
        return stmt
    if user.role == UserRole.PARENT:
        return stmt.join(Client).where(Client.parent_id == user.id)
    tutor = db.scalar(select(Tutor).where(Tutor.user_id == user.id))
    if tutor:
        return stmt.where(Lesson.tutor_id == tutor.id)
    return stmt.where(False)


def sync_work_log(db: Session, lesson: Lesson) -> None:
    existing = lesson.work_log
    if lesson.status == LessonStatus.DONE:
        if existing:
            existing.tutor_id = lesson.tutor_id
            existing.minutes = lesson.duration_minutes
        else:
            db.add(TutorWorkLog(tutor_id=lesson.tutor_id, lesson_id=lesson.id, minutes=lesson.duration_minutes))
    elif existing:
        db.delete(existing)


@router.get("", response_model=list[LessonRead])
def list_lessons(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    tutor_id: int | None = Query(default=None),
    subject: str | None = Query(default=None),
    type: LessonType | None = Query(default=None),
    payment_status: PaymentStatus | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Lesson]:
    stmt = select(Lesson).order_by(Lesson.date, Lesson.start_time)
    if date_from:
        stmt = stmt.where(Lesson.date >= date_from)
    if date_to:
        stmt = stmt.where(Lesson.date <= date_to)
    if tutor_id:
        stmt = stmt.where(Lesson.tutor_id == tutor_id)
    if subject:
        stmt = stmt.where(Lesson.subject.ilike(f"%{subject}%"))
    if type:
        stmt = stmt.where(Lesson.type == type)
    if payment_status:
        stmt = stmt.where(Lesson.payment_status == payment_status)
    return list(db.scalars(lesson_scope(stmt, user, db)))


@router.post("", response_model=LessonRead, status_code=status.HTTP_201_CREATED)
def create_lesson(
    payload: LessonCreate,
    _: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> Lesson:
    if db.get(Tutor, payload.tutor_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tutor not found")
    if db.get(Client, payload.client_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    lesson = Lesson(**payload.model_dump())
    db.add(lesson)
    db.flush()
    sync_work_log(db, lesson)
    db.commit()
    db.refresh(lesson)
    return lesson


@router.put("/{lesson_id}", response_model=LessonRead)
def update_lesson(
    lesson_id: int,
    payload: LessonUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Lesson:
    lesson = db.get(Lesson, lesson_id)
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    if user.role == UserRole.PARENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if user.role == UserRole.TUTOR:
        tutor = db.scalar(select(Tutor).where(Tutor.user_id == user.id))
        if tutor is None or tutor.id != lesson.tutor_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        allowed = {"status", "payment_status"}
        for key, value in payload.model_dump().items():
            if key in allowed:
                setattr(lesson, key, value)
    else:
        if db.get(Tutor, payload.tutor_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tutor not found")
        if db.get(Client, payload.client_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
        for key, value in payload.model_dump().items():
            setattr(lesson, key, value)
    sync_work_log(db, lesson)
    db.commit()
    db.refresh(lesson)
    return lesson


@router.delete("/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lesson(
    lesson_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    lesson = db.get(Lesson, lesson_id)
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Занятие не найдено")
    if user.role == UserRole.PARENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if user.role == UserRole.TUTOR:
        tutor = db.scalar(select(Tutor).where(Tutor.user_id == user.id))
        if tutor is None or tutor.id != lesson.tutor_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    db.delete(lesson)
    db.commit()

