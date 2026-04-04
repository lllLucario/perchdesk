import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.favorite import FavoriteSeatResponse, FavoriteSpaceResponse
from app.services import favorite as favorite_service

router = APIRouter(tags=["favorites"])


@router.get("/me/favorite-spaces", response_model=list[FavoriteSpaceResponse])
async def list_favorite_spaces(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[FavoriteSpaceResponse]:
    return await favorite_service.list_favorite_spaces(db, current_user.id)  # type: ignore[return-value]


@router.post(
    "/spaces/{space_id}/favorite",
    response_model=FavoriteSpaceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_favorite_space(
    space_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FavoriteSpaceResponse:
    return await favorite_service.add_favorite_space(db, current_user.id, space_id)  # type: ignore[return-value]


@router.delete("/spaces/{space_id}/favorite", status_code=status.HTTP_204_NO_CONTENT)
async def remove_favorite_space(
    space_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    await favorite_service.remove_favorite_space(db, current_user.id, space_id)


@router.get("/me/favorite-seats", response_model=list[FavoriteSeatResponse])
async def list_favorite_seats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[FavoriteSeatResponse]:
    return await favorite_service.list_favorite_seats(db, current_user.id)  # type: ignore[return-value]


@router.post(
    "/seats/{seat_id}/favorite",
    response_model=FavoriteSeatResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_favorite_seat(
    seat_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FavoriteSeatResponse:
    return await favorite_service.add_favorite_seat(db, current_user.id, seat_id)  # type: ignore[return-value]


@router.delete("/seats/{seat_id}/favorite", status_code=status.HTTP_204_NO_CONTENT)
async def remove_favorite_seat(
    seat_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    await favorite_service.remove_favorite_seat(db, current_user.id, seat_id)
