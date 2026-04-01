import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.core.exceptions import BookingRuleViolationError
from app.models.user import User
from app.schemas.building import (
    BuildingBoundsResult,
    BuildingCreate,
    BuildingNearbyResult,
    BuildingResponse,
    BuildingUpdate,
)
from app.schemas.space import SpaceResponse
from app.services import building as building_service

router = APIRouter(prefix="/buildings", tags=["buildings"])


@router.get("", response_model=list[BuildingResponse])
async def list_buildings(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[BuildingResponse]:
    return await building_service.list_buildings(db)  # type: ignore[return-value]


# NOTE: /nearby must be registered before /{building_id} so FastAPI does not
# attempt to coerce the literal string "nearby" as a UUID path parameter.
@router.get("/nearby", response_model=list[BuildingNearbyResult])
async def list_nearby_buildings(
    lat: float = Query(..., ge=-90, le=90, description="User latitude in decimal degrees"),
    lng: float = Query(..., ge=-180, le=180, description="User longitude in decimal degrees"),
    limit: int = Query(default=20, ge=1, le=50, description="Maximum number of results"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[BuildingNearbyResult]:
    pairs = await building_service.list_nearby_buildings(db, lat, lng, limit)
    return [
        BuildingNearbyResult(
            id=b.id,
            name=b.name,
            address=b.address,
            description=b.description,
            opening_hours=b.opening_hours,
            facilities=b.facilities,
            latitude=b.latitude,  # type: ignore[arg-type]
            longitude=b.longitude,  # type: ignore[arg-type]
            created_at=b.created_at,
            distance_km=round(dist, 3),
        )
        for b, dist in pairs
    ]


# NOTE: /within-bounds must be registered before /{building_id} so FastAPI does
# not attempt to coerce the literal string "within-bounds" as a UUID.
@router.get("/within-bounds", response_model=list[BuildingBoundsResult])
async def list_buildings_within_bounds(
    min_lat: float = Query(..., ge=-90, le=90, description="South edge of viewport"),
    min_lng: float = Query(..., ge=-180, le=180, description="West edge of viewport"),
    max_lat: float = Query(..., ge=-90, le=90, description="North edge of viewport"),
    max_lng: float = Query(..., ge=-180, le=180, description="East edge of viewport"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[BuildingBoundsResult]:
    if min_lat > max_lat:
        raise BookingRuleViolationError("min_lat must be less than or equal to max_lat")
    if min_lng > max_lng:
        raise BookingRuleViolationError("min_lng must be less than or equal to max_lng")
    buildings = await building_service.list_buildings_within_bounds(
        db, min_lat, min_lng, max_lat, max_lng
    )
    return [BuildingBoundsResult.model_validate(b) for b in buildings]


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


@router.put("/{building_id}", response_model=BuildingResponse)
async def update_building(
    building_id: uuid.UUID,
    data: BuildingUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> BuildingResponse:
    return await building_service.update_building(db, building_id, data)  # type: ignore[return-value]
