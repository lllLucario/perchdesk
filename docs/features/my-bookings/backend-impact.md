# My Bookings Backend Impact

## Goal

Describe the backend implications of the `My Bookings` module.

## Current Assumption

The existing booking API already exposes enough booking data to support a first
pass of `My Bookings`, but the frontend may need clearer derived status
grouping.

## Backend Responsibilities

The backend should support:

- listing current user's bookings
- booking status values required by the page
- booking detail retrieval
- cancellation
- check-in

## Status Grouping

The page will group bookings into two views.

### Active Bookings

Includes bookings that are still actionable or currently relevant:

- `Booked`
- `Check-in Available`
- `In Use`

These may be derived from:

- booking status
- current time
- check-in availability window

### Booking History

Includes past or terminal bookings:

- `Completed`
- `Expired`
- `Cancelled`

## Open Backend Questions

These should be clarified during implementation:

- whether `Check-in Available` is already derivable entirely on the frontend
  from current booking data and time
- whether `Completed` needs an explicit backend status or can be derived from a
  booking that ended successfully after `checked_in`
- whether the detail modal needs any extra floorplan metadata beyond current
  space + seat data

## Likely Backend Touchpoints

- booking list endpoint shape and ordering
- booking detail endpoint shape
- booking cancellation endpoint
- booking check-in endpoint
- optional additional response fields for richer detail modal display

## Non-Goals

This module should not require:

- new booking creation endpoints
- booking editing endpoints
- analytics endpoints

unless a later implementation round proves they are necessary
