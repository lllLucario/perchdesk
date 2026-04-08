# PerchDesk Architecture

## 1. Purpose

This document is the architecture source of truth for the current PerchDesk
codebase.

It intentionally separates three things:

- current implemented architecture
- credible deferred directions
- older planned directions that no longer match the product trajectory closely
  enough to be treated as defaults

The goal is to stop stale planning assumptions from leaking into code changes.

## 2. Product State Snapshot

PerchDesk currently operates as a booking product with four connected surfaces:

- structured browsing through `Buildings -> Spaces in Building`
- booking execution through the floorplan workspace
- personalized discovery through `Home / For You` and `My Spaces`
- post-booking management through `My Bookings`

The current user flow baseline is:

`Home -> Buildings -> Spaces in Building -> Floorplan -> Confirm -> Result`

Supporting alternative flows also exist:

- `Home -> For You -> Space -> Floorplan`
- `Buildings -> Map -> Building -> Spaces`
- `My Spaces -> Space -> Floorplan`
- `My Bookings -> Detail modal`

## 3. Stable Product Decisions

These directions should be treated as active architecture, not open questions.

### 3.1 Resource ownership

- `building` is the primary physical browse and map anchor
- `space` is the direct booking object
- `seat` is the concrete reservable unit
- `booking` remains the persisted reservation entity
- frontend booking drafts are planning artifacts, not new backend entities

### 3.2 Scenario model

The system still models multiple scenarios through `space.type` and
`space_rules`, but the active UX no longer diverges heavily by scenario.

Current active baseline:

- `library` and `office` both use hourly booking interaction
- both default to an `8 hour` daily-cap baseline
- differences currently come from:
  - `max_advance_days`
  - `auto_release_minutes`
  - cancellation policy

This means the old "library = hourly, office = half-day/full-day" product
story is no longer a reliable implementation assumption.

### 3.3 Discovery model

PerchDesk now has two parallel but coordinated access models:

- structured browse: `Buildings -> Spaces`
- personalized access: `For You` and `My Spaces`

Neither replaces the other.

### 3.4 Location model

Location is now a real cross-domain capability, not just a future concept.

Implemented scope:

- building coordinates
- browser location permission handling
- nearby building discovery
- nearby space discovery
- map-based building browsing

Location improves ranking and wayfinding, but does not gate booking.

## 4. Time Semantics

PerchDesk uses two time semantics:

- UTC instant semantics for storage, ordering, overlap checks, and scheduler
  timing
- `Australia/Sydney` wall-clock semantics for booking rules tied to local
  calendar meaning

Examples of Sydney wall-clock rules already implemented:

- hourly slot alignment
- half-day / full-day validation helpers in service logic
- office cancellation cutoff at local midnight
- daily cap accumulation within the same Sydney day

See [time-semantics.md](/Users/kkkadoya/Desktop/perchdesk/docs/time-semantics.md).

## 5. System Architecture

```text
Frontend (Next.js App Router)
  ├─ public and authenticated route segments
  ├─ Zustand for local interaction state
  ├─ TanStack Query for server state
  ├─ Leaflet map browsing
  └─ shared SVG seat map canvas
        │
        │ HTTPS / JSON
        ▼
Backend (FastAPI)
  ├─ /api/v1 routes
  ├─ service layer
  ├─ async SQLAlchemy ORM
  ├─ custom exception handling
  └─ APScheduler auto-release job
        │
        ▼
PostgreSQL (intended runtime)

Testing runtime:
  backend tests use SQLite-compatible fallbacks where possible
```

## 6. Frontend Architecture

### 6.1 Route structure

Current meaningful route groups:

- `/(public)/page.tsx`
  - product home
  - personalized `For You`
  - nearby buildings summary
- `/(auth)`
  - login
  - register
- `/(dashboard)/buildings/page.tsx`
  - building list
- `/(dashboard)/buildings/map/page.tsx`
  - Leaflet map browse
- `/(dashboard)/buildings/[id]/page.tsx`
  - spaces scoped to a building
