# My Spaces First-Phase Data Strategy

## Purpose

This document locks the first implementation strategy for `Recent Spaces` and
`Recommended Spaces` so UI work does not stall on undefined contracts.

Read together with:

- `docs/features/my-spaces/recommendation-spec.md` (full recommendation spec)
- `docs/features/my-spaces/backend-impact.md` (backend impact)
- `docs/features/my-spaces/task-breakdown.md` (delivery plan)

---

## 1. Recent Spaces

### Signal sources (v1)

| Signal | Source | Persistence |
|--------|--------|-------------|
| `booking_complete` | `bookings` table — successful bookings (status `confirmed` or `checked_in`) | Already exists |
| `opened_floorplan` | `space_visits` table — recorded on successful floorplan page initialization | Added in PR 4 |

### Definition of `opened_floorplan`

- The user navigated to a space's floorplan page **and** the page completed
  initialization (space data loaded successfully).
- A simple card click or browse exposure does **not** count.
- No additional seat or slot interaction is required.

### Aggregation

- Deduplicate by `space_id` — each space appears at most once.
- For each space, keep only the most recent meaningful event timestamp.
- Rolling window: **14 days**.

### Event priority (tie-breaking)

When timestamps are equal or additional ordering is needed:

1. `booking_complete`
2. `opened_floorplan`

### Ranking

- Primary: descending by most recent meaningful event timestamp.
- Secondary: event priority.
- Final tie-breaker: stable deterministic `space_id`.

### Selection rule

1. First take one recent booked space.
2. Then take one recent floorplan-entered space.
3. Deduplicate by `space`.
4. If more results are needed, prefer additional booked spaces first.
5. If still needed, fill from additional floorplan-entered spaces.

---

## 2. Recommended Spaces

### Candidate sources (v1)

| Source | Reason label | Dependency |
|--------|-------------|------------|
| Nearby candidates | `Near you` | Shared `location` domain — user coordinates + building coordinates |
| Popular candidates | `Popular` | `bookings` table — successful booking count |

### `Near you` dependency

- Uses browser-provided user coordinates from the location capability flow.
- Uses parent-building coordinates as the physical anchor.
- Consumes the existing `GET /api/v1/spaces/nearby` endpoint.
- Must not be redefined locally inside `My Spaces`.

### V1 feature set

| Feature | Definition | Window |
|---------|-----------|--------|
| `DistanceScore` | Geographic convenience relative to user location via parent building | Real-time |
| `AvailabilityScore` | Practical current availability for recommendation | Real-time |
| `PopularityScore` | Successful booking count, `log(1 + count)` transform, normalized within `space_type` | Rolling 30 days |
| `PreferenceLiteScore` | `0.60 * BuildingAffinityScore + 0.40 * SpaceTypeAffinityScore`, from successful bookings | Rolling 60 days |

All features normalized to `[0, 1]`.

### V1 scoring formula

```
FinalScore = 0.40 * DistanceScore
           + 0.30 * AvailabilityScore
           + 0.20 * PopularityScore
           + 0.10 * PreferenceLiteScore
```

### `PopularityScore` definition

- Derive from **successful bookings only** (not passive impressions).
- Rolling **30-day** window.
- Transform: `log(1 + booking_count_30d)`.
- Normalize within the same `space_type`.

### `PreferenceLiteScore` definition

- Derive from **successful bookings only**.
- Rolling **60-day** window.
- `BuildingAffinityScore`: normalized user affinity toward the candidate
  space's parent building.
- `SpaceTypeAffinityScore`: normalized user affinity toward the candidate
  space's `space_type`.
- Combination: `0.60 * BuildingAffinityScore + 0.40 * SpaceTypeAffinityScore`.
- Default to `0` when insufficient history.

### Exclusion and downweighting

- **Favorites**: exclude from `Recommended Spaces` by default.
- **Recents**: do not hard-exclude; apply `AdjustedScore = FinalScore * 0.85`.

### Lightweight diversity-aware reranking

- Mandatory dimension: **building diversity**.
- Approach: greedy selection — take strongest candidate first, then prefer
  candidates adding building diversity while remaining strong.

### Explanation rules

- Each card carries **one** primary explanation only.
- V1 labels: `Near you`, `Popular`.
- The backend resolves the dominant explanation before the result reaches the UI.
- Avoid generic unexplained `Recommended` labels.

---

## 3. Deduplication and Fill Rules

### Within each section

- Deduplicate by `space_id`.

### Cross-section (My Spaces page)

- Do **not** force cross-section deduplication.
- Allow the same space in multiple sections when the overlap is meaningful.
- `Recommended Spaces` should still prefer complementary results.

### For You (Home page)

- Deduplicate across the mixed stream.
- One `space` appears at most once.
- Favorite, recent, and recommended signals compete for one final card.

---

## 4. Signals Deferred Beyond V1

- `IntentMatchScore`
- `BehaviorScore`
- `CrowdScore`
- `ExplorationScore`
- Passive impression tracking
- Hover-based behavior signals
- Generic detail-view events

See `docs/features/my-spaces/recommendation-v2.md` for deferred ideas.

---

## 5. Implementation Decisions

### Backend-driven vs frontend-adapter

- Recommendation assembly should be **backend-driven** (pipeline logic in the
  backend service layer).
- The frontend consumes a ready-to-render contract, not raw signals.

### Current implementation state

- `opened_floorplan` persistence is implemented via `space_visits` table
  (PR 4).
- `booking_complete` recency is derivable from the existing `bookings` table.
- The full recommendation pipeline (PopularityScore, PreferenceLiteScore,
  reranking) is future backend work, not part of PR 4.
- The existing `GET /api/v1/spaces/nearby` endpoint provides the `Near you`
  candidate source for the current UI.
