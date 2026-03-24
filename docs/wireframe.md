# Wireframe

## Purpose

This document is a low-fidelity wireframe reference for the user-facing booking
experience.

It is intended to help:

- clarify page structure before visual design
- keep layout and interaction discussions grounded
- give agents a fast way to locate page-level UI intent by heading

This document focuses on structure, hierarchy, and interaction zones rather
than final visual styling.

## Home

### Goal

The Home page is the product homepage for the user-facing booking experience.

It should feel lightweight and search-led, closer to a focused entry page than
to a dense dashboard.

### Structure

```text
+----------------------------------------------------------------------------------+
| Logo                         [nav placeholder]                            User   |
+----------------------------------------------------------------------------------+


                               [ Search Box ]
                         [ optional helper text ]


Recent Spaces
+--------------------------------+  +--------------------------------+
| Space A                        |  | Space B                        |
| last booked recently           |  | last booked recently           |
+--------------------------------+  +--------------------------------+


Nearby Buildings
+--------------------------------+  +--------------------------------+
| Building A                     |  | Building B                     |
| address                        |  | address                        |
| distance                       |  | distance                       |
+--------------------------------+  +--------------------------------+
```

### Regions

#### Navbar

- left: project logo
- center: reserved for future primary navigation items
- right: user entry

The exact center navigation items are intentionally undecided for now.

Possible future contents:

- buildings
- favorite spaces
- direct space entry
- other product shortcuts

#### Search box

- sits in the visual center of the page
- acts as the primary entry interaction
- exact feature behavior is intentionally left open for now

It is being reserved for future extensibility.

#### Recent Spaces section

- shows recently used or recently booked spaces
- should help users quickly restart familiar booking flows

This section is based on usage memory, not physical distance.

#### Nearby Buildings section

- shows buildings near the user
- building cards may carry address and distance
- this section should express physical proximity at the building layer

### Notes

- this page should preserve generous whitespace
- it should not read like an admin dashboard
- lower sections should support the search-led homepage rather than overpower it

## Buildings

### Goal

The Buildings page helps users choose which building to enter.

It should behave like a task-oriented building selection page rather than a
building detail page.

### Structure

```text
+----------------------------------------------------------------------------------+
| Breadcrumb: Home / Buildings                                                     |
+----------------------------------------------------------------------------------+

Buildings
+--------------------------------+  +--------------------------------+
| Building image                 |  | Building image                 |
| address                        |  | address                        |
| [View Spaces]                  |  | [View Spaces]                  |
+--------------------------------+  +--------------------------------+
```

### Regions

#### Building card list

- shows many building cards
- each card supports quick entry into the next step
- card body can be used to open a modal with more detail

#### Building card

Base card contents:

- building image
- address
- enter button

Card interaction:

- click card body: open building modal
- click button: move to `Spaces in Building`

#### Building modal

Suggested contents:

- hero image
- building name
- address
- distance
- opening hours
- short description
- facilities
- total space count
- primary CTA: `View Spaces`

## Spaces in Building

### Goal

The `Spaces in Building` page helps users choose a space under the selected
building.

This page should stay selection-focused and should not become a heavy detail
page.

### Structure

```text
+----------------------------------------------------------------------------------+
| Breadcrumb: Home / Buildings / Building A                                        |
+----------------------------------------------------------------------------------+

Spaces in Building
+--------------------------------+  +--------------------------------+
| Space name                     |  | Space name                     |
| seat count                     |  | seat count                     |
| feature icons                  |  | feature icons                  |
| [Book a Seat]                  |  | [Book a Seat]                  |
+--------------------------------+  +--------------------------------+
```

### Regions

#### Space card list

- shows spaces that belong to the selected building
- helps users compare spaces quickly
- keeps information compact and action-oriented

#### Space card

Base card contents:

- space name
- seat count
- feature icons
- enter button

Card interaction:

- click card body: open space modal
- click button: move to `Floorplan`

#### Space modal

Suggested contents:

