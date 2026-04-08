# Booking Workspace Backend Impact

## Purpose

This document records the likely backend and contract implications of the
booking-workspace UX so agents do not assume the current backend already fully
matches the new frontend workflow.

It is not a full backend spec. It is an implementation-awareness document.

Read together with:

- `docs/time-semantics.md`

## Core Principle

The UX may introduce planning behavior that is richer than the current backend
booking entity.

In particular:

- `Booking Drafts` are a frontend planning concept
- a single draft may expand into multiple real bookings at checkout

The backend should not be prematurely redesigned unless a concrete task
requires it.

## Current Backend Reality

The current backend model is centered on:

- `spaces`
- `seats`
- `bookings`
- `space_rules`

The current booking entity is still:

- one seat
- one start time
- one end time
- one status

This should remain the real persisted booking model unless a later change is
explicitly approved.

## Expected Impact Areas

### 1. Discovery data

The new UX may require richer data for:

- buildings
- spaces in building
- modal display data

Questions that implementation may need to resolve:

- does `Building` already exist as a backend entity, or is it currently implicit?
- do current `Space` APIs expose enough card-level metadata?
- do modal fields need new backend fields or can they be derived from existing
  models?

### 2. Floorplan availability queries

The new floorplan flow expects time-first behavior and may require:

- repeated availability queries by selected date/slot set
- filtering seats by the intersection of selected slots

If the current API only supports simple range availability, frontend adapters
may be sufficient at first. If not, targeted API refinement may be needed.

### 2.1 Booking rule time semantics

Booking-workspace implementation must not assume that every time comparison can
be reduced to UTC subtraction.

Important distinction:

- overlap/conflict checks should continue using UTC instants
- slot alignment, daily caps, and midnight-based rules should use
  `Australia/Sydney` wall-clock semantics

This is especially important near DST boundaries, where a valid local
midnight-to-midnight booking may not equal exactly `1440` UTC minutes.

### 2.2 Floorplan-entry event sourcing

The booking workspace is also the natural source of truth for a future
`recently entered floorplan` signal.

That signal would be consumed by personalized discovery surfaces such as
`My Spaces`, but it should originate here because only the floorplan workflow
can define what counts as a successful workspace entry.

Important constraints:

- it should not be inferred from a simple card click
- it should only fire after the floorplan page has entered a successful usable
  state
- it will require dedicated persistence or event tracking if the product wants
  to consume it later

### 3. Booking draft checkout

Current UX direction:

- one draft may contain multiple continuous or discrete selected slots
- one draft may expand into multiple bookings if gaps exist

Possible submission strategies:

- frontend performs multiple booking submissions sequentially
- frontend submits a batch payload to a new backend endpoint

Recommended first step:

- prefer multiple explicit booking creations unless batch semantics become
  necessary

This keeps the current backend entity intact.

### 4. Partial success

The UX explicitly accepts partial success at checkout.

That means implementation must be prepared for:

- some booking creations succeeding
- some failing due to conflicts or rule validation

This should be treated as normal expected behavior, not as an edge case.

### 5. Concurrency

Frontend selection rules can prevent user self-conflict, but they do not remove
real backend concurrency risk.

The backend remains the final authority for:

- seat overlap validation
- rule enforcement
- final booking success or rejection

## Recommended Backend Stance for First Implementation

- keep `Booking Drafts` in frontend state only
- keep real persistence at the booking level
- keep booking creation atomic per real booking
- tolerate partial success during a multi-booking checkout flow
- document any contract gaps instead of inventing hidden assumptions

## Questions to Resolve During Implementation

- whether `Building` needs a first-class model or API now
- whether card/modal data can be served from existing space-related endpoints
- whether confirm/result should use a frontend aggregation model only
- whether sequential booking submission is sufficient for the first pass

## Source Documents

- `docs/architecture.md`
- `docs/features/booking-workspace/decision-log.md`
- `docs/features/booking-workspace/wireframe.md`
- `docs/features/booking-workspace/task-breakdown.md`
