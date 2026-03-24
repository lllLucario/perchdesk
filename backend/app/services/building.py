import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.building import Building
from app.models.space import Space
from app.schemas.building import BuildingCreate


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
    )
    db.add(building)
    await db.commit()
    await db.refresh(building)
    return building
