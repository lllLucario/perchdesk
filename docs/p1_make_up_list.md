# PerchDesk P1 Make-Up Execution Guide

## Contract Decisions (Stage 1 — frozen 2026-03-20)

- Space list: `GET /api/v1/spaces` returns minimal list item — no embedded `seats`. Fields: `id`, `name`, `type`, `capacity`, `layout_config`, `created_at`.
- Space detail: `GET /api/v1/spaces/:id` returns full detail including `seats`. Fields: `id`, `name`, `type`, `capacity`, `layout_config`, `created_at`, `seats[]`.
- Seat availability: Option A — backend returns `booking_status: "available" | "booked" | "my_booking"` per seat. Not `is_available: bool`.
- Response envelope: Option A — success responses return plain resource payloads; error responses use standardized `{ error: { code, detail } }` envelope. Docs updated to reflect this.

---

## How To Use This File

This file is designed for progressive disclosure.

An agent should not try to do everything at once.
The agent should:

1. Read `Stage 0`.
2. Complete only `Stage 1`.
3. Run the required verification for `Stage 1`.
4. Stop and check that `Stage 1` acceptance is satisfied.
5. Only then continue to `Stage 2`.
6. Repeat until all stages are complete.

Do not skip ahead unless a later stage is blocked by an earlier architectural
decision that must be made immediately.

Do not mark a stage complete because code was written.
A stage is complete only when:

- implementation is done
- tests are updated
- verification commands pass
- docs are aligned where required by that stage

---

## Global Rules

These rules apply to all stages.

- Treat backend/frontend API shape as a formal contract.
- Do not use `as unknown as` to hide contract drift.
- Do not leave docs claiming behavior that runtime does not implement.
- Prefer small, explicit response schemas over broad ambiguous ones.
- Prefer fixing one full vertical slice at a time over scattered cleanup.
- If a stage changes backend contract, update backend tests and frontend hooks in
  the same stage.
- If a stage changes user-visible behavior, add or update frontend tests in the
  same stage.
- If a verification command in this file fails, do not continue to the next
  stage until the failure is understood and resolved.

---

## Stage 0. Baseline Audit Snapshot

### Goal

Create a reliable starting point before making contract or test changes.

### Read First

- `AGENTS.md`
- `CLAUDE.md`
- `docs/architecture.md`
- `docs/tasks.md`

### Confirm Current Known Drift

The following issues are already known and should be treated as real until
explicitly fixed:

- `GET /api/v1/spaces/:id` frontend expects `seats`, but backend schema does not
  formally define it.
- `GET /api/v1/spaces/:id/availability` frontend expects `booking_status`, but
  backend returns `is_available`.
- docs describe a universal response envelope, but successful responses are raw
  payloads.
- frontend test infrastructure does not currently exist.
- CI does not currently run frontend tests.
- Docker development startup is now available and healthy through
  `docker compose up --build`, so service boot reliability should no longer be
  treated as the primary explanation for backend verification gaps.
- backend test execution may still hang or fail to return promptly even when the
  Docker backend service itself is healthy. Treat this as a separate test-runner
  problem, not as proof that the backend app is down.

### Required Outputs

- A short baseline note in the working thread or PR description summarizing:
  - current backend contract shape
  - current frontend assumptions
  - current available verification commands
  - current missing test infrastructure

### Verification

Run:

```bash
docker compose ps
cd frontend && npm run lint
cd frontend && npm run typecheck
cd backend && pytest
```

If any command fails:

- record the failure precisely
- do not continue pretending the baseline is green

If `docker compose ps` shows healthy services but `cd backend && pytest` does
not complete:

- record that distinction explicitly
- do not collapse it into a generic "backend down" diagnosis
- open a separate investigation thread for pytest execution behavior

### Acceptance

Stage 0 is complete when:

- the team has a precise starting snapshot
- no one is working from assumed green status
- the baseline explicitly distinguishes:
  - app runtime health
  - test-runner health

---

## Stage 1. Contract Decision Freeze

### Goal

Lock the intended contract before touching implementation.

This stage is intentionally documentation-first.

### Do In This Stage Only

Make explicit decisions for these three areas:

1. `Space list` response shape
2. `Space detail` response shape
3. `Seat availability` response shape

Also make one global decision:

4. Response envelope policy

### Required Decisions

#### 1. Space list

Recommended:

- `GET /api/v1/spaces` returns a minimal list item shape
- no embedded `seats`
- no accidental extra ORM fields

Suggested shape:

- `id`
- `name`
- `type`
- `capacity`
- `layout_config`
- `created_at`

#### 2. Space detail

Recommended:

- `GET /api/v1/spaces/:id` returns a rich detail shape
- includes `seats`
- may optionally include `rules` if the team wants fewer round trips

