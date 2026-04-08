# Location Task Breakdown

## Purpose

This document breaks the location feature domain into implementation-sized
tasks.

Tasks are grouped by delivery work, not by ideal architecture purity.

---

## Delivery Rules

These rules apply to every task in this feature track.

### Testing expectations

- If a task changes behavior, relevant tests should be added or updated.
- If automated coverage is not practical for a specific part, the handoff
  should say so explicitly and include a manual verification note.
- Agents may extend existing test files or add new ones when that produces
  clearer coverage.

### Verification expectations

- Frontend changes should run the most relevant frontend tests.
- Backend contract or API changes should run relevant backend tests.
- If verification is partial, the handoff should say what remains unverified.

### Default commands

Frontend-focused changes:

- `cd frontend && npm test`
- `cd frontend && npm run lint`

Backend/API changes:

- `cd backend && pytest`
- `cd backend && pytest tests/api/`

Use narrower test targets when appropriate, but do not skip verification
entirely.

---

## Effort Legend

| Size | Meaning                         |
|------|---------------------------------|
| S    | Small — less than half a day    |
| M    | Medium — roughly one day        |
| L    | Large — roughly two days        |

---

## PR Allocation Plan

This section maps tasks to pull requests.

Each PR is sized to be independently reviewable and rollbackable. Backend and
frontend work are kept in separate PRs where both sides are substantial, so
reviewers can evaluate each layer without cross-context noise.

### PR Summary

| PR | Branch | Tasks | Effort | Layer | Depends on |
|----|--------|-------|--------|-------|------------|
| 1 | `feat/location-building-coordinates` | 1, 2 | M + M | Backend | — |
| 2 | `feat/location-frontend-permission` | 3 | M | Frontend | — |
| 3 | `feat/location-nearby-buildings` | 4 | M | Backend | PR 1 |
| 4 | `feat/location-nearby-spaces-recommendation` | 5 | L | Backend | PR 3 |
| 5 | `feat/location-my-spaces-integration` | 6 | M | Frontend | PR 2, PR 4 |
| 6 | `feat/location-map-query-support` | 8 | M | Backend | PR 3 |
| 7 | `feat/location-map-surface` | 7 | L | Frontend | PR 5, PR 6 |
| 8 | `feat/location-proximity-booking-direction` | 9 | M | Docs | PR 7 |

### Dependency Flow

```
PR 2 (Task 3) ───────────────────────────────────────────────────┐
                                                                   ▼
PR 1 (Tasks 1–2) ──► PR 3 (Task 4) ──► PR 4 (Task 5) ──► PR 5 (Task 6) ──┐
                           │                                                 ▼
                           └──────────────► PR 6 (Task 8) ─────────► PR 7 (Task 7) ──► PR 8 (Task 9)
```

PR 1 and PR 2 can be opened in parallel. PR 3 through PR 8 follow the merge
chain above.

### PR Rationale

#### PR 1: `feat/location-building-coordinates` — Tasks 1 + 2

Tasks 1 and 2 are combined into a single PR because they form one complete
story: buildings can store and be managed with coordinates. Task 2's management
routes have no reviewable value without Task 1's schema, and separating them
would force reviewers to hold partial context across two consecutive backend
PRs.

Combined effort is M + M (approximately two days), which is within an
acceptable PR size for a self-contained backend domain addition.

Review focus:
- migration correctness and rollback safety
- backward compatibility with existing building list and detail APIs
- coordinate validation range enforcement
- behavior when coordinates are absent

#### PR 2: `feat/location-frontend-permission` — Task 3

Pure frontend work with no backend dependency. It can be opened and merged
in parallel with PR 1. Keeping it isolated also means the permission state
layer can be reviewed and adjusted before it is wired into recommendation
consumption in PR 5.

Review focus:
- state model for permission, loading, success, denial, and unavailable
- intentional permission trigger — no silent prompt on page load
- product continues to function without location access

