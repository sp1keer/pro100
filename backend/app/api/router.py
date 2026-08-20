from fastapi import APIRouter

from app.api.routes import auth, clients, lessons, payments, reports, tutors, users


api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(tutors.router, prefix="/tutors", tags=["tutors"])
api_router.include_router(clients.router, prefix="/clients", tags=["clients"])
api_router.include_router(lessons.router, prefix="/lessons", tags=["lessons"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
