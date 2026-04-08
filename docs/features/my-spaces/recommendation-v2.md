# My Spaces Recommendation V2 Notes

## Purpose

This document records recommendation ideas that are intentionally deferred from
the `My Spaces` v1 implementation.

It exists to preserve useful future direction without polluting the current v1
scope.

Read together with:

- `docs/features/my-spaces/overview.md`
- `docs/features/my-spaces/backend-impact.md`
- `docs/features/my-spaces/recommendation-spec.md`
- `docs/features/my-spaces/task-breakdown.md`

## V1 Boundary

`My Spaces` v1 should keep recommendation scoring intentionally narrow.

V1 keeps:

- `DistanceScore`
- `AvailabilityScore`
- `PopularityScore`
- `PreferenceLiteScore`

This document covers the next layer beyond that baseline.

Nothing in this document is required for the first production implementation of
`My Spaces`.

If v1 implementation work conflicts with this document, the v1 documents take
precedence:

- `docs/features/my-spaces/overview.md`
- `docs/features/my-spaces/backend-impact.md`
- `docs/features/my-spaces/recommendation-spec.md`
- `docs/features/my-spaces/task-breakdown.md`

## Deferred Feature Set

The following signals are intentionally deferred to v2 or later:

- `IntentMatchScore`
- `BehaviorScore`
- `CrowdScore`
- `ExplorationScore`
- richer recommendation diagnostics as part of the product-facing contract

## Deferred Signals

### IntentMatchScore

Definition:

- how well a space matches the user's current inferred need

Why deferred:

- current product scope does not yet have a stable intent taxonomy
- explicit filters and session intent are not yet mature enough to support this
  cleanly

Possible future inputs:

- explicit search mode
- current booking mode
- tags such as quiet, collaborative, focus, lounge

### BehaviorScore

Definition:

- how well a candidate matches short-term session behavior

Why deferred:

- requires stronger session instrumentation
- risks overfitting to sparse or noisy interaction events in the current phase

Possible future inputs:

- repeated current-session clicks
- current building focus
- repeated interaction with similar spaces

### CrowdScore

Definition:

- a comfort or atmosphere correction beyond simple seat availability

Why deferred:

- current product does not yet have a trustworthy crowd or atmosphere signal
- occupancy and comfort are related but not equivalent

Possible future inputs:

- occupancy bands
- quiet-space crowd tolerance
- collaborative-space comfort bands

### ExplorationScore

Definition:

- novelty or discovery value

Why deferred:

- exploration should be introduced carefully so it does not weaken trust in the
  recommendation list
- current phase should optimize for relevance before novelty

Possible future inputs:

- unseen but adjacent spaces
- spaces not visited recently
- adjacent facilities or buildings the user has not yet tried

## Deferred Diagnostics

Future versions may expose richer ranking diagnostics such as:

- `final_score`
- `adjusted_score`
- `score_breakdown`
- reranking influence metadata

These are useful for internal debugging and evaluation, but they should not be
treated as mandatory product contract fields in v1.

## Future Ranking Direction

If recommendation quality and instrumentation improve, a future formula may
extend the v1 baseline toward a broader multi-factor score.

A future direction could incorporate:

- distance or proximity
- availability
- popularity
- preference signals
- explicit or inferred intent
- session behavior
- crowd correction
- exploration value

This should happen only after the supporting data becomes stable and
explainable.

## Future Re-ranking Direction

V1 should keep diversity-aware reranking lightweight.

Future versions may expand reranking beyond basic building diversity into:

- space-type diversity
- feature-profile diversity
- novelty balancing
- repeated ignored-recommendation downweighting

These remain valid ideas, but are not required for the first production
implementation.

## Practical Rule

Do not pull a v2 signal into v1 unless:

- its data source is stable
- its product meaning is explainable
- its implementation cost is justified by a clear product gain
