# PerchDesk Development Defects

Evaluated: 2026-04-06

Project stats at time of evaluation:
- Backend: ~2,855 lines Python, 243 tests, 86% coverage
- Frontend: ~5,885 lines TypeScript/TSX, 259 tests, 14 suites
- Total: 502 tests, all passing

---

## 1. Code Quality

### 1.1 Backend route return types

11+ route handlers use `-> object` instead of concrete response types.

Files:
- `backend/app/api/v1/bookings.py` (lines 28, 37, 46, 55)
- `backend/app/api/v1/seats.py` (lines 37, 68)
- `backend/app/api/v1/spaces.py` (lines 50, 116, 134, 144)

Impact: weakens type safety, FastAPI OpenAPI docs lose response schema info.

Fix: replace `-> object` with exact Pydantic response models.

### 1.2 Assert used for control flow in production code

`backend/app/services/booking.py` (lines 223, 260, 288):
```python
assert loaded is not None
```

Impact: `python -O` strips asserts — these checks silently disappear in
optimized mode.

Fix: replace with `if not loaded: raise NotFoundError(...)`.

### 1.3 Import inside function body

`backend/app/services/auth.py` (line 53): `import uuid` inside function
instead of module-level.

Impact: minor PEP 8 violation, but reviewers may flag it.

### 1.4 Unused refreshToken in frontend

`frontend/store/authStore.ts` (lines 14, 24, 39, 42): stores `refreshToken`
in Zustand state + localStorage, but no refresh logic exists anywhere in
the codebase.

Impact: dead code — looks like an unfinished feature.

Fix: either implement token refresh flow, or remove the field entirely.

### 1.5 Duplicate test files

Both `frontend/tests/mySpaces.test.tsx` (245 lines) and
`frontend/tests/my-spaces.test.tsx` (413 lines) exist, testing the same page.

Fix: consolidate into one file.

### 1.6 Placeholder smoke test

`frontend/tests/smoke.test.ts` — only 4 lines, no real assertions.

Fix: add meaningful tests or remove the file.

### 1.7 window.location.reload() anti-pattern

`frontend/app/(dashboard)/my-spaces/page.tsx` (line ~94): uses
`window.location.reload()` for error recovery.

Fix: use TanStack Query retry or React error boundary instead.

---

## 2. Test Coverage Gaps

### 2.1 Backend services with low coverage

| Service | Coverage | Missing paths |
|---------|----------|---------------|
| `services/favorite.py` | 38% | toggle, list, batch operations |
| `services/space_visit.py` | 34% | upsert, recent visits query |
| `services/building.py` | 59% | nearby query, CRUD branches |
| `services/space.py` | 79% | nearby spaces, filtered queries |

These are all implemented and working features — just missing dedicated
service-level tests.

### 2.2 Frontend stores without unit tests

- `store/authStore.ts` — no unit tests (login/logout state transitions)
- `store/bookingStore.ts` — no unit tests (draft add/remove/clear)

`store/locationStore.ts` has tests — the other two stores should match.

### 2.3 Missing backend test scenarios

- No concurrent booking race condition tests
- No scheduler (`scheduler/jobs.py`) auto-release integration test
- Limited negative tests for malformed request payloads

---

## 3. Security

### 3.1 Login timing attack

`backend/app/services/auth.py` (line ~36): when user does not exist, the
function returns immediately without calling `verify_password()`. Response
time difference can reveal whether an email is registered.

Fix: always run `verify_password()` against a dummy hash when user is not
found.

### 3.2 JWT payload parsing without exception handling

`backend/app/services/auth.py` (line ~55):
```python
uuid.UUID(payload["sub"])
```

If the token is tampered with, this raises `ValueError` which is not caught.

Fix: wrap in try/except and raise `UnauthorizedError`.

### 3.3 Token storage in localStorage

`frontend/store/authStore.ts`: access token is stored in localStorage. If
any XSS vulnerability exists, tokens are exposed.

Note: this is standard for SPAs and acceptable for a portfolio project.
Production upgrade path would be httpOnly cookies.

---

## 4. Accessibility

### 4.1 Minimal ARIA coverage

Only ~12 `aria-*` attributes across the entire frontend. Specific gaps:

- Modals (`BuildingModal`, `SpaceModal`, `ConfirmModal`): no focus trapping,
  no `role="dialog"`, no `aria-modal`
- No `aria-live` regions for dynamic content updates (booking status changes,
  toast messages)
- No visible keyboard navigation support (`onKeyDown` handlers)
- Seat map (`SeatMapCanvas`): no keyboard-accessible seat selection

### 4.2 Color contrast unaudited

Tailwind defaults likely pass WCAG AA, but no formal audit has been done.
Seat map colors (green/red/gray/blue) should be checked for color-blind
accessibility.

---

## 5. Hardcoded Values

| Value | Location | Note |
|-------|----------|------|
| Slot hours 8-21 | `frontend/store/bookingStore.ts:25-26` | Should be driven by space_rules or config |
| Admin capacity default 10 | `frontend/app/(admin)/spaces/manage/page.tsx` | Minor, but should be a constant |

---

## Summary

| Category | Count | Status |
|----------|-------|--------|
| Code quality | 7 issues | ✅ Fixed |
| Test coverage gaps | 3 areas | ✅ Fixed |
| Security | 3 issues | ✅ Fixed |
| Accessibility | 2 areas | Pending — deferred to pre-production |
| Hardcoded values | 2 items | Low priority |

Fix progress:
1. ✅ Backend service tests (favorite, space_visit) — coverage: favorite 38%→95%, space_visit 34%→80%, total 86%→91%
2. ✅ Assert → raise, JWT parsing fix, timing attack fix
3. ✅ Route return types `-> object` → concrete Pydantic response models (12 handlers)
4. ✅ Dead code cleanup (refreshToken removed, duplicate tests consolidated, smoke test removed)
5. ⬜ Accessibility pass — modal focus trapping, ARIA coverage, keyboard navigation, color contrast audit
