"""Add space_visits table for floorplan-entry recency tracking

Revision ID: 0007
Revises: 0006
Create Date: 2026-04-05

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0007"
down_revision: str | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "space_visits",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("space_id", sa.Uuid(), nullable=False),
        sa.Column(
            "visited_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["space_id"], ["spaces.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "space_id", name="uq_space_visits_user_space"),
    )
    op.create_index("ix_space_visits_user_id", "space_visits", ["user_id"])
    op.create_index("ix_space_visits_space_id", "space_visits", ["space_id"])


def downgrade() -> None:
    op.drop_index("ix_space_visits_space_id", table_name="space_visits")
    op.drop_index("ix_space_visits_user_id", table_name="space_visits")
    op.drop_table("space_visits")
