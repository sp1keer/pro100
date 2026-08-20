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

Данные первого Супер Администратора (SUPER_ADMIN) создаются автоматически при первом запуске:

```text
login: admin
password: admin12345
```

Для production замените `JWT_SECRET_KEY`, `JWT_REFRESH_SECRET_KEY`, пароль PostgreSQL и пароль первого администратора в `docker-compose.yml` или через переменные окружения.

## Иерархия ролей и доступов

- **`SUPER_ADMIN` (Супер Администратор)**:
  - В системе существует строго в **единственном экземпляре** (создается при инициализации).
  - Полный доступ ко всем функциям и данным системы.
  - Эксклюзивный доступ к странице **«Администраторы»**: создание администраторов (`ADMIN`), изменение их логинов, выдача и сброс паролей, удаление администраторов.
- **`ADMIN` (Администратор)**:
  - Создает и управляет преподавателями (`TUTOR`) и родителями (`PARENT`).
  - Выдает логины и пароли преподавателям и родителям, а также может менять и сбрасывать их при необходимости.
  - Управляет расписанием занятий, карточками учеников, ставками педагогов и просматривает финансовые отчеты.
  - Не имеет прав создавать, просматривать или редактировать других администраторов или Супер Администратора.
- **`TUTOR` (Преподаватель)**:
  - Персональный личный кабинет, привязанный к профилю преподавателя.
  - Видит свои занятия, своих учеников, может отмечать проведение занятий и просматривать расчет отработанных часов и зарплаты.
- **`PARENT` (Родитель)**:
  - Персональный личный кабинет, привязанный к профилю родителя.
  - Видит только своих детей (учеников), их расписание, темы, статусы уроков и оплат.

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
