import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, model_validator


class BookingCreate(BaseModel):
    seat_id: uuid.UUID
    start_time: datetime
    end_time: datetime


class BookingResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    seat_id: uuid.UUID
    start_time: datetime
    end_time: datetime
    status: str
    checked_in_at: datetime | None
    created_at: datetime

    # Enriched context fields — populated via model_validator from ORM relationships
    seat_label: str
    seat_position: dict[str, Any]
    space_id: uuid.UUID
    space_name: str
    space_layout_config: dict[str, Any] | None
    building_id: uuid.UUID | None
    building_name: str | None

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def extract_nested(cls, v: Any) -> Any:
        """Flatten ORM relationships into response fields when given an ORM object."""
        if not isinstance(v, dict):
            seat = getattr(v, "seat", None)
            space = getattr(seat, "space", None) if seat else None
            building = getattr(space, "building", None) if space else None
            return {
                "id": v.id,
                "user_id": v.user_id,
                "seat_id": v.seat_id,
                "start_time": v.start_time,
                "end_time": v.end_time,
                "status": v.status,
                "checked_in_at": v.checked_in_at,
                "created_at": v.created_at,
                "seat_label": seat.label if seat else "",
                "seat_position": seat.position if seat else {},
                "space_id": space.id if space else v.seat_id,
                "space_name": space.name if space else "",
                "space_layout_config": space.layout_config if space else None,
                "building_id": building.id if building else None,
                "building_name": building.name if building else None,
            }
        return v
