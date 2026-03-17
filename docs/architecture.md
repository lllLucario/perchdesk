# PerchDesk — Architecture Document

## 1. System Overview

PerchDesk is a multi-scenario seat reservation platform. It supports two space
types through a single unified data model — the `space_rules` table drives all
scenario-specific behavior so that no business logic is hard-coded per space
type.

### Supported scenarios

**Library / Study Room** — High seat count, hourly bookings, 15-minute
auto-release if user does not check in. Designed for walk-in and short-notice
reservations.

**Shared Office / Hot-Desk** — Fewer seats, half-day or full-day bookings, up
to 7 days advance booking. No auto-release; cancellation must happen before the
booking date.

---

## 2. Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                     │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐ │
│  │  Seat Map   │  │  Booking   │  │  Admin Dashboard    │ │
│  │  Component  │  │  Panel     │  │  (Phase 4)          │ │
│  └────────────┘  └────────────┘  └─────────────────────┘ │
│         Zustand (auth, UI state)                         │
│         TanStack Query (API cache, refetching)           │
└──────────────────────┬───────────────────────────────────┘
                       │ HTTPS (REST JSON)
                       ▼
┌──────────────────────────────────────────────────────────┐
│                  Backend (FastAPI)                        │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │ API v1   │  │  Service     │  │  Scheduler          │ │
│  │ Routes   │──│  Layer       │  │  (APScheduler)      │ │
│  └──────────┘  └──────┬───────┘  └────────┬───────────┘ │
│                       │                    │              │
│            ┌──────────▼────────────────────▼──────┐      │
│            │  SQLAlchemy ORM (async sessions)     │      │
│            └──────────────────┬───────────────────┘      │
└───────────────────────────────┼──────────────────────────┘
                                │
                       ┌────────▼────────┐
                       │   PostgreSQL    │
                       └─────────────────┘

Phase 3 additions:
  Frontend ◄──WebSocket──► Backend ◄──pub/sub──► Redis
```

---

## 3. Database Schema

### 3.1 Entity Relationship

```
users          1 ──── * bookings
seats          1 ──── * bookings
spaces         1 ──── * seats
spaces         1 ──── 1 space_rules
```

### 3.2 Table Definitions

#### users

| Column          | Type        | Constraints               |
|-----------------|-------------|---------------------------|
| id              | UUID        | PK, default uuid4         |
| email           | VARCHAR     | UNIQUE, NOT NULL, indexed |
| name            | VARCHAR     | NOT NULL                  |
| hashed_password | VARCHAR     | NOT NULL                  |
| role            | ENUM        | 'admin' \| 'user'         |
| created_at      | TIMESTAMPTZ | DEFAULT now()             |

#### spaces

| Column        | Type        | Constraints                    |
|---------------|-------------|--------------------------------|
| id            | UUID        | PK, default uuid4              |
| name          | VARCHAR     | NOT NULL                       |
| type          | ENUM        | 'library' \| 'office'          |
| layout_config | JSONB       | Nullable (seat map layout)     |
| capacity      | INTEGER     | NOT NULL                       |
| created_at    | TIMESTAMPTZ | DEFAULT now()                  |

`layout_config` stores the visual seat map configuration as JSON. The frontend
reads this to render interactive seat layouts. Structure:

```json
{
  "width": 800,
  "height": 600,
  "grid_size": 30,
  "background_image": null,
  "zones": [
    { "id": "zone-a", "label": "Zone A", "x": 0, "y": 0, "width": 400, "height": 300 }
  ]
}
```

- `grid_size`: snap interval in pixels for the seat editor (default 30)
- `background_image`: nullable — URL to uploaded floor plan image (Phase 3)
- `zones`: optional grouping areas for organizing seats visually

#### seats

| Column     | Type    | Constraints                                |
|------------|---------|--------------------------------------------|
| id         | UUID    | PK, default uuid4                          |
| space_id   | UUID    | FK → spaces.id, NOT NULL, indexed          |
| label      | VARCHAR | NOT NULL (e.g. "A1", "B12")                |
| position   | JSONB   | NOT NULL — `{ "x": 120, "y": 80 }`        |
| status     | ENUM    | 'available' \| 'maintenance'                |
| attributes | JSONB   | Nullable — `{ "power_outlet": true, ... }` |

#### bookings

| Column        | Type        | Constraints                                                 |
|---------------|-------------|-------------------------------------------------------------|
| id            | UUID        | PK, default uuid4                                           |
| user_id       | UUID        | FK → users.id, NOT NULL, indexed                            |
| seat_id       | UUID        | FK → seats.id, NOT NULL, indexed                            |
| start_time    | TIMESTAMPTZ | NOT NULL                                                    |
| end_time      | TIMESTAMPTZ | NOT NULL                                                    |
| status        | ENUM        | 'confirmed' \| 'cancelled' \| 'checked_in' \| 'expired'     |
| checked_in_at | TIMESTAMPTZ | Nullable                                                    |
| created_at    | TIMESTAMPTZ | DEFAULT now()                                               |

**Conflict prevention**: A database-level exclusion constraint (or application-
level check) ensures no two active bookings (status = 'confirmed' or
'checked_in') overlap on the same seat for the same time range.

```sql
-- PostgreSQL exclusion constraint using btree_gist extension
ALTER TABLE bookings ADD CONSTRAINT no_overlap
  EXCLUDE USING gist (
    seat_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  )
  WHERE (status IN ('confirmed', 'checked_in'));
