import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.space_visit import SpaceVisitResponse
from app.services import space_visit as visit_service

router = APIRouter(tags=["space-visits"])


@router.post(
    "/spaces/{space_id}/visit",
    response_model=SpaceVisitResponse,
    status_code=201,
)
async def record_space_visit(
    space_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SpaceVisitResponse:
    """Record a successful floorplan-entry visit for the current user."""
    return await visit_service.record_visit(db, current_user.id, space_id)  # type: ignore[return-value]


@router.get("/me/recent-spaces", response_model=list[SpaceVisitResponse])
async def list_recent_spaces(
    limit: int = Query(default=10, ge=1, le=50, description="Maximum number of results"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SpaceVisitResponse]:
    """List the current user's most recently visited spaces."""
    return await visit_service.list_recent_visits(db, current_user.id, limit)  # type: ignore[return-value]
