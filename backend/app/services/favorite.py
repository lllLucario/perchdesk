import uuid

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DuplicateError, NotFoundError
from app.models.favorite import FavoriteSeat, FavoriteSpace
from app.models.seat import Seat
from app.models.space import Space


async def get_favorited_space_ids(
    db: AsyncSession,
    user_id: uuid.UUID,
    space_ids: list[uuid.UUID],
) -> set[uuid.UUID]:
    """Return the subset of space_ids that the user has favorited.

    Returns an empty set when space_ids is empty, avoiding an unnecessary
    database round-trip.
    """
    if not space_ids:
        return set()
    result = await db.execute(
        select(FavoriteSpace.space_id).where(
            FavoriteSpace.user_id == user_id,
            FavoriteSpace.space_id.in_(space_ids),
        )
    )
    return set(result.scalars().all())


def _is_unique_violation(exc: IntegrityError) -> bool:
    """Return True when the IntegrityError is caused by a unique-constraint violation.

    Handles both PostgreSQL (pgcode 23505) and SQLite ("UNIQUE constraint failed")
    so the check works in both production and the test environment.
    """
    orig = exc.orig
    if orig is None:
        return False
    # PostgreSQL
    if hasattr(orig, "pgcode") and orig.pgcode == "23505":
        return True
    # SQLite
    return "UNIQUE constraint failed" in str(orig)


async def list_favorite_spaces(
    db: AsyncSession, user_id: uuid.UUID
) -> list[FavoriteSpace]:
    result = await db.execute(
        select(FavoriteSpace)
        .where(FavoriteSpace.user_id == user_id)
        .order_by(FavoriteSpace.created_at.desc())
    )
    return list(result.scalars().all())


async def add_favorite_space(
    db: AsyncSession, user_id: uuid.UUID, space_id: uuid.UUID
) -> FavoriteSpace:
    space = await db.get(Space, space_id)
    if space is None:
        raise NotFoundError(f"Space {space_id} not found.")

    favorite = FavoriteSpace(user_id=user_id, space_id=space_id)
    db.add(favorite)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        if _is_unique_violation(exc):
            raise DuplicateError("Space is already in your favorites.")
        raise
    await db.refresh(favorite)
    return favorite


async def remove_favorite_space(
    db: AsyncSession, user_id: uuid.UUID, space_id: uuid.UUID
) -> None:
    # Validate the space exists before checking favorites so the client can
    # distinguish a missing resource from an unfavorited existing one.
    space = await db.get(Space, space_id)
    if space is None:
        raise NotFoundError(f"Space {space_id} not found.")

    result = await db.execute(
        select(FavoriteSpace).where(
            FavoriteSpace.user_id == user_id,
            FavoriteSpace.space_id == space_id,
        )
    )
    favorite = result.scalar_one_or_none()
    if favorite is None:
        raise NotFoundError("Space is not in your favorites.")
    await db.delete(favorite)
    await db.commit()


async def list_favorite_seats(
    db: AsyncSession, user_id: uuid.UUID
) -> list[FavoriteSeat]:
    result = await db.execute(
        select(FavoriteSeat)
        .where(FavoriteSeat.user_id == user_id)
        .order_by(FavoriteSeat.created_at.desc())
    )
    return list(result.scalars().all())


async def add_favorite_seat(
    db: AsyncSession, user_id: uuid.UUID, seat_id: uuid.UUID
) -> FavoriteSeat:
    seat = await db.get(Seat, seat_id)
    if seat is None:
        raise NotFoundError(f"Seat {seat_id} not found.")

    favorite = FavoriteSeat(user_id=user_id, seat_id=seat_id)
    db.add(favorite)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        if _is_unique_violation(exc):
            raise DuplicateError("Seat is already in your favorites.")
        raise
    await db.refresh(favorite)
    return favorite


async def remove_favorite_seat(
    db: AsyncSession, user_id: uuid.UUID, seat_id: uuid.UUID
) -> None:
    # Validate the seat exists before checking favorites so the client can
    # distinguish a missing resource from an unfavorited existing one.
    seat = await db.get(Seat, seat_id)
    if seat is None:
        raise NotFoundError(f"Seat {seat_id} not found.")

    result = await db.execute(
        select(FavoriteSeat).where(
            FavoriteSeat.user_id == user_id,
            FavoriteSeat.seat_id == seat_id,
        )
    )
    favorite = result.scalar_one_or_none()
    if favorite is None:
        raise NotFoundError("Seat is not in your favorites.")
    await db.delete(favorite)
    await db.commit()
