import uuid
from datetime import datetime
from typing import Any, Literal

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
    is_favorited: bool = False

    model_config = {"from_attributes": True}


class SpaceDetailResponse(SpaceResponse):
    """Full detail shape including embedded seats."""

    seats: list[SeatResponse] = []


class SpaceRecommendationResult(BaseModel):
    """A space returned from a nearby recommendation query.

    Carries distance context from the parent building and a single
    explanation reason for why the space is recommended.

    ``available_seat_count`` is the number of seats that are bookable:
    - When a time window is given: seats with no conflicting active booking.
    - Without a time window: seats whose status is ``available``.

    ``reason`` values:
    - ``"closest_available"`` — time window was provided and the space has
      at least one bookable seat in that window.
    - ``"near_you"`` — no time window was provided, or no seats are
      available in the requested window.
    """

    space_id: uuid.UUID
    space_name: str
    space_type: str
    capacity: int
    building_id: uuid.UUID
    building_name: str
    building_address: str
    building_latitude: float
    building_longitude: float
    distance_km: float
    reason: Literal["near_you", "closest_available"]
    available_seat_count: int
    is_favorited: bool = False
