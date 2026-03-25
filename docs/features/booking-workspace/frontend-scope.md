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

Desktop layout:

- left column: controls
- center column: floorplan
- right column: `Booking Drafts`

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

- `Browsing State`
- `Creating Draft State`
- `Editing Draft State`

### Browsing State

Required frontend behavior:

- no active editing target
- visible stored drafts
- `New Draft`
- `Checkout` when drafts exist

### Creating Draft State

Required frontend behavior:

- activated via `New Draft`
- supports slot selection
- supports seat selection
- supports `Add Draft`
- supports `Cancel Editing`

### Editing Draft State

Required frontend behavior:

- activated from an existing draft or one of its selected items
- restores that draft's seat and slot state into the workspace
- supports `Save Changes`
- supports `Cancel Editing`
- supports `Delete Draft`

## State Model Expectations

The frontend should maintain enough state to support:

- selected date
- selected slot set
- selected seat
- current mode: browsing / creating / editing
- active draft id, if editing
- list of saved drafts

## Visual Rules

Required rules:

- each draft has one shared color
- the same draft color appears on seat and slot selections
- active draft uses stronger fill
- saved non-active drafts use weaker fill
- selected draft items show a checkmark

## Data Strategy

Frontend implementation may start with mock or adapter-backed data where needed,
but should keep shapes aligned with the product direction.

Agents should not silently invent final data contracts that conflict with
`docs/architecture.md`.

## Non-Goals for the First Frontend Pass

- cross-day slot selection
- advanced recommendation UI
- historical availability trend UI
- fully redesigned seat-detail subworkspace
- production-polished visual design beyond the agreed structure
