# PerchDesk Time Semantics

## Purpose

This document defines how time should be interpreted across PerchDesk so
agents do not mix UTC storage rules with Australia/Sydney booking rules.

PerchDesk currently operates on a single business timezone:

- `Australia/Sydney`

The project still stores persisted timestamps in UTC, but not every booking
rule should be computed from raw UTC duration.

## Core Principle

PerchDesk uses two different time semantics:

- `UTC instant semantics` for storage, ordering, overlap checks, and job timing
- `Australia/Sydney wall-clock semantics` for booking calendar rules

The most common source of bugs is treating a wall-clock rule as if it were an
absolute UTC-duration rule.

## Rule Categories

### 1. UTC instant semantics

Use UTC for logic that cares about absolute ordering or real elapsed time.

Examples:

- persisted timestamp fields such as `created_at`, `updated_at`,
  `checked_in_at`
- `start_time <= now`
- seat overlap checks
- booking conflict checks
- scheduler execution and expiry timing
- API transport and database storage

Typical question:

- "Which event happened first?"
- "Has this instant already passed?"
- "Do these two ranges overlap in real time?"

### 2. Australia/Sydney wall-clock semantics

Use Australia/Sydney local time for logic that cares about the local calendar,
midnight boundaries, or booking-slot meaning.

Examples:

- `hourly` slot alignment
- `half_day` boundaries (`00:00` / `12:00`)
- `full_day` midnight-to-midnight validation
- booking-date cancellation cutoff
- per-day booking caps
- "same business day" checks

Typical question:

- "Is this booking on the same Sydney calendar day?"
- "Does this booking start at local midnight?"
- "Does this count as one local full day even across DST?"

## DST Guidance

Australia/Sydney observes daylight saving transitions. During those boundaries:

- a local midnight-to-midnight booking may be `23`, `24`, or `25` UTC hours
- UTC subtraction can disagree with the product meaning of "one local day"

Therefore:

- do not use raw UTC subtraction for `full_day`, `half_day`, or daily-cap
  rules
- do use local wall-clock calculations when the rule is defined in Sydney
  calendar terms

## Current Product Interpretation

For the current booking product:

- storage remains UTC
- booking rule enforcement is anchored to `Australia/Sydney`
- `full_day` means local midnight to next local midnight
- `daily limit` means minutes accumulated within the same Sydney calendar day
- office cancellation cutoff is defined relative to Sydney midnight

## Implementation Guidance

When adding or reviewing time-related logic, answer these questions first:

1. Is this rule about an absolute instant or a local calendar concept?
2. Which timezone owns the business meaning of this rule?
3. Should the calculation use real elapsed seconds or wall-clock/local-date
   semantics?

If the rule is local-calendar-based, use shared helpers once they exist rather
than hand-rolling repeated timezone conversions.

## Testing Guidance

Time-related tests should include deterministic DST coverage for:

- Sydney DST fall-back (`AEDT -> AEST`)
- Sydney DST spring-forward (`AEST -> AEDT`)
- `full_day` booking validation
- per-day cap accumulation
- local-midnight cancellation cutoff

Prefer fixed dates around known DST boundaries over `now + N days` whenever the
test is asserting calendar semantics.

## Future Globalization

PerchDesk is currently single-business-timezone. If the product later becomes
multi-region, this document should evolve from:

- one global business timezone: `Australia/Sydney`

to:

- per-resource business timezone, likely anchored at `building` or `space`

At that point, booking rules should bind to the resource timezone rather than
the viewer's browser timezone.