```

#### space_rules

| Column               | Type    | Constraints                              |
|----------------------|---------|------------------------------------------|
| id                   | UUID    | PK, default uuid4                        |
| space_id             | UUID    | FK → spaces.id, UNIQUE, NOT NULL         |
| max_duration_minutes | INTEGER | NOT NULL                                 |
| max_advance_days     | INTEGER | NOT NULL                                 |
| time_unit            | ENUM    | 'hourly' \| 'half_day' \| 'full_day'     |
| auto_release_minutes | INTEGER | Nullable (null = no auto-release)        |
| requires_approval    | BOOLEAN | DEFAULT false                            |
| recurring_rules      | JSONB   | Nullable (future: recurring bookings)    |

### 3.3 Scenario Rules (driven by space_rules values)

| Rule                  | Library / Study Room       | Shared Office Hot-Desk       |
|-----------------------|----------------------------|------------------------------|
| type                  | library                    | office                       |
| max_duration_minutes  | 240 (4 hours)              | 480 (8 hours = full day)     |
| max_advance_days      | 3                          | 7                            |
| time_unit             | hourly                     | half_day / full_day          |
| auto_release_minutes  | 15                         | null (no auto-release)       |
| requires_approval     | false                      | false                        |
| Cancellation policy   | Before booking start_time  | Before booking date 00:00    |

These values are seed data inserted at database initialization. Adding a new
scenario in the future means inserting a new space + space_rules row — no code
changes needed.

---

## 4. Backend Architecture

### 4.1 Layer Separation

```
Request → Route Handler → Service Layer → ORM / Database
                ↑                ↑
          Pydantic schemas   Business logic,
          (validation)       validation, rules
```

**Route handlers** (`/api/v1/`) parse requests, call service methods, and return
responses. They should be thin — no business logic.

**Service layer** (`/services/`) contains all business logic: booking conflict
checks, rule enforcement, permission checks. Services receive ORM sessions via
dependency injection.

**Models** (`/models/`) are SQLAlchemy ORM classes. They define table structure
only — no business methods.

**Schemas** (`/schemas/`) are Pydantic models for request validation and
response serialization. Separate Create/Update/Response schemas per resource.

### 4.2 Authentication Flow

1. User registers → password hashed with bcrypt → stored in users table
2. User logs in with email + password → server returns JWT access token + refresh token
3. Frontend stores tokens (httpOnly cookie or Zustand + localStorage)
4. Every API request includes `Authorization: Bearer <access_token>`
5. FastAPI dependency `get_current_user` decodes JWT, loads user from DB
6. Admin-only endpoints additionally check `user.role == 'admin'`

Token configuration:
- Access token: 30 minutes expiry
- Refresh token: 7 days expiry
- Algorithm: HS256
- Secret: loaded from environment variable `JWT_SECRET_KEY`

### 4.3 Booking Flow

```
User selects seat + time range
        │
        ▼
Frontend: POST /api/v1/bookings
        │
        ▼
