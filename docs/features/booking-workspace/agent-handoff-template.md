# Agent Handoff Template

## Purpose

Use this template when assigning booking-workspace implementation tasks to an
agent.

Keep prompts narrow. Reference the docs explicitly. State what is out of scope.

---

## Short Task Prompt Template

```text
Implement Task <N> from `docs/features/booking-workspace/task-breakdown.md`.

Read first:
- `CLAUDE.md`
- `docs/architecture.md`
- `docs/features/booking-workspace/overview.md`
- `docs/features/booking-workspace/task-breakdown.md`
- `docs/booking_ux_decisions.md`
- `docs/wireframe.md`

Scope:
- Only implement Task <N>
- Do not expand into unrelated pages or backend redesign unless required

Output requirements:
- Make the code changes
- Add or update relevant tests for changed behavior
- Run the relevant tests
- Summarize what changed
- Summarize which tests were added or updated
- Summarize which commands were run
- Call out any contract gaps or blockers explicitly
```

---

## Multi-Task Prompt Template

```text
Implement Tasks <N>-<M> from `docs/features/booking-workspace/task-breakdown.md`.

Required references:
- `CLAUDE.md`
- `docs/architecture.md`
- `docs/features/booking-workspace/overview.md`
- `docs/features/booking-workspace/frontend-scope.md`
- `docs/features/booking-workspace/backend-impact.md`
- `docs/features/booking-workspace/task-breakdown.md`
- `docs/booking_ux_decisions.md`
- `docs/wireframe.md`

Rules:
- Stay within the defined task range
- Follow the current card/modal/CTA flow
- Do not introduce dedicated building/space detail pages
- Do not implement unresolved ideas from `docs/booking_ux_open_questions.md`
  unless explicitly required
- Add or update relevant tests for changed behavior

Verification:
- Run relevant frontend and/or backend tests
- If no automated test is practical for part of the change, say so explicitly
- If something cannot be fully implemented, explain exactly what remains
```

---

## Review-Oriented Prompt Template

```text
Review the implementation for Task <N> in `docs/features/booking-workspace/task-breakdown.md`.

Review against:
- `docs/features/booking-workspace/overview.md`
- `docs/features/booking-workspace/frontend-scope.md`
- `docs/booking_ux_decisions.md`
- `docs/wireframe.md`

Focus on:
- behavioral mismatches
- missing states
- UX regressions
- contract mismatches
- missing tests
```

---

## Example Prompt

```text
Implement Tasks 3-4 from `docs/features/booking-workspace/task-breakdown.md`.

Read first:
- `CLAUDE.md`
- `docs/architecture.md`
- `docs/features/booking-workspace/overview.md`
- `docs/features/booking-workspace/frontend-scope.md`
- `docs/features/booking-workspace/task-breakdown.md`
- `docs/booking_ux_decisions.md`
- `docs/wireframe.md`

Scope:
- Build the `Buildings` page card list
- Implement the building detail modal
- CTA should follow the current UX direction: `View Spaces`

Out of scope:
- `Spaces in Building`
- `Floorplan`
- backend redesign

Verification:
- Run relevant frontend tests
- Add or update relevant tests for the implemented behavior
- Summarize changed files, tests added/updated, commands run, and any blockers
```
