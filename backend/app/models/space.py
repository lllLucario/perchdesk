import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.core.database import Base


class Space(Base):
    __tablename__ = "spaces"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    building_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("buildings.id", ondelete="SET NULL"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(
        Enum("library", "office", name="space_type"), nullable=False
    )
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    layout_config: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"), nullable=True
    )
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    building: Mapped["Building | None"] = relationship(  # noqa: F821
        "Building", back_populates="spaces"
    )
    seats: Mapped[list["Seat"]] = relationship(  # noqa: F821
        "Seat", back_populates="space", cascade="all, delete-orphan"
    )
    rules: Mapped["SpaceRules | None"] = relationship(  # noqa: F821
        "SpaceRules", back_populates="space", uselist=False, cascade="all, delete-orphan"
    )
