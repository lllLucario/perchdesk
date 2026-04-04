import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class FavoriteSpace(Base):
    __tablename__ = "favorite_spaces"
    __table_args__ = (
        UniqueConstraint("user_id", "space_id", name="uq_favorite_spaces_user_space"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    space_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped["User"] = relationship("User")  # noqa: F821
    space: Mapped["Space"] = relationship("Space")  # noqa: F821


class FavoriteSeat(Base):
    __tablename__ = "favorite_seats"
    __table_args__ = (
        UniqueConstraint("user_id", "seat_id", name="uq_favorite_seats_user_seat"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    seat_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("seats.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped["User"] = relationship("User")  # noqa: F821
    seat: Mapped["Seat"] = relationship("Seat")  # noqa: F821
