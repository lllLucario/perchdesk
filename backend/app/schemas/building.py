import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class BuildingCreate(BaseModel):
    name: str
    address: str
    description: str | None = None
    opening_hours: dict[str, Any] | None = None
    facilities: list[Any] | None = None


class BuildingResponse(BaseModel):
    id: uuid.UUID
    name: str
    address: str
    description: str | None
    opening_hours: dict[str, Any] | None
    facilities: list[Any] | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
