"""Create one-time account token table.

Revision ID: 20260504_0002
Revises: 20260502_0001
Create Date: 2026-05-04
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260504_0002"
down_revision: str | None = "20260502_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "account_tokens",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("token_hash", sa.String(length=128), nullable=False),
        sa.Column("purpose", sa.String(length=60), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index(
        "ix_account_tokens_hash_purpose",
        "account_tokens",
        ["token_hash", "purpose"],
        unique=False,
    )
    op.create_index(
        "ix_account_tokens_user_purpose",
        "account_tokens",
        ["user_id", "purpose"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_account_tokens_user_purpose", table_name="account_tokens")
    op.drop_index("ix_account_tokens_hash_purpose", table_name="account_tokens")
    op.drop_table("account_tokens")
