"""Create community tables.

Revision ID: 20260505_0008
Revises: 20260505_0007
Create Date: 2026-05-05
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260505_0008"
down_revision: str | None = "20260505_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "communities",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=140), nullable=False),
        sa.Column("slug", sa.String(length=160), nullable=False),
        sa.Column("community_type", sa.String(length=40), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("country", sa.String(length=80), nullable=True),
        sa.Column("city", sa.String(length=100), nullable=True),
        sa.Column("sector", sa.String(length=120), nullable=True),
        sa.Column("program_name", sa.String(length=120), nullable=True),
        sa.Column("cohort_year", sa.Integer(), nullable=True),
        sa.Column("visibility", sa.String(length=40), nullable=False),
        sa.Column("join_policy", sa.String(length=40), nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_communities_slug", "communities", ["slug"], unique=False)
    op.create_index(
        "ix_communities_type_country",
        "communities",
        ["community_type", "country"],
        unique=False,
    )
    op.create_table(
        "community_memberships",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("community_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("role", sa.String(length=40), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["community_id"], ["communities.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("community_id", "user_id", name="uq_community_membership_user"),
    )
    op.create_index(
        "ix_community_memberships_community_status",
        "community_memberships",
        ["community_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_community_memberships_user_status",
        "community_memberships",
        ["user_id", "status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_community_memberships_user_status",
        table_name="community_memberships",
    )
    op.drop_index(
        "ix_community_memberships_community_status",
        table_name="community_memberships",
    )
    op.drop_table("community_memberships")
    op.drop_index("ix_communities_type_country", table_name="communities")
    op.drop_index("ix_communities_slug", table_name="communities")
    op.drop_table("communities")
