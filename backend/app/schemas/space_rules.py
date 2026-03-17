import uuid
from typing import Any

from pydantic import BaseModel


class SpaceRulesResponse(BaseModel):
    id: uuid.UUID
    space_id: uuid.UUID
    max_duration_minutes: int
    max_advance_days: int
    time_unit: str
    auto_release_minutes: int | None
    requires_approval: bool
    recurring_rules: dict[str, Any] | None

    model_config = {"from_attributes": True}


class SpaceRulesUpdate(BaseModel):
    max_duration_minutes: int | None = None
    max_advance_days: int | None = None
    time_unit: str | None = None
    auto_release_minutes: int | None = None
    requires_approval: bool | None = None
    recurring_rules: dict[str, Any] | None = None
