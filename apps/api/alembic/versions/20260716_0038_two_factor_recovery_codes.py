"""Add recovery-code storage for two-factor authentication.

Revision ID: 20260716_0038
Revises: 20260708_0037
Create Date: 2026-07-16
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260716_0038"
down_revision: str | None = "20260708_0037"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("two_factor_recovery_codes", sa.JSON(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "two_factor_recovery_codes")
