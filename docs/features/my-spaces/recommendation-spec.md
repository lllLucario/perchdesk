# My Spaces Recommendation Spec

## Purpose

This document defines the ranking and recommendation logic for the `My Spaces`
feature.

It is the implementation-facing source of truth for:

- section-level ranking behavior
- candidate sourcing
- filtering
- feature engineering
- scoring
- de-duplication
- downweighting
- lightweight diversity-aware reranking
- output contract expectations

This document does not define:

- page layout
- visual card structure
- ribbon styling
- copywriting beyond recommendation labels
- general `My Spaces` product goals

Read together with:

- `docs/features/my-spaces/overview.md`
- `docs/features/my-spaces/frontend-scope.md`
- `docs/features/my-spaces/backend-impact.md`
- `docs/features/my-spaces/task-breakdown.md`
- `docs/features/location/nearby-recommendation-spec.md`

This document defines the active v1 recommendation baseline.

`docs/features/my-spaces/recommendation-v2.md` contains deferred ideas only and
must not be treated as required implementation scope for v1.

## Scope

This spec covers the three `My Spaces` sections:

1. `Favorite Spaces`
2. `Recent Spaces`
3. `Recommended Spaces`

These are three separate ranking pipelines.

They must not be treated as one shared ranked list split into three visual
groups.

## Ownership Boundaries

### My Spaces owns

- favorite ranking logic
- recent ranking logic
- recommendation candidate mixing
- recommendation scoring and reranking
- section-level de-duplication rules
- cross-section repetition policy for the `My Spaces` page

### My Spaces does not own

- location permission UX
- building coordinate modeling
- nearby-query semantics
- browser location acquisition
- generalized location-domain recommendation contracts

Those belong to the `location` domain.

## Product Intent

`My Spaces` is a personalized destination where users can:

- quickly return to spaces they already care about
- revisit spaces they recently used
- discover other relevant spaces inferred by the system

The ranking system should therefore optimize for:

- usefulness
- explainability
- low surprise
- low duplication
- lightweight discovery

It should not optimize for:

- novelty at all costs
- opaque algorithmic behavior
- heavy prediction systems in v1

## Shared Terminology

### Meaningful interaction

For the purposes of `My Spaces`, a meaningful interaction is stronger than a
passive browse exposure.

### Recently booked

A space the user successfully booked.

### Recently opened floorplan

A space where the user successfully entered the floorplan page and that page
completed initialization.

This does not require additional seat or slot interaction.

This is stronger than a card click, but weaker than a successful booking.

### Near you

A recommendation reason consumed from the shared `location` domain.

It is based on:

- user location
- parent-building coordinates
- nearby useful candidate evaluation

It must not be redefined locally inside `My Spaces`.

### Popular

A recommendation reason based on successful booking behavior only.

V1 definition:

- successful booking count only
- rolling 30-day window
- `log(1 + booking_count_30d)` style transform
- normalized within the same `space_type`

It should not be derived from:

- passive impressions
- hover-only events
- weak exposure counts
- all-time booking totals by default

## Section Pipelines

## 1. Favorite Spaces

### Definition

Spaces explicitly favorited by the user.

### Product goal

Rank favorites by likely return value, not by favorite creation order.

This is not a discovery or recommendation list.

It is a relationship-based ranking problem.

### Input

All spaces favorited by the current user.

### Eligible ranking signals

V1 allowed signals:

- successful booking recency
- successful booking frequency
- recent floorplan-entry recency if available
- favorite creation time as fallback only

V1 deferred signals:

- generic detail view recency
- weak passive browse signals
- heavy session-behavior modeling

### Suggested v1 features

#### FavoriteRecencyScore

Measures how recently the user meaningfully returned to the favorited space.

Preferred v1 signal order:

1. recent successful bookings
2. recent floorplan entry
3. favorite creation time fallback

#### FavoriteFrequencyScore

Measures how often the user has successfully booked the space historically
within a practical recent horizon.

### Suggested v1 formula

`FavoriteScore = 0.60 * FavoriteRecencyScore + 0.40 * FavoriteFrequencyScore`

Both subscores should be normalized to `[0,1]`.

### Sorting

Sort descending by `FavoriteScore`.

Fallback tie-breakers:

1. most recent meaningful interaction
2. favorite creation time desc
3. stable deterministic `space_id`

### De-duplication

- deduplicate by `space_id` within the section
- do not remove a favorite space from other sections on the `My Spaces` page
  if it is also legitimately recent

### Non-goals

Do not sort favorites by:

- alphabetical order
- favorite creation time only
- static manual order by default

Those may be future user controls, but should not be the default intelligent
ordering.

## 2. Recent Spaces

### Definition

Spaces the user interacted with meaningfully in the recent past.

### Product goal

Reflect recent activity clearly and simply.

This is not a recommendation list.

### Allowed v1 signals

- `booking_complete`
- `opened_floorplan`

### Explicitly excluded from v1

- passive impression-only events
- hover-only events
- generic detail-view events
- weak list exposure signals

### Aggregation window

Use a rolling recent window appropriate for user-facing history.

Recommended v1 window:

- last 14 days

### Aggregation rule

If multiple recent events exist for the same `space_id`:

- keep only the most recent meaningful event for section ranking purposes

The section must be deduplicated by `space_id`.

### Event priority

When timestamps are equal or additional tie-breaking is needed:

1. `booking_complete`
2. `opened_floorplan`

### Ranking

Primary sort:

- descending by most recent meaningful event timestamp

Secondary sort:

- event priority

Final tie-breaker:

- stable deterministic `space_id`

### Notes

Recent should remain stable, transparent, and easy to explain.

Do not overcomplicate `Recent Spaces` with recommendation logic.

## 3. Recommended Spaces

### Definition

Spaces inferred by the system to be relevant now.

### Product goal

Recommend spaces that the user is likely to find useful in the current
context, while avoiding obvious duplication of favorites and recents.

This is the only section that uses the main recommendation algorithm.

## Recommended Pipeline

### Sequence

The v1 recommendation pipeline should follow this order:

1. candidate generation
2. hard filtering
3. feature engineering
4. scoring
5. exclusion and downweighting
6. sorting
7. lightweight diversity-aware reranking
8. final output selection

### Candidate generation

Build a candidate pool of spaces worth scoring.

#### Required runtime context

- `user_id`
- `current_time`
- current location-aware nearby results or inputs when available

#### Optional runtime context

- current user location availability state
- active booking-mode context if relevant
- user preference aggregates

#### Candidate sources for v1

##### A. Nearby candidates

Spaces surfaced through the shared `location` domain as nearby useful
candidates.

These provide the `Near you` pathway.

##### B. Popular candidates

Spaces surfaced through successful-booking-based popularity scoring.

These provide the `Popular` pathway.

##### C. Preference-adjacent candidates

Spaces that match narrow historical preference signals such as:

- frequent building affinity
- frequent `space_type` affinity

This is a lightweight supporting source, not a full personalization system.

### Hard filtering

Apply hard constraints before scoring.

#### Required filters

- user can access the space
- space is open and valid for ordinary use
- space is not permanently disabled
- space has recommendable availability for the current product mode

#### Optional filters

Depending on product mode and available context:

- `space_type` compatibility
- building-level availability
- site or campus restriction

Do not score candidates that fail hard constraints.

### Feature engineering

All v1 features should be normalized to `[0,1]` where practical.

#### 1. DistanceScore

Definition:

- how geographically convenient the space is relative to the user

V1 direction:

- use user coordinates from the `location` capability flow
- use parent-building coordinates as the physical anchor
- prefer smooth decay rather than hard cutoffs when possible

Distance should support the `Near you` explanation, but should not be treated
as the only criterion.

#### 2. AvailabilityScore

Definition:

- how practically available the space is for recommendation right now

V1 direction:

- prefer spaces with usable current availability
- use current availability or current recommendable capacity, depending on the
  available backend contract

Availability is distinct from popularity and must remain a separate signal.

#### 3. PopularityScore

Definition:

- how broadly attractive the space is based on strong recent usage

V1 direction:

- derive from successful booking count only
- use a rolling 30-day window
- apply a `log(1 + booking_count_30d)` style transform
- normalize within the same `space_type`

This signal should remain separate from:

- passive browse volume
- crowding logic
- availability logic

#### 4. PreferenceLiteScore

Definition:

- narrow alignment with the user's stable historical tendencies

V1 direction:

- keep this intentionally simple
- use only signals the current product can actually support

Suggested v1 inputs:

- frequent building affinity
- frequent `space_type` affinity

V1 definition:

- derive from successful booking behavior only
- use a rolling 60-day window
- compute:
  - `BuildingAffinityScore`
  - `SpaceTypeAffinityScore`
- combine as:
  - `PreferenceLiteScore = 0.60 * BuildingAffinityScore + 0.40 * SpaceTypeAffinityScore`
- normalize both sub-scores to `[0,1]`
- default to `0` when the user does not yet have enough history

#### BuildingAffinityScore

Definition:

- the user's normalized affinity toward the candidate space's parent building
  based on successful bookings in the last 60 days

Suggested v1 interpretation:

- higher when the user repeatedly books spaces in that building
- lower when the building is rarely or never used by the user

#### SpaceTypeAffinityScore

Definition:

- the user's normalized affinity toward the candidate space's `space_type`
  based on successful bookings in the last 60 days

Suggested v1 interpretation:

- higher when the user repeatedly books the same `space_type`
- lower when that type is rarely or never used by the user

Do not expand this into a full preference-profile system in v1.

### V1 scoring formula

Use a lightweight, explainable score:

`FinalScore = 0.40 * DistanceScore + 0.30 * AvailabilityScore + 0.20 * PopularityScore + 0.10 * PreferenceLiteScore`

### Formula notes

- weights are a starting product contract for v1
- keep score inputs stable before tuning weights aggressively
- preserve enough internal debug visibility to inspect score contributions
- do not expose heavy diagnostic payloads as mandatory product contract fields
  in v1

### Exclusion and downweighting

Recommended spaces must not simply reproduce content already surfaced
elsewhere.

#### Rule A: Favorite exclusion

If a space is already in user favorites:

- exclude it from `Recommended Spaces` by default

Rationale:

- favorites already have their own section
- recommendation should add discovery value

#### Rule B: Recent downweight

If a space appears in `Recent Spaces`:

- do not hard-exclude it
- apply a downweight multiplier

Suggested v1:

`AdjustedScore = FinalScore * 0.85`

Rationale:

- recent spaces may still be relevant
- but recommendation should not become a duplicate of recent activity

#### Rule C: repeated ignored recommendation penalty

Deferred from v1.

This may be introduced later if recommendation exposure logging becomes
available.

### Sorting

After adjustments:

1. compute `AdjustedScore`
2. sort descending
3. keep a high-quality pre-display pool for reranking

The exact pre-display pool size may vary by implementation scale.

V1 principle:

- reranking should operate on already strong candidates
- do not force weak candidates into the final set just for variety

### Lightweight diversity-aware reranking

#### Goal

Prevent the final recommendation set from becoming too repetitive.

#### Mandatory v1 diversity dimension

- building diversity

#### Optional v1 diversity dimension

- `space_type` diversity if implementation cost remains low

#### Deferred diversity dimensions

- feature-profile diversity
- novelty balancing

#### Suggested v1 approach

Use lightweight greedy reranking:

1. take the highest strong candidate first
2. prefer next candidates that add building diversity while remaining strong
3. stop at the final display count

### De-duplication

#### Within Recommended Spaces

- deduplicate by `space_id`

#### Relative to other sections

- exclude favorites by default
- do not hard-exclude recents
- prefer complementary results when reasonable

### Explanation rules

Each recommended card should carry one primary explanation only.

V1 supported explanation labels:

- `Near you`
- `Popular`

The backend or recommendation layer should resolve one dominant explanation
before the result reaches the UI.

Avoid generic unexplained `Recommended` labels.

## Cross-Surface Rules

### My Spaces page

- deduplicate within each section
- do not force cross-section deduplication
- allow the same space to appear in more than one section when the overlap is
  meaningful
- `Recommended Spaces` should still prefer complementary results rather than
  unnecessary repetition

### For You

`For You` is not the same surface as `My Spaces`, but it consumes the same
signal families.

For `For You`:

- deduplicate across the mixed stream
- one `space` appears at most once
- favorite, recent, and recommended signals compete for one final card

## Output Contract

Each returned recommended item should contain at least:

- standard space identity and card fields
- `recommendation_reason`
- `recommendation_reason_label`

Optional v1 fields:

- `distance_meters` when location-aware recommendation is present

Internal-only or optional diagnostic fields in v1:

- `final_score`
- `adjusted_score`
- partial score breakdowns
- reranking influence metadata

These are useful for debugging and evaluation, but should not be treated as
mandatory product-facing contract fields in the first production release.

## Non-Goals

This spec intentionally excludes:

- collaborative filtering
- embeddings-based ranking
- deep learning ranking
- heavy session-personalization models
- generic detail-view popularity
- hover-based behavior signals
- UI presentation rules

## V2 Boundary

Signals intentionally deferred beyond v1 include:

- `IntentMatchScore`
- `BehaviorScore`
- `CrowdScore`
- `ExplorationScore`
- richer recommendation diagnostics as mandatory product contract

See:

- `docs/features/my-spaces/recommendation-v2.md`

## Summary

This spec defines:

- a separate ranking strategy for each `My Spaces` section
- lightweight relationship-based ordering for favorites
- strict meaningful-recency ordering for recents
- an explainable multi-factor v1 recommendation pipeline
- explicit exclusion and downweight rules
- lightweight diversity-aware reranking
- clear v1/v2 separation

The design target is a production-usable, explainable, engineering-feasible v1
ranking system for `My Spaces`.
