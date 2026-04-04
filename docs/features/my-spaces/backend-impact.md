# My Spaces Backend Impact

## Purpose

This document records the likely backend and contract implications of the
personalized space-discovery feature.

It is not a full backend specification. It is an implementation-awareness
document so agents do not assume the current backend already supports
favorites, recents, or recommendations as first-class concepts.

## Core Principle

The first implementation should make favorites reliable before over-designing
recent-space and recommendation systems.

In particular:

- `favorite_spaces` is active product scope
- `favorite_seats` should be added now as backend groundwork
- recent-space sourcing may begin with simple derivation or adapter logic
- recommendation logic should remain lightweight and explainable in the first
  phase

## Current Backend Reality

The current backend model is centered on:

- `users`
- `buildings`
- `spaces`
- `seats`
- `bookings`
- `space_rules`

The current API model does not yet expose a personalized discovery layer for:

- saved spaces
- saved seats
- recent spaces
- recommended spaces

## Expected Impact Areas

### 1. Favorite tables

The product direction now expects two explicit favorite tables:

- `favorite_spaces`
- `favorite_seats`

Recommended database behavior:

- foreign keys to the user and target object
- unique pair constraint on the `(user_id, target_id)` combination
- cleanup via normal relational deletion behavior when a target is removed

### 2. Favorite APIs

The agreed API direction is:

- `GET /api/v1/me/favorite-spaces`
- `POST /api/v1/spaces/{space_id}/favorite`
- `DELETE /api/v1/spaces/{space_id}/favorite`
- `GET /api/v1/me/favorite-seats`
- `POST /api/v1/seats/{seat_id}/favorite`
- `DELETE /api/v1/seats/{seat_id}/favorite`

These endpoints should be treated as user-scoped preference actions, not admin
capabilities.

### 3. Favorite-state enrichment

The frontend will become simpler if standard space responses can include
favorite-state hints.

Likely direction:

- add `is_favorited: bool` to relevant space response shapes

This avoids forcing the frontend to repeatedly join generic space data against
a separate favorites list.

### 4. Recent-space sourcing

The product direction includes `Recent Spaces`, but the source of truth is not
yet fully locked.

Current first-phase direction:

- combine recently booked spaces
- combine recently entered floorplan spaces

Definition note:

- `recently entered floorplan` means the user successfully entered a space's
  floorplan page and the page completed initialization
- it does not require extra interaction after entry
- it should not be treated as equivalent to a simple browse click

Selection rule:

- first take one recent booked space
- then take one recent floorplan-entered space
- deduplicate by `space`
- if more results are needed, prefer additional booked spaces first
- if still needed, fill from additional floorplan-entered spaces

Implementation should avoid turning this into a broad page-view tracking system
in the first phase.

Current implementation note:

- if the active implementation only has booking-backed recency available, that
  should be treated as a temporary subset of the agreed signal model
- `recently entered floorplan` still requires dedicated persistence or event
  tracking and remains unfinished until a separate implementation adds it
- `My Spaces` should consume that signal, but its source-of-truth belongs to
  the booking-workspace flow that can define successful floorplan entry

### 5. Recommendation sourcing

The UI now reserves space for recommendations, but the backend should not
overreach in the first pass.

Current first-phase direction:

- combine `Near you` from the shared `location` domain
- combine `Popular`

Recommended v1 ranking direction:

- keep the pipeline lightweight and explainable
- use a simple sequence of candidate generation, hard filtering, scoring,
  downweighting, and lightweight reranking
- keep the scoring inputs limited to signals the current product can actually
  support

Recommended v1 feature set:

- `DistanceScore`
- `AvailabilityScore`
- `PopularityScore`
- `PreferenceLiteScore`

Recommended v1 formula:

`FinalScore = 0.40 * DistanceScore + 0.30 * AvailabilityScore + 0.20 * PopularityScore + 0.10 * PreferenceLiteScore`

Where `PreferenceLiteScore` should stay narrow in the first phase, for example:

- frequent building affinity
- frequent space-type affinity

`PopularityScore` v1 definition:

- derive from successful booking count only
- use a rolling 30-day window
- apply a `log(1 + booking_count_30d)` style transform before normalization
- normalize within the same `space_type`
- keep availability and crowding concerns in separate signals rather than
  blending them into popularity

