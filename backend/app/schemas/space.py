import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


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
    id: uuid.UUID
    name: str
    type: str
    capacity: int
    layout_config: dict[str, Any] | None
    created_at: datetime

    model_config = {"from_attributes": True}
