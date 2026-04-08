# Booking Workspace Wireframe

## Goal

The booking workspace is the core booking surface.

It should support:

- time-first booking
- seat selection on a floorplan
- booking-list based planning
- in-context confirmation and result handling

## Floorplan

### Goal

The Floorplan page is the primary booking workspace.

It should support time-first booking while keeping the floorplan as the main
interactive canvas.

### Structure

```text
+------------------------------------------------------------------------------------------------------+
| Breadcrumb: Home / Building A / Space X                                                              |
+------------------------------------------------------------------------------------------------------+
| Left: Time Controls        | Center: Floorplan SVG                         | Right: Booking List     |
|----------------------------|-----------------------------------------------|-------------------------|
| Date picker                |                                               | Booking List            |
| Slot blocks                |                                               | Booking 1               |
| 08:00-09:00                |                                               | Seat A12                |
| 09:00-10:00                |               seat map / svg                  | 08-12, 18-20            |
| 10:00-11:00                |                                               | Edit / Delete           |
| ...                        |                                               |                         |
|                            |                                               | Booking 2               |
| Add Booking                |                                               | ...                     |
+------------------------------------------------------------------------------------------------------+
```

### Width balance

- left column: control area
- center column: primary workspace, about `1/2` of the total width
- right column: persistent `Booking List` area

### Regions

#### Left column

Purpose:

- date selection
- slot selection
- booking creation/edit controls

Contents:

- date picker
- time slot blocks
- time-of-day divider labels such as `Morning`, `Afternoon`, and `Evening`
- current booking actions such as `Add Booking`, `Save Changes`,
  `Cancel Editing`, `Submit`

Slot block contents:

- time range
- very light background color
- remaining seat count only when remaining seats are below 25%

Time slot behavior:

- on first load, the slot list should automatically scroll/focus to the default
  preselected slot
- when the selected date is today, past time slots should appear greyed out and
  be unselectable
- if the current user already holds a booking in this space for a slot, that
  slot should reflect a dedicated `my booking` state rather than generic
  unavailability

When the user reaches the maximum daily duration:

- selected blocks remain selected
- additional unselected blocks become disabled

#### Center column

Purpose:

- main seat-selection workspace

Contents:

- floorplan SVG
- seat states rendered according to the currently selected date and slots

Rules:

- the map reflects seats available across all selected slots
- if no seat satisfies the selection, all seats appear unavailable
- seats already booked by the current user for the selected date/time should
  render with a distinct `my booking` state
- the map should not treat a user's own booking as a generic available seat for
  creating a new booking in the same time range

Seat interaction:

- clicking a seat can surface seat-specific details and seat-specific
  availability
- the seat detail treatment is still open, but it should remain supplementary to
  the main workspace

#### Right column

Purpose:

- persistent `Booking List` visibility
- current planning state
- edit and checkout controls

Each booking card may include:

- booking label
- selected seat
- slot summary
- total duration
- actions such as `Edit` and `Delete`

### Visual state behavior

Each booking uses one color shared by:

- selected seat
- selected slot blocks

State distinction:

- currently edited booking: solid or stronger fill
- non-edited booking: lighter or weaker fill

Selected booking items should also display a checkmark.

### Floorplan States

#### Creating State

##### Goal

Allow the user to assemble the current booking by selecting date, slot(s), and
seat.

##### Entry

- the page first loads
- the user adds a booking to the list
- the user saves an edit
- the user cancels editing

##### Layout behavior

- left column is the main slot-selection area for the current booking
- center column updates seat availability according to the current booking
  selection
- right column shows persistent `Booking List`
- the current booking is edited in the workspace, but does not appear in the
  list until the user clicks `Add Booking`

##### Available actions

- select one or more time slots
- select a seat
- `Add Booking`
- `Submit` when the list is non-empty

`Add Booking` should only be enabled when the current booking has a valid seat
and at least one valid selected slot.

##### Selection behavior

