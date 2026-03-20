import pytest
from httpx import AsyncClient

from app.models.user import User


@pytest.mark.asyncio
async def test_register(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "new@test.com", "name": "New User", "password": "pass1234"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "new@test.com"
    assert data["role"] == "user"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient, regular_user: User):
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "user@test.com", "name": "Dup", "password": "pass1234"},
    )
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "DUPLICATE"


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, regular_user: User):
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "user@test.com", "password": "password123"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, regular_user: User):
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "user@test.com", "password": "wrong"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token(client: AsyncClient, regular_user: User):
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "user@test.com", "password": "password123"},
    )
    refresh_token = login_resp.json()["refresh_token"]
    resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_me(client: AsyncClient, user_token: str):
    resp = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {user_token}"}
    )
    assert resp.status_code == 200
    assert resp.json()["email"] == "user@test.com"


@pytest.mark.asyncio
async def test_me_no_token(client: AsyncClient):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code in (401, 403)  # FastAPI HTTPBearer returns 403 by default


@pytest.mark.asyncio
async def test_me_invalid_token(client: AsyncClient):
    resp = await client.get(
        "/api/v1/auth/me", headers={"Authorization": "Bearer not.a.valid.jwt"}
    )
    assert resp.status_code == 401
