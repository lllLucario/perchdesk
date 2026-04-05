import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.space import Space
from app.models.space_visit import SpaceVisit


async def record_visit(
    db: AsyncSession,
    user_id: uuid.UUID,
    space_id: uuid.UUID,
) -> SpaceVisit:
    """Record or update a floorplan-entry visit for a user and space.

    Uses upsert semantics: if a row already exists for the (user_id,
    space_id) pair, ``visited_at`` is updated to now.  Otherwise a new
    row is created.

    Race-safe: if a concurrent request inserts the same (user_id,
    space_id) pair between our SELECT and INSERT, we catch the unique-
    constraint violation and retry as an UPDATE.
    """
    space = await db.get(Space, space_id)
    if space is None:
        raise NotFoundError(f"Space {space_id} not found.")

    now = datetime.now(UTC)

    result = await db.execute(
        select(SpaceVisit).where(
            SpaceVisit.user_id == user_id,
            SpaceVisit.space_id == space_id,
        )
    )
    visit = result.scalar_one_or_none()

    if visit is not None:
        visit.visited_at = now
        await db.commit()
        await db.refresh(visit)
        return visit

    visit = SpaceVisit(user_id=user_id, space_id=space_id, visited_at=now)
    db.add(visit)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        # Concurrent insert won the race — fetch and update instead.
        result = await db.execute(
            select(SpaceVisit).where(
                SpaceVisit.user_id == user_id,
                SpaceVisit.space_id == space_id,
            )
        )
        visit = result.scalar_one()
        visit.visited_at = datetime.now(UTC)
        await db.commit()
        await db.refresh(visit)

    return visit


async def list_recent_visits(
    db: AsyncSession,
    user_id: uuid.UUID,
    limit: int = 10,
) -> list[SpaceVisit]:
    """Return the user's most recent space visits, ordered by visited_at DESC."""
    result = await db.execute(
        select(SpaceVisit)
        .where(SpaceVisit.user_id == user_id)
        .order_by(SpaceVisit.visited_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())
