"""Direct service-level unit tests for better coverage."""
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    BookingConflictError,
    BookingRuleViolationError,
    ForbiddenError,
    NotFoundError,
    SeatUnavailableError,
    UnauthorizedError,
)
from app.models.seat import Seat
from app.models.space import Space
from app.models.space_rules import SpaceRules
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest
from app.schemas.booking import BookingCreate
from app.schemas.seat import SeatBatchCreate, SeatCreate, SeatUpdate
from app.schemas.space import SpaceCreate, SpaceUpdate
from app.schemas.space_rules import SpaceRulesUpdate
from app.services import auth as auth_service
from app.services import booking as booking_service
from app.services import seat as seat_service
from app.services import space as space_service
from app.services import space_rules as rules_service


def _future(hours: int = 1) -> datetime:
    return datetime.now(UTC) + timedelta(hours=hours)


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
    with pytest.raises(BookingConflictError):
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
        max_duration_minutes=240,
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
    assert results[0].is_available is True


# ─── Space Rules Service ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_rules(db_session: AsyncSession, space_with_rules: Space):
    rules = await rules_service.get_rules(db_session, space_with_rules.id)
    assert rules.max_duration_minutes == 240


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
                end_time=_future(10),  # 9 hours > 240 min limit
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
    with pytest.raises(BookingConflictError):
        await booking_service.create_booking(
            db_session,
            test_user.id,
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
