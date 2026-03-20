import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.database import Base, get_db
from app.core.security import hash_password
from app.main import app
from app.models.seat import Seat
from app.models.space import Space
from app.models.space_rules import SpaceRules
from app.models.user import User

TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

# NullPool: disable connection pooling so each operation creates a fresh
# connection bound to the current event loop. Required when pytest-asyncio
# uses function-scoped event loops (the default) with a module-level engine.
test_engine = create_async_engine(TEST_DATABASE_URL, echo=False, poolclass=NullPool)
TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest.fixture(autouse=True)
async def setup_db():
    # Drop first to clean any stale state left by a previous interrupted run.
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def db_session():
    async with TestSessionLocal() as session:
        yield session


@pytest.fixture
async def client():
    async def override_get_db():
        async with TestSessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
async def admin_user(db_session: AsyncSession) -> User:
    user = User(
        email="admin@test.com",
        name="Admin",
        hashed_password=hash_password("password123"),
        role="admin",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def regular_user(db_session: AsyncSession) -> User:
    user = User(
        email="user@test.com",
        name="User",
        hashed_password=hash_password("password123"),
        role="user",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def admin_token(client: AsyncClient, admin_user: User) -> str:
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "password123"},
    )
    return resp.json()["access_token"]


@pytest.fixture
async def user_token(client: AsyncClient, regular_user: User) -> str:
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "user@test.com", "password": "password123"},
    )
    return resp.json()["access_token"]


@pytest.fixture
async def library_space(db_session: AsyncSession) -> Space:
    space = Space(name="Test Library", type="library", capacity=10)
    db_session.add(space)
    await db_session.flush()
    rules = SpaceRules(
        space_id=space.id,
        max_duration_minutes=240,
        max_advance_days=3,
        time_unit="hourly",
        auto_release_minutes=15,
    )
    db_session.add(rules)
    await db_session.commit()
    await db_session.refresh(space)
    return space


@pytest.fixture
async def library_seat(db_session: AsyncSession, library_space: Space) -> Seat:
    seat = Seat(
        space_id=library_space.id,
        label="A1",
        position={"x": 60, "y": 60},
    )
    db_session.add(seat)
    await db_session.commit()
    await db_session.refresh(seat)
    return seat
