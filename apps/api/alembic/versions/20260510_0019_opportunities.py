"""Add opportunities marketplace review flow.

Revision ID: 20260510_0019
Revises: 20260508_0018
Create Date: 2026-05-10
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260510_0019"
down_revision: str | None = "20260508_0018"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "opportunities",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("reviewed_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("organization", sa.String(length=180), nullable=False),
        sa.Column(
            "opportunity_type",
            sa.String(length=80),
            nullable=False,
            server_default="FELLOWSHIP",
        ),
        sa.Column("location", sa.String(length=160), nullable=True),
        sa.Column("country", sa.String(length=80), nullable=True),
        sa.Column("remote_policy", sa.String(length=40), nullable=False, server_default="HYBRID"),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("application_url", sa.String(length=500), nullable=True),
        sa.Column("deadline_at", sa.DateTime(timezone=True), nullable=True),
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
        "ix_opportunities_creator_status",
        "opportunities",
        ["created_by_user_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_opportunities_status_created",
        "opportunities",
        ["status", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_opportunities_type_country",
        "opportunities",
        ["opportunity_type", "country"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_opportunities_type_country", table_name="opportunities")
    op.drop_index("ix_opportunities_status_created", table_name="opportunities")
    op.drop_index("ix_opportunities_creator_status", table_name="opportunities")
    op.drop_table("opportunities")
