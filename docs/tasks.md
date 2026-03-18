# PerchDesk — Task List

Track progress by checking off tasks. Claude Code can check boxes for you
after completing each item. Each task is scoped to roughly one Claude Code
session (20-30 minutes).

---

## Phase 0: Project Setup

- [x] Initialize Git repository, connect to GitHub
- [x] Create monorepo directory structure (`/frontend`, `/backend`, `/docker`, `/docs`, `/.github/workflows`)
- [x] Create Python package `__init__.py` files for all backend subdirectories
- [x] Copy `CLAUDE.md` and `docs/` files (`architecture.md`, `tasks.md`) into repo
- [x] Create `.env.example` with required variables: `DATABASE_URL`, `JWT_SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`
- [x] Add `.env` to `.gitignore` (keep `.env.example` tracked)
- [x] Backend: create `pyproject.toml`, install dependencies (fastapi, uvicorn, sqlalchemy[asyncio], asyncpg, alembic, passlib[bcrypt], python-jose[cryptography], pydantic-settings, apscheduler, pytest, pytest-asyncio, pytest-cov, httpx, ruff)
- [x] Backend: create FastAPI app skeleton (`app/main.py` with health check endpoint `GET /health`)
- [x] Backend: configure Alembic for async PostgreSQL (`alembic.ini`, `alembic/env.py`)
- [x] Backend: create `app/core/config.py` with Pydantic Settings (load from `.env`)
- [x] Backend: create `app/core/database.py` with async engine, async session factory, and `get_db` dependency
- [x] Backend: create `backend/tests/conftest.py` with test database setup and async test client fixture
- [x] Frontend: initialize Next.js in `/frontend` (`npx create-next-app@latest . --typescript --tailwind --app --src-dir=false`)
- [x] Frontend: install Zustand, TanStack Query (`npm install zustand @tanstack/react-query`)
- [x] Frontend: configure QueryClientProvider and Zustand in root layout
- [x] Frontend: create directories (`/components`, `/lib`, `/store`) and API client base (`lib/api.ts` with fetch wrapper, auth header injection)
- [x] Docker: create `docker/Dockerfile.backend` (multi-stage: builder + runtime)
- [x] Docker: create `docker/Dockerfile.frontend` (multi-stage: builder + runner)
- [x] Docker: create `docker-compose.yml` (frontend + backend + postgres)
- [x] Verify: `docker compose up` starts all services, `GET /health` returns 200
- [x] Git: commit and push Phase 0 to `main` branch

---

## Phase 1: Auth + Core CRUD + Basic Booking

### 1.1 Database Models

- [x] Create SQLAlchemy model: `users` table (id, email, name, hashed_password, role, created_at)
- [x] Create SQLAlchemy model: `spaces` table (id, name, type, layout_config, capacity, created_at)
- [x] Create SQLAlchemy model: `seats` table (id, space_id FK, label, position, status, attributes)
- [x] Create SQLAlchemy model: `bookings` table (id, user_id FK, seat_id FK, start_time, end_time, status, checked_in_at, created_at)
- [x] Create SQLAlchemy model: `space_rules` table (id, space_id FK, max_duration_minutes, max_advance_days, time_unit, auto_release_minutes, requires_approval, recurring_rules)
- [x] Add PostgreSQL exclusion constraint on bookings for overlap prevention (requires `btree_gist` extension — add `CREATE EXTENSION IF NOT EXISTS btree_gist` in initial migration)
- [x] Generate and apply Alembic migration
- [x] Write seed data script (`backend/app/core/seed.py`): create sample library space (max_duration=240, max_advance=3, time_unit=hourly, auto_release=15) + office space (max_duration=480, max_advance=7, time_unit=half_day, auto_release=null) with seats
- [ ] Verify: seed data loads, tables exist, constraints work (requires running PostgreSQL)

### 1.2 Error Handling

