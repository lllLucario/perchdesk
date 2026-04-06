# Frontend Design Replacement Plan

## Goal

Replace the current frontend visual language with the PerchDesk green editorial system defined in [DESIGN.md](/Users/kkkadoya/Desktop/perchdesk/docs/design/DESIGN.md), while keeping the product stable and avoiding broad regressions.

This plan is intentionally incremental. The current frontend still relies on scattered Tailwind utility colors such as `gray`, `blue`, `yellow`, `purple`, and `red` across shared UI and route shells. The replacement should start by creating a single styling foundation, then migrate shared surfaces, then migrate page-specific experiences.

## Current State Summary

The current frontend indicates three main issues:

- Global styling is minimal. [globals.css](/Users/kkkadoya/Desktop/perchdesk/frontend/app/globals.css) only defines a black-and-white background and default body font.
- Top-level app chrome uses ad hoc Tailwind colors. [layout.tsx](/Users/kkkadoya/Desktop/perchdesk/frontend/app/(dashboard)/layout.tsx) still uses `bg-gray-50`, `bg-white`, `text-blue-600`, `text-purple-600`, and `text-red-500`.
- Shared UI components encode their own color semantics. [SpaceCard.tsx](/Users/kkkadoya/Desktop/perchdesk/frontend/components/SpaceCard.tsx) and [BuildingModal.tsx](/Users/kkkadoya/Desktop/perchdesk/frontend/components/BuildingModal.tsx) use hard-coded `gray`, `yellow`, and `blue` classes.

Because of that, the migration should not start at individual screens. It should start at the styling foundation.

## Rollout Principles

- Replace color meaning centrally before replacing page composition locally.
- Preserve booking clarity. Design changes must not make space availability or booking status harder to read.
- Migrate shared components before route-specific pages.
- Keep each phase shippable and testable.
- Avoid mixing old blue/purple status language with the new green system for long periods.

## Phase 1: Establish Global Design Tokens

### Objective

Create a single source of truth for the new color, typography, spacing, radius, and elevation system.

### Work

- Expand [globals.css](/Users/kkkadoya/Desktop/perchdesk/frontend/app/globals.css) to define:
  - light and dark theme CSS variables
  - semantic text, surface, border, and accent tokens
  - serif and sans font variables aligned with the design docs
- Introduce semantic Tailwind-accessible tokens where needed through the existing CSS theme setup.
- Replace the current plain `--background` and `--foreground` model with a broader design token layer.

### Deliverable

After this phase, new UI can consume PerchDesk tokens without hard-coding page-level colors.

## Phase 2: Replace Top-Level Shells

### Objective

Update the persistent app framing so the product feels like PerchDesk before deeper page work begins.

### Work

- Update [layout.tsx](/Users/kkkadoya/Desktop/perchdesk/frontend/app/(dashboard)/layout.tsx) to use the new background, nav, type, and link hierarchy.
- Review [layout.tsx](/Users/kkkadoya/Desktop/perchdesk/frontend/app/(public)/layout.tsx), [layout.tsx](/Users/kkkadoya/Desktop/perchdesk/frontend/app/(admin)/layout.tsx), and [layout.tsx](/Users/kkkadoya/Desktop/perchdesk/frontend/app/layout.tsx) so all entry shells share the same visual language.
- Remove obvious legacy brand signals such as blue brand links, purple admin links, and red text-only logout emphasis where they are purely stylistic rather than semantic.

### Deliverable

The app shell, page background, navigation, and typography should reflect the green editorial direction even before page internals are fully migrated.

## Phase 3: Refactor Shared Components

### Objective

Replace repeated ad hoc styling in components that appear across multiple screens.

### Priority Components

- [SpaceCard.tsx](/Users/kkkadoya/Desktop/perchdesk/frontend/components/SpaceCard.tsx)
- [BuildingModal.tsx](/Users/kkkadoya/Desktop/perchdesk/frontend/components/BuildingModal.tsx)
- [SpaceModal.tsx](/Users/kkkadoya/Desktop/perchdesk/frontend/components/SpaceModal.tsx)
- [RecommendationRibbon.tsx](/Users/kkkadoya/Desktop/perchdesk/frontend/components/RecommendationRibbon.tsx)
- [BuildingMap.tsx](/Users/kkkadoya/Desktop/perchdesk/frontend/components/BuildingMap.tsx)
- Floorplan and seat-map shared pieces under [/Users/kkkadoya/Desktop/perchdesk/frontend/components/Floorplan](/Users/kkkadoya/Desktop/perchdesk/frontend/components/Floorplan) and [/Users/kkkadoya/Desktop/perchdesk/frontend/components/SeatMap](/Users/kkkadoya/Desktop/perchdesk/frontend/components/SeatMap)

