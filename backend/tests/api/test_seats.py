import pytest
from httpx import AsyncClient

from app.models.seat import Seat
from app.models.space import Space


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