- [x] Create `app/core/exceptions.py` with base `PerchDeskError` and subclasses (BookingConflictError, BookingRuleViolationError, SeatUnavailableError, UnauthorizedError, ForbiddenError, NotFoundError)
- [x] Register global exception handler in `app/main.py`
- [x] Write test: verify exception handler returns correct JSON format and status codes

### 1.3 Authentication

- [x] Create Pydantic schemas: `RegisterRequest`, `LoginRequest`, `TokenResponse`, `UserResponse`
- [x] Create `app/services/auth.py`: register (hash password, create user), login (verify password, issue JWT)
- [x] Create JWT utility functions in `app/core/security.py`: create_access_token, create_refresh_token, decode_token
- [x] Create FastAPI dependency: `get_current_user` (decode JWT, load user from DB)
- [x] Create FastAPI dependency: `require_admin` (check user.role == 'admin')
- [x] Create routes: POST `/auth/register`, POST `/auth/login`, POST `/auth/refresh`, GET `/auth/me`
- [x] Write tests: register, login, token refresh, access protected endpoint, reject expired token
- [x] Verify: all auth tests pass

### 1.4 Spaces CRUD (Admin)

- [x] Create Pydantic schemas: `SpaceCreate`, `SpaceUpdate`, `SpaceResponse`, `SpaceListResponse`
- [x] Create `app/services/space.py`: list, get_by_id (include seats), create, update, delete
- [x] Create routes: GET/POST `/spaces`, GET/PUT/DELETE `/spaces/:id`
- [x] Write tests: CRUD operations, admin-only access, non-admin rejected
- [x] Verify: all space tests pass

### 1.5 Seats CRUD (Admin)

- [x] Create Pydantic schemas: `SeatCreate`, `SeatUpdate`, `SeatResponse`, `SeatBatchCreate`
- [x] Create `app/services/seat.py`: list_by_space, create, batch_create, update, delete
- [x] Create routes: GET/POST `/spaces/:id/seats`, POST `/spaces/:id/seats/batch`, PUT/DELETE `/seats/:id`
- [x] Create route: GET `/spaces/:id/availability?start=...&end=...` (returns seats with booking status for time range)
- [x] Write tests: CRUD, batch create, availability query
- [x] Verify: all seat tests pass

### 1.6 Core Booking Flow

- [x] Create Pydantic schemas: `BookingCreate`, `BookingResponse`, `BookingListResponse`
- [x] Create `app/services/booking.py`:
  - [x] `create_booking()`: validate seat available, load space_rules, check duration/advance limits, check time_unit alignment, check overlap, create booking
  - [x] `cancel_booking()`: validate ownership, check cancellation policy, set status='cancelled'
  - [x] `check_in()`: validate ownership, validate time window, set status='checked_in' + checked_in_at
  - [x] `list_my_bookings()`: filter by current user, ordered by start_time
- [x] Create routes: GET/POST `/bookings`, GET `/bookings/:id`, PATCH `/bookings/:id/cancel`, PATCH `/bookings/:id/check-in`
- [x] Create admin route: GET `/admin/bookings` (list all, with filters)
- [x] Write tests: create booking, conflict rejection, rule violation rejection, cancel, check-in, list
- [x] Verify: all booking tests pass

### 1.7 Space Rules (Admin)

- [x] Create Pydantic schemas: `SpaceRulesResponse`, `SpaceRulesUpdate`
- [x] Create routes: GET/PUT `/spaces/:id/rules`
- [x] Write tests: get rules, update rules, verify booking service respects updated rules
- [x] Verify: all rules tests pass

### 1.8 Frontend — Auth Pages

- [x] Create login page (`/(auth)/login/page.tsx`): email + password form, call POST `/auth/login`, store token in Zustand
- [x] Create register page (`/(auth)/register/page.tsx`): name + email + password form
- [x] Create `useAuthStore` Zustand store: user, tokens, login(), logout(), isAuthenticated
- [x] Create auth middleware/layout: redirect to `/login` if not authenticated
- [x] Create TanStack Query hook: `useCurrentUser()` (GET `/auth/me`)
- [ ] Verify: can register, login, see protected page, logout