#### PR 3: `feat/location-nearby-buildings` — Task 4

Backend only. Single responsibility: expose nearby building retrieval with
distance metadata. Isolated from the space recommendation logic so the
query contract can be validated and adjusted before the more complex
recommendation layer is built on top.

Review focus:
- distance calculation approach and future GIS compatibility
- API contract for distance metadata
- graceful behavior when buildings have no coordinates

#### PR 4: `feat/location-nearby-spaces-recommendation` — Task 5

Backend only. The largest and most logic-heavy backend PR in this track.
Kept separate from PR 3 so the recommendation reasoning, availability
integration, and `reason` field design can be reviewed independently without
conflating them with the simpler nearby-buildings query.

Its L effort and distinct business logic justify a standalone PR despite
being in the same iteration as PR 3.

Review focus:
- recommendation reason design and explainability
- ranking logic — proximity vs availability trade-off
- time-window filtering behavior

#### PR 5: `feat/location-my-spaces-integration` — Task 6

Frontend only. Bridges the location permission state from PR 2 and the
recommendation API from PR 4. Keeping it separate from the backend PRs
isolates all recommendation rendering, fallback states, and card layout
decisions into one reviewable frontend diff.

Review focus:
- graceful degradation when location is denied or unavailable
- recommendation reason label rendering
- fallback to non-location signals when needed

#### PR 6: `feat/location-map-query-support` — Task 8

Backend only. Although Task 8 appears after Task 7 in the task list, it is
allocated as a backend PR that precedes the frontend map PR. Separating
backend query enhancements from the frontend map surface allows each to be
reviewed independently, and ensures the map page is not blocked on a
combined backend-frontend PR that is difficult to isolate during rollback.

Review focus:
- viewport or range-aware query design
- compatibility with later spatial indexing or GIS optimization
- no regression on existing nearby building behavior from PR 3

#### PR 7: `feat/location-map-surface` — Task 7

Frontend only. The largest single frontend PR in this track. It depends on
both PR 5 (location permission and My Spaces state patterns in place) and
PR 6 (map query backend ready). The L effort and new map interaction surface
justify a dedicated PR rather than folding map work into earlier frontend
changes.

Review focus:
- map-list synchronization and consistency
- fallback when map fails to load or location is denied
- non-map browsing path remains fully functional
- performance expectations for marker rendering

#### PR 8: `feat/location-proximity-booking-direction` — Task 9

Documentation only. No code changes. Can be opened after Iteration 3 is
merged and the team has enough implementation experience to write a grounded
proximity-aware booking direction.

Review focus:
- product decision alignment
- no premature hard requirement introduced into the core booking flow
- privacy principles consistent with the rest of the location domain

---

## Iteration 1: Location Foundation

This iteration establishes the minimum domain foundation needed for any
location-aware feature work.

### Task 1: Add Building Coordinate Support

**Effort: M**

#### Goal

Add explicit coordinate support to the building model and related schemas.

#### Includes

- ORM updates for building location fields
- migration support
- schema updates for building create/update/response behavior

#### Acceptance criteria

- buildings can store latitude and longitude
- buildings without coordinates remain valid records
- coordinate support does not break existing building flows

#### Suggested verification

- `cd backend && pytest`

---

### Task 2: Add Building Location Management Path

**Effort: M**

#### Goal

Allow trusted building-management flows to create and update coordinates.

#### Includes

- route or contract support for coordinate maintenance
- validation of coordinate input ranges
- backend tests for create and update behavior

#### Acceptance criteria

- coordinates can be added during building creation or update
- invalid coordinates are rejected cleanly
- existing non-location building behavior still works

#### Suggested verification

- `cd backend && pytest`
- `cd backend && pytest tests/api/`

---

### Task 3: Add Frontend Location Permission State

**Effort: M**

#### Goal

Introduce frontend support for browser location permission and acquisition.

#### Includes

