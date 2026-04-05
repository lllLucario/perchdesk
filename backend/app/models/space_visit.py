import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class SpaceVisit(Base):
    """Tracks successful floorplan-entry events per user per space.

    Each row represents the most recent time a user successfully opened a
    space's floorplan page.  The ``visited_at`` column is updated on
    subsequent visits via upsert so there is at most one row per
    ``(user_id, space_id)`` pair.
    """

    __tablename__ = "space_visits"
    __table_args__ = (
        UniqueConstraint("user_id", "space_id", name="uq_space_visits_user_space"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    space_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    visited_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped["User"] = relationship("User")  # noqa: F821
    space: Mapped["Space"] = relationship("Space")  # noqa: F821
