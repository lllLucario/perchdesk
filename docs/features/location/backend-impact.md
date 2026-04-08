# Location Backend Impact

## Purpose

This document records the likely backend and contract implications of the
location feature domain.

It is not a full backend specification.

Its purpose is to keep implementation agents from assuming that location-aware
behavior can be added only in frontend presentation code.

## Current Backend Reality

The current backend model includes:

- `buildings`
- `spaces`
- `seats`
- `bookings`
- `space_rules`

The current `building` model already contains:

- `name`
- `address`
- `description`
- `opening_hours`
- `facilities`

It does not yet treat physical coordinates as first-class fields.

The backend also does not yet expose:

- nearby building queries
- nearby space queries
- location-aware recommendation contracts

## Core Principle

Location should be modeled primarily at the `building` layer.

Rationale:

- a `space` already belongs to a building
- users travel to a building before they use a space
- map and nearby browsing will primarily anchor on buildings
- duplicated coordinates across spaces would add avoidable maintenance overhead

## Expected Impact Areas

### 1. Building Location Fields

The backend should be prepared to add explicit location-related fields to
`buildings`.

Likely direction:

- `latitude`
- `longitude`
- optional normalized address support
- optional source metadata such as `manual` or `geocoded`

The first implementation should avoid overcommitting to a database-specific GIS
design if ordinary numeric fields are sufficient for the initial delivery.

### 2. Building Location Management

Admin or trusted backend workflows will need a way to maintain building
coordinates.

Expected behavior:

- coordinates can be added when a building is created
- coordinates can be updated later
- missing coordinates should not break ordinary building browsing

### 3. Nearby Query Contracts

The backend will likely need user-scoped or authenticated query endpoints for:

- nearby buildings
- nearby spaces
- nearby available spaces

These contracts should accept inputs such as:

- user latitude
- user longitude
- optional radius
- optional booking time window
- optional space type

### 4. Recommendation Support Contracts

The backend should support location-aware recommendation payloads without
forcing every consumer to recreate sorting logic locally.

Likely contract expectations:

- recommended item identity
- distance metadata
- one primary recommendation reason
- enough availability context to explain why the item is useful

This does not require a complex recommendation engine in the first pass.

### 5. Availability-Aware Nearby Discovery

Nearby discovery becomes more useful when it can incorporate booking
availability.

The backend direction should therefore remain compatible with queries such as:

- closest spaces in range
- closest spaces with current availability
- closest spaces available in a requested time window

This area should reuse existing booking and rules logic rather than duplicate
availability checks inside a new location-specific subsystem.

### 6. Future Query Optimization

The first implementation may compute distance in application code or with
simple SQL support.

However, the backend design should remain compatible with later improvements
such as:

- spatial indexing
- GIS-backed distance queries
- viewport or radius filtering for maps

The first implementation should not hard-code assumptions that make those
evolutions painful.

## Contract Guidance

### Location-aware responses should be explainable

If an item is returned because it is nearby, the payload should make that
reason available.

Avoid returning opaque recommendation results without a reason field.

### Location-aware responses should remain optional-friendly

If the user denies location access or a building has no coordinates:

- ordinary browse and booking APIs should still function
- location-aware endpoints may omit those records or downgrade gracefully

### Do not treat live user location as a persistent profile field by default

The backend should assume request-scoped use of user location unless a later
feature explicitly requires a different policy.

## Likely Schema And Service Work

Expected backend work may include:

- building schema updates for coordinates
- migration support for location fields
- service methods for nearby buildings and spaces
- response schema additions for distance and explanation
- API tests for nearby query behavior and fallback behavior

## Questions To Resolve During Implementation

- whether initial coordinates should be stored only as decimal latitude and
  longitude
- whether location-aware endpoints live under `buildings`, `spaces`, or a
  dedicated `location` route area
- whether recommendation assembly belongs fully in backend logic or is partly
  composed by consumers such as `My Spaces`
- when GIS-level optimization becomes worth introducing

## Source Documents

- `docs/features/location/overview.md`
- `docs/features/location/location-capabilities.md`
- `docs/features/location/nearby-recommendation-spec.md`
