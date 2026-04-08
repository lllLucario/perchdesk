# PerchDesk

PerchDesk is a multi-scenario seat reservation platform for library/study
spaces and shared office hot-desks.

The current product is no longer just a basic booking CRUD flow. It now
includes:

- building-first browsing
- a floorplan-based booking workspace
- personalized discovery on `Home` and `My Spaces`
- user booking management on `My Bookings`
- location-aware building and space discovery

## Current Product Shape

Primary booking flow:

`Home -> Buildings -> Spaces in Building -> Floorplan -> Confirm -> Result`

Important current product decisions:

- `building` is the main physical browse anchor
- `space` is the direct booking object
- both `library` and `office` currently use the same hourly slot interaction
- both default scenarios currently align to an `8 hour` daily-cap baseline
- scenario differences currently come mainly from:
  - `max_advance_days`
  - `auto_release_minutes`
  - cancellation rules
- location improves ranking and browsing, but never blocks booking

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind CSS v4, Zustand, TanStack Query, Leaflet |
| Backend | FastAPI, SQLAlchemy 2.0 async ORM, Alembic, APScheduler |
| Database | PostgreSQL 15 intended runtime, SQLite in tests |
| Testing | Pytest + httpx, Jest + React Testing Library |
| CI | GitHub Actions |
| Delivery status | Local Docker workflow implemented, cloud deployment not yet implemented |

## Implemented Scope

### Core flows

- auth: register, login, refresh, current-user endpoint
- buildings list and building detail APIs
- building-first browse flow
- spaces in building flow
- floorplan booking workspace
- booking confirm and result flow
- booking cancellation and check-in
- auto-expiry for unchecked bookings

### Discovery and personalization

- `Home` with `For You`
- `My Spaces`
- favorite spaces
- backend support for favorite seats
- recent space visits
- nearby buildings
- nearby spaces
- building map browse page

### User operations

- `My Bookings` page with active/history tabs
- booking detail modal with floorplan preview
- filter/sort controls

### Admin

- space management page
- seat CRUD on SVG canvas
- floor plan image upload/remove

## What Is Not Implemented Yet

- Redis
- WebSocket real-time updates
- notifications
- approval workflow for bookings
- recurring bookings
- production AWS deployment pipeline
- S3-backed floor plan uploads

## Local Setup

**Prerequisites:** Docker + Docker Compose, Node.js 20+, Python 3.11+

1. Clone and configure environment:

   ```bash
   cp .env.example .env
   # Edit .env and set JWT_SECRET_KEY
   ```

2. Start the stack:

   ```bash
   docker compose up -d --build
   ```

3. Apply migrations and seed data:

   ```bash
   docker compose exec backend python -m alembic upgrade head
   docker compose exec backend python -c "import asyncio; from app.core.seed import main; asyncio.run(main())"
   ```

4. Open the app:

   - frontend: `http://localhost:3000`
   - backend docs: `http://localhost:8000/docs`

## Run Commands

| Action | Command |
|---|---|
| Start full stack | `docker compose up -d` |
| Stop full stack | `docker compose down` |
| Backend dev server | `cd backend && uvicorn app.main:app --reload` |
| Frontend dev server | `cd frontend && npm run dev` |
| Apply DB migration | `cd backend && alembic upgrade head` |
| Create migration | `cd backend && alembic revision --autogenerate -m "description"` |

## Test And Quality Commands

| Action | Command |
|---|---|
| Backend tests | `cd backend && pytest` |
| Backend coverage | `cd backend && pytest --cov=app --cov-report=term-missing` |
| Backend lint | `cd backend && ruff check .` |
| Frontend tests | `cd frontend && npm test` |
| Frontend lint | `cd frontend && npm run lint` |
| Frontend typecheck | `cd frontend && npm run typecheck` |
| Docker build check | `docker compose build` |

## Verification Expectations

After making changes:

- backend changes: run `cd backend && pytest`
- frontend changes: run `cd frontend && npm test`
- API changes: also run `cd backend && pytest tests/api/`
- schema changes: create/apply migration, then run backend tests

Before merge, the preferred full check is:

1. backend lint + tests
2. frontend lint + typecheck + tests
3. Docker build check

## API

- Base URL: `http://localhost:8000/api/v1`
- Swagger docs: `http://localhost:8000/docs`
- Auth: JWT Bearer token

Important endpoint groups:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/me`
- `GET /buildings`
- `GET /buildings/nearby`
- `GET /buildings/within-bounds`
- `GET /buildings/{id}/spaces`
- `GET /spaces`
- `GET /spaces/nearby`
- `GET /spaces/{id}`
- `GET /spaces/{id}/availability`
- `GET /spaces/{id}/rules`
- `POST /bookings`
- `PATCH /bookings/{id}/cancel`
- `PATCH /bookings/{id}/check-in`
- `GET /me/favorite-spaces`
- `GET /me/recent-spaces`

## Data Model Notes

Current key tables:

- `users`
- `buildings`
- `spaces`
- `seats`
- `bookings`
- `space_rules`
- `favorite_spaces`
- `favorite_seats`
- `space_visits`

Important implementation notes:

- IDs are UUIDs
- `buildings` own physical coordinates
- `favorite_seats` exists in backend without an active frontend surface
- `space_visits` drives recency for personalized discovery
- `space_rules.requires_approval` exists in schema, but no approval workflow is implemented
- `space_rules.recurring_rules` exists as schema headroom, not an active feature

## Time Semantics

PerchDesk uses:

- UTC for persisted timestamps, ordering, overlap checks, and scheduler timing
- `Australia/Sydney` wall-clock semantics for booking rules

This matters for:

- hourly slot alignment
- office cancellation cutoff at local midnight
- daily cap calculations
- DST-safe booking validation

See [docs/time-semantics.md](docs/time-semantics.md).

## Current Development Status

- **Phase 1:** Auth, spaces/seats CRUD, core booking flow — complete
- **Phase 2:** rule enforcement, auto-release, check-in, cancellation rules — complete
- **Phase 3 (partial):** seat map editor/user view and floor plan uploads — complete; Redis/WebSocket real-time — not started
- **Cross-cutting delivered:** building-first browse, `My Spaces`, `My Bookings`, location-aware browse, favorites, recent visits
- **Still pending:** analytics, audit-style admin operations, production deployment hardening

## Documentation

Primary references:

- [CLAUDE.md](CLAUDE.md)
- [docs/architecture.md](docs/architecture.md)
- [docs/time-semantics.md](docs/time-semantics.md)

Feature docs:

- [docs/features/booking-workspace/decision-log.md](docs/features/booking-workspace/decision-log.md)
- [docs/features/booking-workspace/overview.md](docs/features/booking-workspace/overview.md)
- [docs/features/booking-workspace/wireframe.md](docs/features/booking-workspace/wireframe.md)
- [docs/features/location/overview.md](docs/features/location/overview.md)
- [docs/features/my-spaces/overview.md](docs/features/my-spaces/overview.md)
- [docs/features/my-bookings/overview.md](docs/features/my-bookings/overview.md)
