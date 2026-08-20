from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, distinct, func, select
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db import get_db
from app.models import Client, Lesson, LessonStatus, LessonType, Tutor, TutorWorkLog, UserRole
from app.schemas import LessonsReport, SalaryReportItem


router = APIRouter(dependencies=[Depends(require_roles(UserRole.ADMIN))])


@router.get("/salary", response_model=list[SalaryReportItem])
def salary_report(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[SalaryReportItem]:
    stmt = (
        select(
            Tutor.id,
            Tutor.name,
            func.count(distinct(Lesson.id)),
            func.coalesce(func.sum(TutorWorkLog.minutes), 0),
            Tutor.rate_per_hour,
        )
        .join(Lesson, Lesson.tutor_id == Tutor.id)
        .join(TutorWorkLog, TutorWorkLog.lesson_id == Lesson.id, isouter=True)
        .where(Lesson.status == LessonStatus.DONE)
        .group_by(Tutor.id)
        .order_by(Tutor.name)
    )
    if date_from:
        stmt = stmt.where(Lesson.date >= date_from)
    if date_to:
        stmt = stmt.where(Lesson.date <= date_to)
    result: list[SalaryReportItem] = []
    for tutor_id, name, lessons_count, minutes, rate in db.execute(stmt):
        hours = Decimal(minutes) / Decimal(60)
        result.append(
            SalaryReportItem(
                tutor_id=tutor_id,
                tutor_name=name,
                lessons_count=lessons_count,
                minutes=minutes,
                hours=hours,
                salary=hours * rate,
            )
        )
    return result


@router.get("/lessons", response_model=LessonsReport)
def lessons_report(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    db: Session = Depends(get_db),
) -> LessonsReport:
    stmt = select(
        func.count(Lesson.id),
        func.coalesce(func.sum(case((Lesson.status == LessonStatus.PLANNED, 1), else_=0)), 0),
        func.coalesce(func.sum(case((Lesson.status == LessonStatus.DONE, 1), else_=0)), 0),
        func.coalesce(func.sum(case((Lesson.status == LessonStatus.CANCELLED, 1), else_=0)), 0),
        func.coalesce(func.sum(case((Lesson.type == LessonType.TRIAL, 1), else_=0)), 0),
    )
    if date_from:
        stmt = stmt.where(Lesson.date >= date_from)
    if date_to:
        stmt = stmt.where(Lesson.date <= date_to)
    total, planned, done, cancelled, trial_total = db.execute(stmt).one()
    converted_stmt = (
        select(func.count(distinct(Client.id)))
        .join(Lesson, Lesson.client_id == Client.id)
        .where(Lesson.type == LessonType.TRIAL)
        .where(
            Client.lessons.any(Lesson.type != LessonType.TRIAL),
        )
    )
    if date_from:
        converted_stmt = converted_stmt.where(Lesson.date >= date_from)
    if date_to:
        converted_stmt = converted_stmt.where(Lesson.date <= date_to)
    trial_converted = db.scalar(converted_stmt) or 0
    conversion = Decimal(0) if not trial_total else (Decimal(trial_converted) / Decimal(trial_total) * Decimal(100))
    return LessonsReport(
        total=total or 0,
        planned=planned or 0,
        done=done or 0,
        cancelled=cancelled or 0,
        trial_total=trial_total or 0,
        trial_converted=trial_converted,
        trial_conversion_percent=conversion,
    )
