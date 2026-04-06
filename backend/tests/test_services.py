"""Direct service-level unit tests for better coverage."""
import uuid
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    BookingConflictError,
    BookingRuleViolationError,
    DuplicateError,
    ForbiddenError,
    NotFoundError,
    SeatUnavailableError,
    UnauthorizedError,
)
from app.models.booking import Booking
from app.models.seat import Seat
from app.models.space import Space
from app.models.space_rules import SpaceRules
from app.models.user import User
from app.scheduler.jobs import expire_bookings_in_session
from app.schemas.auth import LoginRequest, RegisterRequest
from app.schemas.booking import BookingCreate
from app.schemas.seat import SeatBatchCreate, SeatCreate, SeatUpdate
from app.schemas.space import SpaceCreate, SpaceUpdate
from app.schemas.space_rules import SpaceRulesUpdate
from app.services import auth as auth_service
from app.services import booking as booking_service
from app.services import favorite as favorite_service
from app.services import seat as seat_service
from app.services import space as space_service
from app.services import space_rules as rules_service
from app.services import space_visit as visit_service

AEST = ZoneInfo("Australia/Sydney")


def _future(hours: int = 1) -> datetime:
    """Return a future UTC datetime aligned to the next whole hour boundary + offset.
    This ensures compatibility with hourly time_unit validation."""
    now = datetime.now(UTC)
    base = (now + timedelta(hours=1)).replace(minute=0, second=0, microsecond=0)
    return base + timedelta(hours=hours - 1)


