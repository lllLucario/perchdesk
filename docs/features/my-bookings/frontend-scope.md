# My Bookings Frontend Scope

## Goal

Define the frontend scope for the `My Bookings` module.

## Route Direction

Current expected route:

- `/(dashboard)/bookings/page.tsx`

This route should host both tabs:

- `Active Bookings`
- `Booking History`

## UI Regions

### Header

- page title: `My Bookings`
- optional short helper text if needed later

### Tab Row

- `Active Bookings`
- `Booking History`

Default:

- `Active Bookings`

### Control Row

Each tab should expose:

- status filter
- sort control

The sort control should be separate from the status filter.

## Active Bookings View

### Status filter options

- `All`
- `Booked`
- `Check-in Available`
- `In Use`

### Sort options

- `Start time: soonest`
- `Start time: latest`
- `Duration: longest`
- `Duration: shortest`

### Card fields

Required:

- space name
- building name
- seat label
- date
- time range
- duration
- status badge
- relative time hint

### Card actions

`Booked`:

- `View Details`
- `Cancel`

`Check-in Available`:

- `View Details`
- `Check In`
- `Cancel`

`In Use`:

- `View Details`

`In Use` must not render `Cancel`.

Cards should be action-oriented rather than report-oriented.

## Booking History View

### Status filter options

- `All`
- `Completed`
- `Expired`
- `Cancelled`

### Sort options

- `Most recent`
- `Oldest`
- `Duration: longest`
- `Duration: shortest`

### Card fields

Required:

- space name
- building name
- seat label
- date
- time range
- duration
- final status badge

### Card actions

- `View Details`

History cards should remain record-oriented and lightweight.

## Detail Modal

### Purpose

Provide a read-only booking detail surface.

### Required contents

- space name
- building name
- seat label
- date
- time range
- booking status
- duration
- booking id
- created-at time
- check-in metadata when relevant
- cancellation metadata when relevant
- read-only floorplan preview

The modal is informational, not a second booking workspace.

### Floorplan preview rules

- read-only only
- highlight the booked seat
- no seat click or booking interaction

### Modal actions

For active bookings:

- optional contextual actions such as `Check In` or `Cancel`

For history items:

- `Close`

## Source of Truth

This file, together with
[overview.md](/Users/kkkadoya/Desktop/perchdesk/docs/features/my-bookings/overview.md),
is the primary source of truth for `My Bookings`.

## Empty States

### Active Bookings

Should explain that the user has no current bookings and guide them back toward
booking.

### Booking History

Should explain that no historical bookings are available yet.

## State Model

The page state should minimally include:

- selected tab
- status filter per tab
- sort option per tab
- open/closed booking detail modal
- selected booking for modal display

## Testing Expectations

Frontend tests should cover:

- tab switching
- status filtering
- sorting
- status-specific action visibility
- modal open/close
- read-only floorplan preview rendering
