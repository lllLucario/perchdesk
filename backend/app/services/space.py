import uuid
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundError
from app.core.geo import haversine_km
from app.models.booking import Booking
from app.models.building import Building
from app.models.seat import Seat
from app.models.space import Space
from app.models.space_rules import SpaceRules
from app.schemas.space import SpaceCreate, SpaceRecommendationResult, SpaceUpdate


async def list_spaces(db: AsyncSession) -> list[Space]:
    result = await db.execute(select(Space).options(selectinload(Space.rules)))
    return list(result.scalars().all())


async def get_space(db: AsyncSession, space_id: uuid.UUID) -> Space:
    result = await db.execute(
        select(Space)
        .options(selectinload(Space.seats), selectinload(Space.rules))
        .where(Space.id == space_id)
    )
    space = result.scalar_one_or_none()
    if space is None:
        raise NotFoundError(f"Space {space_id} not found.")
    return space


async def create_space(db: AsyncSession, data: SpaceCreate) -> Space:
    space = Space(
        name=data.name,
        type=data.type,
        capacity=data.capacity,
        layout_config=data.layout_config,
    )
    db.add(space)
    await db.flush()

    # Create default space_rules based on type
    if data.type == "library":
        rules = SpaceRules(
            space_id=space.id,
            max_duration_minutes=480,
            max_advance_days=3,
            time_unit="hourly",
            auto_release_minutes=15,
        )
    else:
        rules = SpaceRules(
            space_id=space.id,
            max_duration_minutes=480,
            max_advance_days=7,
            time_unit="hourly",
            auto_release_minutes=None,
        )

    db.add(rules)
    await db.commit()
    await db.refresh(space)
    return space


async def update_space(db: AsyncSession, space_id: uuid.UUID, data: SpaceUpdate) -> Space:
    space = await get_space(db, space_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(space, field, value)
    await db.commit()
    await db.refresh(space)
    return space


async def delete_space(db: AsyncSession, space_id: uuid.UUID) -> None:
    space = await get_space(db, space_id)
    await db.delete(space)
    await db.commit()


async def list_nearby_spaces(
    db: AsyncSession,
    lat: float,
    lng: float,
    start_time: datetime | None = None,
    end_time: datetime | None = None,
    space_type: str | None = None,
    limit: int = 20,
) -> list[SpaceRecommendationResult]:
    """Return nearby space recommendations ordered by proximity and availability.

    Only spaces belonging to buildings that have coordinates are included.
    Spaces without a building, or in buildings without coordinates, are silently
    excluded.

    When ``start_time`` and ``end_time`` are both provided, ``available_seat_count``
    reflects seats with no conflicting active (confirmed or checked_in) booking in
    that window.  Without a time window it reflects seats whose status is
    ``"available"``.

    When a time window is given, spaces that have at least one bookable seat are
    ranked above equally-distant spaces with no availability, and their ``reason``
    is set to ``"closest_available"``.  All other results use ``"near_you"``.
    """
    # 1. Load spaces joined to buildings that have coordinates.
    stmt = (
        select(Space, Building)
        .join(Building, Space.building_id == Building.id)
        .where(
            Building.latitude.is_not(None),
            Building.longitude.is_not(None),
        )
    )
    if space_type is not None:
        stmt = stmt.where(Space.type == space_type)

    rows = list((await db.execute(stmt)).all())

    if not rows:
        return []

    space_ids = [space.id for space, _ in rows]

    # 2. Batch-fetch available seat counts for all candidate spaces.
    if start_time is not None and end_time is not None:
        # Seats that have an active booking overlapping the requested window.
        conflicting_seats = (
            select(Booking.seat_id)
            .where(
                Booking.status.in_(["confirmed", "checked_in"]),
                Booking.start_time < end_time,
                Booking.end_time > start_time,
            )
        )
        avail_stmt = (
            select(Seat.space_id, func.count(Seat.id).label("cnt"))
            .where(
                Seat.space_id.in_(space_ids),
                Seat.status == "available",
                Seat.id.not_in(conflicting_seats),
            )
            .group_by(Seat.space_id)
        )
    else:
        avail_stmt = (
            select(Seat.space_id, func.count(Seat.id).label("cnt"))
            .where(
                Seat.space_id.in_(space_ids),
                Seat.status == "available",
            )
            .group_by(Seat.space_id)
        )

    avail_map: dict[uuid.UUID, int] = {
        row.space_id: row.cnt for row in (await db.execute(avail_stmt)).all()
    }

    # 3. Compute distances and assign recommendation reasons.
    entries: list[tuple[Space, Building, float, int, str]] = []
    for space, building in rows:
        dist = haversine_km(
            lat,
            lng,
            building.latitude,  # type: ignore[arg-type]
            building.longitude,  # type: ignore[arg-type]
        )
        avail_count = avail_map.get(space.id, 0)

        if start_time is not None and end_time is not None and avail_count > 0:
            reason = "closest_available"
        else:
            reason = "near_you"

        entries.append((space, building, dist, avail_count, reason))

    # 4. Sort: closest_available before near_you, then by ascending distance.
    entries.sort(key=lambda e: (0 if e[4] == "closest_available" else 1, e[2]))

    # 5. Build and return result objects.
    return [
        SpaceRecommendationResult(
            space_id=space.id,
            space_name=space.name,
            space_type=space.type,
            capacity=space.capacity,
            building_id=building.id,
            building_name=building.name,
            building_address=building.address,
            building_latitude=building.latitude,  # type: ignore[arg-type]
            building_longitude=building.longitude,  # type: ignore[arg-type]
            distance_km=round(dist, 3),
            reason=reason,  # type: ignore[arg-type]
            available_seat_count=avail_count,
        )
        for space, building, dist, avail_count, reason in entries[:limit]
    ]
