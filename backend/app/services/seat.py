import uuid
from datetime import datetime

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.booking import Booking
from app.models.seat import Seat
from app.models.space import Space
from app.schemas.seat import SeatAvailabilityResponse, SeatBatchCreate, SeatCreate, SeatUpdate


async def _get_space_or_404(db: AsyncSession, space_id: uuid.UUID) -> Space:
    space = await db.get(Space, space_id)
    if space is None:
        raise NotFoundError(f"Space {space_id} not found.")
    return space


async def list_seats(db: AsyncSession, space_id: uuid.UUID) -> list[Seat]:
    await _get_space_or_404(db, space_id)
    result = await db.execute(select(Seat).where(Seat.space_id == space_id))
    return list(result.scalars().all())


async def create_seat(db: AsyncSession, space_id: uuid.UUID, data: SeatCreate) -> Seat:
    await _get_space_or_404(db, space_id)
    seat = Seat(
        space_id=space_id,
        label=data.label,
        position=data.position,
        attributes=data.attributes,
    )
    db.add(seat)
    await db.commit()
    await db.refresh(seat)
    return seat


async def batch_create_seats(
    db: AsyncSession, space_id: uuid.UUID, data: SeatBatchCreate
) -> list[Seat]:
    await _get_space_or_404(db, space_id)
    seats = [
        Seat(
            space_id=space_id,
            label=s.label,
            position=s.position,
            attributes=s.attributes,
        )
        for s in data.seats
    ]
    db.add_all(seats)
    await db.commit()
    for seat in seats:
        await db.refresh(seat)
    return seats


async def update_seat(db: AsyncSession, seat_id: uuid.UUID, data: SeatUpdate) -> Seat:
    seat = await db.get(Seat, seat_id)
    if seat is None:
        raise NotFoundError(f"Seat {seat_id} not found.")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(seat, field, value)
    await db.commit()
    await db.refresh(seat)
    return seat


async def delete_seat(db: AsyncSession, seat_id: uuid.UUID) -> None:
    seat = await db.get(Seat, seat_id)
    if seat is None:
        raise NotFoundError(f"Seat {seat_id} not found.")
    await db.delete(seat)
    await db.commit()


async def get_availability(
    db: AsyncSession,
    space_id: uuid.UUID,
    start_time: datetime,
    end_time: datetime,
) -> list[SeatAvailabilityResponse]:
    await _get_space_or_404(db, space_id)

    seats_result = await db.execute(select(Seat).where(Seat.space_id == space_id))
    seats = list(seats_result.scalars().all())

    # Find seat IDs that have conflicting active bookings
    booked_result = await db.execute(
        select(Booking.seat_id).where(
            and_(
                Booking.seat_id.in_([s.id for s in seats]),
                Booking.status.in_(["confirmed", "checked_in"]),
                Booking.start_time < end_time,
                Booking.end_time > start_time,
            )
        )
    )
    booked_seat_ids = {row[0] for row in booked_result.all()}

    return [
        SeatAvailabilityResponse(
            id=seat.id,
            label=seat.label,
            position=seat.position,
            status=seat.status,
            attributes=seat.attributes,
            is_available=seat.status == "available" and seat.id not in booked_seat_ids,
        )
        for seat in seats
    ]