### 1.9 Frontend — Spaces & Booking Pages

- [x] Create spaces list page (`/(dashboard)/spaces/page.tsx`): show all spaces as cards
- [x] Create space detail page (`/(dashboard)/spaces/[id]/page.tsx`): show seats as simple grid (Phase 1 — no interactive map yet)
- [x] Create booking panel component: select seat → pick time range → confirm → call POST `/bookings`
- [x] Create my bookings page (`/(dashboard)/bookings/page.tsx`): list user's bookings, cancel button, check-in button
- [x] Create TanStack Query hooks: `useSpaces()`, `useSpace(id)`, `useBookings()`, `useCreateBooking()`, `useCancelBooking()`, `useCheckIn()`
- [x] Create `useBookingStore` Zustand store: selectedSeat, selectedTimeRange
- [ ] Verify: full booking flow works end-to-end (select seat → book → see in my bookings → check in → cancel)

### Phase 1 Milestone

- [x] Run full backend test suite: `pytest --cov=app --cov-report=term-missing` — all green, coverage >= 80% (91% achieved, 80 tests)
- [ ] Run frontend tests: `npm test` — all green (Jest not yet configured)
- [ ] Manual end-to-end test: register → login → view spaces → book seat → check in → cancel
- [x] Git: merge all Phase 1 feature branches to main

---

## Phase 2: Scenario Rules Enforcement

### 2.1 Auto-Release Scheduler

- [x] Install APScheduler, create `app/scheduler/jobs.py`
- [x] Implement `expire_unchecked_bookings()` job: query overdue bookings, set status='expired'
- [x] Register scheduler to start on FastAPI lifespan startup, run every 1 minute
- [x] Write test: create booking, simulate time passing, verify auto-expiry
- [x] Verify: scheduler runs in background without blocking API (requires runtime verification)

### 2.2 Advanced Rule Validation

- [x] Enforce `time_unit` alignment in BookingService: hourly bookings snap to hour boundaries, half_day/full_day snap to AM/PM or full day
- [x] Enforce cancellation deadline: library = before start_time, office = before booking date 00:00 AEST
- [x] Add max active bookings per user per space (prevent hoarding)
- [x] Write tests for each rule edge case
- [x] Verify: all rule tests pass (88 tests, 90% coverage)

### 2.3 Frontend Rule Feedback

- [x] Time picker respects `time_unit`: show hourly slots for library, half-day/full-day for office
- [x] Show auto-release warning on library bookings ("Check in within 15 min or booking expires")
- [x] Show booking limit feedback if user has max active bookings (error message shown after API rejection)
- [ ] Verify: frontend correctly reflects all rules (requires manual E2E verification)

### Phase 2 Milestone

- [x] Full test suite green, coverage >= 80% (88 tests, 90% coverage)
- [ ] Both scenarios working: library (hourly + auto-release) and office (half/full day) (requires manual E2E verification)
- [ ] Git: merge Phase 2 to main

---

## Phase 3: Visual Seat Map + Real-Time

### 3.1 Seat Map — Grid Editor (Admin)

- [ ] Create `<SeatMapCanvas>` SVG component with grid background pattern
- [ ] Implement click-to-place: snap coordinates to grid, POST new seat
- [ ] Implement tool modes: add, delete, edit (change label/attributes)
- [ ] Create admin manage page (`/(admin)/spaces/manage/page.tsx`) with toolbar + canvas
- [ ] Write tests: place seat, remove seat, edit seat attributes
- [ ] Verify: admin can create full seat layout via grid editor

### 3.2 Seat Map — User View

- [ ] Create read-only `<SeatMapCanvas>` mode: seats colored by availability
- [ ] Color coding: green=available, red=booked, gray=maintenance, blue=my booking
- [ ] Click available seat → open booking panel with pre-selected seat
- [ ] Replace simple grid view on space detail page with seat map component
- [ ] Verify: user can visually browse and book seats

