# Map Experience Spec

## Purpose

This document defines the future-facing map experience that may be built on top
of the location domain.

It exists so map work can evolve from the same location model and nearby
discovery contracts rather than inventing a separate geospatial feature track.

## Product Role

Map experience is a discovery enhancement.

It should help users:

- orient themselves geographically
- compare nearby buildings visually
- switch between spatial browsing and list browsing

It should not become the only way to find a space.

## Scope Direction

The first meaningful map experience would likely include:

- a map surface for buildings
- visible building markers
- a synchronized nearby building list
- selection sync between map and list
- distance-aware context for the selected result

Later additions may include:

- filtering markers by space type or availability
- clustering or viewport-based loading
- deeper space-level drill-in from a building marker

## Relationship To Other Domains

### Location owns

- map capability definition
- map data prerequisites
- distance and nearby query semantics used by the map

### Buildings may consume

- map browsing as an alternative or enhancement to list browsing

### My Spaces may consume indirectly

`My Spaces` should not be the owner of map behavior.

It may later link into a map-driven nearby exploration flow, but that should be
defined here first.

## Core UX Direction

### Map and list should reinforce each other

Users should be able to move between a geographic view and a more scannable
list view without losing context.

### Map should remain optional

If the map fails to load or the user does not grant location access, the user
should still be able to browse the product through standard list-based flows.

### Building-first remains the safer anchor

Given the current domain model, the map should begin with buildings rather than
individual spaces as the primary markers.

This keeps the map aligned with:

- physical navigation behavior
- current data ownership
- future nearby building discovery

## Data Expectations

Map experience will require:

- building coordinates
- nearby building query support
- enough building metadata to render useful markers or cards

Future refinements may require:

- viewport-aware queries
- query throttling or debouncing
- richer distance metadata

## Deferred Scope

The following should not be treated as baseline map requirements:

- turn-by-turn navigation
- live travel-time estimation
- full indoor floorplan mapping on the geographic map
- map-only booking flow

## Open Questions

- whether the first map surface belongs under `Buildings`, `Home`, or another
  discovery entry point
- whether the first map query should return buildings only or include a summary
  of recommendable spaces
- how much availability detail the first marker state should expose

## Source Documents

- `docs/features/location/overview.md`
- `docs/features/location/location-capabilities.md`
- `docs/features/location/backend-impact.md`
