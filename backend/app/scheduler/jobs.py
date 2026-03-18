import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.booking import Booking
from app.models.seat import Seat
from app.models.space_rules import SpaceRules

logger = logging.getLogger(__name__)


async def expire_bookings_in_session(db: AsyncSession) -> int:
    """
    Core expiry logic — separated so tests can inject a session directly.
    Returns the number of bookings expired.
    """
    now = datetime.now(UTC)

    result = await db.execute(
        select(Booking, SpaceRules.auto_release_minutes)
        .join(Seat, Booking.seat_id == Seat.id)
        .join(SpaceRules, SpaceRules.space_id == Seat.space_id)
        .where(
            and_(
                Booking.status == "confirmed",
                Booking.checked_in_at.is_(None),
                SpaceRules.auto_release_minutes.isnot(None),
                Booking.start_time < now,
            )
        )
    )
    rows = result.all()

    expired_count = 0
    for booking, auto_release_minutes in rows:
        start = booking.start_time
        if start.tzinfo is None:
            start = start.replace(tzinfo=UTC)
        release_at = start + timedelta(minutes=auto_release_minutes)
        if now >= release_at:
            booking.status = "expired"
            expired_count += 1

    if expired_count > 0:
        await db.commit()
        logger.info("Auto-released %d expired bookings", expired_count)

    return expired_count


async def expire_unchecked_bookings() -> None:
    """Scheduled job — creates its own session from the production pool."""
    async with AsyncSessionLocal() as db:
        await expire_bookings_in_session(db)
