"""Create community post media.

Revision ID: 20260507_0014
Revises: 20260507_0013
Create Date: 2026-05-07
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260507_0014"
down_revision: str | None = "20260507_0013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "community_post_media",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("post_id", sa.Uuid(), nullable=False),
        sa.Column("uploaded_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=120), nullable=False),
        sa.Column("file_size_bytes", sa.Integer(), nullable=False),
        sa.Column("storage_provider", sa.String(length=40), nullable=False),
        sa.Column("storage_key", sa.String(length=700), nullable=False),
        sa.Column("alt_text", sa.String(length=180), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("removed_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("removed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["post_id"], ["community_posts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["removed_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["uploaded_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_community_post_media_post_status",
        "community_post_media",
        ["post_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_community_post_media_uploader_created",
        "community_post_media",
        ["uploaded_by_user_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_community_post_media_uploader_created",
        table_name="community_post_media",
    )
    op.drop_index("ix_community_post_media_post_status", table_name="community_post_media")
    op.drop_table("community_post_media")
