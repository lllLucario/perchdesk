import uuid
from datetime import datetime

from pydantic import BaseModel


class SpaceVisitResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    space_id: uuid.UUID
    visited_at: datetime

    model_config = {"from_attributes": True}
