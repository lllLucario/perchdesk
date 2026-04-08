# My Bookings Overview

## Purpose

This feature covers the user-facing `My Bookings` page.

It is the post-booking management surface where users can:

- review upcoming bookings
- take operational actions such as `Check In` and `Cancel`
- inspect booking details in a modal
- browse previous bookings in a historical view

## Current Product Direction

`My Bookings` is one page with two in-page tabs:

- `Active Bookings`
- `Booking History`

This should not be implemented as two separate route pages in the current
phase.

Rationale:

- both tabs represent the same object type at different lifecycle stages
- keeping them on one page makes switching faster and lighter
- this structure remains compatible with a future global sidebar if one is
  added later

## In Scope

- page structure for `My Bookings`
- tab switching between active and historical bookings
- booking card layout and field hierarchy
- status filter and sort controls for both tabs
- booking detail modal with read-only floorplan preview
- contextual booking actions

## Out of Scope

- visual redesign of the global navbar or future sidebar
- admin booking-management views
- editing an existing booking from `My Bookings`
- interactive seat selection inside the detail modal
- deep analytics or reporting

## Primary UX Decisions

Use these documents as the source of truth:

- [decision-log.md](/Users/kkkadoya/Desktop/perchdesk/docs/features/booking-workspace/decision-log.md)
- [wireframe.md](/Users/kkkadoya/Desktop/perchdesk/docs/features/my-bookings/wireframe.md)

## Core Page Model

### Active Bookings

Contains bookings with statuses:

- `Booked`
- `Check-in Available`
- `In Use`

Actions:

- `View Details`
- `Cancel` for `Booked`
- `View Details`, `Check In`, and `Cancel` for `Check-in Available`
- `View Details` only for `In Use`

Intent:

- `Booked` means the booking exists but the user does not need to act yet
- `Check-in Available` means the booking now requires action
- `In Use` means the booking has been checked in and is currently active

### Booking History

Contains bookings with statuses:

- `Completed`
- `Expired`
- `Cancelled`

Actions:

- `View Details`

This area is record-oriented rather than action-oriented.

## Implementation Note

The page should be action-oriented and lightweight.

It should not become:

- a dashboard
- a reporting view
- a second booking workspace
