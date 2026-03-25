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
- right column: `Booking Drafts`

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

- the right-side `Booking Drafts` panel already exposes most pre-checkout
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

When the user reaches the maximum:

- already selected slots remain selected
- unselected slots become disabled/greyed out

### Seat rendering rule for selected slots

When multiple slots are selected:

- the floorplan should show only seats that are available for all selected
slots
- if no seat satisfies the full selection, all seats should render as
unavailable

This is an intentional intersection rule.

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

## Booking Drafts

### Concept

The agreed name is:

- `Booking Drafts`

A booking draft is an intent container used before checkout.

A draft may contain:

- one seat
- one or more selected time slots
- slots may be continuous or discrete

At checkout time:

- a single draft may expand into multiple real bookings if there are gaps
between selected time groups

Example:

- one draft for Seat A with `08:00-12:00` and `18:00-20:00`
- checkout creates two real bookings

### Why drafts exist

Drafts exist to support cases where the user wants to plan multiple bookings in
one session, such as:

- Seat A for one time range
- Seat B for another time range

This behaves more like batch planning than a single booking object.

### Panel placement

`Booking Drafts` should live in the right column of the floorplan workspace.

It should be treated as a first-class part of the booking workspace rather than
as a hidden or surprising overlay.

Rationale:

- drafts affect current page state
- drafts affect seat and slot selection states
- drafts should remain visible while the user plans multiple bookings

The right column may still support collapse/expand behavior later, but the
current direction is a visible three-column workspace rather than an
auto-opening drawer.

### Draft creation flow

Default page mode after loading:

- viewing mode, not editing mode

To begin creating a new draft:

- user clicks `New Draft`

To save a new draft:

- user clicks `Add Draft`

After adding a draft:

- the page returns to viewing mode
- it does not automatically enter creation of another draft

### Draft editing flow

To edit an existing draft:

- click an already draft-selected seat or time slot to enter editing for that
draft

Current intended behavior:

- draft-selected seats/slots act as entry points to the existing draft

### Draft visual states

Each draft gets its own color.

Selected slot blocks and selected seats for the same draft must share the same
color.

Visual distinction:

- currently edited draft: solid fill
- non-edited drafts: weaker / lighter background treatment

Selected items should also show a checkmark.

### Draft selection constraints

Once a seat or time slot has been assigned to a draft:

- it should not be selectable for another draft in the current planning state

Intent behind this rule:

- if the user wants the same seat for more time ranges, that should usually be
handled by extending the same draft rather than creating a second one

### Draft checkout behavior

Checkout should process each resulting booking independently.

Concurrency behavior:

- partial success is acceptable
- the post-checkout result page should report the real outcome clearly

## Editing Modes

The flow conceptually contains these modes:

- viewing mode
- creating a new draft
- editing an existing draft

Current button direction:

- `New Draft`
- `Add Draft`
- `Save Changes`
- `Cancel Editing`
- `Checkout`

## Confirm and Result Expectations

The checkout flow should use:

- a confirm modal before submission
- a result page after submission

The final flow should make it clear that:

- one draft is not always equal to one booking
- a draft may expand into multiple real bookings
- checkout may partially succeed under concurrent conditions

The result page should therefore reflect actual submission results rather than
assuming an all-or-nothing outcome.
