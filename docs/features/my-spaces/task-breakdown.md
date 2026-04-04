# My Spaces Task Breakdown

## Purpose

This document breaks the personalized space-discovery feature into
implementation-sized tasks and maps those tasks to pull requests.

Tasks are grouped by delivery work, not by ideal architecture purity.
The PR allocation plan binds tasks to branches and defines merge dependencies.

This task plan reflects the v1 implementation baseline.

`docs/features/my-spaces/recommendation-v2.md` is not part of the required v1
task scope.

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
| 1 | `feat/my-spaces-favorite-backend` | 1, 2 | M + M | Backend | — |
| 2 | `feat/my-spaces-favorite-contract` | 3 | S | Backend + FE types | PR 1 |
| 3 | `feat/my-spaces-favorite-card` | 4 | M | Frontend | PR 2 |
| 4 | `feat/my-spaces-floorplan-recency` | 5, 9 | M + S | Backend + Frontend + Docs | PR 1 |
| 5 | `feat/my-spaces-for-you` | 6 | M | Frontend | PR 3, PR 4 |
| 6 | `feat/my-spaces-page` | 7, 8, 10 | M + S + S | Frontend | PR 5 |
| 7 | `feat/my-spaces-docs-final` | 11 | S | Docs | PR 6 |

### Dependency Flow

```
PR 1 (Tasks 1–2) ──► PR 2 (Task 3) ──► PR 3 (Task 4) ──────────────────────┐
     │                                                                         ▼
     └──────────────────────────────► PR 4 (Tasks 5, 9) ──► PR 5 (Task 6) ──► PR 6 (Tasks 7, 8, 10) ──► PR 7 (Task 11)
```

PR 1 must merge before PR 2 and PR 4. PR 3 and PR 4 can proceed in parallel
once their respective prerequisites are merged. PR 5 requires both PR 3 and
PR 4.

### PR Rationale

#### PR 1: `feat/my-spaces-favorite-backend` — Tasks 1 + 2

Tasks 1 and 2 are combined into a single PR because they form one complete
backend story: favorites can be stored and managed. Task 2's service methods
and route handlers have no reviewable value without Task 1's schema, and
separating them would force reviewers to hold partial context across two
consecutive backend PRs.

Combined effort is M + M (approximately two days), which is acceptable for a
self-contained backend domain addition.

Review focus:

- migration correctness and rollback safety
- uniqueness constraint on `(user_id, space_id)` and `(user_id, seat_id)` pairs
- seat-favorite endpoints exist at the API level even without active frontend use
- user-scoped access control on all favorite actions

#### PR 2: `feat/my-spaces-favorite-contract` — Task 3

Small standalone PR. Its purpose is to make `is_favorited` available on
standard space responses so the frontend does not need extra joining logic.
Isolating this enrichment step lets reviewers verify the contract change
without conflating it with either the persistence backend (PR 1) or the
card interaction frontend (PR 3).

Review focus:

- `is_favorited` appears on all relevant space response shapes
- favorite state is evaluated per authenticated user, not globally
- no regression on existing space list or detail endpoints

#### PR 3: `feat/my-spaces-favorite-card` — Task 4

Pure frontend work. Builds the star toggle affordance on top of the enriched
contract from PR 2. Keeping it isolated from the My Spaces page itself means
the interaction pattern and mutation behavior can be reviewed and adjusted
before being composed into larger page surfaces.

Review focus:

- star reflects server-backed state, not only optimistic local state
- mutation failure does not leave the star in an inconsistent position
- the same star behavior is consistent across all space-card surfaces

#### PR 4: `feat/my-spaces-floorplan-recency` — Tasks 5 + 9

Tasks 5 and 9 are combined because Task 9 (data strategy documentation) is
the specification that locks how floorplan entry in Task 5 will be persisted
and consumed. Merging the docs and the implementation together in one PR
ensures the accepted strategy and the actual code do not drift at the point
of first implementation.

This PR can proceed in parallel with PR 3 after PR 1 merges, because it
depends only on the established backend patterns from PR 1, not on the
contract enrichment or card interaction work.

Review focus:

- successful floorplan entry is clearly distinguished from a simple card click
- the persistence model is user-scoped and space-scoped
- the event is usable by `Recent Spaces` aggregation without rework
- data strategy docs in Task 9 align with the implemented behavior

#### PR 5: `feat/my-spaces-for-you` — Task 6

Frontend only. The first user-facing personalized surface. It depends on
both PR 3 (favorite star in place) and PR 4 (recency signal available) so
the mixed stream can actually render. Keeping it as a standalone PR before
the full My Spaces page allows the mixed-stream deduplication logic and
compact layout to be evaluated independently.

Review focus:

- mixed stream deduplication ensures one space appears at most once
- section reads as curated rather than three separate report rows
- path into `My Spaces` is present and reachable
- sparse-state behavior is coherent for new users

#### PR 6: `feat/my-spaces-page` — Tasks 7 + 8 + 10

Tasks 7, 8, and 10 are combined into a single PR because they collectively
define the complete My Spaces page experience. Task 8 (card decoration rules)
and Task 10 (empty states) only add reviewable value in the context of the
page structure from Task 7. Separating them into three sequential PRs would
produce two thin PRs that are difficult to evaluate without seeing the full
page.

Combined effort is M + S + S (approximately one and a half days).

Review focus:

- sections appear in the agreed order: Favorites, Recents, Recommended
- initial visible density matches the target (2 / 2 / 4)
- card decorations follow the rules — star only for favorites, supporting
  line for recents, ribbon for recommended
- empty sections do not produce broken carousels
- the page does not collapse into a generic all-spaces directory

#### PR 7: `feat/my-spaces-docs-final` — Task 11

Documentation only. No code changes. Opened after PR 6 merges and the
implementation is stable enough to identify any document drift.

Review focus:

- feature docs do not contradict implemented behavior
- architecture notes stay aligned with favorites and personalized-discovery
  direction

---

## Iteration 1: Favorites Foundation

This iteration establishes the minimum persistence and UI interaction needed
for the personalized discovery layer to exist.

## Task 1: Add Favorite Persistence Models

**Effort: M**

### Goal

Add backend persistence for space favorites and seat favorites.

### Includes

- ORM model for `favorite_spaces`
- ORM model for `favorite_seats`
- migration covering both tables
- uniqueness constraints to prevent duplicates

### Acceptance criteria

- both tables exist in the schema
- duplicate favorite creation is prevented
- schema supports future seat-favorite expansion without frontend activation

### Suggested verification

- `cd backend && pytest`

---

## Task 2: Implement Favorite Services And API Endpoints

**Effort: M**

### Goal

Expose user-scoped API operations for favorite create, delete, and list
behavior.

### Includes

- service methods for listing favorite spaces
- service methods for listing favorite seats
- service methods for favorite create/delete actions
- route handlers for the agreed endpoints
- backend API tests

### Acceptance criteria

- users can favorite and unfavorite spaces
- users can list favorite spaces
- seat-favorite endpoints exist and work at the backend level
- users cannot create duplicate favorites
- favorite actions remain user-scoped

### Suggested verification

- `cd backend && pytest`
- `cd backend && pytest tests/api/`

---

## Task 3: Enrich Space Contracts With Favorite State

**Effort: S**

### Goal

Make it practical for the frontend to render favorite state on standard space
cards.

### Includes

- add favorite-state hints to relevant space response shapes
- update service queries as needed
- update frontend type definitions if contracts change

### Acceptance criteria

- the frontend can determine whether a space is favorited without awkward
  client-side joining
- favorite state is consistent across standard space-card surfaces

### Suggested verification

- `cd backend && pytest`
- `cd frontend && npm test`

---

## Task 4: Add Favorite Interaction To Standard Space Cards

**Effort: M**

### Goal

Enable card-level favorite and unfavorite behavior wherever standard space
cards are already used.

### Includes

- right-top favorite star affordance
- mutation wiring for add/remove favorite
- optimistic or responsive UI state handling
- tests for favorite interaction behavior

### Acceptance criteria

- users can toggle favorite state directly from a space card
- the star state reflects server-backed favorite state
- the same favorite affordance behaves consistently across applicable space
  surfaces

### Suggested verification

- `cd frontend && npm test`
- `cd frontend && npm run lint`

---

## Iteration 2: Recency Signal And Data Strategy

This iteration establishes the source of truth for the `recently opened
floorplan` signal and locks the first-phase data strategy for both `Recent
Spaces` and `Recommended Spaces` so the personalized surface work does not
stall on undefined contracts.

## Task 5: Persist Successful Floorplan-Entry Recency

**Effort: M**

### Goal

Create the source of truth for the `recently opened floorplan` signal used by
`Recent Spaces`.

### Includes

- define the persistence or event-tracking model for successful floorplan entry
- record a floorplan-entry event only after the page successfully initializes
- ensure the signal is user-scoped and space-scoped
- make the event usable by `Recent Spaces` aggregation

### Acceptance criteria

- `recently opened floorplan` is persisted or tracked as a first-class signal
- simple card clicks do not count as floorplan entry
- the resulting data can be queried per user and deduplicated by `space`
- the signal can be consumed alongside booking-backed recency

### Suggested verification

- `cd backend && pytest`
- `cd frontend && npm test`

---

## Task 9: Define First-Phase Recent And Recommendation Data Strategy

**Effort: S**

### Goal

Lock the first implementation strategy for `Recent Spaces` and
`Recommended Spaces` so UI work does not stall.

### Includes

- document the first mixed-source strategy for recent spaces
- document the first mixed-source strategy for recommended spaces
- define deduplication and fill behavior
- define the dependency on location-owned `Near you` inputs
- define the lightweight v1 recommendation feature set and formula
- decide whether recommendations are backend-driven, frontend-adapter-driven,
  or hybrid in phase one
- align contract expectations with implementation reality

### Acceptance criteria