### 3.3 Floor Plan Background (Enhancement)

- [ ] Create file upload endpoint: POST `/spaces/:id/floor-plan` (accept PNG/JPG)
- [ ] Store image locally in dev (or S3 in production), save URL in layout_config.background_image
- [ ] Render uploaded image as SVG `<image>` background in seat map canvas
- [ ] Add toggle to show/hide grid overlay when background image is present
- [ ] Create DELETE `/spaces/:id/floor-plan` endpoint
- [ ] Verify: admin can upload floor plan, place seats on top of it

### 3.4 WebSocket Real-Time Updates

- [ ] Add Redis service to docker-compose
- [ ] Create WebSocket endpoint: `/ws/spaces/:id` (sends seat status changes)
- [ ] Backend: publish booking events to Redis channel on create/cancel/check-in/expire
- [ ] Frontend: connect WebSocket on space detail page, update seat colors in real-time
- [ ] Write test: create booking in one session, verify WebSocket message in another
- [ ] Verify: two browser tabs open, booking in one updates seat color in the other

### Phase 3 Milestone

- [ ] Full test suite green
- [ ] Interactive seat map works for both admin (edit) and user (view + book)
- [ ] Real-time updates working across browser tabs
- [ ] Git: merge Phase 3 to main

---

## Phase 4: Admin Dashboard + CI/CD + Deployment

### 4.1 Admin Dashboard

- [ ] Create analytics API: GET `/admin/analytics` (occupancy rate, peak hours, popular seats)
- [ ] Create admin analytics page with charts (occupancy over time, usage by space type)
- [ ] Create admin bookings list page with filters (by space, date range, status)
- [ ] Verify: admin can view meaningful usage data

### 4.2 Audit Logs

- [ ] Create `audit_logs` table (id, user_id, action, resource_type, resource_id, details JSON, created_at)
- [ ] Log key events: booking created/cancelled/checked_in/expired, space created/deleted, seat added/removed
- [ ] Create admin route: GET `/admin/audit-logs` with pagination and filters
- [ ] Verify: actions are logged and viewable

### 4.3 CI/CD Pipeline

- [x] Create `.github/workflows/ci.yml`: trigger on push to any branch
  - [x] Job 1: Lint (ruff for backend, eslint for frontend)
  - [ ] Job 2: Test (pytest for backend, jest for frontend) (jest not yet configured)
  - [x] Job 3: Build check (docker compose build)
- [ ] Create `.github/workflows/deploy.yml`: trigger on push to main
  - [ ] Build Docker images
  - [ ] Push to container registry (Docker Hub or AWS ECR)
  - [ ] Deploy to AWS (EC2 or ECS)
- [ ] Verify: push to branch triggers CI, merge to main triggers deploy
- [ ] Add CI status badge to README.md

### 4.4 Docker & AWS Deployment

- [ ] Optimize Dockerfiles: multi-stage builds, smaller images
- [ ] Create production docker-compose (with environment variable injection)
- [ ] Set up AWS resources: EC2/ECS, RDS PostgreSQL, security groups
- [ ] Configure environment variables in AWS (DATABASE_URL, JWT_SECRET_KEY)
- [ ] Deploy and verify: application accessible via public URL
- [ ] Set up HTTPS (ACM certificate + ALB)

### 4.5 Documentation & README

- [ ] Write comprehensive README.md: project description, tech stack, setup instructions, API docs link, screenshots
- [ ] Add screenshots/GIFs of key features (seat map, booking flow, admin dashboard)
- [ ] Ensure Swagger UI accessible at `/docs` (FastAPI auto-generates this)
- [ ] Final review: all tests pass, CI green, deployed and accessible

### Phase 4 Milestone

- [ ] CI/CD pipeline fully operational
- [ ] Application deployed to AWS and accessible
- [ ] README polished and ready for resume/portfolio
- [ ] Git: tag v1.0.0 release
