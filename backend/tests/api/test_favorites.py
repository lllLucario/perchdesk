"""Tests for favorites API endpoints.

Covers:
  GET  /api/v1/me/favorite-spaces
  POST /api/v1/spaces/{space_id}/favorite
  DELETE /api/v1/spaces/{space_id}/favorite
  GET  /api/v1/me/favorite-seats
  POST /api/v1/seats/{seat_id}/favorite
  DELETE /api/v1/seats/{seat_id}/favorite
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.seat import Seat
from app.models.space import Space
from app.models.space_rules import SpaceRules
from app.models.user import User


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
async def space(db_session: AsyncSession) -> Space:
    s = Space(name="Test Space", type="library", capacity=10)
    db_session.add(s)
    await db_session.flush()
    rules = SpaceRules(
        space_id=s.id,
        max_duration_minutes=480,
        max_advance_days=3,
        time_unit="hourly",
        auto_release_minutes=15,
    )
    db_session.add(rules)
    await db_session.commit()
    await db_session.refresh(s)
    return s


@pytest.fixture
async def another_space(db_session: AsyncSession) -> Space:
    s = Space(name="Another Space", type="office", capacity=5)
    db_session.add(s)
    await db_session.flush()
    rules = SpaceRules(
        space_id=s.id,
        max_duration_minutes=480,
        max_advance_days=7,
        time_unit="hourly",
        auto_release_minutes=None,
    )
    db_session.add(rules)
    await db_session.commit()
    await db_session.refresh(s)
    return s


@pytest.fixture
async def seat(db_session: AsyncSession, space: Space) -> Seat:
    seat = Seat(space_id=space.id, label="A1", position={"x": 60, "y": 60})
    db_session.add(seat)
    await db_session.commit()
    await db_session.refresh(seat)
    return seat


@pytest.fixture
async def another_seat(db_session: AsyncSession, space: Space) -> Seat:
    seat = Seat(space_id=space.id, label="A2", position={"x": 90, "y": 60})
    db_session.add(seat)
    await db_session.commit()
    await db_session.refresh(seat)
    return seat


# ---------------------------------------------------------------------------
# Space favorites
# ---------------------------------------------------------------------------


class TestListFavoriteSpaces:
    async def test_requires_auth(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/me/favorite-spaces")
        assert resp.status_code == 401

    async def test_empty_initially(self, client: AsyncClient, user_token: str) -> None:
        resp = await client.get(
            "/api/v1/me/favorite-spaces",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_returns_favorited_spaces(
        self, client: AsyncClient, user_token: str, space: Space
    ) -> None:
        await client.post(
            f"/api/v1/spaces/{space.id}/favorite",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        resp = await client.get(
            "/api/v1/me/favorite-spaces",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["space_id"] == str(space.id)

    async def test_scoped_to_current_user(
        self,
        client: AsyncClient,
        user_token: str,
        admin_token: str,
        space: Space,
    ) -> None:
        # Admin favorites the space
        await client.post(
            f"/api/v1/spaces/{space.id}/favorite",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        # Regular user should see an empty list
        resp = await client.get(
            "/api/v1/me/favorite-spaces",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 200
        assert resp.json() == []


class TestAddFavoriteSpace:
    async def test_requires_auth(self, client: AsyncClient, space: Space) -> None:
        resp = await client.post(f"/api/v1/spaces/{space.id}/favorite")
        assert resp.status_code == 401

    async def test_add_favorite_success(
        self, client: AsyncClient, user_token: str, space: Space
    ) -> None:
        resp = await client.post(
            f"/api/v1/spaces/{space.id}/favorite",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["space_id"] == str(space.id)
        assert "id" in data
        assert "created_at" in data

    async def test_duplicate_returns_409(
        self, client: AsyncClient, user_token: str, space: Space
    ) -> None:
        await client.post(
            f"/api/v1/spaces/{space.id}/favorite",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        resp = await client.post(
            f"/api/v1/spaces/{space.id}/favorite",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 409

    async def test_nonexistent_space_returns_404(
        self, client: AsyncClient, user_token: str
    ) -> None:
        resp = await client.post(
            "/api/v1/spaces/00000000-0000-0000-0000-000000000000/favorite",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 404

    async def test_two_users_can_favorite_same_space(
        self,
        client: AsyncClient,
        user_token: str,
        admin_token: str,
        space: Space,
    ) -> None:
        r1 = await client.post(
            f"/api/v1/spaces/{space.id}/favorite",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        r2 = await client.post(
            f"/api/v1/spaces/{space.id}/favorite",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert r1.status_code == 201
        assert r2.status_code == 201


class TestRemoveFavoriteSpace:
    async def test_requires_auth(self, client: AsyncClient, space: Space) -> None:
        resp = await client.delete(f"/api/v1/spaces/{space.id}/favorite")
        assert resp.status_code == 401

    async def test_remove_favorite_success(
        self, client: AsyncClient, user_token: str, space: Space
    ) -> None:
        await client.post(
            f"/api/v1/spaces/{space.id}/favorite",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        resp = await client.delete(
            f"/api/v1/spaces/{space.id}/favorite",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 204

        # Confirm it is gone
        list_resp = await client.get(
            "/api/v1/me/favorite-spaces",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert list_resp.json() == []

    async def test_remove_not_favorited_returns_404(
        self, client: AsyncClient, user_token: str, space: Space
    ) -> None:
        resp = await client.delete(
            f"/api/v1/spaces/{space.id}/favorite",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 404

    async def test_remove_only_affects_current_user(
        self,
        client: AsyncClient,
        user_token: str,
        admin_token: str,
        space: Space,
    ) -> None:
        # Both users favorite the space
        await client.post(
            f"/api/v1/spaces/{space.id}/favorite",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        await client.post(
            f"/api/v1/spaces/{space.id}/favorite",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        # Regular user removes their favorite
        await client.delete(
            f"/api/v1/spaces/{space.id}/favorite",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        # Admin's favorite should still be present
        resp = await client.get(
            "/api/v1/me/favorite-spaces",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert len(resp.json()) == 1


# ---------------------------------------------------------------------------
# Seat favorites
# ---------------------------------------------------------------------------


class TestListFavoriteSeats:
    async def test_requires_auth(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/me/favorite-seats")
        assert resp.status_code == 401

    async def test_empty_initially(self, client: AsyncClient, user_token: str) -> None:
        resp = await client.get(
            "/api/v1/me/favorite-seats",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_returns_favorited_seats(
        self, client: AsyncClient, user_token: str, seat: Seat
    ) -> None:
        await client.post(
            f"/api/v1/seats/{seat.id}/favorite",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        resp = await client.get(
            "/api/v1/me/favorite-seats",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["seat_id"] == str(seat.id)


class TestAddFavoriteSeat:
    async def test_requires_auth(self, client: AsyncClient, seat: Seat) -> None:
        resp = await client.post(f"/api/v1/seats/{seat.id}/favorite")
        assert resp.status_code == 401

    async def test_add_favorite_success(
        self, client: AsyncClient, user_token: str, seat: Seat
    ) -> None:
        resp = await client.post(
            f"/api/v1/seats/{seat.id}/favorite",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["seat_id"] == str(seat.id)
        assert "id" in data
        assert "created_at" in data

    async def test_duplicate_returns_409(
        self, client: AsyncClient, user_token: str, seat: Seat
    ) -> None:
        await client.post(
            f"/api/v1/seats/{seat.id}/favorite",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        resp = await client.post(
            f"/api/v1/seats/{seat.id}/favorite",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 409

    async def test_nonexistent_seat_returns_404(
        self, client: AsyncClient, user_token: str
    ) -> None:
        resp = await client.post(
            "/api/v1/seats/00000000-0000-0000-0000-000000000000/favorite",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 404


class TestRemoveFavoriteSeat:
    async def test_requires_auth(self, client: AsyncClient, seat: Seat) -> None:
        resp = await client.delete(f"/api/v1/seats/{seat.id}/favorite")
        assert resp.status_code == 401

    async def test_remove_favorite_success(
        self, client: AsyncClient, user_token: str, seat: Seat
    ) -> None:
        await client.post(
            f"/api/v1/seats/{seat.id}/favorite",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        resp = await client.delete(
            f"/api/v1/seats/{seat.id}/favorite",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 204

        list_resp = await client.get(
            "/api/v1/me/favorite-seats",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert list_resp.json() == []

    async def test_remove_not_favorited_returns_404(
        self, client: AsyncClient, user_token: str, seat: Seat
    ) -> None:
        resp = await client.delete(
            f"/api/v1/seats/{seat.id}/favorite",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 404
