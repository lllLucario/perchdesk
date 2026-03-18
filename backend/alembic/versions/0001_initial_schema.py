"""Initial schema

Revision ID: 0001
Revises:
Create Date: 2026-03-18

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Enable btree_gist for exclusion constraints
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")

    op.create_table(
        "users",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column(
            "role",
            sa.Enum("admin", "user", name="user_role"),
            nullable=False,
            server_default="user",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    op.create_table(
        "spaces",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column(
            "type", sa.Enum("library", "office", name="space_type"), nullable=False
        ),
        sa.Column("layout_config", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("capacity", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "seats",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("space_id", sa.UUID(), nullable=False),
        sa.Column("label", sa.String(50), nullable=False),
        sa.Column("position", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "status",
            sa.Enum("available", "maintenance", name="seat_status"),
            nullable=False,
            server_default="available",
        ),
        sa.Column("attributes", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(["space_id"], ["spaces.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_seats_space_id"), "seats", ["space_id"], unique=False)

    op.create_table(
        "space_rules",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("space_id", sa.UUID(), nullable=False),
        sa.Column("max_duration_minutes", sa.Integer(), nullable=False),
        sa.Column("max_advance_days", sa.Integer(), nullable=False),
        sa.Column(
            "time_unit",
            sa.Enum("hourly", "half_day", "full_day", name="time_unit"),
            nullable=False,
        ),
        sa.Column("auto_release_minutes", sa.Integer(), nullable=True),
        sa.Column(
            "requires_approval", sa.Boolean(), nullable=False, server_default="false"
        ),
        sa.Column("recurring_rules", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(["space_id"], ["spaces.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("space_id"),
    )

    op.create_table(
        "bookings",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("seat_id", sa.UUID(), nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "confirmed", "cancelled", "checked_in", "expired", name="booking_status"
            ),
            nullable=False,
            server_default="confirmed",
        ),
        sa.Column("checked_in_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["seat_id"], ["seats.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_bookings_user_id"), "bookings", ["user_id"], unique=False)
    op.create_index(op.f("ix_bookings_seat_id"), "bookings", ["seat_id"], unique=False)

    # Exclusion constraint: no overlapping active bookings on the same seat
    op.execute(
        """
        ALTER TABLE bookings ADD CONSTRAINT no_overlap
        EXCLUDE USING gist (
            seat_id WITH =,
            tstzrange(start_time, end_time) WITH &&
        )
        WHERE (status IN ('confirmed', 'checked_in'))
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE bookings DROP CONSTRAINT IF EXISTS no_overlap")
    op.drop_table("bookings")
    op.drop_table("space_rules")
    op.drop_table("seats")
    op.drop_table("spaces")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS booking_status")
    op.execute("DROP TYPE IF EXISTS seat_status")
    op.execute("DROP TYPE IF EXISTS time_unit")
    op.execute("DROP TYPE IF EXISTS space_type")
    op.execute("DROP TYPE IF EXISTS user_role")