- first-phase `Recent Spaces` sourcing is explicitly chosen as:
  - recently booked spaces
  - recently opened floorplan spaces
- first-phase `Recommended Spaces` sourcing is explicitly chosen as:
  - `Near you` from the shared `location` domain
  - `Popular`
- the v1 recommendation feature set is explicitly limited to:
  - `DistanceScore`
  - `AvailabilityScore`
  - `PopularityScore`
  - `PreferenceLiteScore`
- the v1 recommendation formula is explicitly documented
- `PopularityScore` is explicitly defined as:
  - successful bookings only
  - rolling 30-day window
  - `log(1 + booking_count_30d)` style transform
  - normalization within `space_type`
- `PreferenceLiteScore` is explicitly defined as:
  - successful bookings only
  - rolling 60-day window
  - `BuildingAffinityScore`
  - `SpaceTypeAffinityScore`
  - `0.60 / 0.40` weighted combination
- deduplication and fill rules are explicitly chosen
- the dependency of `Near you` on user location plus building coordinates is
  explicitly documented
- each card has one primary displayed explanation only
- `recently opened floorplan` is explicitly defined as successful floorplan
  entry with page initialization completed, not just a card click
- no implementation depends on an undefined recommendation engine

### Notes

Signals intentionally deferred beyond v1 include:

- `IntentMatchScore`
- `BehaviorScore`
- `CrowdScore`
- `ExplorationScore`

### Suggested verification

- documentation review
- manual contract review during implementation

---

## Iteration 3: Personalized Surfaces

This iteration delivers the two user-facing personalized surfaces: the compact
`For You` section on `Home` and the fuller `My Spaces` page. Both surfaces
depend on the favorites interaction and recency signal from earlier iterations.

## Task 6: Implement Home `For You` Section

**Effort: M**

### Goal

Add the compact personalized `For You` section to the `Home` page.

### Includes

- section shell and heading
- mixed stream of favorite, recent, and recommended spaces
- route into `My Spaces`
- compact horizontal layout
- mixed-stream deduplication by `space`

### Acceptance criteria

- `For You` appears on `Home`
- the section reads as a curated personalized area, not three separate reports
- cards remain standard `SpaceCard` instances
- users can continue into `My Spaces`
- one `space` appears at most once in the mixed stream

### Suggested verification

- `cd frontend && npm test`
- `cd frontend && npm run lint`

---

## Task 7: Implement `My Spaces` Page

**Effort: M**

### Goal

Create the fuller personalized destination page for spaces.

### Includes

- route and page shell
- canonical route at `/my-spaces`
- `Favorite Spaces` section
- `Recent Spaces` section
- `Recommended Spaces` section
- horizontal scrolling behavior per section
- section-level deduplication without forced cross-section deduplication

### Acceptance criteria

- `My Spaces` exists as a dedicated page
- sections appear in the agreed order
- first visible density roughly matches:
  - favorites: 2
  - recent: 2
  - recommended: 4
- the page does not collapse into a generic all-spaces directory
- each section deduplicates by `space`
- the same `space` may still appear across multiple sections

### Suggested verification

- `cd frontend && npm test`
- `cd frontend && npm run lint`

---

## Task 8: Implement Personalized Card Context Rules

**Effort: S**

### Goal

Apply the agreed contextual display rules for favorite, recent, and
recommended cards.

### Includes

- favorite cards rely on star state without duplicate reason messaging
- recent cards support one lightweight supporting line
- recommended cards support a left-top ribbon reason

### Acceptance criteria

- favorite cards do not show redundant recommendation ribbons
- recent cards can show lightweight use-context copy
- recommended cards can show a ribbon reason without becoming visually heavy

### Suggested verification

- `cd frontend && npm test`
- `cd frontend && npm run lint`

---

## Task 10: Add Empty States And Sparse-State Behavior

**Effort: S**

### Goal

Make `For You` and `My Spaces` useful even when a user has little or no
personalized history.

### Includes

- sparse personalized state handling on `Home`
- empty section handling on `My Spaces`
- guidance for when to hide versus show empty sections

### Acceptance criteria

- new or low-activity users still see a coherent experience
- `My Spaces` does not render broken empty carousels
- empty-state behavior matches the feature docs

### Suggested verification

- `cd frontend && npm test`
- manual visual verification

---

## Iteration 4: Documentation Consistency

This iteration is intentionally deferred until the implementation is stable
enough to identify any drift between the docs and the shipped behavior.

## Task 11: Add End-To-End Documentation Consistency

**Effort: S**

### Goal

Ensure implementation-facing docs remain aligned once contracts and UI
boundaries are settled.

### Includes

- update `overview.md`, `wireframe.md`, `frontend-scope.md`, and
  `backend-impact.md` if implementation reveals a necessary adjustment
- update `docs/architecture.md` when contract-level backend decisions settle

### Acceptance criteria

- feature docs do not contradict implemented behavior
- architecture notes stay aligned with favorites and personalized-discovery
  direction

### Suggested verification

- documentation review
