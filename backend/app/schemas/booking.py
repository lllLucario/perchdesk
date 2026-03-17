import uuid
from datetime import datetime

from pydantic import BaseModel


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

    model_config = {"from_attributes": True}
