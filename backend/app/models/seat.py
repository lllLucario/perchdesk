import uuid
from typing import Any

from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.core.database import Base


class Seat(Base):
    __tablename__ = "seats"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    space_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    label: Mapped[str] = mapped_column(String(50), nullable=False)
    position: Mapped[dict[str, Any]] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        Enum("available", "maintenance", name="seat_status"),
        nullable=False,
        default="available",
    )
    attributes: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"), nullable=True
    )

    space: Mapped["Space"] = relationship("Space", back_populates="seats")  # noqa: F821
    bookings: Mapped[list["Booking"]] = relationship(  # noqa: F821
        "Booking", back_populates="seat", cascade="all, delete-orphan"
    )