Backend: BookingService.create_booking()
        │
        ├─ Validate seat exists and status == 'available'
        ├─ Load space_rules for the seat's space
        ├─ Validate time range against rules:
        │    ├─ Duration <= max_duration_minutes?
        │    ├─ Start time <= now + max_advance_days?
        │    └─ Time unit alignment (hourly / half_day / full_day)?
        ├─ Check for overlapping bookings (conflict detection)
        │    └─ DB exclusion constraint + application-level pre-check
        ├─ If requires_approval → set status = 'pending' (future)
        └─ Else → set status = 'confirmed'
        │
        ▼
Return booking object with status
```

### 4.4 Auto-Release Scheduler (APScheduler)

Runs as a background task inside the FastAPI process (Phase 1 & 2).

```
Every 1 minute:
  1. Query all bookings WHERE:
     - status = 'confirmed'
     - start_time < now()
     - checked_in_at IS NULL
     - The seat's space has auto_release_minutes IS NOT NULL
     - start_time + auto_release_minutes < now()
  2. Set matching bookings to status = 'expired'
  3. (Phase 3) Publish seat status update via Redis pub/sub
```

### 4.5 Error Handling

Custom exceptions in `backend/app/core/exceptions.py`:

```python
class PerchDeskError(Exception):
    """Base exception for all application errors."""
    status_code: int = 500
    error_code: str = "INTERNAL_ERROR"

class BookingConflictError(PerchDeskError):
    status_code = 409
    error_code = "BOOKING_CONFLICT"

class BookingRuleViolationError(PerchDeskError):
    status_code = 400
    error_code = "RULE_VIOLATION"

class SeatUnavailableError(PerchDeskError):
    status_code = 400
    error_code = "SEAT_UNAVAILABLE"

class UnauthorizedError(PerchDeskError):
    status_code = 401
    error_code = "UNAUTHORIZED"

class ForbiddenError(PerchDeskError):
    status_code = 403
    error_code = "FORBIDDEN"

class NotFoundError(PerchDeskError):
    status_code = 404
    error_code = "NOT_FOUND"
```

Global exception handler in `backend/app/main.py` catches `PerchDeskError`
subclasses and returns the standard JSON response format.

---

## 5. Frontend Architecture

### 5.1 Page Structure (App Router)

```
/app
  /page.tsx                    — Landing / redirect to dashboard
  /(auth)
    /login/page.tsx            — Login form
    /register/page.tsx         — Registration form
  /(dashboard)
    /layout.tsx                — Authenticated layout with nav
    /spaces/page.tsx           — List all spaces
    /spaces/[id]/page.tsx      — Space detail with seat map
    /bookings/page.tsx         — My bookings list
    /bookings/[id]/page.tsx    — Booking detail
  /(admin)
    /layout.tsx                — Admin-only layout guard
    /spaces/manage/page.tsx    — CRUD spaces and seats
    /analytics/page.tsx        — Usage analytics (Phase 4)
