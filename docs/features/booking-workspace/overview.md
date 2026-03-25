# Booking Workspace Feature Overview

## Purpose

This document scopes the current booking-workspace feature effort so agents can
implement it without re-deriving the product direction from scattered
discussion.

It should be read together with:

- `CLAUDE.md`
- `docs/architecture.md`
- `docs/booking_ux_decisions.md`
- `docs/wireframe.md`

## Feature Summary

The current goal is to evolve the user booking experience into a task-oriented
flow:

`Home -> Buildings -> Spaces in Building -> Floorplan -> Confirm Modal -> Result`

This flow should:

- keep discovery lightweight
- avoid heavy detail pages in the primary booking path
- use cards and modals for building/space details
- treat the floorplan page as the main booking workspace
- support `Booking Drafts` before checkout

## In Scope

### Product structure

- user-facing `Home` page as a lightweight product homepage
- `Buildings` selection page
- `Spaces in Building` selection page
- modal-based detail for buildings and spaces
- floorplan workspace with three-column layout
- confirm modal for pre-checkout confirmation

### Booking workspace behavior

- date selection
- slot selection
- seat selection
- `Booking Drafts`
- `Browsing`, `Creating Draft`, and `Editing Draft` states
- confirm modal
- result page

### Current core UX assumptions

- booking unit is `1 hour`
- cross-day booking is out of scope for now
- one draft binds one seat
- one draft may contain continuous or discrete slots
- one draft may expand into multiple real bookings at checkout if gaps exist
- partial success at checkout is acceptable

## Out of Scope

These should not be expanded during the first implementation pass unless the
task explicitly asks for them:

- cross-day booking UX
- smart recommendation of alternative times
- advanced usage analytics such as historical availability hints
- dedicated building or space detail pages
- complex seat-detail redesign beyond the agreed lightweight direction
- redefining the backend booking entity to match drafts 1:1

## Modal Strategy

### Building modal

Minimum agreed content:

- hero image
- building name
- address
- distance
- opening hours
- short description
- facilities
- total space count
- CTA: `View Spaces`

### Space modal

Minimum agreed content:

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
- CTA: `Book a Seat`

## Floorplan Strategy

The floorplan page is the primary booking workspace.

Desktop layout:

- left: date/time controls
- center: floorplan, about half the width
- right: persistent `Booking Drafts`

The page should support:

- time-first booking
- draft creation
- draft editing
- checkout preparation

## Agent Guidance

When implementing this feature, agents should:

- prefer the card/modal/CTA flow over extra pages
- keep the booking path short and operational
- avoid expanding unresolved ideas from `docs/booking_ux_open_questions.md`
- reference `docs/booking_ux_decisions.md` for product rules
- reference `docs/wireframe.md` for page and state structure

If a task requires assumptions beyond these documents, the task should either:

- explicitly record the assumption in the implementation PR/summary, or
- update the feature docs first before implementation