- cover image
- space name
- building name
- seat count
- space type
- feature icons
- opening hours
- short description
- rules
- amenities
- primary CTA: `Book a Seat`

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
| Left: Time Controls        | Center: Floorplan SVG                         | Right: Booking Drafts   |
|----------------------------|-----------------------------------------------|-------------------------|
| Date picker                |                                               | Booking Drafts          |
| Slot blocks                |                                               | Draft 1                 |
| 08:00-09:00                |                                               | Seat A12                |
| 09:00-10:00                |               seat map / svg                  | 08-12, 18-20            |
| 10:00-11:00                |                                               | Edit / Delete           |
| ...                        |                                               |                         |
|                            |                                               | Draft 2                 |
| New Draft / Add Draft      |                                               | ...                     |
+------------------------------------------------------------------------------------------------------+
```

### Width balance

- left column: control area
- center column: primary workspace, about `1/2` of the total width
- right column: persistent `Booking Drafts` area

### Regions

#### Left column

Purpose:

- date selection
- slot selection
- draft creation/edit controls

Contents:

- date picker
- time slot blocks
- active draft actions such as `New Draft`, `Add Draft`, `Save Changes`,
  `Cancel Editing`

Slot block contents:

- time range
- very light background color
- remaining seat count only when remaining seats are below 25%

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

Seat interaction:

- clicking a seat can surface seat-specific details and seat-specific
  availability
- the seat detail treatment is still open, but it should remain supplementary to
  the main workspace

#### Right column

Purpose:

- persistent `Booking Drafts` visibility
- current planning state
- edit and checkout controls

Each draft card may include:

- draft label
- selected seat
- slot summary
- total duration
- actions such as `Edit` and `Delete`

### Visual state behavior

Each draft uses one color shared by:

- selected seat
- selected slot blocks

State distinction:

- currently edited draft: solid or stronger fill
- non-edited draft: lighter or weaker fill

Selected draft items should also display a checkmark.

### Floorplan States

#### Browsing State

##### Goal

Allow the user to inspect the current floorplan, review existing drafts, and
decide whether to create or edit a draft.

##### Entry

This is the default state when:

- the page first loads
- the user finishes adding a draft
- the user finishes editing a draft
- the user cancels out of creation or editing

##### Layout behavior

- left column remains visible with date and time controls
- center column shows the floorplan for the currently selected date and slot
  context
- right column shows persistent `Booking Drafts`

No draft is currently being edited.

##### Available actions

- `New Draft`
- inspect seat states
- inspect existing drafts
- `Checkout` if at least one draft exists

##### Selection behavior

- slot and seat states remain visible
- draft-colored seats and slot blocks continue to show their assigned draft
  state
- browsing should focus on understanding the workspace, not modifying active
  selections

##### Visual cues

- no draft appears as the active editing target
- existing draft colors remain visible in their lighter, stored state

##### Exit paths

- click `New Draft` to enter `Creating Draft`
- click an existing draft or its selected items to enter `Editing Draft`
- click `Checkout` to continue to confirm/checkout flow

#### Creating Draft State

##### Goal

Allow the user to assemble a new booking draft by selecting date, slot(s), and
seat.

##### Entry

- user clicks `New Draft` from `Browsing State`

##### Layout behavior

- left column becomes the main slot-selection and draft-action area
- center column updates seat availability according to the in-progress draft
  selection
- right column continues to show existing drafts and can also reflect the
  current draft-in-progress state

##### Available actions

- select one or more time slots
- select a seat
- `Add Draft`
- `Cancel Editing`

`Add Draft` should only be enabled when the draft has a valid seat and at least
one valid selected slot.

##### Selection behavior

- selected slots for the in-progress draft use the active draft color
- selected seat for the in-progress draft uses the same active draft color
- seat states update based on the currently selected slot set
- unavailable seats remain unavailable
- slots or seats already assigned to other drafts remain unavailable for this
  new draft

##### Visual cues

- the draft currently being created is shown with a stronger, solid visual state
- existing saved drafts remain visible in lighter states
- selected items in the current draft also show a checkmark

##### Exit paths

- click `Add Draft` to save the draft and return to `Browsing State`
- click `Cancel Editing` to discard the in-progress draft and return to
  `Browsing State`

#### Editing Draft State

##### Goal

Allow the user to modify an existing draft while keeping the rest of the booking
workspace visible.

##### Entry

- user clicks an existing draft card
- or user clicks a seat or time slot that already belongs to a draft

##### Layout behavior

- left column reflects the selected draft's slot assignments
- center column reflects the selected draft's seat and the resulting seat-state
  context
- right column highlights the draft currently being edited

##### Available actions

- modify selected time slots
- modify selected seat
- `Save Changes`
- `Cancel Editing`
- `Delete Draft`

##### Selection behavior

- the selected draft is loaded back into the workspace for editing
- its seat and slot assignments become the active selection set
- the user edits this draft directly instead of creating a new one
- other drafts remain visible but visually secondary

##### Visual cues

- the draft currently being edited uses the stronger, solid visual treatment
- all other drafts stay in lighter stored states
- the active draft should be easy to identify across left, center, and right
  columns

##### Exit paths

- click `Save Changes` to persist edits and return to `Browsing State`
- click `Cancel Editing` to revert changes and return to `Browsing State`
- click `Delete Draft` to remove the draft and return to `Browsing State`

## Confirm

### Goal

The Confirm page explains what will be submitted and what real bookings will be
created from the current drafts.

### Structure

```text
+----------------------------------------------------------------------------------+
| Confirm Booking(s)                                                               |
+----------------------------------------------------------------------------------+

+----------------------------------------------------------------------------------+
| Draft 1                                                                          |
| Seat A12                                                                         |
| 08:00-12:00, 18:00-20:00                                                         |
| Will create 2 bookings                                                           |
+----------------------------------------------------------------------------------+

+----------------------------------------------------------------------------------+
| Draft 2                                                                          |
| Seat B03                                                                         |
| 13:00-15:00                                                                      |
| Will create 1 booking                                                            |
+----------------------------------------------------------------------------------+

| [ Checkout ]                                                                     |
```

### Notes

- one draft is not always equal to one real booking
- drafts with gaps may expand into multiple bookings
- checkout may partially succeed under concurrency

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