- `/(dashboard)/spaces/[id]/page.tsx`
  - booking workspace / floorplan
- `/(dashboard)/confirm/page.tsx`
  - checkout confirmation
- `/(dashboard)/result/page.tsx`
  - checkout results
- `/(dashboard)/my-spaces/page.tsx`
  - personalized spaces surface
- `/(dashboard)/bookings/page.tsx`
  - `My Bookings`
- `/(admin)/spaces/manage/page.tsx`
  - space and seat management

### 6.2 Frontend state split

#### Zustand

- `authStore`
  - user metadata
  - access token
  - persisted login state
- `bookingStore`
  - workspace date
  - active seat
  - active slots
  - booking drafts
  - checkout results
- `locationStore`
  - location permission lifecycle
  - coordinates

#### TanStack Query

Owns server-backed data such as:

- buildings
- building spaces
- spaces
- space rules
- availability
- bookings
- favorites
- nearby results
- recent space visits

### 6.3 Auth implementation reality

Current implementation:

- backend issues `access_token` and `refresh_token`
- frontend stores the access token in `localStorage`
- Zustand persists session metadata
- API requests read Bearer token from `localStorage`

Not current reality:

- httpOnly cookie auth
- automatic refresh-token rotation in frontend

Those may be future hardening tasks, but they are not current architecture.

### 6.4 Booking workspace model

The floorplan page is the main booking execution surface.

Desktop mental model:

- left column: date and hourly slot selection
- center: seat map
- right column: booking drafts

Important current behavior:

- one draft binds one seat
- one draft may contain discontinuous slot selections
- discontinuous slots are split into multiple real bookings at checkout
- current daily planning cap on the frontend is aligned to 8 total hours

### 6.5 Seat map

`SeatMapCanvas` is a shared SVG rendering/editing engine used in two modes:

- user mode
  - availability display
  - seat selection
- admin mode
  - add / delete / edit seat interactions
  - optional background floor plan

Current implementation path is intentionally manual:

- background images are visual references only
- admins still place seats manually
- there is no AI-assisted seat detection or computer-vision pipeline

## 7. Backend Architecture

### 7.1 Layering

```text
Route handler
  -> dependency/auth checks
  -> service call
  -> schema serialization

Service layer
  -> business rules
  -> validation
  -> conflict checks
  -> persistence orchestration

ORM models
  -> table mappings
```

Current service modules map closely to domain operations:

- `auth`
- `building`
- `space`
- `seat`
- `booking`
- `favorite`
- `space_visit`
- `space_rules`

### 7.2 Exception model

Backend uses custom domain exceptions:

- `BookingConflictError`
- `BookingRuleViolationError`
- `SeatUnavailableError`
- `UnauthorizedError`
- `ForbiddenError`
- `NotFoundError`
- `DuplicateError`

`main.py` registers a global handler for `PerchDeskError`.

### 7.3 Scheduler

APScheduler runs inside the FastAPI process and executes every minute.

Current job:

- expire confirmed, unchecked bookings after `auto_release_minutes`

Important limit:

- there is no Redis pub/sub fan-out or real-time client sync yet

### 7.4 Geo capability

Location queries are currently application-level, not database-spatial.

Implemented approach:

- Haversine calculation in Python
- coordinate filtering in SQLAlchemy
- bounds querying through simple lat/lng range filtering

This is intentionally lightweight and PostGIS-free for current scope.

## 8. Database Model

### 8.1 Entity relationships

```text
users          1 ── * bookings
seats          1 ── * bookings
buildings      1 ── * spaces
spaces         1 ── * seats
spaces         1 ── 1 space_rules
users          1 ── * favorite_spaces
spaces         1 ── * favorite_spaces
users          1 ── * favorite_seats
seats          1 ── * favorite_seats
users          1 ── * space_visits
spaces         1 ── * space_visits
```

### 8.2 Core tables

#### `users`

- UUID primary key
- unique email
- role enum: `admin | user`

#### `buildings`

