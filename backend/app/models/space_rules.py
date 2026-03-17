import uuid
from typing import Any

from sqlalchemy import Boolean, Enum, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.core.database import Base


class SpaceRules(Base):
    __tablename__ = "space_rules"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    space_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("spaces.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    max_duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    max_advance_days: Mapped[int] = mapped_column(Integer, nullable=False)
    time_unit: Mapped[str] = mapped_column(
        Enum("hourly", "half_day", "full_day", name="time_unit"), nullable=False
    )
    auto_release_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    requires_approval: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    recurring_rules: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"), nullable=True
    )

    space: Mapped["Space"] = relationship("Space", back_populates="rules")  # noqa: F821
