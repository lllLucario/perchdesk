# My Bookings Task Breakdown

## Goal

Ship a usable first version of the `My Bookings` page with:

- tabbed active/history views
- filter and sort controls
- action-aware booking cards
- booking detail modal with read-only floorplan preview

---

## Implementation Assumptions

Decisions made conservatively to avoid scope creep. Document here, not in code.

**Status derivation is done on the frontend from existing fields + wall clock time.**

Backend statuses (`confirmed`, `checked_in`, `cancelled`, `expired`) map to UX
statuses as follows:

| Backend status | Condition                    | UX status           | Tab     |
|----------------|------------------------------|---------------------|---------|
| confirmed      | start_time > now             | Booked              | Active  |
| confirmed      | start_time <= now            | Check-in Available  | Active  |
| checked_in     | end_time > now               | In Use              | Active  |
| checked_in     | end_time <= now              | Completed           | History |
| cancelled      | —                            | Cancelled           | History |
| expired        | —                            | Expired             | History |

`Check-in Available` is shown when `status === "confirmed"` and current time
has passed `start_time`. The auto-release window is enforced server-side
(scheduler); the frontend does not need to re-derive it for display purposes.

**Backend enrichment is mandatory, not optional.**

The current `BookingResponse` returns only `seat_id`. Booking cards require
`seat_label`, `space_name`, `building_name`, and the detail modal also needs
`seat_position` and `space_layout_config` for the floorplan preview. These
cannot be fetched separately per booking without causing N+1 requests.

**Floorplan preview reuses the existing SeatMap rendering infrastructure.**

The detail modal floorplan preview is read-only, highlights only the booked
seat, and accepts no user interaction. It should be driven by the same SVG
renderer used in the booking workspace, passed via props.

**Cross-day bookings are not in scope.**

Consistent with the rest of the platform at this phase.

---

## PR Plan

### PR 1 — Backend: Enrich booking response

**Rationale:** All frontend card and modal work depends on
space/seat/building context that is not currently in `BookingResponse`. This
must land first.

**Tasks:**

- Extend `BookingResponse` schema to include:
  - `seat_label: str`
  - `space_id: UUID`
  - `space_name: str`
  - `building_id: UUID | None`
  - `building_name: str | None`
  - `seat_position: dict` (x, y — needed for floorplan preview)
  - `space_layout_config: dict | None` (needed for floorplan canvas dimensions)
  - `cancellation_reason: str | None` (include if already tracked, else omit)
- Update `list_my_bookings` and `get_booking` service methods to eager-load
  the seat, space, and building relations (avoid N+1)
- Update frontend `Booking` TypeScript interface in `lib/hooks.ts` to match
- Add/update backend tests for enriched response shape

**Verification:**

```
cd backend && pytest
cd backend && pytest tests/api/
cd frontend && npx tsc --noEmit
```

---

### PR 2 — Frontend: Page shell, tabs, and status derivation

**Rationale:** Establishes the structural skeleton and status-derivation
utility that all subsequent PRs build on top of.

**Tasks:**

- Replace current `/(dashboard)/bookings/page.tsx` with the tabbed shell
- Implement `Active Bookings` (default) and `Booking History` tabs
- Add a `deriveBookingStatus(booking, now)` utility that maps backend status
  + time to one of six UX statuses (see table above)
- Wire `useBookings()` to both tabs; separate bookings into active/history
  groups using `deriveBookingStatus`
- Add empty states:
  - Active: explain no current bookings, link toward booking flow
  - History: explain no historical bookings yet
- Render a minimal placeholder card per booking (data only, no full styling)
  so tabs are testable end-to-end

**Verification:**

```
cd frontend && npm test
cd frontend && npm run lint
```

Tests should cover: tab switching, correct grouping of active vs history
bookings given mock status/time combinations, empty state rendering.

---

### PR 3 — Frontend: Cards, filters, and sort

**Rationale:** Builds the full card UI on top of the shell. Cards and
filters are coupled (filter drives which cards render) so they ship together.

**Tasks:**

- Implement full active-booking card layout:
  - space name, building name, seat label, date, time range, duration,
    status badge, relative time hint (`Starts in 2h`, `In progress`)
- Implement history card layout:
  - space name, building name, seat label, date, time range, duration,
    final status badge
- Status badge styles for all six UX statuses
- Enforce action visibility per status:
  - `Booked` → `View Details`, `Cancel`
  - `Check-in Available` → `View Details`, `Check In`, `Cancel`
  - `In Use` → `View Details` only (no Cancel)
  - History statuses → `View Details` only
- Add status filter control per tab (pill or dropdown):
  - Active: All / Booked / Check-in Available / In Use
  - History: All / Completed / Expired / Cancelled
- Add sort control per tab (dropdown):
  - Active: Start time: soonest / Start time: latest / Duration: longest /
    Duration: shortest
  - History: Most recent / Oldest / Duration: longest / Duration: shortest
- Wire `Check In` and `Cancel` buttons to existing `useCheckIn` and
  `useCancelBooking` mutations
- Filter and sort are local UI state — no backend query params needed

**Verification:**

```
cd frontend && npm test
cd frontend && npm run lint
```

Tests should cover: status filter renders correct cards only, sort order,
`Cancel` absent for `In Use`, `Check In` present only for `Check-in
Available`.

---

### PR 4 — Frontend: Detail modal and read-only floorplan preview

**Rationale:** The detail modal is the most self-contained piece. It depends
on enriched booking data (PR 1) and the card shell (PR 2/3), but has no
upstream effects. The floorplan preview is the most complex sub-task and is
isolated here so it does not block PR 2/3.

**Tasks:**

- Implement booking detail modal (triggered by `View Details`)
- Modal content:
  - space name, building name, seat label
  - date, time range, booking status, duration
  - booking ID, created-at time
  - check-in metadata when `checked_in_at` is present
  - cancellation metadata when status is `Cancelled`
- Read-only floorplan preview using seat_position + space_layout_config from
  enriched response:
  - render SVG canvas with seat positions
  - highlight the booked seat (blue, consistent with existing seat-color
    conventions)
  - no seat click or booking interaction
  - if `space_layout_config` is null, show a fallback message instead of
    a blank canvas
- Contextual modal actions for active bookings:
  - `Check In` when status is `Check-in Available`
  - `Cancel` when status is `Booked` or `Check-in Available`
- History modal: `Close` only, no action buttons
- Modal state managed in page-level state (selected booking ID + open flag)

**Verification:**

```
cd frontend && npm test
cd frontend && npm run lint
```

Tests should cover: modal opens on `View Details` click, modal closes,
correct fields present, floorplan preview renders with highlighted seat,
no action buttons for history items.

---

## Acceptance Criteria

- One `My Bookings` page hosts both views via tabs
- `Active Bookings` is the default tab
- Active cards and history cards show all fields defined in `frontend-scope.md`
- `Cancel` is not shown for `In Use`
- `Check In` appears only for `Check-in Available`
- Both tabs have a status filter and a sort control
- Clicking a booking opens a detail modal
- Modal floorplan preview is read-only
- Existing backend tests remain green throughout

---

## Delivery Notes

- Keep user-facing status names aligned with
  `docs/features/booking-workspace/decision-log.md`
- Do not split active/history into separate full pages — this is a deliberate
  product decision documented in `overview.md`
- Preserve a lightweight page structure; avoid dashboard drift
- Filter and sort are UI-only; do not add backend query parameters for them
  unless the booking volume makes client-side filtering impractical (unlikely
  at this phase)