Minimum required shape:

- `id`
- `name`
- `type`
- `capacity`
- `layout_config`
- `created_at`
- `seats`

#### 3. Seat availability

Choose one of these and use it consistently:

Option A, recommended:

- backend returns a richer state field, for example `booking_status`
- values like:
  - `available`
  - `booked`
  - `my_booking`
  - `maintenance`

Option B:

- backend keeps `is_available`
- frontend derives visual state using `status` plus `is_available`

Option A is cleaner if the frontend truly needs visual booking-state semantics.
Option B is simpler if we want minimal backend changes.

#### 4. Response envelope policy

Choose one:

Option A, recommended:

- success responses return plain resource payloads
- error responses use standardized envelope
- docs are updated to reflect this

Option B:

- all success and error responses use envelope
- frontend `api.ts` unwraps `data`
- all tests are updated

Option A is lower-risk and matches the current implementation better.

### Required Output

Update this section of the file or add a short decision block at the top of the
working branch/PR:

```md
Contract decisions:
- Space list:
- Space detail:
- Seat availability:
- Response envelope:
```

### Do Not Do Yet

- do not refactor backend routes yet
- do not refactor frontend hooks yet
- do not add tests yet

### Acceptance

Stage 1 is complete when all four decisions are explicit and written down.

---

## Stage 2. Backend Schema and Route Alignment

### Goal

Make backend responses match the frozen contract from Stage 1.

### Read Only If You Are In Stage 2

Relevant files:

- `backend/app/schemas/space.py`
- `backend/app/schemas/seat.py`
- `backend/app/schemas/space_rules.py`
- `backend/app/api/v1/spaces.py`
- `backend/app/api/v1/seats.py`
- `backend/app/services/space.py`
- `backend/app/services/seat.py`

### Tasks

#### 2.1 Split list and detail schemas

Create explicit response models where needed.

Recommended shape:

- `SpaceListItemResponse`
- `SpaceDetailResponse`
- `SeatNestedResponse` or reuse `SeatResponse`

Do not keep using one generic `SpaceResponse` if list and detail shapes differ.

#### 2.2 Fix `GET /spaces/:id`

Make the response model match the actual intended detail contract.

If detail includes `seats`:

- schema must define `seats`
- route must declare the detail response model
- tests must assert that `seats` exists and is correctly shaped

#### 2.3 Fix availability response

Implement the chosen Stage 1 contract.

If using `booking_status`:

- backend must return that field
- tests must assert exact values

If using `is_available`:

- backend keeps that field
- tests must assert exact field presence and meaning

#### 2.4 Floor plan endpoints

Ensure upload/delete floor plan endpoints are backed by explicit response models
and covered by tests.

#### 2.5 Exception semantics

Fix semantically wrong exception usage discovered during audit.

At minimum:

- `Email already registered` should not raise `BookingConflictError`

Introduce a more appropriate conflict/domain exception if needed.

### Required Tests

Add or update backend tests for:

- space list response shape
- space detail response shape
- availability response shape
- floor plan upload
- floor plan delete
- duplicate email registration error semantics

### Verification

Run:

```bash
cd backend && pytest
cd backend && pytest --cov=app --cov-report=term-missing
```

### Acceptance

Stage 2 is complete when:

- backend response models match frozen contracts
- backend tests assert those exact contracts
- coverage command passes

---

## Stage 3. Frontend Hook and Page Alignment

### Goal

Make the frontend consume the backend contract honestly and without unsafe casts.

### Read Only If You Are In Stage 3

Relevant files:

- `frontend/lib/api.ts`
- `frontend/lib/hooks.ts`
- `frontend/app/(dashboard)/spaces/[id]/page.tsx`
- `frontend/app/(admin)/spaces/manage/page.tsx`
- `frontend/components/SeatMap/SeatMapCanvas.tsx`
- `frontend/store/authStore.ts`
- `frontend/store/bookingStore.ts`

### Tasks

#### 3.1 Replace ad hoc interfaces with contract-true types

Define frontend types that map exactly to backend responses.

Recommended:

- `SpaceListItem`
- `SpaceDetail`
- `SeatAvailability`
- `Booking`
- `SpaceRules`

If the backend uses envelope responses for success, reflect that here.
If it does not, do not fake it.

#### 3.2 Remove unsafe contract bypasses

Remove any code like:

- `as unknown as { seats?: Seat[] }`

Replace it with real types and properly typed query hooks.

#### 3.3 Fix availability consumption

Align the space detail page with the chosen backend contract.

If using `booking_status`:

- build the map from `booking_status`

If using `is_available`:

- derive the visual state correctly from actual backend fields

