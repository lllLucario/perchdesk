import uuid
from typing import Any

from pydantic import BaseModel


class SeatCreate(BaseModel):
    label: str
    position: dict[str, float]
    attributes: dict[str, Any] | None = None


class SeatBatchCreate(BaseModel):
    seats: list[SeatCreate]


class SeatUpdate(BaseModel):
    label: str | None = None
    status: str | None = None
    attributes: dict[str, Any] | None = None


class SeatResponse(BaseModel):
    id: uuid.UUID
    space_id: uuid.UUID
    label: str
    position: dict[str, float]
    status: str
    attributes: dict[str, Any] | None

    model_config = {"from_attributes": True}


class SeatAvailabilityResponse(BaseModel):
    id: uuid.UUID
    label: str
    position: dict[str, float]
    status: str
    attributes: dict[str, Any] | None
    is_available: bool

    model_config = {"from_attributes": True}
