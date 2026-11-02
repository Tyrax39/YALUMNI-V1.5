"""Create verification request table.

Revision ID: 20260504_0004
Revises: 20260504_0003
Create Date: 2026-05-04
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260504_0004"
down_revision: str | None = "20260504_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "verification_requests",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("profile_id", sa.Uuid(), nullable=False),
        sa.Column("request_type", sa.String(length=60), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("submitted_note", sa.Text(), nullable=True),
        sa.Column("reviewer_note", sa.Text(), nullable=True),
        sa.Column("profile_snapshot", sa.JSON(), nullable=False),
        sa.Column("reviewed_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["profile_id"], ["alumni_profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reviewed_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_verification_requests_status_created",
        "verification_requests",
        ["status", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_verification_requests_profile_status",
        "verification_requests",
        ["profile_id", "status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_verification_requests_profile_status",
        table_name="verification_requests",
    )
    op.drop_index(
        "ix_verification_requests_status_created",
        table_name="verification_requests",
    )
    op.drop_table("verification_requests")