def _half_day_start(days_ahead: int = 1) -> datetime:
    """Return midnight AEST on a future day, as UTC (for half_day bookings)."""
    now_aest = datetime.now(AEST)
    target = (now_aest + timedelta(days=days_ahead)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    return target.astimezone(UTC)


def _half_day_end(days_ahead: int = 1) -> datetime:
    """Return noon AEST on a future day, as UTC (for half_day bookings)."""
    now_aest = datetime.now(AEST)
    target = (now_aest + timedelta(days=days_ahead)).replace(
        hour=12, minute=0, second=0, microsecond=0
    )
    return target.astimezone(UTC)


# ─── Auth Service ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_register_creates_user(db_session: AsyncSession):
    user = await auth_service.register(
        db_session,
        RegisterRequest(email="svc@test.com", name="Svc", password="pass1234"),
    )
    assert user.email == "svc@test.com"
    assert user.role == "user"


@pytest.mark.asyncio
async def test_register_duplicate_raises(db_session: AsyncSession):
    data = RegisterRequest(email="dup@test.com", name="Dup", password="pass1234")
    await auth_service.register(db_session, data)
    with pytest.raises(DuplicateError):
        await auth_service.register(db_session, data)


@pytest.mark.asyncio
async def test_login_success(db_session: AsyncSession):
    await auth_service.register(
        db_session, RegisterRequest(email="l@test.com", name="L", password="pass1234")
    )
    tokens = await auth_service.login(
        db_session, LoginRequest(email="l@test.com", password="pass1234")
    )
    assert tokens.access_token
    assert tokens.refresh_token


@pytest.mark.asyncio
async def test_login_wrong_password(db_session: AsyncSession):
    await auth_service.register(
        db_session, RegisterRequest(email="lw@test.com", name="LW", password="pass1234")
    )
    with pytest.raises(UnauthorizedError):
        await auth_service.login(
            db_session, LoginRequest(email="lw@test.com", password="wrong")
        )


@pytest.mark.asyncio
async def test_login_user_not_found(db_session: AsyncSession):
    with pytest.raises(UnauthorizedError):
        await auth_service.login(
            db_session, LoginRequest(email="nobody@test.com", password="pass1234")
        )


@pytest.mark.asyncio
async def test_refresh_tokens(db_session: AsyncSession):
    await auth_service.register(
        db_session, RegisterRequest(email="r@test.com", name="R", password="pass1234")
    )
    tokens = await auth_service.login(
        db_session, LoginRequest(email="r@test.com", password="pass1234")
    )
    new_tokens = await auth_service.refresh_tokens(db_session, tokens.refresh_token)
    assert new_tokens.access_token


@pytest.mark.asyncio
async def test_refresh_invalid_token(db_session: AsyncSession):
    with pytest.raises(UnauthorizedError):
        await auth_service.refresh_tokens(db_session, "invalid.token.here")


@pytest.mark.asyncio
async def test_refresh_wrong_token_type(db_session: AsyncSession):
    """Passing an access token as refresh token should fail."""
    await auth_service.register(
        db_session, RegisterRequest(email="rw@test.com", name="RW", password="pass1234")
    )
    tokens = await auth_service.login(
        db_session, LoginRequest(email="rw@test.com", password="pass1234")
    )
    with pytest.raises(UnauthorizedError):
        await auth_service.refresh_tokens(db_session, tokens.access_token)


# ─── Space Service ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_list_spaces(db_session: AsyncSession):
    await space_service.create_space(
        db_session, SpaceCreate(name="Lib1", type="library", capacity=10)
    )
    spaces = await space_service.list_spaces(db_session)
    assert any(s.name == "Lib1" for s in spaces)


@pytest.mark.asyncio
async def test_create_office_space(db_session: AsyncSession):
    space = await space_service.create_space(
        db_session, SpaceCreate(name="Office1", type="office", capacity=5)
    )
    assert space.type == "office"


@pytest.mark.asyncio
async def test_get_space_not_found(db_session: AsyncSession):
    with pytest.raises(NotFoundError):
        await space_service.get_space(db_session, uuid.uuid4())


@pytest.mark.asyncio
async def test_update_space(db_session: AsyncSession):
    space = await space_service.create_space(
        db_session, SpaceCreate(name="Old", type="library", capacity=5)
    )
    updated = await space_service.update_space(
        db_session, space.id, SpaceUpdate(name="New")
    )
    assert updated.name == "New"


@pytest.mark.asyncio
async def test_delete_space(db_session: AsyncSession):
    space = await space_service.create_space(
        db_session, SpaceCreate(name="ToDelete", type="library", capacity=5)
    )
    await space_service.delete_space(db_session, space.id)
    with pytest.raises(NotFoundError):
        await space_service.get_space(db_session, space.id)


@pytest.mark.asyncio
async def test_delete_space_not_found(db_session: AsyncSession):
    with pytest.raises(NotFoundError):
        await space_service.delete_space(db_session, uuid.uuid4())


# ─── Seat Service ────────────────────────────────────────────────────────────

@pytest.fixture
async def space_with_rules(db_session: AsyncSession) -> Space:
    space = Space(name="Test Space", type="library", capacity=10)
    db_session.add(space)
    await db_session.flush()
    rules = SpaceRules(
        space_id=space.id,
        max_duration_minutes=480,
        max_advance_days=3,
        time_unit="hourly",
        auto_release_minutes=15,
    )
    db_session.add(rules)
    await db_session.commit()
    await db_session.refresh(space)
    return space


@pytest.mark.asyncio
async def test_create_and_list_seats(db_session: AsyncSession, space_with_rules: Space):
    seat = await seat_service.create_seat(
        db_session, space_with_rules.id, SeatCreate(label="A1", position={"x": 10, "y": 10})
    )
    seats = await seat_service.list_seats(db_session, space_with_rules.id)
    assert len(seats) == 1
    assert seats[0].id == seat.id


@pytest.mark.asyncio
async def test_list_seats_space_not_found(db_session: AsyncSession):
    with pytest.raises(NotFoundError):
        await seat_service.list_seats(db_session, uuid.uuid4())


@pytest.mark.asyncio
async def test_create_seat_space_not_found(db_session: AsyncSession):
    with pytest.raises(NotFoundError):
        await seat_service.create_seat(
            db_session, uuid.uuid4(), SeatCreate(label="X1", position={"x": 0, "y": 0})
        )


@pytest.mark.asyncio
async def test_batch_create_seats(db_session: AsyncSession, space_with_rules: Space):
    seats = await seat_service.batch_create_seats(
        db_session,
        space_with_rules.id,
        SeatBatchCreate(seats=[
            SeatCreate(label="B1", position={"x": 10, "y": 10}),
            SeatCreate(label="B2", position={"x": 20, "y": 10}),
        ]),
    )
    assert len(seats) == 2


@pytest.mark.asyncio
async def test_update_seat(db_session: AsyncSession, space_with_rules: Space):
    seat = await seat_service.create_seat(
        db_session, space_with_rules.id, SeatCreate(label="C1", position={"x": 0, "y": 0})
    )
    updated = await seat_service.update_seat(
        db_session, seat.id, SeatUpdate(status="maintenance")
    )
    assert updated.status == "maintenance"


@pytest.mark.asyncio
async def test_update_seat_not_found(db_session: AsyncSession):
    with pytest.raises(NotFoundError):
        await seat_service.update_seat(
            db_session, uuid.uuid4(), SeatUpdate(status="maintenance")
        )


@pytest.mark.asyncio
async def test_delete_seat(db_session: AsyncSession, space_with_rules: Space):
    seat = await seat_service.create_seat(
        db_session, space_with_rules.id, SeatCreate(label="D1", position={"x": 0, "y": 0})
    )
    await seat_service.delete_seat(db_session, seat.id)


@pytest.mark.asyncio
async def test_delete_seat_not_found(db_session: AsyncSession):
    with pytest.raises(NotFoundError):
        await seat_service.delete_seat(db_session, uuid.uuid4())


@pytest.mark.asyncio
async def test_get_availability(db_session: AsyncSession, space_with_rules: Space):
    await seat_service.create_seat(
        db_session, space_with_rules.id, SeatCreate(label="E1", position={"x": 0, "y": 0})
    )
    results = await seat_service.get_availability(
        db_session, space_with_rules.id, _future(1), _future(2)
    )
    assert len(results) == 1
    assert results[0].booking_status == "available"


# ─── Space Rules Service ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_rules(db_session: AsyncSession, space_with_rules: Space):
    rules = await rules_service.get_rules(db_session, space_with_rules.id)
    assert rules.max_duration_minutes == 480


@pytest.mark.asyncio
async def test_get_rules_not_found(db_session: AsyncSession):
    # Space without rules
    space = Space(name="NoRules", type="library", capacity=5)
    db_session.add(space)
    await db_session.commit()
    with pytest.raises(NotFoundError):
        await rules_service.get_rules(db_session, space.id)


@pytest.mark.asyncio
async def test_update_rules(db_session: AsyncSession, space_with_rules: Space):
    updated = await rules_service.update_rules(
        db_session, space_with_rules.id, SpaceRulesUpdate(max_duration_minutes=120)
    )
    assert updated.max_duration_minutes == 120


# ─── Booking Service ─────────────────────────────────────────────────────────

@pytest.fixture
async def test_user(db_session: AsyncSession) -> User:
    from app.core.security import hash_password
    user = User(
        email="booking_user@test.com",
        name="BookingUser",
        hashed_password=hash_password("pass"),
        role="user",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def available_seat(db_session: AsyncSession, space_with_rules: Space) -> Seat:
    seat = Seat(space_id=space_with_rules.id, label="F1", position={"x": 0, "y": 0})
    db_session.add(seat)
    await db_session.commit()
    await db_session.refresh(seat)
    return seat


@pytest.mark.asyncio
async def test_create_booking_success(
    db_session: AsyncSession, test_user: User, available_seat: Seat
):
    booking = await booking_service.create_booking(
        db_session,
        test_user.id,
        BookingCreate(
            seat_id=available_seat.id,
            start_time=_future(1),
            end_time=_future(2),
        ),
    )
    assert booking.status == "confirmed"
    assert booking.user_id == test_user.id


@pytest.mark.asyncio
async def test_create_booking_seat_not_found(db_session: AsyncSession, test_user: User):
    with pytest.raises(NotFoundError):
        await booking_service.create_booking(
            db_session,
            test_user.id,
            BookingCreate(seat_id=uuid.uuid4(), start_time=_future(1), end_time=_future(2)),
        )


@pytest.mark.asyncio
async def test_create_booking_seat_unavailable(
    db_session: AsyncSession, test_user: User, space_with_rules: Space
):
    seat = Seat(
        space_id=space_with_rules.id, label="M1", position={"x": 0, "y": 0}, status="maintenance"
    )
    db_session.add(seat)
    await db_session.commit()
    with pytest.raises(SeatUnavailableError):
        await booking_service.create_booking(
            db_session,
            test_user.id,
            BookingCreate(seat_id=seat.id, start_time=_future(1), end_time=_future(2)),
        )


@pytest.mark.asyncio
async def test_create_booking_no_rules(db_session: AsyncSession, test_user: User):
    space = Space(name="NoRules", type="library", capacity=5)
    db_session.add(space)
    await db_session.flush()
    seat = Seat(space_id=space.id, label="G1", position={"x": 0, "y": 0})
    db_session.add(seat)
    await db_session.commit()
    with pytest.raises(NotFoundError):
        await booking_service.create_booking(
            db_session,
            test_user.id,
            BookingCreate(seat_id=seat.id, start_time=_future(1), end_time=_future(2)),
        )


@pytest.mark.asyncio
async def test_create_booking_start_in_past(
    db_session: AsyncSession, test_user: User, available_seat: Seat
):
    with pytest.raises(BookingRuleViolationError):
        await booking_service.create_booking(
            db_session,
            test_user.id,
            BookingCreate(
                seat_id=available_seat.id,
                start_time=datetime.now(UTC) - timedelta(hours=1),
                end_time=_future(1),
            ),
        )


@pytest.mark.asyncio
async def test_create_booking_end_before_start(
    db_session: AsyncSession, test_user: User, available_seat: Seat
):
    with pytest.raises(BookingRuleViolationError):
        await booking_service.create_booking(
            db_session,
            test_user.id,
            BookingCreate(
                seat_id=available_seat.id,
                start_time=_future(3),
                end_time=_future(1),
            ),
        )


@pytest.mark.asyncio
async def test_create_booking_exceeds_max_duration(
    db_session: AsyncSession, test_user: User, available_seat: Seat
):
    with pytest.raises(BookingRuleViolationError):
        await booking_service.create_booking(
            db_session,
            test_user.id,
            BookingCreate(
                seat_id=available_seat.id,
                start_time=_future(1),
                end_time=_future(12),  # 11 UTC hours; still >480 min on DST fall-back days
            ),
        )


@pytest.mark.asyncio
async def test_create_booking_too_far_in_advance(
    db_session: AsyncSession, test_user: User, available_seat: Seat
):
    with pytest.raises(BookingRuleViolationError):
        await booking_service.create_booking(
            db_session,
            test_user.id,
            BookingCreate(
                seat_id=available_seat.id,
                start_time=_future(24 * 5),  # 5 days > 3 day limit
                end_time=_future(24 * 5 + 1),
            ),
        )


@pytest.mark.asyncio
async def test_create_booking_conflict(
    db_session: AsyncSession, test_user: User, available_seat: Seat
):
    await booking_service.create_booking(
        db_session,
        test_user.id,
        BookingCreate(seat_id=available_seat.id, start_time=_future(1), end_time=_future(2)),
    )
    # A different user trying the same seat/time should hit the seat-level conflict
    from app.core.security import hash_password
    other_user = User(
        email="other_conflict@test.com",
        name="Other",
        hashed_password=hash_password("pass"),
        role="user",
    )
    db_session.add(other_user)
    await db_session.commit()
    await db_session.refresh(other_user)

    with pytest.raises(BookingConflictError):
        await booking_service.create_booking(
            db_session,
            other_user.id,
            BookingCreate(seat_id=available_seat.id, start_time=_future(1), end_time=_future(2)),
        )


@pytest.mark.asyncio
async def test_cancel_booking_success(
    db_session: AsyncSession, test_user: User, available_seat: Seat
):
    booking = await booking_service.create_booking(
        db_session,
        test_user.id,
        BookingCreate(seat_id=available_seat.id, start_time=_future(2), end_time=_future(3)),
    )
    cancelled = await booking_service.cancel_booking(db_session, booking.id, test_user.id)
    assert cancelled.status == "cancelled"


@pytest.mark.asyncio
async def test_cancel_booking_not_found(db_session: AsyncSession, test_user: User):
    with pytest.raises(NotFoundError):
        await booking_service.cancel_booking(db_session, uuid.uuid4(), test_user.id)


@pytest.mark.asyncio
async def test_cancel_booking_wrong_user(
    db_session: AsyncSession, test_user: User, available_seat: Seat
):
    booking = await booking_service.create_booking(
        db_session,
        test_user.id,
        BookingCreate(seat_id=available_seat.id, start_time=_future(2), end_time=_future(3)),
    )
    with pytest.raises(ForbiddenError):
        await booking_service.cancel_booking(db_session, booking.id, uuid.uuid4())


@pytest.mark.asyncio
async def test_cancel_already_cancelled_booking(
    db_session: AsyncSession, test_user: User, available_seat: Seat
):
    booking = await booking_service.create_booking(
        db_session,
        test_user.id,
        BookingCreate(seat_id=available_seat.id, start_time=_future(2), end_time=_future(3)),
    )
    await booking_service.cancel_booking(db_session, booking.id, test_user.id)
    with pytest.raises(BookingRuleViolationError):
        await booking_service.cancel_booking(db_session, booking.id, test_user.id)


@pytest.mark.asyncio
async def test_cancel_booking_admin_override(
    db_session: AsyncSession, test_user: User, available_seat: Seat
):
    booking = await booking_service.create_booking(
        db_session,
        test_user.id,
        BookingCreate(seat_id=available_seat.id, start_time=_future(2), end_time=_future(3)),
    )
    # Admin can cancel regardless of ownership
    cancelled = await booking_service.cancel_booking(
        db_session, booking.id, uuid.uuid4(), is_admin=True
    )
    assert cancelled.status == "cancelled"


@pytest.mark.asyncio
async def test_check_in_success(
    db_session: AsyncSession, test_user: User, available_seat: Seat
):
    """Check-in should succeed when now is between start_time and end_time."""
    now_utc = datetime.now(UTC)
    booking = Booking(
        user_id=test_user.id,
        seat_id=available_seat.id,
        start_time=now_utc - timedelta(minutes=10),
        end_time=now_utc + timedelta(hours=1),
        status="confirmed",
    )
    db_session.add(booking)
    await db_session.commit()
    await db_session.refresh(booking)

    checked_in = await booking_service.check_in(db_session, booking.id, test_user.id)
    assert checked_in.status == "checked_in"
    assert checked_in.checked_in_at is not None


@pytest.mark.asyncio
async def test_check_in_before_start_time(
    db_session: AsyncSession, test_user: User, available_seat: Seat
):
    booking = await booking_service.create_booking(
        db_session,
        test_user.id,
        BookingCreate(seat_id=available_seat.id, start_time=_future(2), end_time=_future(3)),
    )
    with pytest.raises(BookingRuleViolationError):
        await booking_service.check_in(db_session, booking.id, test_user.id)


@pytest.mark.asyncio
async def test_check_in_wrong_user(
    db_session: AsyncSession, test_user: User, available_seat: Seat
):
    booking = await booking_service.create_booking(
        db_session,
        test_user.id,
        BookingCreate(seat_id=available_seat.id, start_time=_future(2), end_time=_future(3)),
    )
    with pytest.raises(ForbiddenError):
        await booking_service.check_in(db_session, booking.id, uuid.uuid4())


@pytest.mark.asyncio
async def test_check_in_after_end_time(
    db_session: AsyncSession, test_user: User, available_seat: Seat
):
    """Attempting to check in after the booking has ended should raise BookingRuleViolationError."""
    now_utc = datetime.now(UTC)
    booking = Booking(
        user_id=test_user.id,
        seat_id=available_seat.id,
        start_time=now_utc - timedelta(hours=2),
        end_time=now_utc - timedelta(hours=1),  # ended in the past
        status="confirmed",
    )
    db_session.add(booking)
    await db_session.commit()
    await db_session.refresh(booking)

    with pytest.raises(BookingRuleViolationError, match="ended"):
        await booking_service.check_in(db_session, booking.id, test_user.id)


@pytest.mark.asyncio
async def test_check_in_not_found(db_session: AsyncSession, test_user: User):
    with pytest.raises(NotFoundError):
        await booking_service.check_in(db_session, uuid.uuid4(), test_user.id)


@pytest.mark.asyncio
async def test_check_in_wrong_status(
    db_session: AsyncSession, test_user: User, available_seat: Seat
):
    booking = await booking_service.create_booking(
        db_session,
        test_user.id,
        BookingCreate(seat_id=available_seat.id, start_time=_future(2), end_time=_future(3)),
    )
    await booking_service.cancel_booking(db_session, booking.id, test_user.id)
    with pytest.raises(BookingRuleViolationError):
        await booking_service.check_in(db_session, booking.id, test_user.id)


@pytest.mark.asyncio
async def test_get_booking_success(
    db_session: AsyncSession, test_user: User, available_seat: Seat
):
    booking = await booking_service.create_booking(
        db_session,
        test_user.id,
        BookingCreate(seat_id=available_seat.id, start_time=_future(1), end_time=_future(2)),
    )
    fetched = await booking_service.get_booking(db_session, booking.id, test_user.id)
    assert fetched.id == booking.id


@pytest.mark.asyncio
async def test_get_booking_not_found(db_session: AsyncSession, test_user: User):
    with pytest.raises(NotFoundError):
        await booking_service.get_booking(db_session, uuid.uuid4(), test_user.id)


@pytest.mark.asyncio
async def test_get_booking_wrong_user(
    db_session: AsyncSession, test_user: User, available_seat: Seat
):
    booking = await booking_service.create_booking(
        db_session,
        test_user.id,
        BookingCreate(seat_id=available_seat.id, start_time=_future(1), end_time=_future(2)),
    )
    with pytest.raises(ForbiddenError):
        await booking_service.get_booking(db_session, booking.id, uuid.uuid4())


@pytest.mark.asyncio
async def test_list_my_bookings(
    db_session: AsyncSession, test_user: User, available_seat: Seat
):
    await booking_service.create_booking(
        db_session,
        test_user.id,
        BookingCreate(seat_id=available_seat.id, start_time=_future(1), end_time=_future(2)),
    )
    bookings = await booking_service.list_my_bookings(db_session, test_user.id)
    assert len(bookings) == 1


@pytest.mark.asyncio
async def test_list_all_bookings(
    db_session: AsyncSession, test_user: User, available_seat: Seat
):
    await booking_service.create_booking(
        db_session,
        test_user.id,
        BookingCreate(seat_id=available_seat.id, start_time=_future(1), end_time=_future(2)),
    )
    all_bookings = await booking_service.list_all_bookings(db_session)
    assert len(all_bookings) >= 1


# ─── Phase 2: time_unit alignment ────────────────────────────────────────────

@pytest.fixture
async def office_space(db_session: AsyncSession) -> Space:
    space = Space(name="Office", type="office", capacity=5)
    db_session.add(space)
    await db_session.flush()
    rules = SpaceRules(
        space_id=space.id,
        max_duration_minutes=720,  # 12 hours to accommodate midnight→noon half-day slots
        max_advance_days=7,
        time_unit="half_day",
        auto_release_minutes=None,
    )
    db_session.add(rules)
    await db_session.commit()
    await db_session.refresh(space)
    return space


@pytest.fixture
async def office_seat(db_session: AsyncSession, office_space: Space) -> Seat:
    seat = Seat(space_id=office_space.id, label="O1", position={"x": 0, "y": 0})
    db_session.add(seat)
    await db_session.commit()
    await db_session.refresh(seat)
    return seat


@pytest.mark.asyncio
async def test_time_unit_hourly_valid(
    db_session: AsyncSession, test_user: User, available_seat: Seat
):
    """Booking exactly on hour boundaries should succeed."""
    booking = await booking_service.create_booking(
        db_session,
        test_user.id,
        BookingCreate(seat_id=available_seat.id, start_time=_future(1), end_time=_future(2)),
    )
    assert booking.status == "confirmed"


@pytest.mark.asyncio
async def test_time_unit_hourly_invalid_start(
    db_session: AsyncSession, test_user: User, available_seat: Seat
):
    """Booking not on an hour boundary should be rejected."""
    start = datetime.now(UTC) + timedelta(hours=2, minutes=30)
    end = datetime.now(UTC) + timedelta(hours=3, minutes=30)
    with pytest.raises(BookingRuleViolationError, match="exact hour"):
        await booking_service.create_booking(
            db_session,
            test_user.id,
            BookingCreate(seat_id=available_seat.id, start_time=start, end_time=end),
        )


@pytest.mark.asyncio
async def test_time_unit_hourly_invalid_end(
    db_session: AsyncSession, test_user: User, available_seat: Seat
):
    """Booking with start on the hour but end off the hour should be rejected."""
    start = _future(2)
    end = start + timedelta(hours=1, minutes=15)  # not on hour boundary
    with pytest.raises(BookingRuleViolationError, match="exact hour"):
        await booking_service.create_booking(
            db_session,
            test_user.id,
            BookingCreate(seat_id=available_seat.id, start_time=start, end_time=end),
        )


@pytest.mark.asyncio
async def test_time_unit_half_day_valid(
    db_session: AsyncSession, test_user: User, office_seat: Seat
):
    """Half-day booking at midnight→noon should succeed."""
    booking = await booking_service.create_booking(
        db_session,
        test_user.id,
        BookingCreate(
            seat_id=office_seat.id,
            start_time=_half_day_start(1),
            end_time=_half_day_end(1),
        ),
    )
    assert booking.status == "confirmed"


@pytest.mark.asyncio
async def test_time_unit_half_day_invalid(
    db_session: AsyncSession, test_user: User, office_seat: Seat
):
    """Half-day booking not starting at 00:00 or 12:00 AEST should be rejected."""
    now_aest = datetime.now(AEST)
    bad_start = (now_aest + timedelta(days=1)).replace(
        hour=9, minute=0, second=0, microsecond=0
    ).astimezone(UTC)
    bad_end = (now_aest + timedelta(days=1)).replace(
        hour=12, minute=0, second=0, microsecond=0
    ).astimezone(UTC)
    with pytest.raises(BookingRuleViolationError, match="midnight.*noon|half.day"):
        await booking_service.create_booking(
            db_session,
            test_user.id,
            BookingCreate(seat_id=office_seat.id, start_time=bad_start, end_time=bad_end),
        )


@pytest.mark.asyncio
async def test_time_unit_half_day_invalid_end(
    db_session: AsyncSession, test_user: User, office_seat: Seat
):
    """Half-day booking with valid start but invalid end should be rejected."""
    start = _half_day_start(1)  # midnight AEST tomorrow
    now_aest = datetime.now(AEST)
    bad_end = (now_aest + timedelta(days=1)).replace(
        hour=9, minute=0, second=0, microsecond=0
    ).astimezone(UTC)
    with pytest.raises(BookingRuleViolationError, match="midnight.*noon|half.day"):
        await booking_service.create_booking(
            db_session,
            test_user.id,
            BookingCreate(seat_id=office_seat.id, start_time=start, end_time=bad_end),
        )


# ─── Phase 2: multi-booking constraints per space ─────────────────────────────

@pytest.mark.asyncio
async def test_overlapping_booking_same_space_rejected(
    db_session: AsyncSession, test_user: User, space_with_rules: Space
):
    """A user cannot hold two time-overlapping active bookings in the same space."""
    seat1 = Seat(space_id=space_with_rules.id, label="X1", position={"x": 0, "y": 0})
    seat2 = Seat(space_id=space_with_rules.id, label="X2", position={"x": 30, "y": 0})
    db_session.add_all([seat1, seat2])
    await db_session.commit()
    await db_session.refresh(seat1)
    await db_session.refresh(seat2)

    await booking_service.create_booking(
        db_session,
        test_user.id,
        BookingCreate(seat_id=seat1.id, start_time=_future(1), end_time=_future(2)),
    )
    # Overlapping booking on a different seat — must be rejected
    with pytest.raises(BookingRuleViolationError, match="overlaps"):
        await booking_service.create_booking(
            db_session,
            test_user.id,
            BookingCreate(seat_id=seat2.id, start_time=_future(1), end_time=_future(2)),
        )


@pytest.mark.asyncio
async def test_non_overlapping_booking_same_space_allowed(
    db_session: AsyncSession, test_user: User, space_with_rules: Space
):
    """A user can hold multiple non-overlapping bookings in the same space on the same day."""
    seat1 = Seat(space_id=space_with_rules.id, label="Y1", position={"x": 0, "y": 0})
    seat2 = Seat(space_id=space_with_rules.id, label="Y2", position={"x": 30, "y": 0})
    db_session.add_all([seat1, seat2])
    await db_session.commit()
    await db_session.refresh(seat1)
    await db_session.refresh(seat2)

    b1 = await booking_service.create_booking(
        db_session,
        test_user.id,
        BookingCreate(seat_id=seat1.id, start_time=_future(1), end_time=_future(2)),
    )
    b2 = await booking_service.create_booking(
        db_session,
        test_user.id,
        BookingCreate(seat_id=seat2.id, start_time=_future(2), end_time=_future(3)),
    )
    assert b1.status == "confirmed"
    assert b2.status == "confirmed"


@pytest.mark.asyncio
async def test_daily_duration_limit_enforced(
    db_session: AsyncSession, test_user: User, space_with_rules: Space
):
    """A user cannot exceed the space's max_duration_minutes total per day.

    Times are anchored to AEST calendar days (tomorrow 09:00–17:00 AEST, then
    17:00–18:00 AEST) so the test is deterministic regardless of when it runs —
    both slots always fall on the same AEST calendar day.
    """
    # space_with_rules has max_duration_minutes=480 (8 hours)
    seat1 = Seat(space_id=space_with_rules.id, label="Z1", position={"x": 0, "y": 0})
    seat2 = Seat(space_id=space_with_rules.id, label="Z2", position={"x": 30, "y": 0})
    db_session.add_all([seat1, seat2])
    await db_session.commit()
    await db_session.refresh(seat1)
    await db_session.refresh(seat2)

    # Build AEST-anchored times: tomorrow 09:00 → 17:00 (8 h) and 17:00 → 18:00 (1 h)
    tomorrow_aest = (datetime.now(AEST) + timedelta(days=1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    start1 = tomorrow_aest.replace(hour=9).astimezone(UTC)
    end1 = tomorrow_aest.replace(hour=17).astimezone(UTC)   # 8 h — hits exact limit
    start2 = tomorrow_aest.replace(hour=17).astimezone(UTC)
    end2 = tomorrow_aest.replace(hour=18).astimezone(UTC)   # 1 additional hour

    # Book 8 hours on seat1 (hits the 480-min limit exactly)
    await booking_service.create_booking(
        db_session,
        test_user.id,
        BookingCreate(seat_id=seat1.id, start_time=start1, end_time=end1),
    )
    # Any additional booking on the same AEST day should fail
    with pytest.raises(BookingRuleViolationError, match="daily limit"):
        await booking_service.create_booking(
            db_session,
            test_user.id,
            BookingCreate(seat_id=seat2.id, start_time=start2, end_time=end2),
        )


# ─── Phase 2: auto-release scheduler ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_expire_bookings_in_session(
    db_session: AsyncSession, test_user: User, available_seat: Seat
):
    """Bookings past auto_release_minutes since start_time should be expired."""
    past_start = datetime.now(UTC) - timedelta(minutes=30)
    booking = Booking(
        user_id=test_user.id,
        seat_id=available_seat.id,
        start_time=past_start,
        end_time=past_start + timedelta(hours=2),
        status="confirmed",
    )
    db_session.add(booking)
    await db_session.commit()
    await db_session.refresh(booking)

    expired_count = await expire_bookings_in_session(db_session)

    assert expired_count == 1
    await db_session.refresh(booking)
    assert booking.status == "expired"


@pytest.mark.asyncio
async def test_expire_bookings_skips_checked_in(
    db_session: AsyncSession, test_user: User, available_seat: Seat
):
    """Already checked-in bookings should not be expired."""
    past_start = datetime.now(UTC) - timedelta(minutes=30)
    booking = Booking(
        user_id=test_user.id,
        seat_id=available_seat.id,
        start_time=past_start,
        end_time=past_start + timedelta(hours=2),
        status="checked_in",
        checked_in_at=past_start,
    )
    db_session.add(booking)
    await db_session.commit()

    expired_count = await expire_bookings_in_session(db_session)
    assert expired_count == 0


@pytest.mark.asyncio
async def test_expire_bookings_skips_no_auto_release(
    db_session: AsyncSession, test_user: User, office_seat: Seat
):
    """Bookings in a space without auto_release_minutes should never be expired."""
    past_start = datetime.now(UTC) - timedelta(hours=2)
    booking = Booking(
        user_id=test_user.id,
        seat_id=office_seat.id,
        start_time=past_start,
        end_time=past_start + timedelta(hours=8),
        status="confirmed",
    )
    db_session.add(booking)
    await db_session.commit()

    expired_count = await expire_bookings_in_session(db_session)
    assert expired_count == 0


# ─── Phase 2: full_day time unit ─────────────────────────────────────────────

@pytest.fixture
async def full_day_space(db_session: AsyncSession) -> Space:
    space = Space(name="FullDay Office", type="office", capacity=3)
    db_session.add(space)
    await db_session.flush()
    rules = SpaceRules(
        space_id=space.id,
        max_duration_minutes=1440,  # 24 hours
        max_advance_days=7,
        time_unit="full_day",
        auto_release_minutes=None,
    )
    db_session.add(rules)
    await db_session.commit()
    await db_session.refresh(space)
    return space


@pytest.fixture
async def full_day_seat(db_session: AsyncSession, full_day_space: Space) -> Seat:
    seat = Seat(space_id=full_day_space.id, label="FD1", position={"x": 0, "y": 0})
    db_session.add(seat)
    await db_session.commit()
    await db_session.refresh(seat)
    return seat


@pytest.mark.asyncio
async def test_time_unit_full_day_valid(
    db_session: AsyncSession, test_user: User, full_day_seat: Seat
):
    """Full-day booking from midnight to midnight AEST (24h) should succeed."""
    start = _half_day_start(2)               # midnight AEST two days ahead
    end = _half_day_start(3)                 # midnight AEST three days ahead (24h later)
    booking = await booking_service.create_booking(
        db_session,
        test_user.id,
        BookingCreate(seat_id=full_day_seat.id, start_time=start, end_time=end),
    )
    assert booking.status == "confirmed"


@pytest.mark.asyncio
async def test_time_unit_full_day_invalid(
    db_session: AsyncSession, test_user: User, full_day_seat: Seat
):
    """Full-day booking not starting at midnight AEST should be rejected."""
    now_aest = datetime.now(AEST)
    bad_start = (now_aest + timedelta(days=2)).replace(
        hour=9, minute=0, second=0, microsecond=0
    ).astimezone(UTC)
    bad_end = (now_aest + timedelta(days=3)).replace(
        hour=9, minute=0, second=0, microsecond=0
    ).astimezone(UTC)
    with pytest.raises(BookingRuleViolationError, match="midnight"):
        await booking_service.create_booking(
            db_session,
            test_user.id,
            BookingCreate(seat_id=full_day_seat.id, start_time=bad_start, end_time=bad_end),
        )


@pytest.mark.asyncio
async def test_time_unit_full_day_invalid_end(
    db_session: AsyncSession, test_user: User, full_day_seat: Seat
):
    """Full-day booking with valid start but end not at next midnight should be rejected."""
    start = _half_day_start(2)   # midnight AEST two days ahead
    bad_end = _half_day_end(2)   # noon AEST two days ahead — not 24h later
    with pytest.raises(BookingRuleViolationError, match="24 hours.*midnight|midnight.*24 hours"):
        await booking_service.create_booking(
            db_session,
            test_user.id,
            BookingCreate(seat_id=full_day_seat.id, start_time=start, end_time=bad_end),
        )


# ─── Phase 2: cancellation deadline ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_cancel_office_after_midnight_deadline(
    db_session: AsyncSession, test_user: User, office_space: Space, office_seat: Seat
):
    """Office bookings cannot be cancelled after midnight AEST on the booking date."""
    rules = await db_session.scalar(
        select(SpaceRules).where(SpaceRules.space_id == office_space.id)
    )
    assert rules is not None
    rules.time_unit = "hourly"
    rules.max_duration_minutes = 480
    await db_session.commit()

    # Insert booking directly to bypass create_booking time checks.
    # Use today noon AEST so today's midnight has ALWAYS already passed,
    # regardless of what time of day this test runs.
    now_aest = datetime.now(AEST)
    today_noon_utc = now_aest.replace(hour=12, minute=0, second=0, microsecond=0).astimezone(UTC)
    booking = Booking(
        user_id=test_user.id,
        seat_id=office_seat.id,
        start_time=today_noon_utc,
        end_time=today_noon_utc + timedelta(hours=4),
        status="confirmed",
    )
    db_session.add(booking)
    await db_session.commit()
    await db_session.refresh(booking)

    with pytest.raises(BookingRuleViolationError, match="midnight"):
        await booking_service.cancel_booking(db_session, booking.id, test_user.id)


@pytest.mark.asyncio
async def test_cancel_library_after_start_time(
    db_session: AsyncSession, test_user: User, available_seat: Seat
):
    """Library bookings cannot be cancelled after the booking has started."""
    now_utc = datetime.now(UTC)
    booking = Booking(
        user_id=test_user.id,
        seat_id=available_seat.id,
        start_time=now_utc - timedelta(minutes=30),  # already started
        end_time=now_utc + timedelta(hours=1),
        status="confirmed",
    )
    db_session.add(booking)
    await db_session.commit()
    await db_session.refresh(booking)

    with pytest.raises(BookingRuleViolationError, match="before the start time"):
        await booking_service.cancel_booking(db_session, booking.id, test_user.id)


# ─── Favorite Service ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_favorite_spaces_empty(db_session: AsyncSession, test_user: User):
    result = await favorite_service.list_favorite_spaces(db_session, test_user.id)
    assert result == []


@pytest.mark.asyncio
async def test_add_favorite_space_success(
    db_session: AsyncSession, test_user: User, space_with_rules: Space
):
    fav = await favorite_service.add_favorite_space(
        db_session, test_user.id, space_with_rules.id
    )
    assert fav.user_id == test_user.id
    assert fav.space_id == space_with_rules.id
    assert fav.created_at is not None


@pytest.mark.asyncio
async def test_add_favorite_space_duplicate_raises(
    db_session: AsyncSession, test_user: User, space_with_rules: Space
):
    await favorite_service.add_favorite_space(
        db_session, test_user.id, space_with_rules.id
    )
    with pytest.raises(DuplicateError):
        await favorite_service.add_favorite_space(
            db_session, test_user.id, space_with_rules.id
        )


@pytest.mark.asyncio
async def test_add_favorite_space_nonexistent_raises(
    db_session: AsyncSession, test_user: User
):
    with pytest.raises(NotFoundError):
        await favorite_service.add_favorite_space(
            db_session, test_user.id, uuid.uuid4()
        )


@pytest.mark.asyncio
async def test_remove_favorite_space_success(
    db_session: AsyncSession, test_user: User, space_with_rules: Space
):
    await favorite_service.add_favorite_space(
        db_session, test_user.id, space_with_rules.id
    )
    await favorite_service.remove_favorite_space(
        db_session, test_user.id, space_with_rules.id
    )
    result = await favorite_service.list_favorite_spaces(db_session, test_user.id)
    assert result == []


@pytest.mark.asyncio
async def test_remove_favorite_space_not_favorited_raises(
    db_session: AsyncSession, test_user: User, space_with_rules: Space
):
    with pytest.raises(NotFoundError):
        await favorite_service.remove_favorite_space(
            db_session, test_user.id, space_with_rules.id
        )


@pytest.mark.asyncio
async def test_remove_favorite_space_nonexistent_raises(
    db_session: AsyncSession, test_user: User
):
    with pytest.raises(NotFoundError):
        await favorite_service.remove_favorite_space(
            db_session, test_user.id, uuid.uuid4()
        )


@pytest.mark.asyncio
async def test_list_favorite_spaces_returns_added(
    db_session: AsyncSession, test_user: User, space_with_rules: Space
):
    await favorite_service.add_favorite_space(
        db_session, test_user.id, space_with_rules.id
    )
    result = await favorite_service.list_favorite_spaces(db_session, test_user.id)
    assert len(result) == 1
    assert result[0].space_id == space_with_rules.id


@pytest.mark.asyncio
async def test_get_favorited_space_ids_empty_input(
    db_session: AsyncSession, test_user: User
):
    result = await favorite_service.get_favorited_space_ids(
        db_session, test_user.id, []
    )
    assert result == set()


@pytest.mark.asyncio
async def test_get_favorited_space_ids_returns_subset(
    db_session: AsyncSession, test_user: User, space_with_rules: Space
):
    await favorite_service.add_favorite_space(
        db_session, test_user.id, space_with_rules.id
    )
    other_id = uuid.uuid4()
    result = await favorite_service.get_favorited_space_ids(
        db_session, test_user.id, [space_with_rules.id, other_id]
    )
    assert result == {space_with_rules.id}


@pytest.mark.asyncio
async def test_add_favorite_seat_success(
    db_session: AsyncSession, test_user: User, available_seat: Seat
):
    fav = await favorite_service.add_favorite_seat(
        db_session, test_user.id, available_seat.id
    )
    assert fav.user_id == test_user.id
    assert fav.seat_id == available_seat.id


@pytest.mark.asyncio
async def test_add_favorite_seat_duplicate_raises(
    db_session: AsyncSession, test_user: User, available_seat: Seat
):
    await favorite_service.add_favorite_seat(
        db_session, test_user.id, available_seat.id
    )
    with pytest.raises(DuplicateError):
        await favorite_service.add_favorite_seat(
            db_session, test_user.id, available_seat.id
        )


@pytest.mark.asyncio
async def test_add_favorite_seat_nonexistent_raises(
    db_session: AsyncSession, test_user: User
):
    with pytest.raises(NotFoundError):
        await favorite_service.add_favorite_seat(
            db_session, test_user.id, uuid.uuid4()
        )


@pytest.mark.asyncio
async def test_remove_favorite_seat_success(
    db_session: AsyncSession, test_user: User, available_seat: Seat
):
    await favorite_service.add_favorite_seat(
        db_session, test_user.id, available_seat.id
    )
    await favorite_service.remove_favorite_seat(
        db_session, test_user.id, available_seat.id
    )
    result = await favorite_service.list_favorite_seats(db_session, test_user.id)
    assert result == []


@pytest.mark.asyncio
async def test_remove_favorite_seat_not_favorited_raises(
    db_session: AsyncSession, test_user: User, available_seat: Seat
):
    with pytest.raises(NotFoundError):
        await favorite_service.remove_favorite_seat(
            db_session, test_user.id, available_seat.id
        )


@pytest.mark.asyncio
async def test_remove_favorite_seat_nonexistent_raises(
    db_session: AsyncSession, test_user: User
):
    with pytest.raises(NotFoundError):
        await favorite_service.remove_favorite_seat(
            db_session, test_user.id, uuid.uuid4()
        )


@pytest.mark.asyncio
async def test_list_favorite_seats_empty(db_session: AsyncSession, test_user: User):
    result = await favorite_service.list_favorite_seats(db_session, test_user.id)
    assert result == []


@pytest.mark.asyncio
async def test_list_favorite_seats_returns_added(
    db_session: AsyncSession, test_user: User, available_seat: Seat
):
    await favorite_service.add_favorite_seat(
        db_session, test_user.id, available_seat.id
    )
    result = await favorite_service.list_favorite_seats(db_session, test_user.id)
    assert len(result) == 1
    assert result[0].seat_id == available_seat.id


# ─── Space Visit Service ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_record_visit_creates_new(
    db_session: AsyncSession, test_user: User, space_with_rules: Space
):
    visit = await visit_service.record_visit(
        db_session, test_user.id, space_with_rules.id
    )
    assert visit.user_id == test_user.id
    assert visit.space_id == space_with_rules.id
    assert visit.visited_at is not None


@pytest.mark.asyncio
async def test_record_visit_upserts_existing(
    db_session: AsyncSession, test_user: User, space_with_rules: Space
):
    visit1 = await visit_service.record_visit(
        db_session, test_user.id, space_with_rules.id
    )
    first_time = visit1.visited_at
    # Normalize to naive for SQLite compatibility
    if first_time.tzinfo is not None:
        first_time = first_time.replace(tzinfo=None)

    visit2 = await visit_service.record_visit(
        db_session, test_user.id, space_with_rules.id
    )
    second_time = visit2.visited_at
    if second_time.tzinfo is not None:
        second_time = second_time.replace(tzinfo=None)

    # Same row, updated timestamp
    assert visit2.id == visit1.id
    assert second_time >= first_time


@pytest.mark.asyncio
async def test_record_visit_nonexistent_space_raises(
    db_session: AsyncSession, test_user: User
):
    with pytest.raises(NotFoundError):
        await visit_service.record_visit(
            db_session, test_user.id, uuid.uuid4()
        )


@pytest.mark.asyncio
async def test_list_recent_visits_empty(
    db_session: AsyncSession, test_user: User
):
    result = await visit_service.list_recent_visits(db_session, test_user.id)
    assert result == []


@pytest.mark.asyncio
async def test_list_recent_visits_ordered_by_recency(
    db_session: AsyncSession, test_user: User, space_with_rules: Space
):
    # Create a second space
    space2 = Space(name="Second Visit Space", type="office", capacity=5)
    db_session.add(space2)
    await db_session.flush()
    rules2 = SpaceRules(
        space_id=space2.id,
        max_duration_minutes=480,
        max_advance_days=7,
        time_unit="hourly",
    )
    db_session.add(rules2)
    await db_session.commit()
    await db_session.refresh(space2)

    await visit_service.record_visit(db_session, test_user.id, space_with_rules.id)
    await visit_service.record_visit(db_session, test_user.id, space2.id)

    result = await visit_service.list_recent_visits(db_session, test_user.id)
    assert len(result) == 2
    # Most recent first
    assert result[0].space_id == space2.id
    assert result[1].space_id == space_with_rules.id


@pytest.mark.asyncio
async def test_list_recent_visits_respects_limit(
    db_session: AsyncSession, test_user: User, space_with_rules: Space
):
    space2 = Space(name="Limit Test Space", type="office", capacity=5)
    db_session.add(space2)
    await db_session.flush()
    rules2 = SpaceRules(
        space_id=space2.id,
        max_duration_minutes=480,
        max_advance_days=7,
        time_unit="hourly",
    )
    db_session.add(rules2)
    await db_session.commit()
    await db_session.refresh(space2)

    await visit_service.record_visit(db_session, test_user.id, space_with_rules.id)
    await visit_service.record_visit(db_session, test_user.id, space2.id)

    result = await visit_service.list_recent_visits(db_session, test_user.id, limit=1)
    assert len(result) == 1
