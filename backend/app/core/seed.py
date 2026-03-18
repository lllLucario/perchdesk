"""Seed script: creates sample spaces with rules and seats."""
import asyncio

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.security import hash_password
from app.models.seat import Seat
from app.models.space import Space
from app.models.space_rules import SpaceRules
from app.models.user import User


async def seed(session: AsyncSession) -> None:
    # Admin user
    admin = User(
        email="admin@perchdesk.local",
        name="Admin",
        hashed_password=hash_password("admin123"),
        role="admin",
    )
    session.add(admin)

    # Library space
    library = Space(name="Central Library", type="library", capacity=20)
    session.add(library)
    await session.flush()

    library_rules = SpaceRules(
        space_id=library.id,
        max_duration_minutes=240,
        max_advance_days=3,
        time_unit="hourly",
        auto_release_minutes=15,
    )
    session.add(library_rules)

    for row in range(4):
        for col in range(5):
            label = f"{chr(65 + row)}{col + 1}"
            seat = Seat(
                space_id=library.id,
                label=label,
                position={"x": 60 + col * 90, "y": 60 + row * 90},
            )
            session.add(seat)

    # Office space
    office = Space(name="Innovation Hub", type="office", capacity=10)
    session.add(office)
    await session.flush()

    office_rules = SpaceRules(
        space_id=office.id,
        max_duration_minutes=480,
        max_advance_days=7,
        time_unit="half_day",
        auto_release_minutes=None,
    )
    session.add(office_rules)

    for i in range(10):
        row, col = divmod(i, 5)
        seat = Seat(
            space_id=office.id,
            label=f"D{i + 1}",
            position={"x": 60 + col * 120, "y": 60 + row * 120},
            attributes={"power_outlet": True, "monitor": i % 2 == 0},
        )
        session.add(seat)

    await session.commit()
    print("Seed data loaded.")


async def main() -> None:
    engine = create_async_engine(settings.database_url)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        await seed(session)
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
