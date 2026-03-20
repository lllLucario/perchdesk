# PerchDesk

Multi-scenario seat reservation platform — supports library/study rooms (hourly, auto-release) and shared office hot-desks (half-day/full-day, advance booking).

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS, Zustand, TanStack Query |
| Backend | FastAPI (Python 3.11), SQLAlchemy 2.0 (async), Alembic, APScheduler |
| Database | PostgreSQL 15 |
| Cache / MQ | Redis (Phase 3+ only) |
| Testing | Pytest + httpx (backend), Jest + React Testing Library (frontend) |
| CI/CD | GitHub Actions → Docker → AWS (Phase 4) |

## Local Setup

**Prerequisites:** Docker + Docker Compose, Node.js 20+, Python 3.11+

1. Clone and configure environment:
   ```bash
   cp .env.example .env
   # Edit .env: set JWT_SECRET_KEY to any random string
   ```

2. Start full stack:
   ```bash
   docker compose up -d --build
   ```

3. Apply migrations and seed data:
   ```bash
   docker compose exec backend python -m alembic upgrade head
   docker compose exec backend python -c "import asyncio; from app.core.seed import main; asyncio.run(main())"
   ```

4. Open the app: `http://localhost:3000`

## Run Commands

| Action | Command |
|--------|---------|
| Start full stack | `docker compose up -d` |
| Stop | `docker compose down` |
| Backend dev server | `cd backend && uvicorn app.main:app --reload` |
| Frontend dev server | `cd frontend && npm run dev` |
| Apply DB migration | `cd backend && alembic upgrade head` |
| Create migration | `cd backend && alembic revision --autogenerate -m "description"` |

## Test Commands

| Action | Command |
|--------|---------|
| Backend tests | `cd backend && python3.11 -m pytest` |
| Backend tests + coverage | `cd backend && python3.11 -m pytest --cov=app --cov-report=term-missing` |
| Frontend tests | `cd frontend && npm test` |
| Frontend test coverage | `cd frontend && npm run test:coverage` |
| Backend lint | `cd backend && ruff check .` |
| Frontend lint | `cd frontend && npm run lint` |
| Frontend typecheck | `cd frontend && npm run typecheck` |

## API

- Base URL: `http://localhost:8000/api/v1/`
- Interactive docs (Swagger): `http://localhost:8000/docs`
- Auth: JWT Bearer token in `Authorization` header

Key endpoints:
- `POST /auth/register` — create account
- `POST /auth/login` — get JWT tokens
- `GET /spaces` — list spaces
- `GET /spaces/:id` — space detail with embedded seats
- `GET /spaces/:id/availability?start=&end=` — seat availability (`booking_status: available|booked|my_booking`)
- `POST /bookings` — create booking
- `PATCH /bookings/:id/cancel` — cancel booking
- `PATCH /bookings/:id/check-in` — check in

## Implemented Scope

- **Phase 1** ✅ — Auth, Spaces/Seats CRUD, core booking flow, frontend pages
- **Phase 2** ✅ — Scenario rule enforcement (auto-release scheduler, time-unit alignment, cancellation deadlines, booking limits)
- **Phase 3** ✅ — Visual SVG seat map (admin editor + user view), floor plan background image upload
- **Phase 4** — Admin analytics dashboard, WebSocket real-time, Docker/AWS deployment *(not started)*
