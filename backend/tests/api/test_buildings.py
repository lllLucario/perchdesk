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

    async def test_create_building_only_latitude_rejected(
        self, client: AsyncClient, admin_token: str
    ) -> None:
        resp = await client.post(
            "/api/v1/buildings",
            json={"name": "Partial Building", "address": "1 Partial St", "latitude": -33.8688},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 422

    async def test_create_building_only_longitude_rejected(
        self, client: AsyncClient, admin_token: str
    ) -> None:
        resp = await client.post(
            "/api/v1/buildings",
            json={"name": "Partial Building", "address": "1 Partial St", "longitude": 151.2093},
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

    async def test_update_building_only_latitude_rejected(
        self, client: AsyncClient, admin_token: str, sample_building: Building
    ) -> None:
        resp = await client.put(
            f"/api/v1/buildings/{sample_building.id}",
            json={"latitude": -33.8688},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 422

    async def test_update_building_only_longitude_rejected(
        self, client: AsyncClient, admin_token: str, sample_building: Building
    ) -> None:
        resp = await client.put(
            f"/api/v1/buildings/{sample_building.id}",
            json={"longitude": 151.2093},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 422

    async def test_update_building_clear_only_latitude_rejected(
        self, client: AsyncClient, admin_token: str, building_with_coords: Building
    ) -> None:
        # Sending only latitude=null would leave longitude intact in DB — rejected.
        resp = await client.put(
            f"/api/v1/buildings/{building_with_coords.id}",
            json={"latitude": None},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 422

    async def test_update_building_clear_only_longitude_rejected(
        self, client: AsyncClient, admin_token: str, building_with_coords: Building
    ) -> None:
        resp = await client.put(
            f"/api/v1/buildings/{building_with_coords.id}",
            json={"longitude": None},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 422


class TestNearbyBuildings:
    # User position: a few metres from building_with_coords (Sydney CBD area).
    USER_LAT = -33.87
    USER_LNG = 151.21

    async def test_nearby_requires_auth(self, client: AsyncClient) -> None:
        resp = await client.get(
            "/api/v1/buildings/nearby", params={"lat": self.USER_LAT, "lng": self.USER_LNG}
        )
        assert resp.status_code == 401

    async def test_nearby_missing_lat_rejected(
        self, client: AsyncClient, user_token: str
    ) -> None:
        resp = await client.get(
            "/api/v1/buildings/nearby",
            params={"lng": self.USER_LNG},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 422

    async def test_nearby_missing_lng_rejected(
        self, client: AsyncClient, user_token: str
    ) -> None:
        resp = await client.get(
            "/api/v1/buildings/nearby",
            params={"lat": self.USER_LAT},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 422

    async def test_nearby_invalid_lat_rejected(
        self, client: AsyncClient, user_token: str
    ) -> None:
        resp = await client.get(
            "/api/v1/buildings/nearby",
            params={"lat": 91.0, "lng": self.USER_LNG},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 422

    async def test_nearby_invalid_lng_rejected(
        self, client: AsyncClient, user_token: str
    ) -> None:
        resp = await client.get(
            "/api/v1/buildings/nearby",
            params={"lat": self.USER_LAT, "lng": -181.0},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 422

    async def test_nearby_empty_when_no_buildings_have_coords(
        self, client: AsyncClient, user_token: str, sample_building: Building
    ) -> None:
        # sample_building has no coordinates — should not appear in results.
        resp = await client.get(
            "/api/v1/buildings/nearby",
            params={"lat": self.USER_LAT, "lng": self.USER_LNG},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_nearby_returns_building_with_coords(
        self,
        client: AsyncClient,
        user_token: str,
        building_with_coords: Building,
    ) -> None:
        resp = await client.get(
            "/api/v1/buildings/nearby",
            params={"lat": self.USER_LAT, "lng": self.USER_LNG},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["name"] == "Geo Building"

    async def test_nearby_excludes_buildings_without_coords(
        self,
        client: AsyncClient,
        user_token: str,
        building_with_coords: Building,
        sample_building: Building,  # no coords
    ) -> None:
        resp = await client.get(
            "/api/v1/buildings/nearby",
            params={"lat": self.USER_LAT, "lng": self.USER_LNG},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 200
        names = [b["name"] for b in resp.json()]
        assert "Geo Building" in names
        assert "Sample Building" not in names

    async def test_nearby_response_includes_distance_km(
        self,
        client: AsyncClient,
        user_token: str,
        building_with_coords: Building,
    ) -> None:
        resp = await client.get(
            "/api/v1/buildings/nearby",
            params={"lat": self.USER_LAT, "lng": self.USER_LNG},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()[0]
        assert "distance_km" in data
        assert isinstance(data["distance_km"], float)
        # User is a few metres away — distance should be well under 5 km.
        assert data["distance_km"] < 5.0

    async def test_nearby_sorted_nearest_first(
        self,
        client: AsyncClient,
        user_token: str,
        db_session: AsyncSession,
        building_with_coords: Building,  # Sydney ~0 km from user
    ) -> None:
        # Add a second building in Melbourne (~714 km from Sydney).
        far = Building(
            name="Far Building", address="1 Far St", latitude=-37.8136, longitude=144.9631
        )
        db_session.add(far)
        await db_session.commit()

        resp = await client.get(
            "/api/v1/buildings/nearby",
            params={"lat": self.USER_LAT, "lng": self.USER_LNG},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["name"] == "Geo Building"
        assert data[1]["name"] == "Far Building"
        assert data[0]["distance_km"] < data[1]["distance_km"]

    async def test_nearby_limit_caps_results(
        self,
        client: AsyncClient,
        user_token: str,
        db_session: AsyncSession,
    ) -> None:
        # Insert three buildings with coordinates.
        for i, (lat, lng) in enumerate(
            [(-33.8688, 151.2093), (-34.0, 151.0), (-35.0, 150.0)]
        ):
            db_session.add(
                Building(name=f"Building {i}", address=f"{i} St", latitude=lat, longitude=lng)
            )
        await db_session.commit()

        resp = await client.get(
            "/api/v1/buildings/nearby",
            params={"lat": self.USER_LAT, "lng": self.USER_LNG, "limit": 2},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    async def test_nearby_limit_above_max_rejected(
        self, client: AsyncClient, user_token: str
    ) -> None:
        resp = await client.get(
            "/api/v1/buildings/nearby",
            params={"lat": self.USER_LAT, "lng": self.USER_LNG, "limit": 51},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 422


class TestBuildingsWithinBounds:
    # Viewport covering Sydney CBD — building_with_coords sits at (-33.8688, 151.2093).
    BOUNDS = {"min_lat": -34.0, "min_lng": 151.0, "max_lat": -33.0, "max_lng": 152.0}

    def _auth(self, token: str) -> dict[str, str]:
        return {"Authorization": f"Bearer {token}"}

    async def test_within_bounds_requires_auth(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/buildings/within-bounds", params=self.BOUNDS)
        assert resp.status_code == 401

    async def test_within_bounds_missing_min_lat_rejected(
        self, client: AsyncClient, user_token: str
    ) -> None:
        params = {k: v for k, v in self.BOUNDS.items() if k != "min_lat"}
        resp = await client.get(
            "/api/v1/buildings/within-bounds", params=params, headers=self._auth(user_token)
        )
        assert resp.status_code == 422

    async def test_within_bounds_missing_min_lng_rejected(
        self, client: AsyncClient, user_token: str
    ) -> None:
        params = {k: v for k, v in self.BOUNDS.items() if k != "min_lng"}
        resp = await client.get(
            "/api/v1/buildings/within-bounds", params=params, headers=self._auth(user_token)
        )
        assert resp.status_code == 422

    async def test_within_bounds_missing_max_lat_rejected(
        self, client: AsyncClient, user_token: str
    ) -> None:
        params = {k: v for k, v in self.BOUNDS.items() if k != "max_lat"}
        resp = await client.get(
            "/api/v1/buildings/within-bounds", params=params, headers=self._auth(user_token)
        )
        assert resp.status_code == 422

    async def test_within_bounds_missing_max_lng_rejected(
        self, client: AsyncClient, user_token: str
    ) -> None:
        params = {k: v for k, v in self.BOUNDS.items() if k != "max_lng"}
        resp = await client.get(
            "/api/v1/buildings/within-bounds", params=params, headers=self._auth(user_token)
        )
        assert resp.status_code == 422

    async def test_within_bounds_invalid_min_lat_rejected(
        self, client: AsyncClient, user_token: str
    ) -> None:
        params = {**self.BOUNDS, "min_lat": -91.0}
        resp = await client.get(
            "/api/v1/buildings/within-bounds", params=params, headers=self._auth(user_token)
        )
        assert resp.status_code == 422

    async def test_within_bounds_invalid_max_lat_rejected(
        self, client: AsyncClient, user_token: str
    ) -> None:
        params = {**self.BOUNDS, "max_lat": 91.0}
        resp = await client.get(
            "/api/v1/buildings/within-bounds", params=params, headers=self._auth(user_token)
        )
        assert resp.status_code == 422

    async def test_within_bounds_invalid_min_lng_rejected(
        self, client: AsyncClient, user_token: str
    ) -> None:
        params = {**self.BOUNDS, "min_lng": -181.0}
        resp = await client.get(
            "/api/v1/buildings/within-bounds", params=params, headers=self._auth(user_token)
        )
        assert resp.status_code == 422

    async def test_within_bounds_invalid_max_lng_rejected(
        self, client: AsyncClient, user_token: str
    ) -> None:
        params = {**self.BOUNDS, "max_lng": 181.0}
        resp = await client.get(
            "/api/v1/buildings/within-bounds", params=params, headers=self._auth(user_token)
        )
        assert resp.status_code == 422

    async def test_within_bounds_min_lat_gt_max_lat_rejected(
        self, client: AsyncClient, user_token: str
    ) -> None:
        params = {**self.BOUNDS, "min_lat": -33.0, "max_lat": -34.0}
        resp = await client.get(
            "/api/v1/buildings/within-bounds", params=params, headers=self._auth(user_token)
        )
        assert resp.status_code == 400

    async def test_within_bounds_min_lng_gt_max_lng_rejected(
        self, client: AsyncClient, user_token: str
    ) -> None:
        # min_lng > max_lng is the antimeridian-crossing representation used by
        # many map libraries.  The endpoint explicitly rejects it with a message
        # that explains the limitation rather than silently returning wrong data.
        params = {**self.BOUNDS, "min_lng": 152.0, "max_lng": 151.0}
        resp = await client.get(
            "/api/v1/buildings/within-bounds", params=params, headers=self._auth(user_token)
        )
        assert resp.status_code == 400
        assert "Antimeridian" in resp.json()["error"]["detail"]

    async def test_within_bounds_empty_when_no_coordinated_buildings(
        self, client: AsyncClient, user_token: str, sample_building: Building
    ) -> None:
        # sample_building has no coordinates — should not appear.
        resp = await client.get(
            "/api/v1/buildings/within-bounds",
            params=self.BOUNDS,
            headers=self._auth(user_token),
        )
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_within_bounds_returns_building_inside_viewport(
        self,
        client: AsyncClient,
        user_token: str,
        building_with_coords: Building,
    ) -> None:
        resp = await client.get(
            "/api/v1/buildings/within-bounds",
            params=self.BOUNDS,
            headers=self._auth(user_token),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["name"] == "Geo Building"

    async def test_within_bounds_excludes_building_outside_viewport(
        self,
        client: AsyncClient,
        user_token: str,
        db_session: AsyncSession,
    ) -> None:
        # inside viewport
        db_session.add(Building(name="Inside", address="1 St", latitude=-33.9, longitude=151.2))
        # outside viewport (too far south)
        db_session.add(Building(name="Outside", address="2 St", latitude=-35.0, longitude=151.2))
        await db_session.commit()

        resp = await client.get(
            "/api/v1/buildings/within-bounds",
            params=self.BOUNDS,
            headers=self._auth(user_token),
        )
        assert resp.status_code == 200
        names = [b["name"] for b in resp.json()]
        assert "Inside" in names
        assert "Outside" not in names

    async def test_within_bounds_excludes_buildings_without_coordinates(
        self,
        client: AsyncClient,
        user_token: str,
        db_session: AsyncSession,
    ) -> None:
        db_session.add(Building(name="No Coords", address="3 St"))
        db_session.add(Building(name="Has Coords", address="4 St", latitude=-33.9, longitude=151.2))
        await db_session.commit()

        resp = await client.get(
            "/api/v1/buildings/within-bounds",
            params=self.BOUNDS,
            headers=self._auth(user_token),
        )
        assert resp.status_code == 200
        names = [b["name"] for b in resp.json()]
        assert "Has Coords" in names
        assert "No Coords" not in names

    async def test_within_bounds_response_has_non_nullable_coordinates(
        self,
        client: AsyncClient,
        user_token: str,
        building_with_coords: Building,
    ) -> None:
        resp = await client.get(
            "/api/v1/buildings/within-bounds",
            params=self.BOUNDS,
            headers=self._auth(user_token),
        )
        assert resp.status_code == 200
        item = resp.json()[0]
        assert item["latitude"] is not None
        assert item["longitude"] is not None
        assert "distance_km" not in item

    async def test_within_bounds_results_ordered_by_name(
        self,
        client: AsyncClient,
        user_token: str,
        db_session: AsyncSession,
    ) -> None:
        for name, lat, lng in [
            ("Zeta Hub", -33.9, 151.2),
            ("Alpha Centre", -33.85, 151.21),
            ("Beta Space", -33.88, 151.19),
        ]:
            db_session.add(Building(name=name, address="X St", latitude=lat, longitude=lng))
        await db_session.commit()

        resp = await client.get(
            "/api/v1/buildings/within-bounds",
            params=self.BOUNDS,
            headers=self._auth(user_token),
        )
        assert resp.status_code == 200
        names = [b["name"] for b in resp.json()]
        assert names == sorted(names)


class TestBuildingSpacesIsFavorited:
    async def test_building_spaces_includes_is_favorited(
        self,
        client: AsyncClient,
        user_token: str,
        space_in_building: Space,
        sample_building: Building,
    ) -> None:
        resp = await client.get(
            f"/api/v1/buildings/{sample_building.id}/spaces",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 1
        assert "is_favorited" in resp.json()[0]
        assert resp.json()[0]["is_favorited"] is False

    async def test_building_spaces_reflects_favorite(
        self,
        client: AsyncClient,
        user_token: str,
        space_in_building: Space,
        sample_building: Building,
    ) -> None:
        await client.post(
            f"/api/v1/spaces/{space_in_building.id}/favorite",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        resp = await client.get(
            f"/api/v1/buildings/{sample_building.id}/spaces",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.json()[0]["is_favorited"] is True
