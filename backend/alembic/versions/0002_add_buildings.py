"""Add buildings table and link spaces

Revision ID: 0002
Revises: 0001
Create Date: 2026-03-24

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "buildings",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("address", sa.String(500), nullable=False),
        sa.Column("description", sa.String(1000), nullable=True),
        sa.Column("opening_hours", postgresql.JSONB(), nullable=True),
        sa.Column("facilities", postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.add_column(
        "spaces",
        sa.Column("building_id", sa.UUID(), nullable=True),
    )
    op.add_column(
        "spaces",
        sa.Column("description", sa.String(1000), nullable=True),
    )
    op.create_foreign_key(
        "fk_spaces_building_id",
        "spaces",
        "buildings",
        ["building_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_spaces_building_id", "spaces", ["building_id"])


def downgrade() -> None:
    op.drop_index("ix_spaces_building_id", table_name="spaces")
    op.drop_constraint("fk_spaces_building_id", "spaces", type_="foreignkey")
    op.drop_column("spaces", "description")
    op.drop_column("spaces", "building_id")
    op.drop_table("buildings")