#### 3.4 Validate shared detail shape

The user space detail page and the admin manage page should consume the same
formal `SpaceDetail` contract.

#### 3.5 Keep seat map visual logic coherent

Make sure seat coloring logic reflects:

- maintenance
- available
- booked
- selected/my booking

without depending on fields that do not exist.

### Required Tests

At this stage, if frontend test infrastructure does not yet exist, you may add a
temporary checklist note but do not skip implementation correctness.

### Verification

Run:

```bash
cd frontend && npm run lint
cd frontend && npm run typecheck
```

Optional manual smoke for this stage:

- open spaces page
- open a space detail page
- confirm seats render
- confirm admin manage page renders seats

### Acceptance

Stage 3 is complete when:

- no user-critical page relies on `unknown` casts for API data
- frontend hook types match backend responses
- space detail and admin manage page both work from the same real contract

---

## Stage 4. Frontend Test Infrastructure

### Goal

Create the missing frontend testing foundation so the repository can honestly
support `cd frontend && npm test`.

### Read Only If You Are In Stage 4

Relevant files to add:

- `frontend/jest.config.*`
- `frontend/jest.setup.*`
- `frontend/tests/...`
- `frontend/package.json`

### Tasks

#### 4.1 Add test dependencies

Recommended stack:

- `jest`
- `jest-environment-jsdom`
- `@testing-library/react`
- `@testing-library/jest-dom`
- `@testing-library/user-event`
- Next-compatible Jest glue

#### 4.2 Add scripts

Add:

- `test`
- `test:watch`
- optional `test:coverage`

#### 4.3 Add test utilities

Create reusable test helpers for:

- rendering with `QueryClientProvider`
- resetting Zustand state between tests
- mocking `next/navigation`
- mocking `localStorage`

#### 4.4 Prove it runs

Add at least one simple smoke test first so the command is known-good before
adding the full suite.

### Verification

Run:

```bash
cd frontend && npm test
```

### Acceptance

Stage 4 is complete when:

- `npm test` exists
- the test runner executes successfully
- at least one real test passes

---

## Stage 5. Frontend P1 Test Coverage

### Goal

Add meaningful tests for the already-implemented core flows.

### Read Only If You Are In Stage 5

Test only what the app actually implements today.
Do not write speculative tests for future pages.

### Required Test Areas

#### 5.1 Auth

Add tests for:

- login success flow
- login failure message
- register success redirect
- dashboard redirect when unauthenticated
- admin layout rejects non-admin user

#### 5.2 Spaces list

Add tests for:

- loading state
- success state
- empty state
- error state

#### 5.3 Space detail booking flow

Add tests for:

- hourly spaces show datetime inputs
- half-day/full-day spaces show slot selector
- booking success message appears
- booking failure surfaces API error
- seat clickability respects availability contract

#### 5.4 My bookings page

Add tests for:

- confirmed bookings show check-in and cancel actions
- non-confirmed bookings do not show invalid actions
- clicking actions calls the expected mutations

#### 5.5 Admin manage page

Add tests for:

- selecting a space loads detail data
- add mode creates a seat
- delete mode deletes a seat
- edit mode opens dialog and submits updates
- floor plan upload action triggers mutation

### Testing Scope Rule

These tests do not need to be true browser E2E tests.
Component/page tests with mocked hooks are acceptable for P1.

But they must validate:

- branch behavior
- basic form flow
- mutation invocation
- conditional rendering

### Verification

Run:

```bash
cd frontend && npm test
```

If available:

```bash
cd frontend && npm run test:coverage
```

### Acceptance

Stage 5 is complete when:

- all listed page groups have tests
- the test suite gives confidence in current user-critical behavior

---

## Stage 6. Backend Test Tightening

### Goal

Ensure backend tests cover the final contract and critical business rules.

This stage also includes stabilizing backend test execution itself if pytest is
currently hanging or failing to terminate in the local development environment.

### Read Only If You Are In Stage 6

Focus on missing or weak coverage that matters to the frontend or product rules.

### Tasks

- If `pytest` does not complete reliably, investigate and fix the test execution
  issue before expanding backend coverage further.
- Determine whether the hang is caused by:
  - async fixture setup/teardown
  - SQLite test database lifecycle
  - FastAPI app lifespan / scheduler startup
  - background tasks not shutting down
  - event loop configuration
  - interaction between tests and the running Docker stack

- assert exact `GET /spaces` contract
- assert exact `GET /spaces/:id` detail contract
- assert exact availability contract
- test floor-plan upload and delete routes
- test office booking slot alignment
- test office cancellation midnight deadline
- test max active booking limit per user per space
- test auth failure behavior for missing/invalid token paths

### Verification

Run:

