# Booking UX Open Questions

## Scope

This document captures ideas, open questions, and discussed topics that were
mentioned but not yet fully decided.

These items should be treated as product discussion notes, not implementation
requirements.

## Future Information Architecture Topics

### Building vs. distance-based discovery

Current direction is:

- Home may show recently used spaces
- physical proximity should likely be expressed at the building layer

Still open:

- how building cards should present address and distance
- whether Home should also support location-aware building suggestions

## Floorplan and Availability Topics

### What to do when no seat matches all selected slots

Current agreed behavior:

- floorplan simply reflects the truth and shows all seats unavailable

Not planned for now:

- auto-suggesting nearby alternative times
- smart recommendation behavior

Reason:

- weak recommendations may mislead users more than they help

This may be revisited later if recommendation quality can be high enough.

### Capacity visualization beyond the current threshold rule

Current direction is intentionally restrained.

Still open:

- whether low-capacity warning needs stronger visual treatment
- whether future versions should add summary occupancy indicators elsewhere on
  the page

## Seat Detail UI

The seat detail box direction is agreed at a high level, but details remain
open:

- exact placement relative to the floorplan
- whether it should behave like a popover, floating panel, or persistent side
  panel
- whether clicking a seat should always open it, or only when the panel is not
  already pinned
- how it should coexist visually with the persistent `Booking Drafts` right
  column

## Booking Drafts Model

### Draft editing behavior

Current direction:

- clicking a seat or time slot already assigned to a draft enters editing for
  that draft

Still open:

- whether entering edit mode should be immediate or require an explicit confirm
  action such as `Edit`
- whether users need protection against accidental edit-mode switching

### Draft deletion and recovery

Deletion is expected to exist, but details are still open:

- exact placement of `Delete Draft`
- whether deletion needs confirmation
- whether undo should be supported

### Editing conflict when switching drafts mid-edit

Potential issue:

- user is editing Draft A
- user clicks an item belonging to Draft B

Still open:

- whether the UI should prompt to save/discard changes first
- what the least confusing interruption pattern is

### Number of drafts allowed

Not yet decided:

- whether there should be a hard limit on how many drafts can be created in one
  planning session

## Booking Expansion and Submission

### Draft-to-booking expansion details

Current direction:

- one draft may expand into multiple real bookings when selected slots contain
  gaps

Still open:

- exact wording on the confirm page
- whether expansion should be previewed inline before checkout

### Partial success UX

Current direction:

- partial success is acceptable

Still open:

- exact structure of the result page
- whether failed booking attempts should remain as editable drafts after
  checkout
- whether successful items should disappear from drafts automatically

## Cross-Day Booking

Current decision:

- not supported for now

Reason:

- cross-day booking introduces additional complexity that should not be mixed
  into the current floorplan and draft design yet

Open for future discussion:

- whether a future draft may span multiple dates
- how multi-day slot selection would be represented in the UI
- how checkout would explain multi-day draft expansion

## Backend and Data Model Alignment

The UX direction now assumes capabilities that may require backend changes or
API refinement.

Still open:

- how `Booking Drafts` should be represented in frontend state only, vs.
  persisted server-side
- whether checkout should submit a batch payload or multiple sequential booking
  requests
- how final booking creation should be validated under concurrency

## Unresolved Product Framing Questions

These framing questions were discussed and are still worth revisiting during
implementation planning:

- how much seat metadata should be shown before the user clicks a seat
- whether the space page needs lightweight current availability hints
- whether the booking result page should encourage the user to continue planning
  more reservations after partial success
