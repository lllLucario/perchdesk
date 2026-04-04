from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking
from app.models.building import Building
from app.models.seat import Seat
from app.models.space import Space
from app.models.space_rules import SpaceRules
from app.models.user import User


def _next_hour() -> datetime:
    """Return the next whole UTC hour boundary (always in the future)."""
    now = datetime.now(UTC)
    return (now + timedelta(hours=1)).replace(minute=0, second=0, microsecond=0)


def future(hours: int = 1) -> str:
    return (_next_hour() + timedelta(hours=hours - 1)).isoformat()


def future_naive(hours: int = 1) -> str:
    return (_next_hour() + timedelta(hours=hours - 1)).replace(tzinfo=None).isoformat()


def future_dt(hours: int = 1) -> datetime:
    return _next_hour() + timedelta(hours=hours - 1)


@pytest.mark.asyncio
async def test_create_booking(
    client: AsyncClient, user_token: str, library_seat: Seat
):
    resp = await client.post(
        "/api/v1/bookings",
        json={
            "seat_id": str(library_seat.id),
            "start_time": future(1),
            "end_time": future(2),
        },
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "confirmed"
    assert data["seat_id"] == str(library_seat.id)
    # Enriched fields
    assert data["seat_label"] == "A1"
    assert data["space_name"] == "Test Library"
    assert data["building_name"] is None  # library_space has no building in fixture
    assert "seat_position" in data
    assert "space_layout_config" in data


@pytest.mark.asyncio
async def test_create_booking_with_naive_datetimes(
    client: AsyncClient, user_token: str, library_seat: Seat
):
    resp = await client.post(
        "/api/v1/bookings",
        json={
            "seat_id": str(library_seat.id),
            "start_time": future_naive(1),
            "end_time": future_naive(2),
        },
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "confirmed"
    assert data["seat_id"] == str(library_seat.id)


@pytest.mark.asyncio
async def test_booking_conflict(
    client: AsyncClient, user_token: str, library_seat: Seat, db_session: AsyncSession,
    admin_user: User
):
    # Another user (admin) holds a booking on the same seat/time
    booking = Booking(
        user_id=admin_user.id,
        seat_id=library_seat.id,
        start_time=future_dt(1),
        end_time=future_dt(2),
        status="confirmed",
    )
    db_session.add(booking)
    await db_session.commit()

    # regular_user tries to book the same seat — should conflict (409), not rule violation
    resp = await client.post(
        "/api/v1/bookings",
        json={
            "seat_id": str(library_seat.id),
            "start_time": future(1),
            "end_time": future(2),
        },
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_booking_exceeds_max_duration(
    client: AsyncClient, user_token: str, library_seat: Seat
):
    # Library max is 480 min = 8 hours; try 11 hours.
    # Using 11 UTC hours ensures the wall-clock duration exceeds 480 min even
    # on DST fall-back days when the clock goes back 1 hour (11 UTC hours
    # = 10 wall-clock hours = 600 min > 480 min).
    resp = await client.post(
        "/api/v1/bookings",
        json={
            "seat_id": str(library_seat.id),
            "start_time": future(1),
            "end_time": future(12),
        },
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "RULE_VIOLATION"


@pytest.mark.asyncio
async def test_booking_too_far_in_advance(
    client: AsyncClient, user_token: str, library_seat: Seat
):
    # Library max is 3 days; try 5 days ahead (aligned to hour boundary)
    far_future = _next_hour() + timedelta(days=5)
    resp = await client.post(
        "/api/v1/bookings",
        json={
            "seat_id": str(library_seat.id),
            "start_time": far_future.isoformat(),
            "end_time": (far_future + timedelta(hours=1)).isoformat(),
        },
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "RULE_VIOLATION"


@pytest.mark.asyncio
async def test_list_my_bookings(
    client: AsyncClient, user_token: str, library_seat: Seat
):
    # Create a booking first
    await client.post(
        "/api/v1/bookings",
        json={
            "seat_id": str(library_seat.id),
            "start_time": future(1),
            "end_time": future(2),
        },
        headers={"Authorization": f"Bearer {user_token}"},
    )
    resp = await client.get(
        "/api/v1/bookings", headers={"Authorization": f"Bearer {user_token}"}
    )
    assert resp.status_code == 200
    bookings = resp.json()
    assert len(bookings) == 1
    # Enriched fields present in list response
    b = bookings[0]
    assert b["seat_label"] == "A1"
    assert b["space_name"] == "Test Library"
    assert b["building_name"] is None


@pytest.mark.asyncio
async def test_cancel_booking(
    client: AsyncClient, user_token: str, library_seat: Seat
):
    create_resp = await client.post(
        "/api/v1/bookings",
        json={
            "seat_id": str(library_seat.id),
            "start_time": future(2),
            "end_time": future(3),
        },
        headers={"Authorization": f"Bearer {user_token}"},
    )
    booking_id = create_resp.json()["id"]

    cancel_resp = await client.patch(
        f"/api/v1/bookings/{booking_id}/cancel",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "cancelled"


@pytest.mark.asyncio
async def test_admin_list_all_bookings(
    client: AsyncClient, admin_token: str, user_token: str, library_seat: Seat
):
    await client.post(
        "/api/v1/bookings",
        json={
            "seat_id": str(library_seat.id),
            "start_time": future(1),
            "end_time": future(2),
        },
        headers={"Authorization": f"Bearer {user_token}"},
    )
    resp = await client.get(
        "/api/v1/admin/bookings",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


@pytest.mark.asyncio
async def test_admin_bookings_forbidden_for_user(client: AsyncClient, user_token: str):
    resp = await client.get(
        "/api/v1/admin/bookings",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_booking_enriched_building_name(
    client: AsyncClient,
    user_token: str,
    db_session: AsyncSession,
):
    """Booking for a space linked to a building should return building_name."""
    building = Building(name="Main Campus", address="1 University Ave")
    db_session.add(building)
    await db_session.flush()

    space = Space(
        building_id=building.id, name="Office Floor 3", type="office", capacity=20
    )
    db_session.add(space)
    await db_session.flush()

    rules = SpaceRules(
        space_id=space.id,
        max_duration_minutes=480,
        max_advance_days=7,
        time_unit="hourly",
        auto_release_minutes=None,
    )
    db_session.add(rules)
    await db_session.flush()

    seat = Seat(space_id=space.id, label="B5", position={"x": 120, "y": 90})
    db_session.add(seat)
    await db_session.commit()

    resp = await client.post(
        "/api/v1/bookings",
        json={
            "seat_id": str(seat.id),
            "start_time": future(1),
            "end_time": future(2),
        },
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["seat_label"] == "B5"
    assert data["space_name"] == "Office Floor 3"
    assert data["building_name"] == "Main Campus"
    assert data["building_id"] is not None
