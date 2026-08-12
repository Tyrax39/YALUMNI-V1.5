"""Create notification preferences.

Revision ID: 20260507_0015
Revises: 20260507_0014
Create Date: 2026-05-07
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260507_0015"
down_revision: str | None = "20260507_0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "notification_preferences",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("in_app_enabled", sa.Boolean(), nullable=False),
        sa.Column("email_digest_frequency", sa.String(length=20), nullable=False),
        sa.Column("muted_event_types", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_notification_preferences_user",
        "notification_preferences",
        ["user_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_notification_preferences_user", table_name="notification_preferences")
    op.drop_table("notification_preferences")
