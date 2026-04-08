# Location Deferred Considerations

## Purpose

This document records important location-domain concerns that do not need to be
implemented immediately, but should not be forgotten as the feature set grows.

These items are not current blockers.

They are deferred considerations that future implementation agents should
revisit when the relevant trigger conditions appear.

## How To Use This Document

Use this document when:

- planning later iterations of the `location` domain
- expanding nearby discovery into a higher-traffic product surface
- introducing map experience
- evaluating proximity-aware booking or check-in behavior

Do not treat every item here as current implementation scope.

Instead:

- keep the current delivery focused
- revisit deferred items when their trigger conditions become true

## Deferred Technical Considerations

### 1. Nearby Query Scalability

The initial nearby-building implementation may fetch all buildings with
coordinates, compute Haversine distance in application code, sort in memory,
and then return the nearest `N` results.

This is acceptable for an early, low-volume stage because:

- it is easy to reason about
- it keeps infrastructure requirements low
- it preserves a clean external API contract

However, it does not scale well indefinitely.

Why it becomes expensive:

- work grows with the total number of coordinate-bearing buildings
- `limit` only caps response size, not the amount of computation
- the database is not yet doing the true nearest-neighbor work
- repeated nearby queries multiply the cost

Recommended future optimization path:

1. bounding-box prefiltering before full distance evaluation
2. database-side filtering or ordering when query volume increases
3. spatial indexing or GIS-backed queries when nearby and map use cases mature

### 2. Map Query Pressure

Map experience will increase the frequency and breadth of location-aware
queries.

Map usage often introduces:

- repeated fetches after pan or zoom
- viewport-based retrieval
- larger candidate sets than a compact recommendation surface

A nearby-query strategy that is acceptable for a small recommendation module
may become insufficient once map exploration becomes active scope.

Map work should therefore be treated as a likely trigger for upgrading the
query strategy.

### 3. Nearby Space Recommendation Scalability

The initial nearby-space implementation may:

- load all candidate spaces whose buildings have coordinates
- compute building distance in application code
- batch-count available seats across all candidate spaces
- sort results in memory by availability bucket and distance

This is a reasonable early implementation because it keeps the recommendation
logic explicit and testable.

However, it has a steeper growth curve than nearby-building lookup because it
depends on more tables and more derived state.

Why it becomes expensive:

- candidate count grows with coordinate-bearing spaces, not just buildings
- availability counting touches `seats` and, when a time window is provided,
  also touches overlapping active `bookings`
- `limit` still only caps the response size, not the amount of candidate
  evaluation
- recommendation traffic from `My Spaces`, `Home`, and future map or discovery
  surfaces may all converge on the same path

Recommended future optimization path:

1. reduce candidate space count before availability evaluation
2. consider building-level or bounding-box prefiltering ahead of seat counting
3. move more ranking and filtering work toward the database when traffic grows
4. revisit whether cached or pre-aggregated availability summaries become
   worthwhile for high-traffic nearby recommendation paths

### 4. Coordinate Quality And Data Hygiene

The current direction assumes that `building` is the primary physical anchor.

That makes coordinate quality important.

Future work may need to clarify:

- how coordinates are sourced
- whether admin-entered coordinates need validation assistance
- whether geocoded coordinates should be distinguishable from manual entries
- how incorrect or stale coordinates should be corrected

### 5. User Location Persistence Boundaries

The current direction prefers request-scoped or session-scoped use of precise
user location.

That reduces privacy risk in the first implementation.

Future product ideas may pressure the system toward more persistent location
handling.

Examples:

- location history for analytics
- repeated auto-refresh of nearby surfaces
- proximity-aware reminders

Those should not be added casually.

If longer-lived location storage is ever proposed, the product should first
revisit:

- privacy expectations
- retention policy
- access controls
- logging behavior

### 6. Distance Precision And Presentation

The first nearby contracts may expose a simple `distance_km` field.

That is sufficient for initial recommendation and nearby building surfaces.

Future work may need to revisit:

- whether kilometers alone are always the right display unit
- whether very small distances should be shown in metres
- whether rounded display distance should differ from ranking precision
- whether travel time becomes more useful than straight-line distance in some
  surfaces

### 7. Proximity-Aware Booking Risk

Future booking or check-in features may want to use location as a policy input.

Examples:

- location-aware check-in reminders
- check-in allowed only near the building
- geo-fenced booking assistance

This area should be treated cautiously because location accuracy is imperfect.

Future work should explicitly consider:

- GPS error and indoor inaccuracy
- fairness when users are close but reported as outside range
- fallback paths when location is denied or unavailable
- whether strict gating is actually necessary

## Deferred Product Considerations

### 1. Nearby Versus Personalized

`My Spaces` will consume location-aware recommendation signals, but nearby
results should not automatically replace broader personalized discovery.

Future recommendation work should continue to balance:

- nearby relevance
- availability
- favorites
- recent usage
- popularity

### 2. Map As Enhancement, Not Replacement

Future map work should improve discovery without forcing map use as the only
browse path.

List-based browsing should remain viable even after map capabilities grow.

### 3. Explainability Must Remain Visible

As location-aware recommendation becomes more sophisticated, the UI should not
lose its ability to explain why a result is present.

The system should avoid drifting into opaque recommendation behavior.

## Triggers For Revisit

The items in this document should be revisited when any of the following
becomes true:

- the number of coordinate-bearing buildings grows materially
- nearby discovery becomes a high-traffic entry path
- map experience enters active implementation
- nearby queries show noticeable latency
- the product begins discussing proximity-aware booking or check-in rules
- the team considers persisting user location beyond the active session

## Related Documents

- `docs/features/location/overview.md`
- `docs/features/location/backend-impact.md`
- `docs/features/location/frontend-scope.md`
- `docs/features/location/nearby-recommendation-spec.md`
- `docs/features/location/map-experience-spec.md`
- `docs/features/location/task-breakdown.md`