`PreferenceLiteScore` v1 definition:

- derive from successful booking behavior only
- use a rolling 60-day window
- compute:
  - `BuildingAffinityScore`
  - `SpaceTypeAffinityScore`
- combine as:
  - `PreferenceLiteScore = 0.60 * BuildingAffinityScore + 0.40 * SpaceTypeAffinityScore`
- normalize both sub-scores to `[0,1]`
- default to `0` for users without enough history

`Near you` dependency direction:

- use browser-provided user coordinates from the location capability flow
- use parent-building coordinates as the physical anchor
- prefer nearby useful candidates rather than pure distance-only ranking
- preserve one primary recommendation reason in the returned contract

Selection rule:

- first take one `Near you` candidate
- then take one `Popular` candidate
- deduplicate by `space`
- if more results are needed, continue filling from the available candidate
  pools by priority

Consumer guidance:

- `For You` should consume mixed recommendation and recent sources as a
  deduplicated stream
- `My Spaces` may preserve the same `space` across multiple sections when the
  overlap is meaningful
- `Recommended Spaces` should still prefer complementary results rather than
  unnecessary repetition of favorites or recents

Recommended v1 adjustment guidance:

- exclude favorites from `Recommended Spaces` by default
- do not hard-exclude recents
- downweight recent items if they still appear in the recommendation candidate
  pool

Recommended v1 reranking guidance:

- keep reranking lightweight
- prefer building diversity first
- do not force obviously weak candidates into the final list only for variety

Contract guidance:

- each recommended card should carry one primary explanation only
- avoid a generic unexplained `Recommended` label when a specific reason can be
  shown
- heavy score breakdown fields should remain optional diagnostics rather than
  mandatory product-facing contract fields in v1

Popularity non-goals for v1:

- do not derive popularity from passive impressions
- do not derive popularity from hover-only or weak exposure events
- do not treat all-time historical volume as the default popularity signal

The important product requirement is explainability, not sophistication.

### 6. Seat favorites

Seat favorites should exist at the backend layer now so the schema and API
shape do not need to be reinvented later.

However:

- no frontend seat-favorite UX is active scope yet
- no recommendation behavior should assume seat-favorite usage yet

## Recommended Backend Stance For First Implementation

- make space favorites complete and durable
- add seat favorites at the persistence and API layer only
- keep recent-space logic simple until the product defines the preferred signal
- keep recommendation logic shallow and explainable
- prefer stable response contracts over speculative personalization logic

## Likely Schema And Contract Work

Expected backend work may include:

- new ORM models for `favorite_spaces` and `favorite_seats`
- dedicated persistence or event tracking for successful floorplan-entry recency
- migration(s) for both tables
- service methods for list/create/delete favorite actions
- user-scoped route handlers
- response-schema updates for favorite state
- integration with location-aware nearby recommendation inputs or contracts
- backend tests for duplicate prevention and access control

## Questions To Resolve During Implementation

The following questions remain open and should be decided at implementation time.

- which existing space response shapes should include `is_favorited` — to be
  decided during Task 3 (PR 2: `feat/my-spaces-favorite-contract`)

The following questions were open at authoring time and have since been
answered in `docs/features/my-spaces/recommendation-spec.md`.

- `Recent Spaces` v1 signals are `booking_complete` and `opened_floorplan`,
  with `booking_complete` taking priority — see recommendation-spec.md §2
- mixed recommendation sourcing should be assembled in backend pipeline logic,
  not in a consumer-layer adapter — see recommendation-spec.md Recommended
  Pipeline
- recommended cards must include `recommendation_reason` and
  `recommendation_reason_label` from day one — see recommendation-spec.md
  Output Contract
- recommendation diagnostics (`final_score`, partial breakdowns) should remain
  internal-only in v1 and are not mandatory product-facing contract fields —
  see recommendation-spec.md Output Contract

## Source Documents

- `docs/architecture.md`
- `docs/features/my-spaces/overview.md`
- `docs/features/my-spaces/wireframe.md`
- `docs/features/my-spaces/recommendation-spec.md`
- `docs/features/my-spaces/task-breakdown.md`
- `docs/features/location/nearby-recommendation-spec.md`

`docs/features/my-spaces/recommendation-v2.md` is future-only context and does
not define required backend scope for v1.
