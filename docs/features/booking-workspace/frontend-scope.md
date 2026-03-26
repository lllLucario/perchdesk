# Booking Workspace Frontend Scope

## Purpose

This document defines the frontend implementation scope for the booking
workspace feature so agents can work with clear UI boundaries.

Read together with:

- `docs/features/booking-workspace/overview.md`
- `docs/features/booking-workspace/task-breakdown.md`
- `docs/booking_ux_decisions.md`
- `docs/wireframe.md`

## Page Scope

The frontend booking experience currently spans these user-facing pages:

- `Home`
- `Buildings`
- `Spaces in Building`
- `Floorplan`
- `Confirm Modal`
- `Result`

## Page Responsibilities

### Home

Responsibilities:

- render a lightweight product homepage
- show navbar with logo, future nav placeholder, and user entry
- show centered search box area
- show `Recent Spaces`
- show `Nearby Buildings`

Non-goals:

- admin dashboard behavior
- dense analytics layout
- heavy discovery filters in the first pass

### Buildings

Responsibilities:

- render a list/grid of building cards
- support direct movement into `Spaces in Building`
- support opening a building detail modal from the card body

Minimum building card data:

- image
- address
- CTA

### Spaces in Building

Responsibilities:

- render a list/grid of space cards scoped to one building
- support direct movement into `Floorplan`
- support opening a space detail modal from the card body

Minimum space card data:

- name
- seat count
- feature icons
- CTA

### Floorplan

Responsibilities:

- render the booking workspace
- support date selection
- support slot selection
- render seat availability
- support draft creation/editing
- support checkout preparation
- reflect the current user's existing bookings as a distinct state in both the
  slot picker and seat map

Desktop layout:

- left column: controls
- center column: floorplan
- right column: `Booking List`

### Confirm Modal

Responsibilities:

- summarize the selected drafts
- clarify draft-to-booking expansion
- prepare the user for submission without leaving the floorplan flow

### Result

Responsibilities:

- show actual submission results
- support partial success communication

## Modal Scope

### Building modal

Required fields:

- hero image
- building name
- address
- distance
- opening hours
- short description
- facilities
- total space count
- CTA `View Spaces`

### Space modal

Required fields:

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
- CTA `Book a Seat`

## Floorplan State Scope

The floorplan must support these states:

- `Creating State`
- `Editing State`

### Creating State

Required frontend behavior:

- default state on page load
- preselect the nearest valid upcoming slot
- auto-scroll or auto-focus the slot list so the preselected slot is visible
- supports slot selection
- supports seat selection
- supports `Add Booking`
- supports `Submit` when the booking list is non-empty
- current in-progress booking does not appear in the right-side list until added
- when the selected date is today, past time slots are greyed out and disabled
- time slots include lightweight grouping labels such as `Morning`,
  `Afternoon`, and `Evening`

### Editing State

Required frontend behavior:

- activated only from explicit `Edit` on an existing booking
- restores that booking's seat and slot state into the workspace
- supports `Save Changes`
- supports `Cancel Editing`
- supports `Delete`

## State Model Expectations

The frontend should maintain enough state to support:

- selected date
- selected slot set
- selected seat
- current mode: creating / editing
- active booking id, if editing
- list of saved bookings
- current user's successful bookings for the selected space/date context

## Visual Rules

Required rules:

- each booking has one shared color
- the same booking color appears on seat and slot selections
- active edited booking uses stronger fill
- saved non-active bookings use weaker fill
- selected booking items show a checkmark
- seat and slot selection must stay synchronized in both creating and editing
  states
- `my booking` must have a distinct visual state from both `available` and
  generic `booked`
- the slot picker should reflect `my booking` where the user already owns the
  selected time in the current space

## Backend-aligned UX Expectations

- the current frontend direction assumes an `8 hour` maximum per user per space
  per day for both `library` and `office`
- the user must be allowed to create additional bookings in the same space on
  the same day as long as those bookings do not overlap and still respect the
  daily duration limit
- frontend behavior should not assume a one-booking-per-space rule

## Data Strategy

Frontend implementation may start with mock or adapter-backed data where needed,
but should keep shapes aligned with the product direction.

Agents should not silently invent final data contracts that conflict with
`docs/architecture.md`.

Current implementation note:

- the active booking workspace assumes an hourly slot model for both `library`
  and `office`
- `office` remains a distinct scenario through rule values such as longer
  maximum duration and advance-booking window
- do not reintroduce `half_day` or `full_day` picker behavior in the current
  workspace without an explicit product decision

## Non-Goals for the First Frontend Pass

- cross-day slot selection
- advanced recommendation UI
- historical availability trend UI
- fully redesigned seat-detail subworkspace
- production-polished visual design beyond the agreed structure
