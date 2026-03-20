from datetime import UTC, datetime

import pytest
from httpx import AsyncClient

from app.models.booking import Booking
from app.models.seat import Seat
from app.models.space import Space
from app.models.user import User


@pytest.mark.asyncio
async def test_list_seats(client: AsyncClient, user_token: str, library_seat: Seat):
    space_id = library_seat.space_id
    resp = await client.get(
        f"/api/v1/spaces/{space_id}/seats",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 200
    assert len(resp.json()) == 1


@pytest.mark.asyncio
async def test_create_seat(client: AsyncClient, admin_token: str, library_space: Space):
    resp = await client.post(
        f"/api/v1/spaces/{library_space.id}/seats",
        json={"label": "B1", "position": {"x": 120.0, "y": 60.0}},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 201
    assert resp.json()["label"] == "B1"


@pytest.mark.asyncio
async def test_batch_create_seats(client: AsyncClient, admin_token: str, library_space: Space):
    resp = await client.post(
        f"/api/v1/spaces/{library_space.id}/seats/batch",
        json={
            "seats": [
                {"label": "C1", "position": {"x": 60.0, "y": 150.0}},
                {"label": "C2", "position": {"x": 150.0, "y": 150.0}},
            ]
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 201
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_update_seat(client: AsyncClient, admin_token: str, library_seat: Seat):
    resp = await client.put(
        f"/api/v1/seats/{library_seat.id}",
        json={"status": "maintenance"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "maintenance"


@pytest.mark.asyncio
async def test_delete_seat(client: AsyncClient, admin_token: str, library_seat: Seat):
    resp = await client.delete(
        f"/api/v1/seats/{library_seat.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_availability_available(
    client: AsyncClient, user_token: str, library_seat: Seat
):
    space_id = library_seat.space_id
    resp = await client.get(
        f"/api/v1/spaces/{space_id}/availability"
        "?start=2030-01-01T09:00:00Z&end=2030-01-01T10:00:00Z",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["booking_status"] == "available"
    assert "id" in data[0]
    assert "label" in data[0]
    assert "position" in data[0]
    assert "status" in data[0]


@pytest.mark.asyncio
async def test_availability_my_booking(
    client: AsyncClient,
    user_token: str,
    library_seat: Seat,
    regular_user: User,
    db_session,
):
    booking = Booking(
        user_id=regular_user.id,
        seat_id=library_seat.id,
        start_time=datetime(2030, 1, 1, 9, 0, tzinfo=UTC),
        end_time=datetime(2030, 1, 1, 10, 0, tzinfo=UTC),
        status="confirmed",
    )
    db_session.add(booking)
    await db_session.commit()

    resp = await client.get(
        f"/api/v1/spaces/{library_seat.space_id}/availability"
        "?start=2030-01-01T09:00:00Z&end=2030-01-01T10:00:00Z",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data[0]["booking_status"] == "my_booking"


@pytest.mark.asyncio
async def test_availability_booked_by_other(
    client: AsyncClient,
    admin_token: str,
    library_seat: Seat,
    regular_user: User,
    db_session,
):
    booking = Booking(
        user_id=regular_user.id,
        seat_id=library_seat.id,
        start_time=datetime(2030, 1, 1, 9, 0, tzinfo=UTC),
        end_time=datetime(2030, 1, 1, 10, 0, tzinfo=UTC),
        status="confirmed",
    )
    db_session.add(booking)
    await db_session.commit()

    # Query as admin (different user from regular_user who owns the booking)
    resp = await client.get(
        f"/api/v1/spaces/{library_seat.space_id}/availability"
        "?start=2030-01-01T09:00:00Z&end=2030-01-01T10:00:00Z",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data[0]["booking_status"] == "booked"