- UUID primary key
- physical browse anchor
- optional `latitude` / `longitude`

#### `spaces`

- UUID primary key
- nullable `building_id`
- `type: library | office`
- `layout_config` for seat-map rendering metadata

#### `seats`

- UUID primary key
- `position` stored as JSON
- status enum: `available | maintenance`

#### `bookings`

- UUID primary key
- status enum:
  - `confirmed`
  - `cancelled`
  - `checked_in`
  - `expired`

Important correction:

- booking status does not include `pending`
- therefore `requires_approval` is not an active workflow despite existing on
  `space_rules`

#### `space_rules`

- scenario/rule configuration for a space
- fields include:
  - `max_duration_minutes`
  - `max_advance_days`
  - `time_unit`
  - `auto_release_minutes`
  - `requires_approval`
  - `recurring_rules`

Current architecture stance:

- `requires_approval` and `recurring_rules` are schema headroom, not active
  baseline features

#### `favorite_spaces`

- active product feature
- unique `(user_id, space_id)`

#### `favorite_seats`

- backend-ready only
- no active user-facing frontend surface yet

#### `space_visits`

- one row per `(user_id, space_id)`
- `visited_at` updated on repeat visit
- used as a recency signal for personalized discovery

## 9. Booking Rules

### 9.1 Current baseline rules by scenario

| Rule | Library | Office |
|---|---|---|
| time unit | hourly | hourly |
| default max duration | 480 min | 480 min |
| default advance window | 3 days | 7 days |
| auto release | 15 min | none |
| check-in model | active | active |
| cancellation rule | before start time | before local booking-date midnight |

### 9.2 Conflict handling

Conflict prevention currently has two layers:

- application-level overlap checks in `booking` service
- PostgreSQL migration-level exclusion constraint for seat overlap

Architecture guidance:

- do not rely solely on the DB exclusion constraint as the only authoritative
  protection, because tests run on SQLite and service-layer checks are already
  part of the real behavior contract

### 9.3 User-level constraints

Implemented checks include:

- no overlapping active bookings for the same user in the same space
- same-day per-space daily cap accumulation
- time-unit alignment enforcement

## 10. Discovery Architecture

### 10.1 Structured discovery

Owned by:

- buildings list
- building detail-to-spaces flow
- buildings map

### 10.2 Personalized discovery

Owned by:

- `Home / For You`
- `My Spaces`

Current signals:

- favorite spaces
- recent bookings
- recent floorplan visits
- nearby spaces

Important correction:

- advanced recommendation pipeline documents exist, but the real implemented
  recommendation source is explainable nearby discovery
- do not design against an assumed hidden scoring engine that is not present

### 10.3 Location capability

Location owns:

- coordinates
- nearby ranking inputs
- map browse behavior
- permission/fallback behavior

Location does not own:

- booking validation
- overall personalized ranking strategy
- global browse information architecture

## 11. Current API Surface

