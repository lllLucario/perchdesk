import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.models.user import User
from app.schemas.building import BuildingCreate, BuildingResponse
from app.schemas.space import SpaceResponse
from app.services import building as building_service

router = APIRouter(prefix="/buildings", tags=["buildings"])


@router.get("", response_model=list[BuildingResponse])
async def list_buildings(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[BuildingResponse]:
    return await building_service.list_buildings(db)  # type: ignore[return-value]


@router.get("/{building_id}", response_model=BuildingResponse)
async def get_building(
    building_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> BuildingResponse:
    return await building_service.get_building(db, building_id)  # type: ignore[return-value]


@router.get("/{building_id}/spaces", response_model=list[SpaceResponse])
async def list_building_spaces(
    building_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[SpaceResponse]:
    return await building_service.list_building_spaces(db, building_id)  # type: ignore[return-value]


@router.post("", response_model=BuildingResponse, status_code=201)
async def create_building(
    data: BuildingCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> BuildingResponse:
    return await building_service.create_building(db, data)  # type: ignore[return-value]