```

### 5.2 State Management

**Zustand stores** (synchronous, client-side):
- `useAuthStore` — current user, tokens, login/logout actions
- `useBookingStore` — selected seat, selected time range (transient UI state)

**TanStack Query** (async, server state):
- `useSpaces()` — GET /api/v1/spaces
- `useSpace(id)` — GET /api/v1/spaces/:id (includes seats)
- `useBookings()` — GET /api/v1/bookings (current user's bookings)
- `useCreateBooking()` — POST /api/v1/bookings (mutation)
- `useCancelBooking()` — PATCH /api/v1/bookings/:id/cancel (mutation)
- `useCheckIn()` — PATCH /api/v1/bookings/:id/check-in (mutation)

Mutations invalidate related queries on success (e.g. creating a booking
invalidates both `useBookings` and `useSpace` to refresh seat availability).

### 5.3 Seat Map — Phased Implementation

The seat map has two views sharing the same SVG rendering engine:
- **Admin editor** (`/admin/spaces/manage`): editable — place, move, delete seats
- **User view** (`/spaces/[id]`): read-only — view availability, click to book

#### Phase 1 & 2: Grid-based seat editor (no background image)

Admin creates seats by clicking on a grid canvas. Coordinates snap to grid
intersections for clean alignment. No floor plan image needed.

```
Admin editor UI:
┌─────────────────────────────────────────────────┐
│ Toolbar: [+ Add seat] [Remove] [Edit] [Toggle grid] │
│          Label prefix: [A]  Grid size: [30px]   │
├─────────────────────────────────────────────────┤
│                                                 │
│  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·   │
│  · [A1] ·  · [A2] ·  ·  ·  ·  ·  ·  ·  ·  ·   │
│  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·   │
│  · [A3] ·  · [A4] ·  ·  · [B1] · [B2] ·  ·   │
│  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·   │
│                                                 │
└─────────────────────────────────────────────────┘
```

Implementation details:
- SVG canvas with configurable viewBox (default 800×600)
- Grid rendered as SVG `<pattern>` with `grid_size` from `layout_config`
- Click event → `snap(x, y)` → POST /api/v1/spaces/:id/seats with `{ label, position: { x, y } }`
- Each seat rendered as colored `<rect>` + `<text>` label
- Tool modes: add (click to place), delete (click to remove), edit (click to change attributes)
- User view: same SVG renderer but read-only, seats color-coded by booking status

Seat colors (both admin and user views):
- Green (#1D9E75): available
- Red (#E24B4A): booked for the selected time range
- Gray (#B4B2A9): maintenance / disabled
- Blue (#378ADD): user's own booking (user view only)

#### Phase 3: Floor plan background image

Enhances the editor by allowing admins to upload a real floor plan image as
the canvas background. Seats are placed on top of the image for accurate
positioning.

```
Admin editor with background:
┌─────────────────────────────────────────────────┐
│ Toolbar: [Upload floor plan] [+ Add] [Remove]  │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │  ╔══════╗        ╔══════╗   <- real image   │ │
│ │  ║ Desk ║  aisle ║ Desk ║   background      │ │
│ │  ║[A1]  ║        ║[A2]  ║                   │ │
│ │  ╚══════╝        ╚══════╝                   │ │
│ │         ╔══════╗                            │ │
│ │         ║ Desk ║                            │ │
│ │         ║[A3]  ║                            │ │
│ │         ╚══════╝                            │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

Implementation:
- Admin uploads PNG/JPG via POST /api/v1/spaces/:id/floor-plan
- Image stored locally (dev) or S3 (production), URL saved in `layout_config.background_image`
- SVG renders image as `<image>` element at z-index 0, seats render on top
- Grid overlay toggleable (can be turned off when using background image)
- Seat placement still uses click-to-place — the image is purely visual reference
- No AI or computer vision involved: admin places seats manually on top of the image

#### Shared SVG component structure

```
<SeatMapCanvas>              — shared wrapper
  <SeatMapBackground />      — grid pattern OR floor plan image
  <SeatMapSeats />           — renders all seats as colored rects
  <SeatMapToolbar />         — admin only: tool selection
  <SeatMapBookingPanel />    — user only: time picker + confirm button
</SeatMapCanvas>
```

One component, two modes (editable vs read-only), passed via props.
Phase 1 & 2 render grid background; Phase 3 adds image background option.

---

## 6. API Endpoints

### 6.1 Auth

| Method | Endpoint                | Description         | Auth |
|--------|-------------------------|---------------------|------|
| POST   | /api/v1/auth/register   | Register new user   | No   |
| POST   | /api/v1/auth/login      | Login, return JWT   | No   |
| POST   | /api/v1/auth/refresh    | Refresh access token| Yes  |
| GET    | /api/v1/auth/me         | Get current user    | Yes  |

### 6.2 Spaces

| Method | Endpoint                | Description              | Auth  |
|--------|-------------------------|--------------------------|-------|
| GET    | /api/v1/spaces          | List all spaces          | Yes   |
| GET    | /api/v1/spaces/:id      | Get space with seats     | Yes   |
| POST   | /api/v1/spaces          | Create space             | Admin |
| PUT    | /api/v1/spaces/:id      | Update space             | Admin |
| DELETE | /api/v1/spaces/:id      | Delete space             | Admin |

### 6.3 Seats

