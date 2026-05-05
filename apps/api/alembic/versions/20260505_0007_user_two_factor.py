"""Add user two-factor authentication fields.

Revision ID: 20260505_0007
Revises: 20260505_0006
Create Date: 2026-05-05
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260505_0007"
down_revision: str | None = "20260505_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("two_factor_secret_encrypted", sa.String(length=512), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("two_factor_enabled_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "two_factor_enabled_at")
    op.drop_column("users", "two_factor_secret_encrypted")
