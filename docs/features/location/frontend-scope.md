# Location Frontend Scope

## Purpose

This document defines the frontend implementation scope for the location
feature domain.

It should be read together with:

- `docs/features/location/overview.md`
- `docs/features/location/location-capabilities.md`
- `docs/features/location/nearby-recommendation-spec.md`
- `docs/features/location/map-experience-spec.md`

## Core Principle

Location access should improve discovery and recommendation without becoming a
hard prerequisite for the normal booking flow.

The frontend should therefore treat location as an optional enhancer.

## Scope Areas

### 1. Browser Location Access

The frontend may request device location using browser capabilities.

Responsibilities:

- trigger permission requests from an intentional user action or a clearly
  justified surface
- represent permission state clearly
- handle loading, success, denial, and unavailable states
- avoid silently failing when location access is not possible

Non-goals:

- background location tracking
- continuous updates without product need
- storing precise location across long-lived sessions by default

### 2. Location State Handling

The frontend should maintain enough state to support nearby discovery and
recommendation consumption.

Likely state needs:

- permission state
- current coordinates
- coordinate accuracy if useful
- timestamp of last successful acquisition
- source of location, such as browser or manual fallback

This state should remain scoped to active use cases and should not be treated
as a permanent identity attribute.

### 3. Nearby Discovery Consumption

The frontend should be able to consume nearby building or space data for
surfaces such as:

- `My Spaces`
- `Home`
- future `Buildings` nearby ordering

Responsibilities:

- request location-aware results when location is available
- fall back gracefully when location is unavailable
- render explanation labels such as `Near you`
- show distance where it improves comprehension

### 4. Recommendation Consumption

The frontend does not own location-aware recommendation logic, but it does own
how recommendation reasons are rendered.

Responsibilities:

- render one primary recommendation reason
- avoid stacking multiple heavy explanation badges
- preserve standard card structure where possible

For `My Spaces`, location-aware recommendations should remain one signal among
others, not the whole feature.

### 5. Future Map Experience

The frontend scope should anticipate a future map browsing experience.

Expected future responsibilities:

- map viewport state
- selected marker state
- synchronization between map and list results
- location permission entry points for map usage

This future scope should not drive premature complexity into the first nearby
recommendation implementation.

## Permission UX Direction

### Permission should be intentional

The frontend should prefer a clear action such as `Use my location` rather than
an unexplained permission prompt on first page load.

### Denial should not feel like failure

If the user denies permission:

- the page should continue working
- nearby-only UI should downgrade gracefully
- alternative discovery paths should remain visible

### Fallbacks matter

Recommended fallback behaviors may include:

- recent spaces
- popular spaces
- favorite spaces
- ordinary building browsing

## Display Guidance

### Nearby labels should be concrete

Prefer:

- `Near you`
- `Closest available`
- `0.6 km away`

Avoid vague labels that do not explain the value.

### Distance is supporting context

Distance can improve trust in a location-aware result, but it should not
replace the primary action or overwhelm the card.

### Map should not be mandatory

The product should not force a map interaction before users can book.

## Empty And Edge States

The frontend should handle:

- permission denied
- location unavailable in browser
- user location timeout
- no nearby buildings in range
- nearby buildings exist but have no recommendable spaces
- buildings or spaces missing coordinates

These states should remain understandable and should not collapse the rest of
the page.

## Explicit Non-Goals

- a permanent live location indicator across the product
- dense map-first UI in the first implementation
- user-managed location history
- exposing advanced geospatial tuning controls in the UI

## Source Documents

- `docs/features/location/overview.md`
- `docs/features/location/location-capabilities.md`
- `docs/features/my-spaces/frontend-scope.md`
