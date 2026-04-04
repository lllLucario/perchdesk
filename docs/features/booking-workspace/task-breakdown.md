# Booking Workspace Task Breakdown

## Purpose

This document breaks the booking-workspace feature into implementation-sized
tasks that can be assigned to agents without giving them the entire feature at
once.

Tasks are grouped by delivery slice, not by ideal architecture purity.

---

## Delivery Rules

These rules apply to every task and every PR in this feature track.

### Testing expectations

- If a task changes behavior, the agent should add or update relevant tests.
- If no automated test is practical for a specific change, the agent should say
  so explicitly and provide a manual verification note instead.
- Agents should prefer updating existing test files when appropriate, but they
  may create new test files when coverage would otherwise be unclear or
  awkward.

### Verification expectations

- Every implementation PR should run the most relevant frontend tests.
- If backend contracts or booking behavior are changed, the PR should also run
  relevant backend tests.
- If full end-to-end automation is not available, the PR summary should include
  a short manual verification checklist or a note explaining what remains
  unverified.

### PR summary expectations

Each PR handoff should report:

- what was implemented
- what tests were added or updated
- what commands were run
- what was not verified
- any blockers, assumptions, or contract gaps

### Default commands

Frontend-focused changes:

- `cd frontend && npm test`

Frontend lint when UI structure changes significantly:

- `cd frontend && npm run lint`

Backend/API changes:

- `cd backend && pytest`

API-specific backend changes:

- `cd backend && pytest tests/api/`

Use narrower test targets when appropriate, but do not skip verification
entirely.

---

## Effort Legend

| Size | Meaning               |
|------|-----------------------|
| S    | Small — less than half a day |
| M    | Medium — roughly one day     |
| L    | Large — roughly two days     |

---

## Task 1: Align Routing and Page Ownership

**Effort: S**

### Goal

Define or refactor the frontend routes/pages so the user-facing flow maps to the
current product direction:

`Home -> Buildings -> Spaces in Building -> Floorplan -> Confirm Modal -> Result`

### Likely areas

- `frontend/app/`
- shared layout/navigation components

### Acceptance criteria

- route structure clearly supports the current page hierarchy
- obsolete assumptions about heavy building/space detail pages are removed or
isolated
- navigation between the core booking pages is coherent

### Suggested verification

- `cd frontend && npm test`
- `cd frontend && npm run lint`

---

## Task 2: Implement Home Page Shell

**Effort: M**

### Goal

Implement the lightweight booking homepage shell described in
`docs/wireframe.md`.

### Includes

- navbar
- centered search box area
- `Recent Spaces` section
- `Nearby Buildings` section

### Acceptance criteria

- page reads as a lightweight product homepage, not an admin dashboard
- search-led layout is visible
- sections exist with placeholder or real data wiring as appropriate

### Suggested verification

- `cd frontend && npm test`
- `cd frontend && npm run lint`

---

## Task 3: Implement Buildings Page and Building Cards

**Effort: S**

### Goal

Create the building selection page as a card-list page.

### Includes

- building card grid/list
- card image
- card address
- CTA to continue

### Acceptance criteria

- users can browse multiple buildings
- each card has a clear enter action
- page is optimized for choosing a building quickly

### Suggested verification

- `cd frontend && npm test`
- `cd frontend && npm run lint`

---

## Task 4: Implement Building Detail Modal

**Effort: S**

### Goal

Support modal-based building detail without inserting a dedicated detail page in
the flow.

### Includes

- click card body opens modal
- modal fields match the agreed minimum set
- CTA `View Spaces`

### Acceptance criteria

- building modal opens and closes reliably
- CTA continues into the selected building's spaces page
- modal content stays concise and decision-oriented

### Suggested verification

- `cd frontend && npm test`
- `cd frontend && npm run lint`

---

## Task 5: Implement Spaces in Building Page and Space Cards

**Effort: S**

### Goal

Create the page that lists spaces under a selected building.

This page lives at `/buildings/[id]` and its sole purpose is **space
selection** — not building detail. The route carries the building ID as
context for filtering spaces, nothing more.

### Semantic constraint

**This page is a task-oriented selection page, not a building detail page.**

Concretely:

