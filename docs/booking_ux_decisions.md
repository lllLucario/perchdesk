# Booking UX Decisions

## Scope

This document captures the booking UX decisions that are currently agreed for
the user-facing reservation flow.

It focuses on:

- information architecture
- booking flow
- floorplan interaction model
- booking drafts behavior
- confirmed UI states and constraints

## Information Architecture

### Core user flow

The current agreed primary flow is:

`Home -> Buildings -> Spaces in Building -> Floorplan -> Confirm Modal -> Result`

Notes:

- `Building` is a first-class entity in the UX.
- `Level` and `Room` should remain in the data model, but they should not be
forced as explicit navigation steps in the default flow.
- Users should typically choose a `Building`, then a `Space` under that
  building, then continue to the floorplan page.
- The product should avoid adding separate heavy detail pages for buildings or
  spaces in the core booking path.
- Building and space detail should be shown in modal form rather than dedicated
  content pages.

### Role of each page

#### Home

Primary responsibilities:

- act as the product homepage for this project
- provide a quick way to start booking
- surface recently used spaces
- allow users to search or browse buildings

This `Home` page is the user-facing product homepage, not a marketing landing
page and not an admin dashboard.

The meaning of "recent" on Home is:

- time-based recent usage, not physical distance

From Home, users should be able to enter the building-selection flow directly.

If physical proximity is shown in the future:

- proximity should be attached to `Building`
- building cards can display address and distance
- space cards should avoid carrying extra location clutter

#### Buildings

The Buildings page should:

- show a list of building cards
- help users choose a building quickly
- avoid becoming a building detail page

Each building card should minimally support:

- hero image
- address
- explicit enter action

Interaction model:

- clicking the card body opens a building detail modal
- clicking the enter action moves to that building's space-selection page

#### Spaces in Building

The `Spaces in Building` page should:

- show a list of space cards for the selected building
- help users choose a space quickly
- avoid becoming a heavy space detail page

Each space card should minimally support:

- space name
- seat count
- small feature icons, such as power or accessibility
- explicit enter action

Interaction model:

- clicking the card body opens a space detail modal
- clicking the enter action moves to the booking workspace

#### Floorplan

The floorplan page is the main booking workspace.

High-level layout:

- left column: date and time selection controls
- center column: floorplan SVG
- right column: `Booking List`

The workspace should use a three-column layout.

Recommended width balance:

- left column: secondary control area
- center column: primary workspace, about `1/2` of the screen width
- right column: persistent drafts/status area

The floorplan should remain the dominant visual area because it is the main
interactive canvas for seat selection.

#### Confirm Modal

The confirm step should be implemented as a modal rather than a standalone
page.

The confirm modal should:

- show the concrete seat/time selections that will be submitted
- clarify how many real bookings will be created
- allow the user to explicitly confirm checkout without leaving the floorplan
  context

Rationale:

- the right-side `Booking List` panel already exposes most pre-checkout
  information
- a standalone confirm page would duplicate too much of the workspace context
- a modal keeps the flow lightweight while still giving checkout an explicit
  confirmation step

### Modal detail strategy

The product should use modal detail views as supplementary information layers.

Rationale:

- keep the primary booking flow short
- avoid inserting dedicated detail pages between selection steps
- still allow users to inspect more context before proceeding

### Building modal

The building detail modal should help users decide whether to continue into that
building's spaces.

Current minimum content:

- hero image
- building name
- address
- distance
- opening hours
- short description
- facilities
- total space count
- primary CTA: `View Spaces`

Current exclusions:

- transport notes
- rules or notices
- real-time available space count

### Space modal

The space detail modal should help users decide whether to begin booking in that
space.

Current minimum content:

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

Optional future enhancement:

- quick availability

This is not required for the current baseline design.

## Booking Logic

### Booking unit

- Booking selection unit is `1 hour`.
- Current temporary strategy: both `library` and `office` use an hourly slot
  model in the user-facing booking flow.
- For `office`, this is a deliberate temporary simplification to keep the
  booking workspace, drafts, confirm modal, and result flow on one consistent
  slot-based interaction model.
- `office` still differs through business limits such as longer maximum
  duration and advance-booking window.
- More flexible admin-defined office booking modes may be introduced later, but
  they are out of scope for the current implementation phase.

### Day boundary

- Cross-day booking is not supported for now.
- Booking selection stays within a single day for the current product scope.

### Time-first booking model

The default floorplan interaction is time-first:

1. user selects date
2. user selects one or more time slots
3. floorplan renders seat availability for the current selection
4. user chooses a seat

Rationale:

- users care first about whether they can use the space at a given time
- seat identity is usually secondary to time availability

### Default time behavior

If the user has not selected a time yet:

- default to the nearest valid upcoming slot after the current time
- do not default to an already-started slot
- when the page first loads, the slot picker should automatically scroll or
  focus to the preselected slot so it is visible without requiring manual
  searching
- when the selected date is today, slots that are already in the past should be
  greyed out and unselectable

### Multi-slot selection

Users may select:

- continuous time slots
- discrete time slots

Product intent:

- the system should not reject reasonable real-world usage patterns
- for example, a user may want to use a seat in the morning and return later

### Max usage constraint

For the current design direction:

- a user may reserve at most `8 hours` in the same space per day
- this `8 hour` limit currently applies to both `library` and `office` in the
  active product direction
- future admin-defined per-space duration overrides are intentionally deferred
  until after the current booking workspace flow is stable

When the user reaches the maximum:

- already selected slots remain selected
- unselected slots become disabled/greyed out

### Multiple bookings in the same space

The system should allow the user to create more than one booking in the same
space on the same day, provided the bookings do not overlap and do not exceed
the total daily duration constraint.

