# Nearby Recommendation Spec

## Purpose

This document defines the product and contract expectations for location-aware
nearby recommendations.

Its primary consumer is currently `My Spaces`, but the capability should remain
domain-owned by `location`.

## Feature Summary

Nearby recommendation is the ability to surface relevant buildings or spaces
because they are physically close to the user and useful in the current
context.

The first production intent is to support recommendation reasons such as:

- `Near you`
- `Closest available`
- `Nearby building`

## Primary Consumer

### My Spaces

`My Spaces` may consume nearby recommendation as one input to its
`Recommended Spaces` section.

Location-aware recommendation does not replace other recommendation inputs such
as:

- popularity
- recent usage
- favorites

## User Problems

Nearby recommendation should help solve problems such as:

- `I want a space close to where I am now`
- `I want to quickly find a nearby place I can actually book`
- `I want to understand why a recommended space is relevant`

## Recommendation Inputs

The capability may consider:

- current user latitude and longitude
- requested booking time window
- optional space type preference
- building coordinates
- current or requested availability
- lightweight personalization signals from the consuming feature

The first implementation should keep the logic explainable.

## Recommendation Outputs

A nearby recommendation payload should ideally expose:

- target identity
- target type if needed
- building reference
- distance metadata
- one primary explanation reason
- enough availability context to support the explanation

For space-level recommendations, the payload may also expose:

- available seat count
- whether the space is currently recommendable for the requested window

## Recommendation Rules

### Nearby alone is not enough

A space should not be promoted only because it is close if it is not useful.

For example:

- a space with no valid booking path for the requested time should not outrank
  a slightly farther but actually bookable space

### One card should carry one primary reason

If a card is present because it is close, the UI should not also need to show
multiple competing explanation labels.

### Explainability is mandatory

The recommendation should be able to explain itself in product language.

Do not return an unexplained generic `Recommended` item when a location-specific
reason is available.

## Ranking Direction

The first implementation should use a shallow and defensible ranking approach.

Likely ranking dimensions:

- proximity
- availability
- lightweight consumer-specific preference signals

Suggested product stance:

- distance influences ranking strongly
- availability can override pure closeness when closeness would lead to a dead
  end
- consumer domains may mix location-aware results with non-location results

This does not require a complex machine-learning system.

## Fallback Behavior

If location-aware recommendation cannot be produced, the consuming surface
should degrade gracefully.

Examples:

- user denied location permission
- user location could not be retrieved
- no building has coordinate data
- no nearby candidate is bookable

In those cases, the consumer may fall back to:

- popular spaces
- recent spaces
- favorite spaces
- ordinary browse flows

## Contract Guidance For Consumers

### My Spaces consumption

`My Spaces` should treat nearby recommendation as:

- one recommendation source
- not the sole source
- a reason-bearing result set

The section should remain personalized rather than becoming a pure nearby list.

### Buildings consumption

Another consumer may choose to use the same nearby results simply for ordering
or highlighting nearby buildings.

That does not require the `My Spaces` card rules.

## Deferred Scope

The following are intentionally deferred:

- advanced behavior prediction
- commute-aware route optimization
- personalized recommendation tuning controls
- dense multi-factor scoring exposure to users

## Open Questions

- whether the first nearby recommendation contract should recommend buildings,
  spaces, or both
- whether nearby recommendation is assembled fully in backend logic or partly
  mixed by the consumer
- how strongly current availability should override pure proximity

## Source Documents

- `docs/features/location/overview.md`
- `docs/features/location/location-capabilities.md`
- `docs/features/my-spaces/overview.md`