### Work

- Replace hard-coded `gray`, `blue`, `yellow`, and other utility colors with semantic classes or CSS variables.
- Normalize button hierarchy, panel backgrounds, chip styles, borders, and hover states.
- Ensure booking and favorite interactions use the new brand language without losing state clarity.

### Deliverable

Shared cards, modals, chips, ribbons, and status surfaces should all read as part of one system.

## Phase 4: Migrate High-Value Surfaces

### Objective

Update the most visible and product-defining screens first.

### Priority Order

1. Public home and discovery
2. Buildings and spaces browsing
3. My Spaces
4. Booking flow
5. My Bookings
6. Admin management surfaces

### Route Targets

- [page.tsx](/Users/kkkadoya/Desktop/perchdesk/frontend/app/(public)/page.tsx)
- [page.tsx](/Users/kkkadoya/Desktop/perchdesk/frontend/app/(dashboard)/buildings/page.tsx)
- [page.tsx](/Users/kkkadoya/Desktop/perchdesk/frontend/app/(dashboard)/buildings/[id]/page.tsx)
- [page.tsx](/Users/kkkadoya/Desktop/perchdesk/frontend/app/(dashboard)/spaces/page.tsx)
- [page.tsx](/Users/kkkadoya/Desktop/perchdesk/frontend/app/(dashboard)/spaces/[id]/page.tsx)
- [page.tsx](/Users/kkkadoya/Desktop/perchdesk/frontend/app/(dashboard)/my-spaces/page.tsx)
- [page.tsx](/Users/kkkadoya/Desktop/perchdesk/frontend/app/(dashboard)/confirm/page.tsx)
- [page.tsx](/Users/kkkadoya/Desktop/perchdesk/frontend/app/(dashboard)/result/page.tsx)
- [page.tsx](/Users/kkkadoya/Desktop/perchdesk/frontend/app/(dashboard)/bookings/page.tsx)
- [page.tsx](/Users/kkkadoya/Desktop/perchdesk/frontend/app/(admin)/spaces/manage/page.tsx)

### Work

- Apply the new page-level rhythm from [surfaces.md](/Users/kkkadoya/Desktop/perchdesk/docs/design/surfaces.md).
- Reduce dashboard-style density where editorial hierarchy would improve readability.
- Make discovery pages feel spatial and calm.
- Keep booking confirmation, slot picking, and result pages operational and reassuring rather than decorative.

### Deliverable

The main user journey should feel visually consistent from landing through booking completion.

## Phase 5: Booking State and Seat Map Semantics

### Objective

Make sure the new design system supports operational clarity in the most sensitive areas.

### Work

- Audit booking state colors across:
  - available
  - selected
  - confirmed
  - checked in
  - occupied
  - unavailable
  - maintenance
- Apply non-color cues where needed for accessibility.
- Tune Floorplan and Seat Map visuals so the green theme supports state meaning instead of flattening distinctions.

### Deliverable

The seat and booking flows retain strong usability while adopting the new visual language.

## Phase 6: Cleanup and Consistency Pass

### Objective

Remove leftover legacy styling and close the gap between design docs and implementation.

### Work

- Search for residual Tailwind classes that conflict with the new system:
  - `text-blue-*`
  - `bg-blue-*`
  - `text-purple-*`
  - `bg-purple-*`
  - `text-yellow-*`
  - `bg-yellow-*`
  - generic `gray-*` usage where semantic tokens should be used instead
- Standardize spacing, border radius, and shadow usage.
- Align empty, loading, and error states with [patterns.md](/Users/kkkadoya/Desktop/perchdesk/docs/design/patterns.md).

### Deliverable

The frontend no longer presents as a hybrid of old default Tailwind styling and the new PerchDesk system.

## Verification Strategy

Each phase should be verified separately.

- Foundation and component work: `cd frontend && npm test`
- Surface-level route updates: targeted visual review plus `cd frontend && npm test`
- Booking and seat-map updates: pay special attention to relevant tests such as booking, floorplan, building map, and space-card coverage in [/Users/kkkadoya/Desktop/perchdesk/frontend/tests](/Users/kkkadoya/Desktop/perchdesk/frontend/tests)

## Suggested Implementation Sequence

If work starts immediately, the best sequence is:

1. global tokens in [globals.css](/Users/kkkadoya/Desktop/perchdesk/frontend/app/globals.css)
2. dashboard/public/admin layouts
3. shared cards, modals, ribbons, and buttons
4. public home and discovery pages
5. booking flow and result pages
6. my-spaces and my-bookings refinements
7. seat-map semantic pass
8. cleanup sweep for legacy Tailwind colors

This sequence minimizes churn because it replaces the styling foundation first and postpones route polish until shared primitives are stable.