The system should not reject all additional bookings in a space simply because
the user already has one active booking there.

### Seat rendering rule for selected slots

When multiple slots are selected:

- the floorplan should show only seats that are available for all selected
slots
- if no seat satisfies the full selection, all seats should render as
unavailable

This is an intentional intersection rule.

### Existing user booking visibility

If the current user already has a successful booking in this space for the
selected date and time:

- the floorplan should visually distinguish that seat as the user's own booking
- this should be a dedicated `my booking` state rather than a generic disabled
  or unavailable state
- the slot picker should also reflect that the user already holds that time in
  this space
- the legend should explain this state clearly

### Check-in rule direction

Current decision:

- do not implement "continuous bookings longer than 4 hours require a second
check-in" for now

Current direction for discrete usage:

- each real booking created from separated time groups should follow normal
check-in behavior independently

## Time Slot UI

### Slot block contents

Slot blocks should remain visually simple.

Each slot block should contain:

1. time range
2. very light background color
3. remaining seat count only when remaining seats are below 25%

The remaining seat count should be shown in small text.

### Availability expression

Primary expression:

- text and selectable state

Secondary expression:

- very light background color

The product should avoid heavy or noisy capacity heatmaps in the slot picker.

### Time-of-day grouping

The slot picker should include lightweight English dividers to help users scan
the day more quickly.

Current direction:

- `Morning`
- `Afternoon`
- `Evening`

These labels are navigational aids, not separate booking modes.

### Capacity display rule

Capacity numbers are only emphasized when seat supply is low.

Current threshold:

- show remaining count when remaining seats are below 25%

## Seat Detail Interaction

Clicking a seat should show a small side panel or detail box near the booking
workspace.

The seat detail box should include:

- seat-specific metadata on the left
- seat-specific availability on the right

Seat metadata examples:

- seat label
- power availability
- accessibility support
- other seat attributes if available

Seat-specific availability area:

- date selector at the top
- a simple row-by-row slot view below
- available slots shown in white
- unavailable slots shown in grey

This seat detail UI is supplementary. The main booking flow remains time-first.

## Booking List and Modes

### User-facing naming

User-facing language should prefer:

- `Booking`
- `Current Booking`
- `Booking List`

The word `draft` should not be the primary user-facing term.

### Current Booking vs Booking List

The workspace contains two layers:

- `Current Booking`
- `Booking List`

`Current Booking` means the booking currently being assembled or edited in the
left/center workspace.

`Booking List` means the set of bookings already added to the right-side list
and waiting for final submission.

The right-side list should not render an empty placeholder card just because
the page is currently in `Creating`.

### Booking object before submit

A booking in the current workspace may contain:

- one seat
- one or more selected time slots
- slots may be continuous or discrete

At checkout time:

- one booking may expand into multiple real bookings if there are gaps between
  selected time groups

Example:

- one booking for Seat A with `08:00-12:00` and `18:00-20:00`
- checkout creates two real bookings

### Panel placement

`Booking List` should live in the right column of the floorplan workspace.

It should remain a first-class, visible part of the workspace rather than a
surprising overlay.

### Interaction modes

The floorplan should use two primary modes:

- `Creating`
- `Editing`

There should not be a separate `Browsing` mode in the current design
direction.

### Creating mode

This is the default mode when:

- the page first loads
- the user finishes adding a booking
- the user finishes editing a booking
- the user cancels editing

Behavior:

- the page immediately supports time and seat selection
- the system preselects the nearest valid upcoming slot
- the user may change slots and choose a seat without first clicking a `New`
  button
- the current workspace selection is the `Current Booking`
- the user clicks `Add Booking` to add the current booking to the right-side
  `Booking List`
- after `Add Booking`, the page returns to a fresh `Creating` state

### Editing mode

This mode is entered only when the user explicitly clicks `Edit` on an existing
booking in the `Booking List`.

Behavior:

- the selected booking is loaded back into the workspace
- its seat and slot assignments become the active editable selection
- `Save Changes` updates the booking in the list
- `Cancel Editing` discards the changes and returns to `Creating`

### Seat and slot synchronization

In both `Creating` and `Editing`:

- selected time slots determine which seats are available
- selected seat also constrains which time slots remain available

When a seat is selected:

- left-side time slots should update according to that seat's availability
- unavailable slots should become greyed out and unselectable
- if a now-unavailable slot had already been selected, it should be removed
  automatically
- the UI should provide lightweight feedback when selected slots are removed
  due to seat availability changes

### Visual states

Each booking gets its own color.

Selected slot blocks and selected seats for the same booking must share the
same color.

Visual distinction:

- currently edited booking: solid fill
- non-edited bookings in the list: weaker / lighter background treatment

Selected items should also show a checkmark.

### Selection constraints

Once a seat or time slot has been assigned to a booking already in the list:

- it should not be selectable for another booking in the current planning state

### Button direction

Current button direction:

- `Add Booking`
- `Edit`
- `Save Changes`
- `Cancel Editing`
- `Submit`

`New Draft` and `Start Another Draft` should not be part of the current
interaction model.

### Checkout behavior

Checkout should process each resulting booking independently.

Concurrency behavior:

- partial success is acceptable
- the post-checkout result page should report the real outcome clearly

## Confirm and Result Expectations

The checkout flow should use:

- a confirm modal before submission
- a result page after submission

The final flow should make it clear that:

- one booking in the list is not always equal to one real submitted booking
- a single booking may expand into multiple real bookings
- checkout may partially succeed under concurrent conditions

The result page should therefore reflect actual submission results rather than
assuming an all-or-nothing outcome.
