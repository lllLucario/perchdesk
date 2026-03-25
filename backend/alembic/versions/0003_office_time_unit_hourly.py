"""Set office space rules to hourly

Revision ID: 0003
Revises: 0002
Create Date: 2026-03-25

"""
from collections.abc import Sequence

from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE space_rules
        SET time_unit = 'hourly'
        WHERE space_id IN (
            SELECT id
            FROM spaces
            WHERE type = 'office'
        )
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE space_rules
        SET time_unit = 'half_day'
        WHERE space_id IN (
            SELECT id
            FROM spaces
            WHERE type = 'office'
        )
        """
    )
