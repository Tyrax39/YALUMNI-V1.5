"""Create community post engagement tables.

Revision ID: 20260507_0011
Revises: 20260506_0010
Create Date: 2026-05-07
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260507_0011"
down_revision: str | None = "20260506_0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "community_post_comments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("post_id", sa.Uuid(), nullable=False),
        sa.Column("author_user_id", sa.Uuid(), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("removed_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("removed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["author_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["post_id"], ["community_posts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["removed_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_community_post_comments_author_created",
        "community_post_comments",
        ["author_user_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_community_post_comments_post_status_created",
        "community_post_comments",
        ["post_id", "status", "created_at"],
        unique=False,
    )
    op.create_table(
        "community_post_reactions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("post_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("reaction_type", sa.String(length=40), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["post_id"], ["community_posts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("post_id", "user_id", name="uq_community_post_reaction_user"),
    )
    op.create_index(
        "ix_community_post_reactions_post_type",
        "community_post_reactions",
        ["post_id", "reaction_type"],
        unique=False,
    )
    op.create_index(
        "ix_community_post_reactions_user",
        "community_post_reactions",
        ["user_id"],
        unique=False,
    )
    op.create_table(
        "community_post_reports",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("post_id", sa.Uuid(), nullable=False),
        sa.Column("reporter_user_id", sa.Uuid(), nullable=True),
        sa.Column("reason", sa.String(length=80), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("resolved_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["post_id"], ["community_posts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reporter_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["resolved_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_community_post_reports_post_status",
        "community_post_reports",
        ["post_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_community_post_reports_reporter_status",
        "community_post_reports",
        ["reporter_user_id", "status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_community_post_reports_reporter_status", table_name="community_post_reports")
    op.drop_index("ix_community_post_reports_post_status", table_name="community_post_reports")
    op.drop_table("community_post_reports")
    op.drop_index("ix_community_post_reactions_user", table_name="community_post_reactions")
    op.drop_index("ix_community_post_reactions_post_type", table_name="community_post_reactions")
    op.drop_table("community_post_reactions")
    op.drop_index(
        "ix_community_post_comments_post_status_created",
        table_name="community_post_comments",
    )
    op.drop_index(
        "ix_community_post_comments_author_created",
        table_name="community_post_comments",
    )
    op.drop_table("community_post_comments")
