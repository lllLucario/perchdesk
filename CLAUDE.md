# PerchDesk

Multi-scenario seat reservation platform supporting library/study rooms
and shared office hot-desks.

## Stack

### Frontend
- Next.js 14+ with TypeScript (App Router)
- Tailwind CSS
- Zustand (global state: auth, selected seat)
- TanStack Query (server state: API data fetching, caching, refetching)

### Backend
- FastAPI (Python 3.11+)
- SQLAlchemy 2.0 ORM (async sessions)
- Alembic (database migrations)
- APScheduler (background task: auto-release expired bookings, Phase 1&2)

### Database
- PostgreSQL 15+
- All timestamps stored as UTC, converted to Australia/Sydney on frontend display

### Cache / Message Queue
- Redis (Phase 3+ only — WebSocket pub/sub and optional query caching)

### Testing
- Backend: Pytest + httpx (FastAPI TestClient)
- Frontend: Jest + React Testing Library

### CI/CD & Deployment
- CI/CD: GitHub Actions (lint → test → build Docker image)
- Deployment: Docker Compose, target AWS (EC2 or ECS)

---

## Project Structure

```
/frontend          — Next.js app (TypeScript, App Router)
  /app             — Route segments (App Router)
  /components      — Reusable UI components
  /lib             — API clients (TanStack Query hooks)
  /store           — Zustand stores
/backend           — FastAPI app
  /app
    /api/v1        — Route handlers
    /models        — SQLAlchemy models
    /schemas       — Pydantic request/response schemas
    /services      — Business logic layer
    /core          — Config, security, dependencies
    /scheduler     — APScheduler jobs (auto-release task)
  /tests           — Pytest tests
  /alembic         — Database migrations
/docker            — Dockerfiles and compose config
/docs              — Architecture, API spec, task plans
/.github/workflows — CI/CD pipeline
```

---

## Commands

- Backend dev server: `cd backend && uvicorn app.main:app --reload`
- Backend tests: `cd backend && pytest`
- Backend test coverage: `cd backend && pytest --cov=app --cov-report=term-missing`
- Frontend dev server: `cd frontend && npm run dev`
- Frontend tests: `cd frontend && npm test`
- Run full stack: `docker compose up`
- DB migration create: `cd backend && alembic revision --autogenerate -m "description"`
- DB migration apply: `cd backend && alembic upgrade head`
- Lint backend: `cd backend && ruff check .`
- Lint frontend: `cd frontend && npm run lint`

---

## Verification

After every code change, verify by running the relevant command:
- Backend changes → `cd backend && pytest`
- Frontend changes → `cd frontend && npm test`
- API endpoint changes → also run `cd backend && pytest tests/api/`
- DB model changes → create and apply migration, then run full backend tests
- If all tests pass, proceed. If any fail, fix before moving on.

---

## API Conventions

- All endpoints prefixed with `/api/v1/`
- RESTful resource naming: plural nouns (e.g. `/api/v1/spaces`, `/api/v1/bookings`)
- Consistent JSON response format:
  ```json
  { "data": {}, "message": "success", "error": null }
  ```
- Authentication: JWT Bearer tokens in Authorization header
- Error responses include `error` field with error code and detail
- HTTP status codes: 200, 201, 400, 401, 403, 404, 409

---

## Error Handling Pattern

- Define custom exception classes in `backend/app/core/exceptions.py`
- Each exception maps to an HTTP status code (e.g. `BookingConflictError` → 409)
- Register a global exception handler in FastAPI that catches custom exceptions and returns the standard JSON response format
- Never raise raw `HTTPException` in service layer — only in route handlers as a last resort

---

## Database Models (5 core tables)

- `users` — id, email, name, hashed_password, role (admin | user), created_at
- `spaces` — id, name, type (library | office), layout_config (JSON), capacity
- `seats` — id, space_id (FK), label, position (JSON), status (available | maintenance), attributes (JSON)
- `bookings` — id, user_id (FK), seat_id (FK), start_time, end_time, status (confirmed | cancelled | checked_in | expired), checked_in_at
- `space_rules` — id, space_id (FK), max_duration_minutes, max_advance_days, time_unit (hourly | half_day | full_day), auto_release_minutes, requires_approval, recurring_rules (JSON)

Scenario-specific rule values and business logic details → see @docs/architecture.md

---

## Git Workflow

- Branch naming: `feat/description`, `fix/description`, `docs/description`
- Conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `chore:`
- Always create feature branch from main, submit PR for review
- Do not commit directly to main

---

## Code Style

- Python: follow PEP 8, use type hints on all function signatures
- TypeScript: strict mode enabled, no `any` types unless absolutely necessary
- All code, comments, commit messages, and PR descriptions in English
- Import ordering: stdlib → third-party → local (enforced by linter)
- Test coverage target: >= 80% on backend service layer
- Prefer async def for all FastAPI route handlers and service methods

---

## Development Phases

- **Phase 1:** Auth + Spaces/Seats CRUD + core booking flow (both scenarios)
- **Phase 2:** Scenario rules enforcement (auto-release scheduler, advance booking validation, check-in)
- **Phase 3:** Visual seat map, WebSocket real-time updates (Redis introduced here), notifications
- **Phase 4:** Admin dashboard analytics, audit logs, Docker + CI/CD + AWS deployment