- the nearest valid upcoming slot is selected by default
- the slot list should auto-position to make that default slot visible
- selected slots for the current booking use the active booking color
- selected seat for the current booking uses the same active booking color
- seat states update based on the currently selected slot set
- unavailable seats remain unavailable
- seats in a `my booking` state remain visibly distinct from both `available`
  and `booked`
- slots or seats already assigned to items in the list remain unavailable for
  the current booking
- when the user selects a seat, the time slots update to reflect that seat's
  availability
- slots unavailable for the selected seat become greyed out and unselectable
- if a selected slot becomes unavailable due to seat choice, it is removed from
  the current booking and the UI should provide lightweight feedback

##### Visual cues

- the booking currently being created is shown with a stronger, solid visual
  state
- existing saved bookings remain visible in lighter states
- selected items in the current booking also show a checkmark

##### Exit paths

- click `Add Booking` to save the booking and remain in `Creating State`
- click `Edit` on an existing booking to enter `Editing State`
- click `Submit` to continue to confirm/checkout flow

#### Editing State

##### Goal

Allow the user to modify an existing booking while keeping the rest of the
booking workspace visible.

##### Entry

- user explicitly clicks `Edit` on an existing booking in the `Booking List`

##### Layout behavior

- left column reflects the selected booking's slot assignments
- center column reflects the selected booking's seat and the resulting
  seat-state context
- right column highlights the booking currently being edited

##### Available actions

- modify selected time slots
- modify selected seat
- `Save Changes`
- `Cancel Editing`
- `Delete`

##### Selection behavior

- the selected booking is loaded back into the workspace for editing
- its seat and slot assignments become the active selection set
- the user edits this booking directly instead of creating a new one
- other bookings remain visible but visually secondary
- seat and slot synchronization rules still apply while editing

##### Visual cues

- the booking currently being edited uses the stronger, solid visual treatment
- all other bookings stay in lighter stored states
- the active booking should be easy to identify across left, center, and right
  columns

##### Exit paths

- click `Save Changes` to persist edits and return to `Creating State`
- click `Cancel Editing` to revert changes and return to `Creating State`
- click `Delete` to remove the booking and return to `Creating State`

## Confirm Modal

### Goal

The confirm step should stay inside the floorplan flow as a modal.

It should explain what will be submitted and what real bookings will be created
from the current booking list without forcing the user onto a separate full
page.

### Structure

```text
+--------------------------------------------------------------+
| Confirm Booking(s)                                     [X]   |
+--------------------------------------------------------------+
| Booking 1                                                    |
| Seat A12                                                     |
| 08:00-12:00, 18:00-20:00                                     |
| Will create 2 bookings                                       |
+--------------------------------------------------------------+
| Booking 2                                                    |
| Seat B03                                                     |
| 13:00-15:00                                                  |
| Will create 1 booking                                        |
+--------------------------------------------------------------+
| [ Cancel ]                                  [ Confirm ]      |
+--------------------------------------------------------------+
```

### Notes

- this should be a lightweight confirmation step, not a duplicate review page
- one draft is not always equal to one real booking
- drafts with gaps may expand into multiple bookings
- the modal should preserve the user's floorplan context until submission
  begins

## Result

### Goal

The Result page should report the actual checkout outcome after submission.

### Structure

```text
+----------------------------------------------------------------------------------+
| Booking Results                                                                  |
+----------------------------------------------------------------------------------+

+----------------------------------------------------------------------------------+
| Success                                                                          |
| Seat A12 / 08:00-12:00                                                           |
+----------------------------------------------------------------------------------+

+----------------------------------------------------------------------------------+
| Success                                                                          |
| Seat A12 / 18:00-20:00                                                           |
+----------------------------------------------------------------------------------+

+----------------------------------------------------------------------------------+
| Failed                                                                           |
| Seat B03 / 13:00-15:00                                                           |
| Reason: no longer available                                                      |
+----------------------------------------------------------------------------------+
```

### Notes

- result reporting should reflect real submission outcomes
- partial success is acceptable
- result wording should stay concrete and operational
