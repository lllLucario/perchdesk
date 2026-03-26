import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundError
from app.models.space import Space
from app.models.space_rules import SpaceRules
from app.schemas.space import SpaceCreate, SpaceUpdate


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