- the page heading must read as a space-selection action (e.g. "Spaces in
  Central Library"), not as a building profile
- building metadata such as address, description, or opening hours must NOT
  appear on this page — that information belongs in the building detail modal
  (Task 4), which is opened from the Buildings page (Task 3)
- if an agent is tempted to add building-level information here, it should
  instead surface it in the Task 4 modal

The distinction matters because the agreed UX direction avoids inserting
heavy detail pages into the primary booking path. A "Spaces in Building"
selection page keeps the flow moving; a "Building detail page" stalls it.

### Includes

- space card list/grid
- space name
- seat count
- feature icons
- CTA to continue

### Acceptance criteria

- users can compare spaces under a building quickly
- page does not become a heavy content page
- each card clearly supports moving into booking
- page contains no building-level descriptive content (address, description,
  facilities, opening hours) — those belong in the Task 4 modal only

### Suggested verification

- `cd frontend && npm test`
- `cd frontend && npm run lint`

---

## Task 6: Implement Space Detail Modal

**Effort: S**

### Goal

Support modal-based space detail with booking-oriented information.

### Includes

- click card body opens modal
- modal fields match the agreed minimum set
- CTA `Book a Seat`

### Acceptance criteria

- modal opens from the space card body
- CTA continues into the floorplan workspace
- modal emphasizes booking-relevant information

### Suggested verification

- `cd frontend && npm test`
- `cd frontend && npm run lint`

---

## Deferred Cross-Domain Note: Recent Floorplan Entry Signal

This feature track is the correct source domain for a future `recently entered
floorplan` signal, because only the booking workspace can define what counts
as a successful floorplan entry.

That signal is consumed by `My Spaces`, but it should not block the current
booking-workspace implementation sequence unless a task explicitly scopes it in.

When this signal is later implemented, it should:

- fire after floorplan initialization succeeds
- not be inferred from a simple browse click
- use dedicated persistence or event tracking rather than page-local UI state

---

## Task 7: Refactor Floorplan into Three-Column Workspace

**Effort: M**

### Goal

Make the floorplan page match the agreed workspace model.

### Includes

- left control column
- center floorplan column
- right `Booking Drafts` column

### Acceptance criteria

- center floorplan remains the dominant visual area
- desktop layout gives the floorplan about half the width
- `Booking Drafts` is persistent, not a surprising overlay

### Suggested verification

- `cd frontend && npm test`
- `cd frontend && npm run lint`

---

## Task 8: Implement Floorplan Browsing State

**Effort: M**

### Goal

Implement the default floorplan state where no draft is being edited.

### Includes

- visible draft states
- `New Draft`
- `Checkout` visibility when drafts exist

### Acceptance criteria

- workspace loads in `Browsing State`
- no draft appears actively edited by default
- existing draft selections remain legible

### Suggested verification

- `cd frontend && npm test`
- `cd frontend && npm run lint`
- add or update focused component/interaction tests for browsing-state behavior

---

## Task 9: Implement Creating Draft State

**Effort: L**

### Goal

Allow users to create a new booking draft from the floorplan workspace.

### Includes

- enter via `New Draft`
- select slots
- select seat
- `Add Draft`
- `Cancel Editing`

### Acceptance criteria

- `Add Draft` is only enabled when the draft is valid
- in-progress draft uses the active visual treatment
- existing drafts remain visible but secondary

### Suggested verification

- `cd frontend && npm test`
- `cd frontend && npm run lint`
- add or update focused component/interaction tests for draft creation behavior

---

## Task 10: Implement Editing Draft State

**Effort: M**

### Goal

Allow users to modify an existing draft.

### Includes

- enter by clicking an existing draft or its selected items
- load draft selections back into the workspace
- `Save Changes`
- `Cancel Editing`
- `Delete Draft`

### Acceptance criteria

- users can identify which draft is being edited
- draft selections are restored correctly into the workspace
- edit cancellation restores the previous saved state

### Suggested verification

- `cd frontend && npm test`
- `cd frontend && npm run lint`
- add or update focused component/interaction tests for draft editing behavior

---

## Task 11: Implement Draft Coloring and Selection Rules

**Effort: M**

### Goal

Implement the visual and interaction rules for draft ownership.

### Includes

- shared draft color across seat and slot selections
- strong visual treatment for active draft
- weaker visual treatment for stored drafts
- checkmark on selected draft items

### Acceptance criteria

- users can easily tell which items belong to which draft
- active vs. stored draft states are visually distinct
- conflicting selections are prevented according to the current product rules

### Suggested verification

- `cd frontend && npm test`
- `cd frontend && npm run lint`
- add or update focused component/interaction tests for draft coloring and
  selection rules

---

## Task 12: Implement Confirm Modal

**Effort: S**

### Goal

Show the user exactly what will be submitted before checkout without forcing a
separate full-page transition.

### Includes

- modal triggered from checkout
- draft summary
- seat summary
- selected slot summary
- note when one draft will expand into multiple bookings
- explicit confirm/cancel actions

### Acceptance criteria

- confirm modal makes draft-to-booking expansion understandable
- user can review the booking set before submission
- user can cancel and return directly to the floorplan workspace

### Suggested verification

- `cd frontend && npm test`
- `cd frontend && npm run lint`

---

## Task 13: Implement Result Page

**Effort: S**

### Goal

Show the real checkout outcome after submission.

### Includes

- success/failure per submitted booking
- partial success handling

### Acceptance criteria

- result page reflects real submission outcomes
- partial success is clearly explained

### Suggested verification

- `cd frontend && npm test`
- `cd frontend && npm run lint`

---

## Task 14: Align Frontend State and API Calls

**Effort: M**

### Goal

Make sure the frontend state model and API interaction strategy support the new
workspace.

### Includes

- state for active draft mode
- state for draft list
- state for selected slots and seat
- checkout submission behavior

### Acceptance criteria

- frontend state supports browsing/creating/editing cleanly
- data flow is consistent with the agreed UX model
- unresolved backend gaps are clearly identified rather than silently improvised

### Suggested verification

- `cd frontend && npm test`
- `cd frontend && npm run lint`
- if API contracts change, also run `cd backend && pytest`
- if API endpoint behavior changes, also run `cd backend && pytest tests/api/`

---

## Task 15: Testing and Verification

**Effort: M**

### Goal

Add or update tests to protect the new booking workspace behavior.

### Includes

- component tests where useful
- flow-level tests where feasible
- manual verification checklist for booking workspace behavior

### Acceptance criteria

- relevant frontend tests pass
- critical booking workspace paths have coverage or explicit manual verification
- regressions to the prior booking flow are identified

### Suggested verification

- `cd frontend && npm test`
- `cd frontend && npm run lint`
- if backend booking submission logic changed, run `cd backend && pytest`
- if API endpoint behavior changed, run `cd backend && pytest tests/api/`
- include a short manual verification checklist for anything not covered by
  automated tests

---

## Suggested Delivery Order

Recommended implementation sequence:

1. Task 1
2. Task 2
3. Task 3
4. Task 4
5. Task 5
6. Task 6
7. Task 7
8. Task 8
9. Task 9
10. Task 10
11. Task 11
12. Task 12
13. Task 13
14. Task 14
15. Task 15

---

## PR Grouping Plan

Tasks are grouped into four PRs by delivery boundary. Each PR delivers a
self-contained, reviewable slice of the feature.

### PR 1 — Foundation: Routing and Home (Tasks 1–2)

**Estimated effort: ~1.5 days**

| Task | Title                               | Effort |
|------|-------------------------------------|--------|
| 1    | Align Routing and Page Ownership    | S      |
| 2    | Implement Home Page Shell           | M      |

**Rationale:**
Task 1 is a prerequisite for all other work — it establishes the route
structure the whole feature builds on. Grouping it with the Home page shell
keeps PR 1 small and focused on the foundational skeleton. Both tasks avoid
touching real data-fetching logic so they are easy to review and merge first.

**Branch:** `feat/booking-workspace-pr1-foundation`

**Minimum verification:**

- `cd frontend && npm test`
- `cd frontend && npm run lint`

---

### PR 2 — Discovery: Buildings and Spaces (Tasks 3–6)

**Estimated effort: ~2.5 days** (revised from 1.5 — includes backend building entity)

| Task | Title                                              | Effort |
|------|----------------------------------------------------|--------|
| 3    | Implement Buildings Page and Building Cards        | S      |
| 4    | Implement Building Detail Modal                    | S      |
| 5    | Implement Spaces in Building Page and Space Cards  | S      |
| 6    | Implement Space Detail Modal                       | S      |

**Rationale:**
Tasks 3–6 form the discovery phase: building selection and space selection,
each with a card and a modal. They share the same card/modal pattern and are
all individually small. Grouping them in one PR allows a reviewer to assess
the full card-and-modal interaction model in a single pass and confirm the
pattern is consistent before the workspace work begins.

**Branch:** `feat/booking-workspace-pr2-discovery`

**Pre-condition — Building entity decision (resolved):**

PR 2 must ship a real `buildings` backend entity. The decision was made
before PR 2 started:

- **Decision: Option A — real backend entity**
- Add a `buildings` table: `id`, `name`, `address`, `description`,
  `opening_hours`, `facilities` (JSONB), `created_at`
- Add `building_id` FK on the `spaces` table
- Add backend CRUD routes at `GET /api/v1/buildings` and
  `GET /api/v1/buildings/:id/spaces`
- Migrate and seed with representative data
- Wire the frontend Buildings page and Spaces in Building page to these
  real endpoints

Rationale for Option A over frontend aggregation:
- `Building` is a first-class entity in the UX (its own card, modal, and
  selection step)
- Building-level attributes (address, opening hours, facilities) have no
  natural home on a space row
- Aggregating from space data would produce tech debt that blocks any future
  building-level rules or admin management

**Minimum verification:**

- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd backend && pytest` (building routes and space FK migration)
- `cd backend && pytest tests/api/`

---

### PR 3 — Core Workspace: Floorplan States and Drafts (Tasks 7–11)

**Estimated effort: ~5 days**

| Task | Title                                       | Effort |
|------|---------------------------------------------|--------|
| 7    | Refactor Floorplan into Three-Column Layout | M      |
| 8    | Implement Floorplan Browsing State          | M      |
| 9    | Implement Creating Draft State              | L      |
| 10   | Implement Editing Draft State               | M      |
| 11   | Implement Draft Coloring and Selection Rules| M      |

**Rationale:**
This is the largest and most complex PR. The five tasks are tightly coupled:
the three-column layout (T7) is the shell for the three states (T8–T10), and
the coloring system (T11) spans all three states and both columns. Splitting
them further would require incomplete intermediary states that are hard to
review in isolation. The PR is large by necessity and warrants thorough review.

**Branch:** `feat/booking-workspace-pr3-workspace`

**Minimum verification:**

- `cd frontend && npm test`
- `cd frontend && npm run lint`

Recommended additions if state logic changes are substantial:

- add/update focused component or interaction tests for draft state behavior

---

### PR 4 — Checkout: Confirm Modal, Result, State, and Tests (Tasks 12–15)

**Estimated effort: ~2.5 days**

| Task | Title                               | Effort |
|------|-------------------------------------|--------|
| 12   | Implement Confirm Modal             | S      |
| 13   | Implement Result Page               | S      |
| 14   | Align Frontend State and API Calls  | M      |
| 15   | Testing and Verification            | M      |

**Rationale:**
Task 12 adds a lightweight confirm modal inside the floorplan flow. Task 13
adds the post-submission result page. Task 14 wires up the state model and API calls that the entire workspace
depends on — it is placed here rather than earlier because the full interaction
model only becomes clear after PR 3. Task 15 adds test coverage across the
whole feature and is a natural final step before the feature branch is merged
to main.

**Branch:** `feat/booking-workspace-pr4-checkout`

**Minimum verification:**

- `cd frontend && npm test`
- `cd frontend && npm run lint`

If backend booking submission logic or API contracts change:

- `cd backend && pytest`
- `cd backend && pytest tests/api/`

---

### Summary

| PR   | Tasks  | Effort estimate | Scope                        |
|------|--------|-----------------|------------------------------|
| PR 1 | 1–2    | ~1.5 days       | Route foundation + Home      |
| PR 2 | 3–6    | ~1.5 days       | Buildings + Spaces discovery |
| PR 3 | 7–11   | ~5 days         | Floorplan workspace          |
| PR 4 | 12–15  | ~2.5 days       | Checkout + state + tests     |
| **Total** | 1–15 | **~10.5 days** |                              |

---

## Notes for Agent Assignment

Good agent prompts should reference:

- the exact task number(s)
- the source docs to follow
- what is explicitly out of scope
- what verification is expected before handoff
