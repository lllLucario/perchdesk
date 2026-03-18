import uuid
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import (
    BookingConflictError,
    BookingRuleViolationError,
    ForbiddenError,
    NotFoundError,
    SeatUnavailableError,
)
from app.models.booking import Booking
from app.models.seat import Seat
from app.models.space_rules import SpaceRules
from app.schemas.booking import BookingCreate

AEST = ZoneInfo("Australia/Sydney")


def _utc(dt: datetime) -> datetime:
    """Ensure a datetime is UTC-aware (handles SQLite returning naive datetimes)."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt


def _validate_time_unit(start: datetime, end: datetime, time_unit: str) -> None:
    """Validate that start/end times align with the space's time_unit."""
    start_aest = start.astimezone(AEST)
    end_aest = end.astimezone(AEST)

    if time_unit == "hourly":
        if start_aest.minute != 0 or start_aest.second != 0 or start_aest.microsecond != 0:
            raise BookingRuleViolationError(
                "Hourly bookings must start on an exact hour (e.g. 09:00, 10:00)."
            )
        if end_aest.minute != 0 or end_aest.second != 0 or end_aest.microsecond != 0:
            raise BookingRuleViolationError(
                "Hourly bookings must end on an exact hour (e.g. 10:00, 11:00)."
            )

    elif time_unit == "half_day":
        if start_aest.hour not in (0, 12) or start_aest.minute != 0 or start_aest.second != 0:
            raise BookingRuleViolationError(
                "Half-day bookings must start at midnight (00:00) or noon (12:00) AEST."
            )
        if end_aest.hour not in (0, 12) or end_aest.minute != 0 or end_aest.second != 0:
            raise BookingRuleViolationError(
                "Half-day bookings must end at midnight (00:00) or noon (12:00) AEST."
            )

    elif time_unit == "full_day":
        if start_aest.hour != 0 or start_aest.minute != 0 or start_aest.second != 0:
            raise BookingRuleViolationError(
                "Full-day bookings must start at midnight (00:00) AEST."
            )
        expected_end = (start_aest + timedelta(days=1)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        if end_aest != expected_end:
            raise BookingRuleViolationError(
                "Full-day bookings must end exactly 24 hours after midnight (next day 00:00) AEST."
            )


async def create_booking(
    db: AsyncSession, user_id: uuid.UUID, data: BookingCreate
) -> Booking:
    # 1. Load seat
    seat = await db.get(Seat, data.seat_id)
    if seat is None:
        raise NotFoundError("Seat not found.")
    if seat.status != "available":
        raise SeatUnavailableError()

    # 2. Load rules
    rules_result = await db.execute(
        select(SpaceRules).where(SpaceRules.space_id == seat.space_id)
    )
    rules = rules_result.scalar_one_or_none()
    if rules is None:
        raise NotFoundError("Space rules not configured.")

    now = datetime.now(UTC)

    # 3. Validate time range basics
    if data.start_time <= now:
        raise BookingRuleViolationError("Start time must be in the future.")
    if data.end_time <= data.start_time:
        raise BookingRuleViolationError("End time must be after start time.")

    duration_minutes = (data.end_time - data.start_time).total_seconds() / 60
    if duration_minutes > rules.max_duration_minutes:
        raise BookingRuleViolationError(
            f"Booking duration exceeds maximum of {rules.max_duration_minutes} minutes."
        )

    advance_seconds = (data.start_time - now).total_seconds()
    if advance_seconds > rules.max_advance_days * 86400:
        raise BookingRuleViolationError(
            f"Cannot book more than {rules.max_advance_days} days in advance."
        )

    # 4. Validate time_unit alignment
    _validate_time_unit(data.start_time, data.end_time, rules.time_unit)

    # 5. Check max active bookings per user per space (max 1 active booking per space)
    active_result = await db.execute(
        select(Booking)
        .join(Seat, Booking.seat_id == Seat.id)
        .where(
            and_(
                Booking.user_id == user_id,
                Seat.space_id == seat.space_id,
                Booking.status.in_(["confirmed", "checked_in"]),
            )
        )
    )
    if active_result.scalar_one_or_none() is not None:
        raise BookingRuleViolationError(
            "You already have an active booking in this space."
        )

    # 6. Check for seat-level conflicts
    conflict_result = await db.execute(
        select(Booking).where(
            and_(
                Booking.seat_id == data.seat_id,
                Booking.status.in_(["confirmed", "checked_in"]),
                Booking.start_time < data.end_time,
                Booking.end_time > data.start_time,
            )
        )
    )
    if conflict_result.scalar_one_or_none() is not None:
        raise BookingConflictError()

    booking = Booking(
        user_id=user_id,
        seat_id=data.seat_id,
        start_time=data.start_time,
        end_time=data.end_time,
        status="confirmed",
    )
    db.add(booking)
    await db.commit()
    await db.refresh(booking)
    return booking


async def cancel_booking(
    db: AsyncSession, booking_id: uuid.UUID, user_id: uuid.UUID, is_admin: bool = False
) -> Booking:
    booking = await db.get(
        Booking, booking_id, options=[selectinload(Booking.seat)]
    )
    if booking is None:
        raise NotFoundError("Booking not found.")
    if not is_admin and booking.user_id != user_id:
        raise ForbiddenError()
    if booking.status not in ("confirmed", "checked_in"):
        raise BookingRuleViolationError(f"Cannot cancel a booking with status '{booking.status}'.")

    # Load rules for cancellation policy
    rules_result = await db.execute(
        select(SpaceRules).where(SpaceRules.space_id == booking.seat.space_id)
    )
    rules = rules_result.scalar_one_or_none()

    now = datetime.now(UTC)
    if rules and rules.time_unit in ("half_day", "full_day"):
        # Office: must cancel before booking date 00:00 AEST
        start_aest = _utc(booking.start_time).astimezone(AEST)
        booking_date_midnight_aest = start_aest.replace(hour=0, minute=0, second=0, microsecond=0)
        booking_date_midnight_utc = booking_date_midnight_aest.astimezone(UTC)
        if now >= booking_date_midnight_utc:
            raise BookingRuleViolationError(
                "Office bookings must be cancelled before the booking date (midnight AEST)."
            )
    else:
        # Library: must cancel before start_time
        if now >= _utc(booking.start_time):
            raise BookingRuleViolationError(
                "Library bookings must be cancelled before the start time."
            )

    booking.status = "cancelled"
    await db.commit()
    await db.refresh(booking)
    return booking


async def check_in(
    db: AsyncSession, booking_id: uuid.UUID, user_id: uuid.UUID
) -> Booking:
    booking = await db.get(Booking, booking_id)
    if booking is None:
        raise NotFoundError("Booking not found.")
    if booking.user_id != user_id:
        raise ForbiddenError()
    if booking.status != "confirmed":
        raise BookingRuleViolationError(
            f"Cannot check in a booking with status '{booking.status}'."
        )

    now = datetime.now(UTC)
    if now < _utc(booking.start_time):
        raise BookingRuleViolationError("Cannot check in before the booking start time.")
    if now >= _utc(booking.end_time):
        raise BookingRuleViolationError("Booking has already ended.")

    booking.status = "checked_in"
    booking.checked_in_at = now
    await db.commit()
    await db.refresh(booking)
    return booking


async def list_my_bookings(db: AsyncSession, user_id: uuid.UUID) -> list[Booking]:
    result = await db.execute(
        select(Booking)
        .where(Booking.user_id == user_id)
        .order_by(Booking.start_time.asc())
    )
    return list(result.scalars().all())


async def list_all_bookings(db: AsyncSession) -> list[Booking]:
    result = await db.execute(select(Booking).order_by(Booking.start_time.asc()))
    return list(result.scalars().all())


async def get_booking(
    db: AsyncSession, booking_id: uuid.UUID, user_id: uuid.UUID, is_admin: bool = False
) -> Booking:
    booking = await db.get(Booking, booking_id)
    if booking is None:
        raise NotFoundError("Booking not found.")
    if not is_admin and booking.user_id != user_id:
        raise ForbiddenError()
    return booking
