# My Spaces Overview

## Purpose

This feature defines the personalized discovery layer for recurring booking
behavior.

It covers:

- the standalone `My Spaces` page
- the `For You` section on `Home`
- user favorites for spaces
- preparatory backend support for seat favorites

This feature is not just a favorites list. Its purpose is to help users return
to relevant spaces faster without making `space` the only global browsing
surface.

## Recommended Reading Order

1. `docs/features/my-spaces/overview.md`
2. `docs/features/my-spaces/wireframe.md`
3. `docs/features/my-spaces/frontend-scope.md`
4. `docs/features/my-spaces/backend-impact.md`
5. `docs/features/my-spaces/recommendation-spec.md`
6. `docs/features/my-spaces/task-breakdown.md`
7. `docs/features/my-spaces/recommendation-v2.md`

Read `recommendation-v2.md` only as future direction.

It is not part of the v1 implementation baseline.

## Problem Statement

`Space` is the direct booking object, but it is not always the right primary
information-organizing layer.

As the product grows to support multiple buildings and many spaces per
building, a flat all-spaces browsing page becomes heavy and repetitive. Users
would need to scan many similarly named spaces such as `Building A - L1 - Room
B` and `Building A - L1 - Room E`, even when their real intent is simply to go
back to a familiar space and start booking.

This feature introduces a dedicated personalized layer so the product can do
both:

- keep `Buildings` as the structured browsing entry point
- expose relevant spaces directly when the user already has intent

## Information Architecture Direction

### Buildings

`Buildings` remains the systemized browsing and exploration entry point.

It answers:

- where to look
- how spaces are grouped

### My Spaces

`My Spaces` is a standalone page for personalized access to spaces that are
more likely to matter to the current user.

Canonical route:

- `/my-spaces`

It answers:

- which spaces matter to me
- which spaces I should return to first

### Space

`Space` remains the concrete booking object that the user enters to complete a
reservation flow.

It should not become the only top-level discovery structure.

## Feature Summary

The feature has two surfaces:

1. `For You` on `Home`
2. `My Spaces` as a dedicated page

These surfaces share the same underlying signals:

- `Favorite Spaces`
- `Recent Spaces`
- `Recommended Spaces`

They differ in density and intent.

### For You

`For You` is a lightweight summary section on the `Home` page.

It should:

- surface a small personalized set of spaces
- help the user quickly resume a booking journey
- avoid becoming a full management page
- deduplicate results across the mixed stream so one space appears at most once

### My Spaces

`My Spaces` is the fuller personalized destination.

It should:

- expose favorites, recents, and recommendations with more room
- let the user consume these lists in one place
- avoid becoming a duplicate all-spaces directory
- preserve section meaning even when the same space is relevant in more than
  one section

## In Scope

- favorite spaces
- `For You` on `Home`
- `My Spaces` page
- reuse of standard `SpaceCard` presentation
- recent-space surfacing
- recommendation placeholder model and UI hooks
- backend schema and API groundwork for seat favorites

## Out of Scope

- a standalone `Favorites` page
- a dedicated all-spaces redesign in this feature
- seat-favorite frontend UI
- advanced recommendation algorithms
- major global navigation redesign
- replacing `Buildings` as the system browse surface

## Core UX Decisions

### Favorites are part of a broader personalized layer

Favorites should not be treated as a standalone product area.

They are one strong signal inside a broader personalized space-entry system.

### For You uses mixed display

`For You` should mix favorite, recent, and recommended spaces in one stream
rather than separating them into three full sections.

The section should feel curated, not report-like.

### My Spaces uses sectioned display

`My Spaces` should present content in explicit sections:

- `Favorite Spaces`
- `Recent Spaces`
- `Recommended Spaces`

This page is the fuller consumption surface and can afford clearer grouping.

Section deduplication guidance:

- deduplicate within each section
- do not force cross-section deduplication between `Favorite Spaces`,
  `Recent Spaces`, and `Recommended Spaces`
- allow the same space to appear in more than one section when that overlap is
  meaningful
- `Recommended Spaces` should still prefer to complement the earlier sections
  rather than repeat them unnecessarily

### Space cards are shared

`For You`, `My Spaces`, and other browsing surfaces should reuse the same
standard `SpaceCard` structure.

This feature should not introduce a separate visual card system for spaces.

Differences should come from lightweight contextual decoration, not from a new
card layout.

## Card Presentation Rules

### Shared card content

The base card should remain consistent with the standard space card used
elsewhere in the product.

### Favorite spaces

If a card appears because the space is favorited:

- the right-top favorite star is the main signal
- no additional recommendation ribbon is needed
- no duplicate `Favorite` explanation text is required by default

### Recent spaces

Recent spaces may include a lightweight line of supporting copy, such as a
recent visit or booking hint.

They should not use the recommendation ribbon.

### Recommended spaces

Recommended spaces should be visually distinguished with a lightweight ribbon
badge at the left-top of the card.

The ribbon should communicate the recommendation reason, not just the generic
fact that the card is recommended.

Examples of acceptable first-phase reasoning labels:

- `Near you`
- `Popular`

The exact recommendation logic can remain shallow in the first iteration as
long as the UI preserves the ability to explain why the card is present.

## Data Model Direction

The product direction is to use two explicit favorite tables rather than a
single polymorphic favorites table:

- `favorite_spaces`
- `favorite_seats`

Rationale:

- simpler relational constraints
- easier query logic
- easier testing and serialization
- better fit for the current domain model

### favorite_spaces

This table is active in the first implementation phase.

It supports:

- user favoriting of spaces
- personalized surfacing in `For You`
- dedicated listing in `My Spaces`

### favorite_seats

This table should be added at the backend level now, but seat-favorite
behavior remains dormant in the frontend until a clearer product surface
exists.

Current intent:

- preserve future expansion space
- avoid later schema rework
- do not force premature seat-favorite UI design

## API Direction

Planned API structure:

- `GET /api/v1/me/favorite-spaces`
- `POST /api/v1/spaces/{space_id}/favorite`
- `DELETE /api/v1/spaces/{space_id}/favorite`
- `GET /api/v1/me/favorite-seats`
- `POST /api/v1/seats/{seat_id}/favorite`
- `DELETE /api/v1/seats/{seat_id}/favorite`

Response models should eventually support favorite-state hints on standard
space and seat payloads so the frontend can render stars without extra joining
logic.

## Recommendation Strategy

The recommendation area is intentionally staged.

### First phase

- keep recommendation logic lightweight
- allow recommendation UI to exist without a complex scoring system
- favor explainability over sophistication
- use mixed first-phase sourcing rather than a single rigid signal

Current first-phase direction:

- `Recent Spaces` should combine:
  - recently booked spaces
  - recently opened floorplan spaces
- `Recommended Spaces` should combine:
  - `Near you`
  - `Popular`

Recommended v1 pipeline shape:

- candidate generation
- hard filtering
- lightweight feature scoring
- de-duplication and downweighting
- diversity-aware re-ranking

Recommended v1 scoring should remain intentionally narrow.

Keep in v1:

- `DistanceScore`
- `AvailabilityScore`
- `PopularityScore`
- `PreferenceLiteScore`

`PopularityScore` v1 definition:

- derive from successful booking count only
- use a rolling 30-day window
- apply a `log(1 + booking_count_30d)` style transform
- normalize within the same `space_type`
- keep popularity separate from availability and crowding logic

`PreferenceLiteScore` v1 definition:

- derive from successful booking behavior only
- use a rolling 60-day window
- combine:
  - `BuildingAffinityScore`
  - `SpaceTypeAffinityScore`
- use:
  - `PreferenceLiteScore = 0.60 * BuildingAffinityScore + 0.40 * SpaceTypeAffinityScore`
- normalize both sub-scores to `[0,1]`
- default to `0` when the user does not yet have enough history

Defer to v2:

- `IntentMatchScore`
- `BehaviorScore`
- `CrowdScore`
- `ExplorationScore`
- heavy diagnostic output as product contract

Implementation status:

- `Recent Spaces` now combines booking-backed recency and floorplan-entry
  recency (`space_visits` table, recorded on successful floorplan page
  initialization)
- only successful bookings (`confirmed` / `checked_in`) are included;
  `cancelled` and `expired` bookings are filtered out
- bookings take priority over floorplan visits; the list is deduplicated by
  `space`

Selection behavior should follow priority plus fill rules rather than a fixed
hard-coded quota.

Implementation note:

- `Near you` should be consumed from the shared `location` domain rather than
  redefined inside `My Spaces`
- the physical anchor for `Near you` is the parent building's coordinates
- `Near you` should prefer nearby useful candidates rather than pure distance
  alone
- `recently opened floorplan` means the user successfully entered a space's
  floorplan view and the page completed initialization
- it does not require extra interaction after entry
- it is stronger than a simple card click, but weaker than a successful booking
- `Popular` should be derived from successful booking behavior rather than weak
  passive exposure
- `Popular` should use a 30-day successful-booking window rather than all-time
  accumulation
- signal ownership and source-of-truth details should be defined in
  `docs/features/booking-workspace/*.md`
- each card should still expose only one clear primary explanation
- recommendation cards should show one primary ribbon reason
- favorite cards should continue to rely on the favorite star only

### Later phase

Future recommendation logic may incorporate:

- richer intent matching
- session behavior modeling
- crowd and comfort correction
- exploration and novelty support
- facility quality
- parking availability
- historical user behavior

This should be treated as an enhancement path, not as a blocker for favorites
or `My Spaces`.

Nothing in `docs/features/my-spaces/recommendation-v2.md` is required for v1
implementation.

## Implementation Phasing

### Phase 1 (complete)

- `favorite_spaces` and `favorite_seats` persistence and API — complete
- `is_favorited` enrichment on space responses — complete
- `SpaceCard` with favorite star toggle (optimistic UI) — complete
- `space_visits` floorplan-entry recency tracking — complete
- `For You` on `Home` with mixed personalized stream — complete
- `My Spaces` page with `Favorite Spaces`, `Recent Spaces`, and
  `Recommended Spaces` sections — complete
- `Recommended Spaces` consumes `Near you` via `GET /api/v1/spaces/nearby` —
  complete

### Phase 2

- refine recent-space sourcing and ranking
- improve recommendation signals and explanation quality

### Phase 3

- revisit seat-favorite frontend UX once a clear consumption surface exists

## Relationship To Existing Booking Flow

This feature complements the current booking flow rather than replacing it.

The intended high-level path becomes:

`Home -> For You or Buildings -> Spaces in Building / My Spaces -> Floorplan -> Confirm -> Result`

`Buildings` remains the structured browse path.

`For You` and `My Spaces` act as personalized shortcuts into that flow.
