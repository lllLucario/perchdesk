"""Tests for space visit (floorplan-entry recency) endpoints."""

import asyncio

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.space import Space
from app.models.space_rules import SpaceRules
from app.models.user import User


@pytest.fixture
async def space(db_session: AsyncSession) -> Space:
    s = Space(name="Visit Space", type="library", capacity=10)
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
async def second_space(db_session: AsyncSession) -> Space:
    s = Space(name="Second Space", type="office", capacity=5)
    db_session.add(s)
    await db_session.flush()
    rules = SpaceRules(
        space_id=s.id,
        max_duration_minutes=480,
        max_advance_days=7,
        time_unit="hourly",
    )
    db_session.add(rules)
    await db_session.commit()
    await db_session.refresh(s)
    return s


# ─── POST /api/v1/spaces/{space_id}/visit ────────────────────────────────────


class TestRecordVisit:
    async def test_requires_auth(self, client: AsyncClient, space: Space):
        resp = await client.post(f"/api/v1/spaces/{space.id}/visit")
        assert resp.status_code == 401

    async def test_creates_visit(
        self, client: AsyncClient, user_token: str, space: Space
    ):
        resp = await client.post(
            f"/api/v1/spaces/{space.id}/visit",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["space_id"] == str(space.id)
        assert "visited_at" in data

    async def test_upsert_updates_visited_at(
        self, client: AsyncClient, user_token: str, space: Space
    ):
        headers = {"Authorization": f"Bearer {user_token}"}
        resp1 = await client.post(
            f"/api/v1/spaces/{space.id}/visit", headers=headers
        )
        first_id = resp1.json()["id"]
        first_time = resp1.json()["visited_at"]

        resp2 = await client.post(
            f"/api/v1/spaces/{space.id}/visit", headers=headers
        )
        assert resp2.status_code == 201
        # Same row, updated timestamp
        assert resp2.json()["id"] == first_id
        assert resp2.json()["visited_at"] >= first_time

    async def test_nonexistent_space_404(
        self, client: AsyncClient, user_token: str
    ):
        import uuid

        fake_id = uuid.uuid4()
        resp = await client.post(
            f"/api/v1/spaces/{fake_id}/visit",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 404

    async def test_user_scoped(
        self,
        client: AsyncClient,
        user_token: str,
        admin_token: str,
        space: Space,
    ):
        """Each user gets their own visit row for the same space."""
        headers_user = {"Authorization": f"Bearer {user_token}"}
        headers_admin = {"Authorization": f"Bearer {admin_token}"}

        resp1 = await client.post(
            f"/api/v1/spaces/{space.id}/visit", headers=headers_user
        )
        resp2 = await client.post(
            f"/api/v1/spaces/{space.id}/visit", headers=headers_admin
        )
        assert resp1.json()["id"] != resp2.json()["id"]


# ─── GET /api/v1/me/recent-spaces ────────────────────────────────────────────


class TestListRecentSpaces:
    async def test_requires_auth(self, client: AsyncClient):
        resp = await client.get("/api/v1/me/recent-spaces")
        assert resp.status_code == 401

    async def test_empty_when_no_visits(
        self, client: AsyncClient, user_token: str
    ):
        resp = await client.get(
            "/api/v1/me/recent-spaces",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_returns_visits_ordered_by_recency(
        self,
        client: AsyncClient,
        user_token: str,
        space: Space,
        second_space: Space,
    ):
        headers = {"Authorization": f"Bearer {user_token}"}
        # Visit space first, then second_space with a small delay to ensure
        # distinct timestamps (SQLite has second-level precision).
        await client.post(f"/api/v1/spaces/{space.id}/visit", headers=headers)
        await asyncio.sleep(0.05)
        await client.post(
            f"/api/v1/spaces/{second_space.id}/visit", headers=headers
        )

        resp = await client.get("/api/v1/me/recent-spaces", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        # Most recent first
        assert data[0]["space_id"] == str(second_space.id)
        assert data[1]["space_id"] == str(space.id)

    async def test_respects_limit(
        self,
        client: AsyncClient,
        user_token: str,
        space: Space,
        second_space: Space,
    ):
        headers = {"Authorization": f"Bearer {user_token}"}
        await client.post(f"/api/v1/spaces/{space.id}/visit", headers=headers)
        await client.post(
            f"/api/v1/spaces/{second_space.id}/visit", headers=headers
        )

        resp = await client.get(
            "/api/v1/me/recent-spaces?limit=1", headers=headers
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    async def test_user_scoped_isolation(
        self,
        client: AsyncClient,
        user_token: str,
        admin_token: str,
        space: Space,
    ):
        """One user's visits are not visible to another."""
        await client.post(
            f"/api/v1/spaces/{space.id}/visit",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        resp = await client.get(
            "/api/v1/me/recent-spaces",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        assert resp.json() == []
