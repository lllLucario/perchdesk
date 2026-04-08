# Location Capabilities

## Purpose

This document defines the capability map for the `location` domain.

Its goal is to help future implementation agents understand:

- what belongs to location
- what only consumes location
- which capabilities are foundational
- which capabilities are deferred

It should be read before implementation planning.

## Core Principle

Location is a shared domain capability, not a standalone product silo.

It should provide reusable inputs and contracts that other feature areas can
consume without re-owning the domain.

## Capability Areas

### 1. Building Location Modeling

This capability formalizes the physical position of a building.

It includes:

- latitude and longitude
- normalized address support if needed
- source-of-truth expectations for coordinate maintenance
- future compatibility with richer geographic storage

This capability does not require map UI to exist first.

### 2. User Location Access

This capability defines how the frontend may request, hold, and use the
current user's device location.

It includes:

- permission request timing
- success and denial states
- coarse fallback behavior
- session-scoped handling expectations

This capability should not assume continuous background tracking.

### 3. Distance And Proximity Evaluation

This capability defines how the system evaluates:

- distance between a user and a building
- ordering by proximity
- radius-based filtering
- future proximity eligibility checks

The first implementation may use simple application-level distance
calculation as long as the contracts stay compatible with later database-side
optimization.

### 4. Nearby Discovery

This capability defines the ability to surface:

- nearby buildings
- nearby spaces
- nearby available spaces

It is not limited to a map page.

It may be consumed by:

- `My Spaces`
- `Buildings`
- future landing or discovery surfaces

### 5. Location-Aware Recommendation Signals

This capability defines location-derived recommendation reasons such as:

- `Near you`
- `Closest available`
- `Nearby building`

This capability does not own the full recommendation strategy for every
consumer.

For example:

- `My Spaces` may combine location signals with popularity and user history
- another surface may only use location for sorting

### 6. Map Experience

This capability defines future map-driven product behavior:

- map-based building exploration
- map/list synchronization
- viewport-aware filtering
- building marker presentation

This capability is intentionally later-stage and should not complicate the
foundation work.

### 7. Future Booking Support

This capability covers future location-aware booking assistance, such as:

- proximity guidance before check-in
- optional geo-aware reminders
- stricter proximity validation if the product later requires it

This area is intentionally deferred.

## Ownership Boundaries

### Location owns

- canonical definitions of coordinate fields
- permission and privacy rules for user location
- distance semantics
- nearby-query contract expectations
- map-specific capability definitions

### Consumer domains own

- where and how location-aware cards appear
- booking-specific action behavior
- page-level layout and interaction details unrelated to location
- mixing location signals with non-location recommendation signals

## Staged Delivery Guidance

### Foundation first

The first delivery should make location data and location access reliable.

Without that, nearby recommendation and map behavior will become brittle.

### Recommendation second

Location-aware recommendation should come after the data model and permission
rules are stable enough to support it.

### Map later

Map experience should not drive premature complexity into the initial
foundation model.

The first map implementation should consume existing location capabilities
rather than redefining them.

## Dependency Map

### Nearby recommendation depends on

- building coordinates
- frontend user location access
- distance calculation semantics
- available building/space discovery inputs

### Map experience depends on

- building coordinates
- nearby discovery contracts
- frontend state rules for location and viewport

### Future proximity check-in depends on

- all foundation capabilities
- booking lifecycle alignment
- explicit privacy and product-policy decisions

## Explicit Non-Goals

- treating every space as its own coordinate source by default
- storing a continuous user movement history
- requiring location permission for ordinary booking flow
- defining advanced route guidance or ETA engines now
- making the map experience the mandatory browse entry point

## Source Documents

- `docs/features/location/overview.md`
- `docs/features/location/nearby-recommendation-spec.md`
- `docs/features/location/map-experience-spec.md`
