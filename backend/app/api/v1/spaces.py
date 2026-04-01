import os
import shutil
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.core.exceptions import BookingRuleViolationError
from app.models.user import User
from app.schemas.space import (
    SpaceCreate,
    SpaceDetailResponse,
    SpaceRecommendationResult,
    SpaceResponse,
    SpaceUpdate,
)
from app.schemas.space_rules import SpaceRulesResponse, SpaceRulesUpdate
from app.services import space as space_service
from app.services import space_rules as rules_service

router = APIRouter(prefix="/spaces", tags=["spaces"])

UPLOAD_DIR = "uploads/floor_plans"


@router.get("", response_model=list[SpaceResponse])
async def list_spaces(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list:
    return await space_service.list_spaces(db)


@router.post("", response_model=SpaceResponse, status_code=201)
async def create_space(
    data: SpaceCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> object:
    return await space_service.create_space(db, data)


# NOTE: /nearby must be registered before /{space_id} so FastAPI does not
# attempt to coerce the literal string "nearby" as a UUID path parameter.
@router.get("/nearby", response_model=list[SpaceRecommendationResult])
async def list_nearby_spaces(
    lat: float = Query(..., ge=-90, le=90, description="User latitude in decimal degrees"),
    lng: float = Query(..., ge=-180, le=180, description="User longitude in decimal degrees"),
    start_time: datetime | None = Query(
        default=None, description="Window start (ISO 8601); required together with end_time"
    ),
    end_time: datetime | None = Query(
        default=None, description="Window end (ISO 8601); required together with start_time"
    ),
    type: str | None = Query(
        default=None, pattern="^(library|office)$", description="Filter by space type"
    ),
    limit: int = Query(default=20, ge=1, le=50, description="Maximum number of results"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[SpaceRecommendationResult]:
    if (start_time is None) != (end_time is None):
        raise BookingRuleViolationError(
            "start_time and end_time must both be provided or both be omitted"
        )
    if start_time is not None and end_time is not None and end_time <= start_time:
        raise BookingRuleViolationError("end_time must be after start_time")
    return await space_service.list_nearby_spaces(
        db,
        lat=lat,
        lng=lng,
        start_time=start_time,
        end_time=end_time,
        space_type=type,
        limit=limit,
    )


@router.get("/{space_id}", response_model=SpaceDetailResponse)
async def get_space(
    space_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> object:
    return await space_service.get_space(db, space_id)


@router.put("/{space_id}", response_model=SpaceResponse)
async def update_space(
    space_id: uuid.UUID,
    data: SpaceUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> object:
    return await space_service.update_space(db, space_id, data)


@router.delete("/{space_id}", status_code=204)
async def delete_space(
    space_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> None:
    await space_service.delete_space(db, space_id)


@router.get("/{space_id}/rules", response_model=SpaceRulesResponse)
async def get_rules(
    space_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> object:
    return await rules_service.get_rules(db, space_id)


@router.put("/{space_id}/rules", response_model=SpaceRulesResponse)
async def update_rules(
    space_id: uuid.UUID,
    data: SpaceRulesUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> object:
    return await rules_service.update_rules(db, space_id, data)


@router.post("/{space_id}/floor-plan", response_model=SpaceResponse)
async def upload_floor_plan(
    space_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> object:
    if file.content_type not in ("image/png", "image/jpeg"):
        raise BookingRuleViolationError("Only PNG and JPEG images are accepted.")

    space = await space_service.get_space(db, space_id)

    ext = "png" if file.content_type == "image/png" else "jpg"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_path = f"{UPLOAD_DIR}/{space_id}.{ext}"

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    layout = dict(space.layout_config or {})
    layout["background_image"] = f"/uploads/floor_plans/{space_id}.{ext}"
    return await space_service.update_space(db, space_id, SpaceUpdate(layout_config=layout))


@router.delete("/{space_id}/floor-plan", response_model=SpaceResponse)
async def delete_floor_plan(
    space_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> object:
    space = await space_service.get_space(db, space_id)
    layout = dict(space.layout_config or {})
    bg = layout.pop("background_image", None)

    if bg:
        local_path = bg.lstrip("/")
        if os.path.exists(local_path):
            os.remove(local_path)

    return await space_service.update_space(db, space_id, SpaceUpdate(layout_config=layout or None))
