import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DuplicateError, NotFoundError, UnauthorizedError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse

# Dummy hash used to keep constant-time comparison when the user does not exist,
# preventing timing-based user enumeration.
_DUMMY_HASH = hash_password("__timing_safe_dummy__")


async def register(db: AsyncSession, data: RegisterRequest) -> User:
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none() is not None:
        raise DuplicateError("Email already registered.")

    user = User(
        email=data.email,
        name=data.name,
        hashed_password=hash_password(data.password),
        role="user",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def login(db: AsyncSession, data: LoginRequest) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    # Always run verify_password to prevent timing-based user enumeration.
    stored_hash = user.hashed_password if user is not None else _DUMMY_HASH
    password_ok = verify_password(data.password, stored_hash)
    if user is None or not password_ok:
        raise UnauthorizedError("Invalid email or password.")

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


async def refresh_tokens(db: AsyncSession, refresh_token: str) -> TokenResponse:
    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise ValueError
    except ValueError:
        raise UnauthorizedError("Invalid refresh token.")

    try:
        user_id = uuid.UUID(payload["sub"])
    except (ValueError, KeyError):
        raise UnauthorizedError("Invalid refresh token.")

    user = await db.get(User, user_id)
    if user is None:
        raise NotFoundError("User not found.")

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )
