"""Add resources publishing review flow.

Revision ID: 20260512_0020
Revises: 20260510_0019
Create Date: 2026-05-12
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260512_0020"
down_revision: str | None = "20260510_0019"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "resources",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("reviewed_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("resource_type", sa.String(length=80), nullable=False, server_default="GUIDE"),
        sa.Column("resource_format", sa.String(length=80), nullable=False, server_default="LINK"),
        sa.Column("topic", sa.String(length=120), nullable=True),
        sa.Column("country", sa.String(length=80), nullable=True),
        sa.Column("language", sa.String(length=80), nullable=True),
        sa.Column("external_url", sa.String(length=500), nullable=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column(
            "status",
            sa.String(length=40),
            nullable=False,
            server_default="PENDING_REVIEW",
        ),
        sa.Column("reviewer_note", sa.Text(), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["reviewed_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_resources_creator_status",
        "resources",
        ["created_by_user_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_resources_status_created",
        "resources",
        ["status", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_resources_type_topic",
        "resources",
        ["resource_type", "topic"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_resources_type_topic", table_name="resources")
    op.drop_index("ix_resources_status_created", table_name="resources")
    op.drop_index("ix_resources_creator_status", table_name="resources")
    op.drop_table("resources")
