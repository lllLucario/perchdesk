# Location Overview

## Purpose

This feature defines the location-aware capability layer for PerchDesk.

It covers:

- building location data as a first-class domain concept
- browser-based user location access
- distance-aware discovery of buildings and spaces
- nearby recommendation signals consumed by other features
- future map-driven browsing and location-aware booking support

This feature is not owned by `My Spaces`, `Buildings`, or `Booking`.

It is a shared domain that those feature areas may consume.

## Problem Statement

PerchDesk currently supports:

- buildings as the browse entry point
- spaces as the direct booking objects
- bookings as the persisted reservation units

However, the product does not yet treat physical location as a formal domain
concept.

That leaves several product needs underdefined:

- helping the user find the closest relevant building
- surfacing nearby bookable spaces
- explaining why a recommended space is relevant
- supporting map-based exploration later
- enabling future proximity-aware booking behaviors

If location remains implicit or ad hoc, each feature area will be forced to
invent its own partial solution.

This feature establishes a shared location domain so the product can evolve
consistently.

## Domain Boundaries

### Location owns

- building coordinate modeling
- user location access and permission rules
- distance calculation and location-aware ranking inputs
- nearby discovery contracts
- map-oriented capability design
- privacy rules for handling user location

### Location does not own

- the full personalized discovery experience
- the standard buildings browsing hierarchy
- booking conflict validation
- check-in policy by default

Those remain in their respective feature domains.

## Cross-Domain Consumers

### My Spaces

`My Spaces` may consume location-aware recommendation signals such as:

- `Near you`
- nearby available spaces

`My Spaces` does not own the location model or location permission UX.

### Buildings

`Buildings` may consume location-aware capabilities for:

- nearby building ordering
- future map browsing
- distance display

### Booking And Check-In

Booking may later consume location-aware capabilities for:

- optional proximity hints before booking
- future check-in proximity support
- future geo-fenced experience rules

These are not active baseline scope in the first implementation.

## Feature Summary

The location feature should be treated as a staged domain with three broad
delivery tracks:

1. location foundation
2. nearby discovery and recommendation
3. map and future location-aware experience

These tracks should share one domain model and one set of privacy principles.

## In Scope

- location as a dedicated feature domain
- building coordinates and related metadata
- frontend permission and fallback patterns for browser location
- nearby building and space discovery capability
- explainable location-aware recommendation signals
- map experience design direction
- future-facing proximity support planning

## Out Of Scope

- a mandatory location requirement before booking
- persistent storage of precise live user location by default
- advanced route planning or navigation
- production geofencing policy in the first delivery
- replacing the existing `Buildings` browse path
- moving all recommendation logic into the location domain

## Core Product Direction

### Location is an enabling domain

Location should exist as infrastructure for multiple product surfaces, not as a
single user-facing page.

### Location should improve ranking, not block the core flow

Users must still be able to browse and book without granting location access.

Location-aware behavior should improve relevance, ordering, and explanation
when available.

### Building is the primary physical anchor

The current data model already groups spaces under buildings.

For that reason, physical coordinates should be owned primarily at the
`building` level rather than duplicated per `space`.

### Explainability matters more than sophistication

Location-aware recommendations should prefer clear reasons such as:

- `Near you`
- `Closest available`
- `In a nearby building`

The first implementation should not hide its logic behind an opaque scoring
system.

## Recommended Reading Order

1. `docs/features/location/overview.md`
2. `docs/features/location/location-capabilities.md`
3. `docs/features/location/backend-impact.md`
4. `docs/features/location/frontend-scope.md`
5. `docs/features/location/nearby-recommendation-spec.md`
6. `docs/features/location/map-experience-spec.md`
7. `docs/features/location/task-breakdown.md`

## Source Documents

- `docs/architecture.md`
- `docs/features/my-spaces/overview.md`
- `docs/features/my-spaces/backend-impact.md`