### 11.1 Auth

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`

### 11.2 Buildings

- `GET /api/v1/buildings`
- `GET /api/v1/buildings/nearby`
- `GET /api/v1/buildings/within-bounds`
- `GET /api/v1/buildings/{id}`
- `GET /api/v1/buildings/{id}/spaces`
- `POST /api/v1/buildings`
- `PUT /api/v1/buildings/{id}`

### 11.3 Spaces and seats

- `GET /api/v1/spaces`
- `GET /api/v1/spaces/nearby`
- `GET /api/v1/spaces/{id}`
- `PUT /api/v1/spaces/{id}`
- `DELETE /api/v1/spaces/{id}`
- `GET /api/v1/spaces/{id}/rules`
- `PUT /api/v1/spaces/{id}/rules`
- `GET /api/v1/spaces/{id}/availability`
- `POST /api/v1/spaces/{id}/floor-plan`
- `DELETE /api/v1/spaces/{id}/floor-plan`
- seat CRUD endpoints also exist and support the admin editor

### 11.4 Bookings

- `GET /api/v1/bookings`
- `POST /api/v1/bookings`
- `GET /api/v1/bookings/{id}`
- `PATCH /api/v1/bookings/{id}/cancel`
- `PATCH /api/v1/bookings/{id}/check-in`
- `GET /api/v1/admin/bookings`

### 11.5 Personalized signals

- `GET /api/v1/me/favorite-spaces`
- `POST /api/v1/spaces/{space_id}/favorite`
- `DELETE /api/v1/spaces/{space_id}/favorite`
- `GET /api/v1/me/favorite-seats`
- `POST /api/v1/seats/{seat_id}/favorite`
- `DELETE /api/v1/seats/{seat_id}/favorite`
- `POST /api/v1/spaces/{space_id}/visit`
- `GET /api/v1/me/recent-spaces`

## 12. Deployment Reality

### 12.1 Implemented today

- local Dockerfiles
- local `docker compose` workflow
- GitHub Actions CI:
  - backend lint
  - backend tests with coverage
  - frontend lint + typecheck
  - frontend tests
  - Docker build check

### 12.2 Not implemented today

- S3-backed uploads
- Redis
- WebSockets
- production AWS infrastructure
- ECR/ECS deployment pipeline

### 12.3 Architecture guidance

It is acceptable to keep cloud deployment notes as a future direction, but they
must not be described as if they are already present or implied by the running
system.

Current floor plan uploads are stored on local disk under `uploads/`.

## 13. Credible Future Directions

These are still aligned enough with the current codebase to keep as deferred
directions.

### 13.1 Production hardening

- env-driven CORS
- stronger auth token lifecycle
- upload storage abstraction
- deployment automation

### 13.2 Real-time updates

- Redis-backed pub/sub
- live seat availability refresh

This is credible, but currently unstarted.

### 13.3 Better recommendations

- stronger ranking on top of current favorites/recents/nearby signals
- more explainable recommendation reasons

### 13.4 Spatial optimization

- PostGIS or spatial indexing if the location domain expands materially

## 14. Directions That Should No Longer Be Treated As Baseline

These may still be theoretically possible, but they are no longer trustworthy
default assumptions for implementation.

### 14.1 Office-specific half-day/full-day booking as the primary UX

Why this is no longer baseline:

- migrations already moved office defaults to hourly
- booking workspace is designed around hourly slot selection
- frontend interaction model is hourly-first across both scenarios

Implication:

- do not design new work assuming office returns to a separate half-day/full-day
  picker unless product direction explicitly changes

### 14.2 "Adding a new scenario is just seed data, no code change"

Why this is misleading now:

- `space.type` is still a closed enum: `library | office`
- frontend copy, icons, and affordances assume those two values
- multiple services and views contain scenario-specific interpretation

Implication:

- a third scenario is no longer a pure data-only extension

### 14.3 Approval workflow via `requires_approval`

Why this is not baseline:

- bookings do not have a `pending` status
- create-booking service always confirms successful bookings
- frontend has no approval-review flow

Implication:

- do not plan around approval as an existing architecture path

### 14.4 Recurring bookings via `recurring_rules`

Why this is not baseline:

- field exists only as schema headroom
- no API contract or UI flow exists
- no scheduler, expansion, or editing model exists for recurring instances

Implication:

- recurring booking should be treated as a new feature, not a partially built one

## 15. Document Relationships

Use this document together with:

- [time-semantics.md](/Users/kkkadoya/Desktop/perchdesk/docs/time-semantics.md)
- [features/booking-workspace/overview.md](/Users/kkkadoya/Desktop/perchdesk/docs/features/booking-workspace/overview.md)
- [features/location/overview.md](/Users/kkkadoya/Desktop/perchdesk/docs/features/location/overview.md)
- [features/my-spaces/overview.md](/Users/kkkadoya/Desktop/perchdesk/docs/features/my-spaces/overview.md)
- [features/my-bookings/overview.md](/Users/kkkadoya/Desktop/perchdesk/docs/features/my-bookings/overview.md)
