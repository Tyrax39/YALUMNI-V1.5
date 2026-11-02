"""Add success story publishing review flow.

Revision ID: 20260512_0021
Revises: 20260512_0020
Create Date: 2026-05-12
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260512_0021"
down_revision: str | None = "20260512_0020"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "success_stories",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("reviewed_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("summary", sa.String(length=500), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("country", sa.String(length=80), nullable=True),
        sa.Column("sector", sa.String(length=120), nullable=True),
        sa.Column("program", sa.String(length=120), nullable=True),
        sa.Column("cohort_year", sa.Integer(), nullable=True),
        sa.Column("beneficiary_count", sa.Integer(), nullable=True),
        sa.Column("impact_metric", sa.String(length=180), nullable=True),
        sa.Column("media_url", sa.String(length=500), nullable=True),
        sa.Column("external_url", sa.String(length=500), nullable=True),
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
        "ix_success_stories_country_sector",
        "success_stories",
        ["country", "sector"],
        unique=False,
    )
    op.create_index(
        "ix_success_stories_creator_status",
        "success_stories",
        ["created_by_user_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_success_stories_status_created",
        "success_stories",
        ["status", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_success_stories_status_created", table_name="success_stories")
    op.drop_index("ix_success_stories_creator_status", table_name="success_stories")
    op.drop_index("ix_success_stories_country_sector", table_name="success_stories")
    op.drop_table("success_stories")
