"""Create notifications.

Revision ID: 20260507_0013
Revises: 20260507_0012
Create Date: 2026-05-07
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260507_0013"
down_revision: str | None = "20260507_0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("actor_user_id", sa.Uuid(), nullable=True),
        sa.Column("event_type", sa.String(length=100), nullable=False),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("target_url", sa.String(length=500), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_notifications_event_created",
        "notifications",
        ["event_type", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_notifications_user_read_created",
        "notifications",
        ["user_id", "read_at", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_notifications_user_read_created", table_name="notifications")
    op.drop_index("ix_notifications_event_created", table_name="notifications")
    op.drop_table("notifications")