- permission-state modeling
- location acquisition handling
- loading, success, denial, and unavailable states

#### Acceptance criteria

- the frontend can request location intentionally
- denial and unavailable states are represented cleanly
- the product continues to function without location access

#### Suggested verification

- `cd frontend && npm test`
- `cd frontend && npm run lint`

---

## Iteration 2: Nearby Discovery And Recommendation

This iteration turns the foundation work into user-facing nearby discovery
value.

### Task 4: Implement Nearby Building Query Support

**Effort: M**

#### Goal

Expose nearby building retrieval based on user coordinates.

#### Includes

- service methods for nearby building lookup
- response support for distance metadata
- backend tests for nearby ordering or filtering behavior

#### Acceptance criteria

- nearby buildings can be queried with user coordinates
- results include enough distance context for consumers
- buildings without coordinates do not break the query behavior

#### Suggested verification

- `cd backend && pytest`
- `cd backend && pytest tests/api/`

---

### Task 5: Implement Nearby Space Recommendation Contract

**Effort: L**

#### Goal

Expose location-aware nearby recommendations for spaces.

#### Includes

- service logic for nearby recommendable spaces
- recommendation reason support
- optional time-window aware filtering
- backend tests for recommendation behavior

#### Acceptance criteria

- nearby space results expose one primary reason
- availability-aware filtering can be incorporated when needed
- recommendation logic remains explainable

#### Suggested verification

- `cd backend && pytest`
- `cd backend && pytest tests/api/`

---

### Task 6: Consume Nearby Recommendations In `My Spaces`

**Effort: M**

#### Goal

Use location-aware recommendation results in `My Spaces` without making that
feature own the location domain.

#### Includes

- frontend query wiring for location-aware recommendations
- recommendation reason rendering
- graceful fallback when location is unavailable

#### Acceptance criteria

- `My Spaces` can show location-aware recommended spaces
- location denial does not break the page
- location-aware cards remain compatible with the standard card system

#### Suggested verification

- `cd frontend && npm test`
- `cd frontend && npm run lint`

---

## Iteration 3: Map Experience

This iteration introduces location-driven visual exploration.

### Task 7: Define And Implement Initial Building Map Surface

**Effort: L**

#### Goal

Create the first map-based building discovery surface using the established
location model.

#### Includes

- map page or map section shell
- building marker rendering
- synchronized building list

#### Acceptance criteria

- buildings can be explored on a map
- map and list stay meaningfully aligned
- standard non-map browsing remains available

#### Suggested verification

- `cd frontend && npm test`
- `cd frontend && npm run lint`

---

### Task 8: Add Map-Oriented Query Enhancements

**Effort: M**

#### Goal

Support queries needed for practical map exploration.

#### Includes

- query tuning for map use cases
- support for range or viewport-aware retrieval if needed
- backend verification of map query behavior

#### Acceptance criteria

- map consumers can retrieve relevant building data efficiently
- query design remains compatible with later optimization

#### Suggested verification

- `cd backend && pytest`
- `cd backend && pytest tests/api/`

---

## Iteration 4: Future Location-Aware Booking Support

This iteration is intentionally deferred until the earlier domain work is
stable.

### Task 9: Explore Proximity-Aware Booking And Check-In Support

**Effort: M**

#### Goal

Define how booking or check-in may later consume location capabilities.

#### Includes

- policy clarification
- privacy review
- contract direction for proximity checks or guidance

#### Acceptance criteria

- the product has a documented direction for proximity-aware booking support
- no premature hard requirement is introduced into the core booking flow

#### Suggested verification

- documentation review

---

## Recommended Implementation Order

1. Tasks 1–3
2. Tasks 4–6
3. Tasks 7–8
4. Task 9

## Source Documents

- `docs/features/location/overview.md`
- `docs/features/location/location-capabilities.md`
- `docs/features/location/nearby-recommendation-spec.md`
- `docs/features/location/map-experience-spec.md`