| Method | Endpoint                         | Description          | Auth  |
|--------|----------------------------------|----------------------|-------|
| GET    | /api/v1/spaces/:id/seats         | List seats in space  | Yes   |
| POST   | /api/v1/spaces/:id/seats         | Add seat to space    | Admin |
| POST   | /api/v1/spaces/:id/seats/batch   | Add multiple seats at once | Admin |
| PUT    | /api/v1/seats/:id                | Update seat          | Admin |
| DELETE | /api/v1/seats/:id                | Delete seat          | Admin |
| GET    | /api/v1/spaces/:id/availability  | Seat availability for time range | Yes |
| POST   | /api/v1/spaces/:id/floor-plan    | Upload floor plan image (Phase 3) | Admin |
| DELETE | /api/v1/spaces/:id/floor-plan    | Remove floor plan image | Admin |

### 6.4 Bookings

| Method | Endpoint                          | Description             | Auth  |
|--------|-----------------------------------|-------------------------|-------|
| GET    | /api/v1/bookings                  | List my bookings        | Yes   |
| POST   | /api/v1/bookings                  | Create booking          | Yes   |
| GET    | /api/v1/bookings/:id              | Get booking detail      | Yes   |
| PATCH  | /api/v1/bookings/:id/cancel       | Cancel booking          | Yes   |
| PATCH  | /api/v1/bookings/:id/check-in     | Check in to booking     | Yes   |
| GET    | /api/v1/admin/bookings            | List all bookings       | Admin |

### 6.5 Space Rules (Admin)

| Method | Endpoint                          | Description              | Auth  |
|--------|-----------------------------------|--------------------------|-------|
| GET    | /api/v1/spaces/:id/rules          | Get rules for a space    | Yes   |
| PUT    | /api/v1/spaces/:id/rules          | Update rules for a space | Admin |

---

## 7. Deployment Architecture

### 7.1 Local Development (Docker Compose)

```yaml
services:
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    depends_on: [backend]

  backend:
    build: ./backend
    ports: ["8000:8000"]
    depends_on: [db]
    environment:
      - DATABASE_URL=postgresql+asyncpg://perchdesk:password@db:5432/perchdesk
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}

  db:
    image: postgres:15
    volumes: [pgdata:/var/lib/postgresql/data]
    environment:
      - POSTGRES_DB=perchdesk
      - POSTGRES_USER=perchdesk
      - POSTGRES_PASSWORD=password

  # Phase 3+
  # redis:
  #   image: redis:7-alpine
  #   ports: ["6379:6379"]

volumes:
  pgdata:
```

### 7.2 CI/CD Pipeline (GitHub Actions)

```
Push to any branch:
  1. Lint (ruff + eslint)
  2. Test (pytest + jest)
  3. Build check (docker compose build)

Push/merge to main:
  4. Build Docker images
  5. Push to AWS ECR (or Docker Hub)
  6. Deploy to AWS EC2/ECS (Phase 4)
```

### 7.3 AWS Target Architecture (Phase 4)

```
                    ┌────────────────┐
                    │  Route 53      │
                    │  (DNS)         │
                    └───────┬────────┘
                            │
                    ┌───────▼────────┐
                    │  ALB           │
                    │  (Load Balancer)│
                    └───┬────────┬───┘
                        │        │
               ┌────────▼──┐ ┌──▼────────┐
               │  ECS Task  │ │  ECS Task  │
               │  Frontend  │ │  Backend   │
               └────────────┘ └──┬─────────┘
                                 │
                        ┌────────▼────────┐
                        │  RDS PostgreSQL  │
                        │  (Free tier)     │
                        └─────────────────┘
```

Use AWS Free Tier where possible: t2.micro EC2 or Fargate spot for ECS,
RDS db.t3.micro for PostgreSQL.

---

## 8. Security Considerations

- Passwords hashed with bcrypt (via passlib)
- JWT tokens signed with HS256, secrets loaded from environment variables
- CORS configured to allow only the frontend origin
- Rate limiting on auth endpoints (Phase 2+)
- SQL injection prevented by SQLAlchemy parameterized queries
- Input validation by Pydantic schemas on all endpoints
- Admin endpoints protected by role-based middleware
- Environment variables managed via `.env` file (not committed to git)

---

## 9. Future Considerations (out of scope for v1)

- Meeting room scenario (third space type — add space_rules row, no code change)
- Recurring bookings (use `recurring_rules` JSON field in space_rules)
- Email/push notifications for booking reminders
- SSO integration (Google OAuth)
- Mobile responsive PWA
- Multi-tenancy (multiple organizations sharing one deployment)
