from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking
from app.models.seat import Seat
from app.models.user import User


def future(hours: int = 1) -> str:
    return (datetime.now(UTC) + timedelta(hours=hours)).isoformat()


def future_dt(hours: int = 1) -> datetime:
    return datetime.now(UTC) + timedelta(hours=hours)


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


@pytest.mark.asyncio
async def test_booking_conflict(
    client: AsyncClient, user_token: str, library_seat: Seat, db_session: AsyncSession,
    regular_user: User
):
    # Create first booking directly
    booking = Booking(
        user_id=regular_user.id,
        seat_id=library_seat.id,
        start_time=future_dt(1),
        end_time=future_dt(2),
        status="confirmed",
    )
    db_session.add(booking)
    await db_session.commit()

    # Try to create overlapping booking
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
    # Library max is 240 min = 4 hours; try 5 hours
    resp = await client.post(
        "/api/v1/bookings",
        json={
            "seat_id": str(library_seat.id),
            "start_time": future(1),
            "end_time": future(6),
        },
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "RULE_VIOLATION"


@pytest.mark.asyncio
async def test_booking_too_far_in_advance(
    client: AsyncClient, user_token: str, library_seat: Seat
):
    # Library max is 3 days; try 5 days ahead
    far_future = datetime.now(UTC) + timedelta(days=5)
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
    assert len(resp.json()) == 1


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
