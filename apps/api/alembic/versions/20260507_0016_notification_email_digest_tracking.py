"""Add notification email digest tracking.

Revision ID: 20260507_0016
Revises: 20260507_0015
Create Date: 2026-05-07
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260507_0016"
down_revision: str | None = "20260507_0015"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "notifications",
        sa.Column("email_digest_sent_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_notifications_user_digest_created",
        "notifications",
        ["user_id", "email_digest_sent_at", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_notifications_user_digest_created", table_name="notifications")
    op.drop_column("notifications", "email_digest_sent_at")
