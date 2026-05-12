"""Add initiatives member workflow.

Revision ID: 20260512_0023
Revises: 20260512_0022
Create Date: 2026-05-12
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260512_0023"
down_revision: str | None = "20260512_0022"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "initiatives",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("summary", sa.String(length=500), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column(
            "focus_area",
            sa.String(length=80),
            nullable=False,
            server_default="COMMUNITY_IMPACT",
        ),
        sa.Column("stage", sa.String(length=60), nullable=False, server_default="IDEA"),
        sa.Column("country", sa.String(length=80), nullable=True),
        sa.Column("city", sa.String(length=120), nullable=True),
        sa.Column("partner_organization", sa.String(length=180), nullable=True),
        sa.Column("impact_goal", sa.String(length=500), nullable=True),
        sa.Column("support_needed", sa.Text(), nullable=True),
        sa.Column("target_beneficiaries", sa.Integer(), nullable=True),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="ACTIVE"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_initiatives_creator_status",
        "initiatives",
        ["created_by_user_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_initiatives_focus_country",
        "initiatives",
        ["focus_area", "country"],
        unique=False,
    )
    op.create_index(
        "ix_initiatives_status_created",
        "initiatives",
        ["status", "created_at"],
        unique=False,
    )

    op.create_table(
        "initiative_milestones",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("initiative_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="PLANNED"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["initiative_id"], ["initiatives.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_initiative_milestones_sort",
        "initiative_milestones",
        ["initiative_id", "sort_order"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_initiative_milestones_sort", table_name="initiative_milestones")
    op.drop_table("initiative_milestones")
    op.drop_index("ix_initiatives_status_created", table_name="initiatives")
    op.drop_index("ix_initiatives_focus_country", table_name="initiatives")
    op.drop_index("ix_initiatives_creator_status", table_name="initiatives")
    op.drop_table("initiatives")
