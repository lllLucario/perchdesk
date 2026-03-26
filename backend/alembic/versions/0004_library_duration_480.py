"""Set library space duration cap to 480 minutes

Revision ID: 0004
Revises: 0003
Create Date: 2026-03-27

"""
from collections.abc import Sequence

from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE space_rules
        SET max_duration_minutes = 480
        WHERE max_duration_minutes = 240
          AND space_id IN (
            SELECT id
            FROM spaces
            WHERE type = 'library'
          )
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE space_rules
        SET max_duration_minutes = 240
        WHERE max_duration_minutes = 480
          AND space_id IN (
            SELECT id
            FROM spaces
            WHERE type = 'library'
          )
        """
    )
