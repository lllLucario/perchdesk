"""Add favorite_spaces and favorite_seats tables

Revision ID: 0006
Revises: 0005
Create Date: 2026-04-04

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "favorite_spaces",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("space_id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["space_id"], ["spaces.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "space_id", name="uq_favorite_spaces_user_space"),
    )
    op.create_index("ix_favorite_spaces_user_id", "favorite_spaces", ["user_id"])
    op.create_index("ix_favorite_spaces_space_id", "favorite_spaces", ["space_id"])

    op.create_table(
        "favorite_seats",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("seat_id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["seat_id"], ["seats.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "seat_id", name="uq_favorite_seats_user_seat"),
    )
    op.create_index("ix_favorite_seats_user_id", "favorite_seats", ["user_id"])
    op.create_index("ix_favorite_seats_seat_id", "favorite_seats", ["seat_id"])


def downgrade() -> None:
    op.drop_index("ix_favorite_seats_seat_id", table_name="favorite_seats")
    op.drop_index("ix_favorite_seats_user_id", table_name="favorite_seats")
    op.drop_table("favorite_seats")

    op.drop_index("ix_favorite_spaces_space_id", table_name="favorite_spaces")
    op.drop_index("ix_favorite_spaces_user_id", table_name="favorite_spaces")
    op.drop_table("favorite_spaces")
