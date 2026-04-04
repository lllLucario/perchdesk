import uuid
from datetime import datetime

from pydantic import BaseModel


class FavoriteSpaceResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    space_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class FavoriteSeatResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    seat_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}
