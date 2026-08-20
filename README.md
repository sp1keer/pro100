# pro100_repik

Production-oriented веб-приложение для управления репетиторами, учениками, расписанием, оплатами и зарплатами.

## Стек

- Backend: FastAPI, SQLAlchemy 2, Alembic, JWT access/refresh, bcrypt
- Frontend: React, Vite, TypeScript, SPA
- Database: PostgreSQL
- Infra: Docker Compose, Nginx reverse proxy

## Запуск

```bash
docker-compose up --build

или

docker compose up -d
```

После запуска приложение доступно на `http://localhost`.

Данные первого администратора создаются автоматически:

```text
login: admin
password: admin12345
```

Для production замените `JWT_SECRET_KEY`, `JWT_REFRESH_SECRET_KEY`, пароль PostgreSQL и пароль первого администратора в `docker-compose.yml` или через переменные окружения.

## API

Nginx проксирует backend через `/api`.

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/users`, `POST /api/users`
- `GET /api/tutors`, `POST /api/tutors`, `PUT /api/tutors/{id}`
- `GET /api/clients`, `POST /api/clients`, `PUT /api/clients/{id}`
- `GET /api/lessons`, `POST /api/lessons`, `PUT /api/lessons/{id}`
- `GET /api/payments`, `POST /api/payments`
- `GET /api/reports/salary`
- `GET /api/reports/lessons`

## Роли

- `ADMIN`: полный доступ, создание пользователей, управление педагогами, клиентами, уроками и отчетами.
- `TUTOR`: видит своих клиентов и занятия, может менять статусы своих занятий и профиль педагога.
- `PARENT`: видит только клиентов и занятия, где он указан родителем.

## Локальная разработка

Backend:

```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
python -m app.initial_data
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Vite dev server проксирует `/api` на `http://localhost:8000`.

## Структура

```text
backend/
  app/
    api/routes/      REST API
    core/            config, security
    models.py        SQLAlchemy models
    schemas.py       Pydantic schemas
  alembic/           migrations
frontend/
  src/
    App.tsx          SPA pages and components
    api.ts           REST client with refresh tokens
    types.ts         shared frontend types
nginx/
  default.conf       SPA + reverse proxy
docker-compose.yml
```
