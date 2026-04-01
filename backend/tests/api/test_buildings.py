"""Tests for /api/v1/buildings endpoints."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.building import Building
from app.models.space import Space
from app.models.space_rules import SpaceRules


@pytest.fixture
async def sample_building(db_session: AsyncSession) -> Building:
    b = Building(
        name="Sample Building",
        address="99 Sample St",
        description="A sample building for tests.",
        opening_hours={"weekday": "08:00–18:00"},
        facilities=["Wifi"],
    )
    db_session.add(b)
    await db_session.commit()
    await db_session.refresh(b)
    return b


@pytest.fixture
async def building_with_coords(db_session: AsyncSession) -> Building:
    b = Building(
        name="Geo Building",
        address="1 Coord Ave",
        latitude=-33.8688,
        longitude=151.2093,
    )
    db_session.add(b)
    await db_session.commit()
    await db_session.refresh(b)
    return b


@pytest.fixture
async def space_in_building(db_session: AsyncSession, sample_building: Building) -> Space:
    space = Space(
        name="Building Space",
        type="library",
        capacity=5,
        building_id=sample_building.id,
    )
    db_session.add(space)
    await db_session.flush()
    rules = SpaceRules(
        space_id=space.id,
        max_duration_minutes=480,
        max_advance_days=3,
        time_unit="hourly",
        auto_release_minutes=15,
    )
    db_session.add(rules)
    await db_session.commit()
    await db_session.refresh(space)
    return space


class TestListBuildings:
    async def test_list_buildings_requires_auth(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/buildings")
        assert resp.status_code == 401

    async def test_list_buildings_empty(self, client: AsyncClient, user_token: str) -> None:
        resp = await client.get(
            "/api/v1/buildings", headers={"Authorization": f"Bearer {user_token}"}
        )
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_list_buildings_returns_all(
        self, client: AsyncClient, user_token: str, sample_building: Building
    ) -> None:
        resp = await client.get(
            "/api/v1/buildings", headers={"Authorization": f"Bearer {user_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["name"] == "Sample Building"
        assert data[0]["address"] == "99 Sample St"
        assert "id" in data[0]


class TestGetBuilding:
    async def test_get_building_not_found(self, client: AsyncClient, user_token: str) -> None:
        resp = await client.get(
            "/api/v1/buildings/00000000-0000-0000-0000-000000000000",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 404

    async def test_get_building_success(
        self, client: AsyncClient, user_token: str, sample_building: Building
    ) -> None:
        resp = await client.get(
            f"/api/v1/buildings/{sample_building.id}",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == str(sample_building.id)
        assert data["name"] == "Sample Building"
        assert data["opening_hours"] == {"weekday": "08:00–18:00"}
        assert data["facilities"] == ["Wifi"]

    async def test_get_building_includes_null_coordinates(
        self, client: AsyncClient, user_token: str, sample_building: Building
    ) -> None:
        resp = await client.get(
            f"/api/v1/buildings/{sample_building.id}",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["latitude"] is None
        assert data["longitude"] is None

    async def test_get_building_with_coordinates(
        self, client: AsyncClient, user_token: str, building_with_coords: Building
    ) -> None:
        resp = await client.get(
            f"/api/v1/buildings/{building_with_coords.id}",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["latitude"] == pytest.approx(-33.8688)
        assert data["longitude"] == pytest.approx(151.2093)


class TestListBuildingSpaces:
    async def test_list_building_spaces_requires_auth(
        self, client: AsyncClient, sample_building: Building
    ) -> None:
        resp = await client.get(f"/api/v1/buildings/{sample_building.id}/spaces")
        assert resp.status_code == 401

    async def test_list_building_spaces_building_not_found(
        self, client: AsyncClient, user_token: str
    ) -> None:
        resp = await client.get(
            "/api/v1/buildings/00000000-0000-0000-0000-000000000000/spaces",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 404

    async def test_list_building_spaces_empty(
        self, client: AsyncClient, user_token: str, sample_building: Building
    ) -> None:
        resp = await client.get(
            f"/api/v1/buildings/{sample_building.id}/spaces",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_list_building_spaces_returns_spaces(
        self,
        client: AsyncClient,
        user_token: str,
        sample_building: Building,
        space_in_building: Space,
    ) -> None:
        resp = await client.get(
            f"/api/v1/buildings/{sample_building.id}/spaces",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["name"] == "Building Space"
        assert data[0]["building_id"] == str(sample_building.id)

    async def test_list_building_spaces_only_returns_own_spaces(
        self,
        client: AsyncClient,
        user_token: str,
        sample_building: Building,
        space_in_building: Space,
        library_space: Space,  # unlinked space
    ) -> None:
        resp = await client.get(
            f"/api/v1/buildings/{sample_building.id}/spaces",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 1


class TestCreateBuilding:
    async def test_create_building_requires_admin(
        self, client: AsyncClient, user_token: str
    ) -> None:
        resp = await client.post(
            "/api/v1/buildings",
            json={"name": "New Building", "address": "1 New St"},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 403

    async def test_create_building_success(
        self, client: AsyncClient, admin_token: str
    ) -> None:
        resp = await client.post(
            "/api/v1/buildings",
            json={
                "name": "New Building",
                "address": "1 New St",
                "description": "A new building.",
                "opening_hours": {"weekday": "09:00–17:00"},
                "facilities": ["Wifi", "Parking"],
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "New Building"
        assert data["address"] == "1 New St"
        assert data["facilities"] == ["Wifi", "Parking"]
        assert data["latitude"] is None
        assert data["longitude"] is None
        assert "id" in data

    async def test_create_building_with_coordinates(
        self, client: AsyncClient, admin_token: str
    ) -> None:
        resp = await client.post(
            "/api/v1/buildings",
            json={
                "name": "Geo Building",
                "address": "1 Coord Ave",
                "latitude": -33.8688,
                "longitude": 151.2093,
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["latitude"] == pytest.approx(-33.8688)
        assert data["longitude"] == pytest.approx(151.2093)

    async def test_create_building_invalid_latitude(
        self, client: AsyncClient, admin_token: str
    ) -> None:
        resp = await client.post(
            "/api/v1/buildings",
            json={"name": "Bad Building", "address": "1 Bad St", "latitude": 91.0},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 422

    async def test_create_building_invalid_longitude(
        self, client: AsyncClient, admin_token: str
    ) -> None:
        resp = await client.post(
            "/api/v1/buildings",
            json={"name": "Bad Building", "address": "1 Bad St", "longitude": -181.0},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 422


class TestUpdateBuilding:
    async def test_update_building_requires_auth(
        self, client: AsyncClient, sample_building: Building
    ) -> None:
        resp = await client.put(
            f"/api/v1/buildings/{sample_building.id}",
            json={"name": "Updated"},
        )
        assert resp.status_code == 401

    async def test_update_building_requires_admin(
        self, client: AsyncClient, user_token: str, sample_building: Building
    ) -> None:
        resp = await client.put(
            f"/api/v1/buildings/{sample_building.id}",
            json={"name": "Updated"},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 403

    async def test_update_building_not_found(
        self, client: AsyncClient, admin_token: str
    ) -> None:
        resp = await client.put(
            "/api/v1/buildings/00000000-0000-0000-0000-000000000000",
            json={"name": "Ghost"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 404

    async def test_update_building_name(
        self, client: AsyncClient, admin_token: str, sample_building: Building
    ) -> None:
        resp = await client.put(
            f"/api/v1/buildings/{sample_building.id}",
            json={"name": "Renamed Building"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Renamed Building"
        assert resp.json()["address"] == "99 Sample St"  # unchanged

    async def test_update_building_add_coordinates(
        self, client: AsyncClient, admin_token: str, sample_building: Building
    ) -> None:
        resp = await client.put(
            f"/api/v1/buildings/{sample_building.id}",
            json={"latitude": -33.8688, "longitude": 151.2093},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["latitude"] == pytest.approx(-33.8688)
        assert data["longitude"] == pytest.approx(151.2093)
        assert data["name"] == "Sample Building"  # unchanged

    async def test_update_building_clear_coordinates(
        self, client: AsyncClient, admin_token: str, building_with_coords: Building
    ) -> None:
        resp = await client.put(
            f"/api/v1/buildings/{building_with_coords.id}",
            json={"latitude": None, "longitude": None},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["latitude"] is None
        assert data["longitude"] is None

    async def test_update_building_invalid_latitude(
        self, client: AsyncClient, admin_token: str, sample_building: Building
    ) -> None:
        resp = await client.put(
            f"/api/v1/buildings/{sample_building.id}",
            json={"latitude": -91.0},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 422

    async def test_update_building_invalid_longitude(
        self, client: AsyncClient, admin_token: str, sample_building: Building
    ) -> None:
        resp = await client.put(
            f"/api/v1/buildings/{sample_building.id}",
            json={"longitude": 181.0},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 422
