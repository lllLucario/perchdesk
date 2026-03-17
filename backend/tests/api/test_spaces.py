import pytest
from httpx import AsyncClient

from app.models.space import Space


@pytest.mark.asyncio
async def test_list_spaces(client: AsyncClient, user_token: str, library_space: Space):
    resp = await client.get(
        "/api/v1/spaces", headers={"Authorization": f"Bearer {user_token}"}
    )
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


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
async def test_get_space(client: AsyncClient, user_token: str, library_space: Space):
    resp = await client.get(
        f"/api/v1/spaces/{library_space.id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["id"] == str(library_space.id)


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
