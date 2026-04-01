import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.core.geo import haversine_km
from app.models.building import Building
from app.models.space import Space
from app.schemas.building import BuildingCreate, BuildingUpdate


async def list_buildings(db: AsyncSession) -> list[Building]:
    result = await db.execute(select(Building).order_by(Building.name))
    return list(result.scalars().all())


async def get_building(db: AsyncSession, building_id: uuid.UUID) -> Building:
    result = await db.execute(select(Building).where(Building.id == building_id))
    building = result.scalar_one_or_none()
    if building is None:
        raise NotFoundError(f"Building {building_id} not found")
    return building


async def list_building_spaces(db: AsyncSession, building_id: uuid.UUID) -> list[Space]:
    await get_building(db, building_id)
    result = await db.execute(select(Space).where(Space.building_id == building_id))
    return list(result.scalars().all())


async def create_building(db: AsyncSession, data: BuildingCreate) -> Building:
    building = Building(
        name=data.name,
        address=data.address,
        description=data.description,
        opening_hours=data.opening_hours,
        facilities=data.facilities,
        latitude=data.latitude,
        longitude=data.longitude,
    )
    db.add(building)
    await db.commit()
    await db.refresh(building)
    return building


async def list_nearby_buildings(
    db: AsyncSession,
    lat: float,
    lng: float,
    limit: int = 20,
) -> list[tuple[Building, float]]:
    """Return buildings sorted by distance from (lat, lng).

    Only buildings that have both latitude and longitude set are included.
    Buildings without coordinates are silently excluded — they have no
    position to calculate distance from.

    Returns a list of (Building, distance_km) tuples ordered nearest-first.
    """
    result = await db.execute(
        select(Building).where(
            Building.latitude.is_not(None),
            Building.longitude.is_not(None),
        )
    )
    buildings = list(result.scalars().all())

    with_distance: list[tuple[Building, float]] = [
        (b, haversine_km(lat, lng, b.latitude, b.longitude))  # type: ignore[arg-type]
        for b in buildings
    ]
    with_distance.sort(key=lambda pair: pair[1])
    return with_distance[:limit]


async def update_building(
    db: AsyncSession, building_id: uuid.UUID, data: BuildingUpdate
) -> Building:
    building = await get_building(db, building_id)
    update_fields = data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(building, field, value)
    await db.commit()
    await db.refresh(building)
    return building
