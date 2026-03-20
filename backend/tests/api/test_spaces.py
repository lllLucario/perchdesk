import io

import pytest
from httpx import AsyncClient

from app.models.seat import Seat
from app.models.space import Space


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
    assert data["max_duration_minutes"] == 240
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
