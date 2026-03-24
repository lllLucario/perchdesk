import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.schemas.seat import SeatResponse


class SpaceCreate(BaseModel):
    name: str
    type: str
    capacity: int
    layout_config: dict[str, Any] | None = None


class SpaceUpdate(BaseModel):
    name: str | None = None
    capacity: int | None = None
    layout_config: dict[str, Any] | None = None


class SpaceResponse(BaseModel):
    """Minimal shape used in list responses."""

    id: uuid.UUID
    building_id: uuid.UUID | None
    name: str
    type: str
    description: str | None
    capacity: int
    layout_config: dict[str, Any] | None
    created_at: datetime

    model_config = {"from_attributes": True}


class SpaceDetailResponse(SpaceResponse):
    """Full detail shape including embedded seats."""

    seats: list[SeatResponse] = []
