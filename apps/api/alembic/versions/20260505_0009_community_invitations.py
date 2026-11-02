"""Create community invitation table.

Revision ID: 20260505_0009
Revises: 20260505_0008
Create Date: 2026-05-05
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260505_0009"
down_revision: str | None = "20260505_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "community_invitations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("community_id", sa.Uuid(), nullable=False),
        sa.Column("invited_email", sa.String(length=320), nullable=False),
        sa.Column("invited_role", sa.String(length=40), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("token_hash", sa.String(length=128), nullable=False),
        sa.Column("invited_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("accepted_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("canceled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["accepted_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["community_id"], ["communities.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["invited_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index(
        "ix_community_invitations_community_status",
        "community_invitations",
        ["community_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_community_invitations_email_status",
        "community_invitations",
        ["invited_email", "status"],
        unique=False,
    )
    op.create_index(
        "ix_community_invitations_token_hash",
        "community_invitations",
        ["token_hash"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_community_invitations_token_hash", table_name="community_invitations")
    op.drop_index("ix_community_invitations_email_status", table_name="community_invitations")
    op.drop_index("ix_community_invitations_community_status", table_name="community_invitations")
    op.drop_table("community_invitations")