```bash
cd backend && pytest
cd backend && pytest --cov=app --cov-report=term-missing
```

If either command hangs:

- do not mark this stage as partially complete
- treat test execution reliability as part of the stage acceptance criteria

### Acceptance

Stage 6 is complete when:

- backend pytest execution completes reliably
- backend tests prove the final contract
- booking edge cases remain protected

---

## Stage 7. CI Alignment

### Goal

Make CI enforce the same verification standard the docs describe.

### Read Only If You Are In Stage 7

Relevant file:

- `.github/workflows/ci.yml`

### Tasks

- keep backend lint
- keep backend tests
- keep frontend lint
- keep frontend typecheck
- add frontend test job
- keep docker build

Recommended CI job order:

1. backend lint
2. backend tests
3. frontend lint
4. frontend typecheck
5. frontend tests
6. docker build

Also:

- rename any misleading job titles
- ensure commands match actual package scripts

### Verification

Local verification before pushing:

```bash
cd backend && pytest
cd frontend && npm run lint
cd frontend && npm run typecheck
cd frontend && npm test
docker compose build
```

### Acceptance

Stage 7 is complete when:

- CI runs every documented verification command
- frontend tests are no longer omitted from CI

---

## Stage 8. Documentation Truth Pass

### Goal

Make project docs accurately describe the current codebase after all P1 fixes.

### Read Only If You Are In Stage 8

Relevant files:

- `AGENTS.md`
- `CLAUDE.md`
- `docs/architecture.md`
- `docs/tasks.md`
- `README.md`

### Tasks

#### 8.1 Update architecture docs

Fix:

- route examples that do not reflect actual URLs
- response format wording
- frontend page structure wording
- availability response description

Separate:

- implemented now
- planned later

#### 8.2 Update task list honesty

For any checked item:

- keep it checked only if implementation and verification are both real

For any partially done item:

- add a clarifying note
- or uncheck it if that is more accurate

#### 8.3 Update README

Replace placeholder README with:

- project overview
- stack
- local setup
- run commands
- test commands
- current implemented scope
- known next steps

#### 8.4 Keep agent docs synchronized

If both `AGENTS.md` and `CLAUDE.md` remain in the repo:

- keep them aligned
- avoid letting one become stale

### Verification

Perform a final doc read-through and confirm:

- no doc claims a route that does not exist without marking it planned
- no doc claims a test command that the repo cannot execute
- no doc claims a universal response policy that runtime does not follow

### Acceptance

Stage 8 is complete when:

- docs are trustworthy for a new engineer
- docs describe the repo that actually exists

---

## Final Acceptance Gate

Do not call the make-up pass complete until all items below are true.

### Backend

- backend schemas match frozen API contracts
- backend routes declare the correct response models
- backend tests assert exact response shapes
- backend pytest execution completes and exits normally
- `cd backend && pytest` passes
- `cd backend && pytest --cov=app --cov-report=term-missing` passes

### Frontend

- frontend hooks use real backend-aligned types
- no user-critical page relies on `unknown` casts for API data
- seat availability logic uses real fields
- `cd frontend && npm run lint` passes
- `cd frontend && npm run typecheck` passes
- `cd frontend && npm test` passes

### CI

- CI runs backend lint
- CI runs backend tests
- CI runs frontend lint
- CI runs frontend typecheck
- CI runs frontend tests
- CI runs docker build

### Docs

- `docs/architecture.md` matches the implemented route and response reality
- `docs/tasks.md` does not overstate completion
- `README.md` is meaningful and current
- `AGENTS.md` and `CLAUDE.md` are synchronized if both remain

### Manual Smoke

Perform one final smoke flow:

1. Register a user.
2. Log in.
3. View spaces.
4. Open a space detail page.
5. Select a seat.
6. Create a booking.
7. See the booking in My Bookings.
8. Check in or cancel as appropriate.
9. Log in as admin.
10. Open the manage page.
11. Confirm seats render.
12. Add, edit, or delete a seat.

No blank pages, contract errors, missing fields, or silent failures are allowed.

### Final Verification Commands

```bash
cd backend && pytest
cd backend && pytest --cov=app --cov-report=term-missing
cd frontend && npm run lint
cd frontend && npm run typecheck
cd frontend && npm test
docker compose build
```

---

## Suggested Agent Operating Pattern

If an agent is executing this file directly, use this loop:

1. Read only the current stage.
2. Summarize the exact files to touch.
3. Make the smallest coherent set of changes for that stage.
4. Run that stage's verification commands.
5. If verification fails, fix before moving on.
6. Update docs required by that stage.
7. Move to the next stage only after acceptance is satisfied.

This file should be treated as an execution playbook, not a brainstorming note.
