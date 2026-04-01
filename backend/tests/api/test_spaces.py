import io
from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking
from app.models.building import Building
from app.models.seat import Seat
from app.models.space import Space
from app.models.space_rules import SpaceRules


@pytest.mark.asyncio
async def test_list_spaces_shape(client: AsyncClient, user_token: str, library_space: Space):
    resp = await client.get(
        "/api/v1/spaces", headers={"Authorization": f"Bearer {user_token}"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    item = data[0]
    assert "id" in item
    assert "name" in item
    assert "type" in item
    assert "capacity" in item
    assert "layout_config" in item
    assert "created_at" in item
    # list endpoint must NOT embed seats
    assert "seats" not in item


@pytest.mark.asyncio
async def test_create_space_admin(client: AsyncClient, admin_token: str):
    resp = await client.post(
        "/api/v1/spaces",
        json={"name": "New Library", "type": "library", "capacity": 20},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 201
    assert resp.json()["name"] == "New Library"


@pytest.mark.asyncio
async def test_create_library_space_defaults_to_eight_hour_rules(
    client: AsyncClient, admin_token: str
):
    create_resp = await client.post(
        "/api/v1/spaces",
        json={"name": "New Library", "type": "library", "capacity": 20},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert create_resp.status_code == 201
    space_id = create_resp.json()["id"]

    rules_resp = await client.get(
        f"/api/v1/spaces/{space_id}/rules",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert rules_resp.status_code == 200
    rules = rules_resp.json()
    assert rules["time_unit"] == "hourly"
    assert rules["max_duration_minutes"] == 480
    assert rules["max_advance_days"] == 3


@pytest.mark.asyncio
async def test_create_office_space_defaults_to_hourly_rules(
    client: AsyncClient, admin_token: str
):
    create_resp = await client.post(
        "/api/v1/spaces",
        json={"name": "New Office", "type": "office", "capacity": 12},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert create_resp.status_code == 201
    space_id = create_resp.json()["id"]

    rules_resp = await client.get(
        f"/api/v1/spaces/{space_id}/rules",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert rules_resp.status_code == 200
    rules = rules_resp.json()
    assert rules["time_unit"] == "hourly"
    assert rules["max_duration_minutes"] == 480
    assert rules["max_advance_days"] == 7


@pytest.mark.asyncio
async def test_create_space_non_admin_forbidden(client: AsyncClient, user_token: str):
    resp = await client.post(
        "/api/v1/spaces",
        json={"name": "New Library", "type": "library", "capacity": 20},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_get_space_detail_includes_seats(
    client: AsyncClient, user_token: str, library_seat: Seat
):
    space_id = library_seat.space_id
    resp = await client.get(
        f"/api/v1/spaces/{space_id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    # Space-level contract fields
    assert data["id"] == str(space_id)
    assert "name" in data
    assert "type" in data
    assert "capacity" in data
    assert "layout_config" in data
    assert "created_at" in data
    # Embedded seats
    assert "seats" in data
    assert isinstance(data["seats"], list)
    assert len(data["seats"]) == 1
    seat = data["seats"][0]
    assert "id" in seat
    assert "label" in seat
    assert "position" in seat
    assert "status" in seat


@pytest.mark.asyncio
async def test_get_space_detail_no_seats(
    client: AsyncClient, user_token: str, library_space: Space
):
    resp = await client.get(
        f"/api/v1/spaces/{library_space.id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["seats"] == []


@pytest.mark.asyncio
async def test_update_space(client: AsyncClient, admin_token: str, library_space: Space):
    resp = await client.put(
        f"/api/v1/spaces/{library_space.id}",
        json={"name": "Updated Library"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated Library"


@pytest.mark.asyncio
async def test_delete_space(client: AsyncClient, admin_token: str, library_space: Space):
    resp = await client.delete(
        f"/api/v1/spaces/{library_space.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_get_rules(client: AsyncClient, user_token: str, library_space: Space):
    resp = await client.get(
        f"/api/v1/spaces/{library_space.id}/rules",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["max_duration_minutes"] == 480
    assert data["time_unit"] == "hourly"


@pytest.mark.asyncio
async def test_update_rules(client: AsyncClient, admin_token: str, library_space: Space):
    resp = await client.put(
        f"/api/v1/spaces/{library_space.id}/rules",
        json={"max_duration_minutes": 120},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["max_duration_minutes"] == 120


@pytest.mark.asyncio
async def test_upload_floor_plan(client: AsyncClient, admin_token: str, library_space: Space):
    fake_png = io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"\x00" * 100)
    resp = await client.post(
        f"/api/v1/spaces/{library_space.id}/floor-plan",
        files={"file": ("floor.png", fake_png, "image/png")},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["layout_config"] is not None
    assert "background_image" in data["layout_config"]
    assert str(library_space.id) in data["layout_config"]["background_image"]


@pytest.mark.asyncio
async def test_upload_floor_plan_wrong_type(
    client: AsyncClient, admin_token: str, library_space: Space
):
    resp = await client.post(
        f"/api/v1/spaces/{library_space.id}/floor-plan",
        files={"file": ("doc.pdf", io.BytesIO(b"%PDF"), "application/pdf")},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_delete_floor_plan(client: AsyncClient, admin_token: str, library_space: Space):
    # Upload first
    fake_png = io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"\x00" * 100)
    await client.post(
        f"/api/v1/spaces/{library_space.id}/floor-plan",
        files={"file": ("floor.png", fake_png, "image/png")},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    # Now delete
    resp = await client.delete(
        f"/api/v1/spaces/{library_space.id}/floor-plan",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["layout_config"] is None or "background_image" not in (data["layout_config"] or {})


# ---------------------------------------------------------------------------
# Helpers shared by the nearby-spaces tests
# ---------------------------------------------------------------------------

def _future_window(hours_from_now: int = 2) -> tuple[str, str]:
    """Return an (start_time, end_time) pair as ISO strings."""
    base = datetime.now(UTC) + timedelta(hours=hours_from_now)
    return base.isoformat(), (base + timedelta(hours=1)).isoformat()


async def _make_geo_space(
    db: AsyncSession,
    building: Building,
    name: str = "Geo Library",
    space_type: str = "library",
    capacity: int = 5,
    n_seats: int = 2,
) -> tuple[Space, list[Seat]]:
    """Create a space attached to *building* with *n_seats* available seats."""
    space = Space(
        name=name, type=space_type, capacity=capacity, building_id=building.id
    )
    db.add(space)
    await db.flush()
    rules = SpaceRules(
        space_id=space.id,
        max_duration_minutes=480,
        max_advance_days=3,
        time_unit="hourly",
        auto_release_minutes=15,
    )
    db.add(rules)
    seats = []
    for i in range(n_seats):
        seat = Seat(space_id=space.id, label=f"S{i+1}", position={"x": i * 30, "y": 0})
        db.add(seat)
        seats.append(seat)
    await db.commit()
    await db.refresh(space)
    for seat in seats:
        await db.refresh(seat)
    return space, seats


# ---------------------------------------------------------------------------
# Tests for GET /api/v1/spaces/nearby
# ---------------------------------------------------------------------------

# Sydney CBD: -33.8688, 151.2093  (used as the query origin in most tests)
# North Sydney: -33.8400, 151.2070  (~3.2 km north of CBD)
# Melbourne: -37.8136, 144.9631    (~714 km away)

SYDNEY = {"lat": -33.8688, "lng": 151.2093}


class TestNearbySpaces:
    async def test_nearby_requires_auth(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/spaces/nearby", params=SYDNEY)
        assert resp.status_code == 401

    async def test_nearby_missing_lat_returns_422(
        self, client: AsyncClient, user_token: str
    ) -> None:
        resp = await client.get(
            "/api/v1/spaces/nearby",
            params={"lng": 151.2093},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 422

    async def test_nearby_missing_lng_returns_422(
        self, client: AsyncClient, user_token: str
    ) -> None:
        resp = await client.get(
            "/api/v1/spaces/nearby",
            params={"lat": -33.8688},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 422

    async def test_nearby_invalid_lat_returns_422(
        self, client: AsyncClient, user_token: str
    ) -> None:
        resp = await client.get(
            "/api/v1/spaces/nearby",
            params={"lat": 200.0, "lng": 151.2093},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 422

    async def test_nearby_limit_above_max_returns_422(
        self, client: AsyncClient, user_token: str
    ) -> None:
        resp = await client.get(
            "/api/v1/spaces/nearby",
            params={**SYDNEY, "limit": 51},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 422

    async def test_nearby_start_without_end_returns_400(
        self, client: AsyncClient, user_token: str
    ) -> None:
        start, _ = _future_window()
        resp = await client.get(
            "/api/v1/spaces/nearby",
            params={**SYDNEY, "start_time": start},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 400

    async def test_nearby_end_without_start_returns_400(
        self, client: AsyncClient, user_token: str
    ) -> None:
        _, end = _future_window()
        resp = await client.get(
            "/api/v1/spaces/nearby",
            params={**SYDNEY, "end_time": end},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 400

    async def test_nearby_empty_when_no_buildings_with_coords(
        self, client: AsyncClient, user_token: str, library_space: Space
    ) -> None:
        """library_space has no building, so it should not appear."""
        resp = await client.get(
            "/api/v1/spaces/nearby",
            params=SYDNEY,
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_nearby_excludes_space_without_building(
        self,
        client: AsyncClient,
        user_token: str,
        db_session: AsyncSession,
        library_space: Space,
    ) -> None:
        """A space with no building_id is never returned."""
        # library_space has no building — should not appear
        resp = await client.get(
            "/api/v1/spaces/nearby",
            params=SYDNEY,
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 200
        ids = [item["space_id"] for item in resp.json()]
        assert str(library_space.id) not in ids

    async def test_nearby_excludes_space_in_building_without_coords(
        self,
        client: AsyncClient,
        user_token: str,
        db_session: AsyncSession,
    ) -> None:
        """Spaces whose building has no coordinates are silently excluded."""
        no_coord_bldg = Building(name="No-Coord Building", address="Nowhere")
        db_session.add(no_coord_bldg)
        await db_session.flush()
        space = Space(
            name="No-Coord Space",
            type="library",
            capacity=3,
            building_id=no_coord_bldg.id,
        )
        db_session.add(space)
        await db_session.commit()

        resp = await client.get(
            "/api/v1/spaces/nearby",
            params=SYDNEY,
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 200
        ids = [item["space_id"] for item in resp.json()]
        assert str(space.id) not in ids

    async def test_nearby_returns_expected_fields(
        self,
        client: AsyncClient,
        user_token: str,
        db_session: AsyncSession,
    ) -> None:
        bldg = Building(
            name="CBD Building", address="1 CBD St", latitude=-33.8688, longitude=151.2093
        )
        db_session.add(bldg)
        await db_session.flush()
        await _make_geo_space(db_session, bldg)

        resp = await client.get(
            "/api/v1/spaces/nearby",
            params=SYDNEY,
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 1
        item = resp.json()[0]
        for field in (
            "space_id",
            "space_name",
            "space_type",
            "capacity",
            "building_id",
            "building_name",
            "building_address",
            "building_latitude",
            "building_longitude",
            "distance_km",
            "reason",
            "available_seat_count",
        ):
            assert field in item, f"missing field: {field}"

    async def test_nearby_distance_km_is_near_zero_at_same_coords(
        self,
        client: AsyncClient,
        user_token: str,
        db_session: AsyncSession,
    ) -> None:
        bldg = Building(
            name="Same-Spot", address="0 Zero St", latitude=-33.8688, longitude=151.2093
        )
        db_session.add(bldg)
        await db_session.flush()
        await _make_geo_space(db_session, bldg)

        resp = await client.get(
            "/api/v1/spaces/nearby",
            params=SYDNEY,
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()[0]["distance_km"] == pytest.approx(0.0, abs=0.01)

    async def test_nearby_reason_is_near_you_without_time_window(
        self,
        client: AsyncClient,
        user_token: str,
        db_session: AsyncSession,
    ) -> None:
        bldg = Building(name="NearYou", address="1 Near St", latitude=-33.8688, longitude=151.2093)
        db_session.add(bldg)
        await db_session.flush()
        await _make_geo_space(db_session, bldg)

        resp = await client.get(
            "/api/v1/spaces/nearby",
            params=SYDNEY,
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()[0]["reason"] == "near_you"

    async def test_nearby_reason_is_closest_available_with_time_window_and_free_seats(
        self,
        client: AsyncClient,
        user_token: str,
        db_session: AsyncSession,
    ) -> None:
        bldg = Building(name="Avail", address="1 Avail St", latitude=-33.8688, longitude=151.2093)
        db_session.add(bldg)
        await db_session.flush()
        await _make_geo_space(db_session, bldg, n_seats=2)

        start, end = _future_window()
        resp = await client.get(
            "/api/v1/spaces/nearby",
            params={**SYDNEY, "start_time": start, "end_time": end},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 200
        item = resp.json()[0]
        assert item["reason"] == "closest_available"
        assert item["available_seat_count"] >= 1

    async def test_nearby_reason_is_near_you_when_all_seats_booked(
        self,
        client: AsyncClient,
        user_token: str,
        db_session: AsyncSession,
        regular_user: object,
    ) -> None:
        """When the only seat is booked in the window, reason falls back to near_you."""
        bldg = Building(name="Full", address="2 Full St", latitude=-33.8688, longitude=151.2093)
        db_session.add(bldg)
        await db_session.flush()
        _, seats = await _make_geo_space(db_session, bldg, n_seats=1)
        seat = seats[0]

        # Book the sole seat in the target window
        start_dt = datetime.now(UTC) + timedelta(hours=2)
        end_dt = start_dt + timedelta(hours=1)
        booking = Booking(
            user_id=regular_user.id,  # type: ignore[union-attr]
            seat_id=seat.id,
            start_time=start_dt,
            end_time=end_dt,
            status="confirmed",
        )
        db_session.add(booking)
        await db_session.commit()

        resp = await client.get(
            "/api/v1/spaces/nearby",
            params={
                **SYDNEY,
                "start_time": start_dt.isoformat(),
                "end_time": end_dt.isoformat(),
            },
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 200
        item = resp.json()[0]
        assert item["reason"] == "near_you"
        assert item["available_seat_count"] == 0

    async def test_nearby_available_spaces_rank_above_full_spaces(
        self,
        client: AsyncClient,
        user_token: str,
        db_session: AsyncSession,
        regular_user: object,
    ) -> None:
        """With a time window, a farther available space should outrank a closer full one."""
        # Close building — but its space will be fully booked
        close_bldg = Building(
            name="Close Full", address="3 Close St", latitude=-33.8690, longitude=151.2093
        )
        # Farther building — its space has free seats
        far_bldg = Building(
            name="Far Avail", address="4 Far St", latitude=-33.8400, longitude=151.2070
        )
        db_session.add(close_bldg)
        db_session.add(far_bldg)
        await db_session.flush()

        _, close_seats = await _make_geo_space(db_session, close_bldg, n_seats=1)
        await _make_geo_space(db_session, far_bldg, n_seats=2)

        start_dt = datetime.now(UTC) + timedelta(hours=2)
        end_dt = start_dt + timedelta(hours=1)

        # Book the sole seat in the close space
        booking = Booking(
            user_id=regular_user.id,  # type: ignore[union-attr]
            seat_id=close_seats[0].id,
            start_time=start_dt,
            end_time=end_dt,
            status="confirmed",
        )
        db_session.add(booking)
        await db_session.commit()

        resp = await client.get(
            "/api/v1/spaces/nearby",
            params={
                **SYDNEY,
                "start_time": start_dt.isoformat(),
                "end_time": end_dt.isoformat(),
            },
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 200
        results = resp.json()
        assert len(results) == 2
        # Far available space should appear first
        assert results[0]["reason"] == "closest_available"
        assert results[1]["reason"] == "near_you"

    async def test_nearby_nearest_first_within_same_reason(
        self,
        client: AsyncClient,
        user_token: str,
        db_session: AsyncSession,
    ) -> None:
        """Without a time window, results are ordered nearest-first."""
        close_bldg = Building(
            name="Close", address="5 Close St", latitude=-33.8688, longitude=151.2093
        )
        far_bldg = Building(
            name="Far", address="6 Far St", latitude=-37.8136, longitude=144.9631
        )
        db_session.add(close_bldg)
        db_session.add(far_bldg)
        await db_session.flush()
        await _make_geo_space(db_session, close_bldg, name="Close Space")
        await _make_geo_space(db_session, far_bldg, name="Far Space")

        resp = await client.get(
            "/api/v1/spaces/nearby",
            params=SYDNEY,
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 200
        results = resp.json()
        assert len(results) == 2
        assert results[0]["distance_km"] < results[1]["distance_km"]
        assert results[0]["space_name"] == "Close Space"

    async def test_nearby_type_filter(
        self,
        client: AsyncClient,
        user_token: str,
        db_session: AsyncSession,
    ) -> None:
        bldg = Building(
            name="Mixed", address="7 Mixed St", latitude=-33.8688, longitude=151.2093
        )
        db_session.add(bldg)
        await db_session.flush()
        await _make_geo_space(db_session, bldg, name="Library Space", space_type="library")
        await _make_geo_space(db_session, bldg, name="Office Space", space_type="office")

        resp = await client.get(
            "/api/v1/spaces/nearby",
            params={**SYDNEY, "type": "office"},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 200
        results = resp.json()
        assert all(r["space_type"] == "office" for r in results)

    async def test_nearby_limit_caps_results(
        self,
        client: AsyncClient,
        user_token: str,
        db_session: AsyncSession,
    ) -> None:
        bldg = Building(
            name="Many", address="8 Many St", latitude=-33.8688, longitude=151.2093
        )
        db_session.add(bldg)
        await db_session.flush()
        for i in range(5):
            await _make_geo_space(
                db_session, bldg, name=f"Space {i}", capacity=2, n_seats=0
            )

        resp = await client.get(
            "/api/v1/spaces/nearby",
            params={**SYDNEY, "limit": 3},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 3
