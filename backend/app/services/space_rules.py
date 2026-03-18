import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.space_rules import SpaceRules
from app.schemas.space_rules import SpaceRulesUpdate


async def get_rules(db: AsyncSession, space_id: uuid.UUID) -> SpaceRules:
    result = await db.execute(select(SpaceRules).where(SpaceRules.space_id == space_id))
    rules = result.scalar_one_or_none()
    if rules is None:
        raise NotFoundError(f"Rules for space {space_id} not found.")
    return rules


async def update_rules(
    db: AsyncSession, space_id: uuid.UUID, data: SpaceRulesUpdate
) -> SpaceRules:
    rules = await get_rules(db, space_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(rules, field, value)
    await db.commit()
    await db.refresh(rules)
    return rules
