# My Spaces Frontend Scope

## Purpose

This document defines the frontend implementation scope for the personalized
space-discovery feature.

Read together with:

- `docs/features/my-spaces/overview.md`
- `docs/features/my-spaces/wireframe.md`
- `docs/features/my-spaces/recommendation-spec.md`
- `docs/features/my-spaces/task-breakdown.md`
- `CLAUDE.md`

`docs/features/my-spaces/recommendation-v2.md` is future-only context and
should not be treated as active frontend scope for v1.

## Page Scope

The current frontend scope for this feature spans these user-facing surfaces:

- `Home`
- `My Spaces`
- standard space-card surfaces that need favorite state

This feature should complement, not replace, the existing browse path through:

- `Buildings`
- `Spaces in Building`

## Page Responsibilities

### Home

Responsibilities:

- render the `For You` section
- present a compact personalized entry layer
- support direct movement into a space booking path
- support a path into the fuller `My Spaces` page

Non-goals:

- becoming a full management page
- rendering the same density as `My Spaces`
- exposing separate full-width sub-sections for favorites, recents, and
  recommendations

### For You

Responsibilities:

- mix `Favorite`, `Recent`, and `Recommended` spaces in one stream
- feel curated rather than report-like
- remain visually compact
- support horizontal overflow when needed

Display rules:

- favorite cards rely on the right-top star as the primary signal
- recent cards may include one lightweight supporting line
- recommended cards may use a left-top ribbon with a reason label
- cards should remain standard `SpaceCard` instances, not a new card system
- the mixed stream should deduplicate by `space` so one item appears at most
  once in the section

### My Spaces

Responsibilities:

- provide a fuller personalized destination
- render sectioned content for:
  - `Favorite Spaces`
  - `Recent Spaces`
  - `Recommended Spaces`
- allow deeper consumption without turning into a generic all-spaces directory

Non-goals:

- replacing `Buildings` as the main browse surface
- introducing seat-favorite frontend behavior
- becoming a dense analytics or recommendation-management page

Deduplication rules:

- each section should deduplicate by `space`
- the page should not force cross-section deduplication
- the same space may appear in both `Favorite Spaces` and `Recent Spaces`
- `Recommended Spaces` should prefer to surface complementary items when
  reasonable, rather than repeating spaces already shown above

## Section Responsibilities

### Favorite Spaces

Responsibilities:

- surface user-saved spaces clearly
- allow direct return into booking
- show favorite state without redundant explanation

Display rules:

- show the right-top favorite star
- do not add a recommendation ribbon
- do not require extra `Favorite` helper copy by default

### Recent Spaces

Responsibilities:

- help users quickly return to spaces they recently used
- provide lightweight context for why the space feels familiar

Display rules:

- do not use the recommendation ribbon
- may include one supporting line such as:
  - `Opened recently`
  - `Booked 2 days ago`

### Recommended Spaces

Responsibilities:

- surface spaces the system believes are relevant
- provide an explainable reason for inclusion

Display rules:

- use the standard `SpaceCard`
- allow a left-top ribbon badge for the recommendation reason
- avoid generic unexplained recommendation labels

## Card Scope

The base card structure should stay aligned with the standard space card used
in building-scoped browsing.

The feature should reuse standard card fields rather than inventing a separate
personalized card schema.

Allowed contextual additions:

- favorite star state
- one recent-use supporting line
- one recommendation ribbon

## For You Density Expectations

`For You` should remain compact and summary-oriented.

Guidance:

- show a limited set of personalized cards
- allow horizontal scrolling when content exceeds the initial width
- avoid presenting the section as three separate large blocks

When signals are sparse:

- recommendations may fill more of the section
- empty personalized states should not break the page structure

## My Spaces Density Expectations

`My Spaces` is sectioned and can expose more content.

Initial visible density target per section:

- `Favorite Spaces`: 2 cards
- `Recent Spaces`: 2 cards
- `Recommended Spaces`: 4 cards

These describe the intended first visible slice, not a hard item cap.

## Interaction Expectations

- clicking any space card should continue into the normal booking flow
- users should be able to favorite or unfavorite a space from card-level UI
- favorite state should remain visually consistent across all space-card
  surfaces
- `For You` should include a clear route into `My Spaces`

## Data Expectations

Frontend implementation should expect:

- favorite state for spaces
- a favorites list for personalized rendering
- a recent-spaces list or adapter-backed equivalent
- a recommendations list or placeholder equivalent

First-phase mixed sourcing direction:

- `Recent Spaces` should combine:
  - recently booked spaces
  - recently opened floorplan spaces
- `Recommended Spaces` should combine:
  - `Near you` from the shared `location` domain
  - `Popular`

Display rules for mixed sourcing:

- one card should communicate one primary reason only
- favorite cards should not duplicate explanation through extra labels
- recent cards should use one lightweight supporting line
- recommended cards should use one ribbon reason
- in `For You`, mixed-source competition should resolve to one final card per
  `space`

Definition note:

- `recently opened floorplan` means the user successfully entered a space's
  floorplan view and the page completed initialization
- it should not be derived from a simple card click alone
- `Near you` should be rendered from location-aware recommendation input rather
  than guessed locally from generic space-card data

Implementation status:

- `Recent Spaces` now combines booking-backed recency and floorplan-entry
  recency from `space_visits`
- only successful bookings (`confirmed` / `checked_in`) are surfaced; cancelled
  and expired bookings are filtered out
- bookings take priority; floorplan visits fill remaining slots; deduplicated by
  `space`
- `Recommended Spaces` consumes `Near you` from the shared `location` domain
  via `GET /api/v1/spaces/nearby`
- the full recommendation pipeline (PopularityScore, PreferenceLiteScore,
  reranking) is future backend work — the current `Recommended Spaces` section
  is backed by location-aware nearby candidates only

The frontend should not assume:

- seat favorites are part of active UI scope

## Empty-State Expectations

### For You

- may lean more heavily on recommendations when favorites and recents are
  sparse
- should remain useful for new or low-activity users

### My Spaces

Each section may:

- be hidden when empty, or
- show a lightweight empty state if preserving structure is more useful

Do not force placeholder cards for symmetry.

## Non-Goals For The First Frontend Pass

- dedicated seat-favorite UI
- advanced recommendation controls or tuning
- a standalone `Favorites` page
- a second bespoke personalized space-card design
- major navigation re-architecture beyond adding `My Spaces`
