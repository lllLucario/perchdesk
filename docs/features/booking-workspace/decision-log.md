# Booking Workspace Decision Log

## Purpose

This document records the current stable UX decisions for the booking flow and
booking workspace.

It is intentionally shorter than the earlier root-level booking UX notes. The
goal is to keep only the decisions that still guide implementation.

## Current Flow Baseline

Primary flow:

`Home -> Buildings -> Spaces in Building -> Floorplan -> Confirm -> Result`

Supporting rules:

- `building` is a first-class browse entity
- `space` is the direct booking object
- building and space details stay modal-first in the primary flow
- the product should avoid adding heavy detail pages between selection steps

## Current Booking Model

- booking selection unit is `1 hour`
- both `library` and `office` currently use the same hourly interaction model
- both scenarios currently align to an `8 hour` daily-cap baseline
- scenario differences currently come mainly from:
  - `max_advance_days`
  - `auto_release_minutes`
  - cancellation rules
- cross-day booking is out of scope for the current workspace

## Floorplan Workspace

The floorplan page is the main booking workspace.

Desktop structure:

- left: date and slot controls
- center: floorplan SVG / seat map
- right: booking list

Important behavior:

- the floorplan remains the dominant workspace area
- time-first booking is the active model
- selected slots constrain seat availability
- selected seat also constrains remaining slot availability
- `my booking` should remain a distinct state from generic unavailability

## Booking List And Modes

The workspace has two practical layers:

- the current booking being assembled or edited
- the booking list waiting for submission

Current interaction modes:

- `Creating`
- `Editing`

Current rules:

- one booking binds one seat
- one booking may contain continuous or discrete slots
- one booking may expand into multiple real bookings at checkout if slot groups
  are separated by gaps
- partial checkout success is acceptable and must be reported honestly

## Checkout Expectations

The checkout flow uses:

- a confirm step before submission
- a result page after submission

The UX must make it clear that:

- one item in the booking list is not always equal to one submitted backend
  booking
- real booking expansion happens at checkout time
- concurrent booking conflicts may produce partial success

## What This Document Replaces

This file replaces the older root-level booking UX decision notes as the
current decision reference for workspace-related implementation.
