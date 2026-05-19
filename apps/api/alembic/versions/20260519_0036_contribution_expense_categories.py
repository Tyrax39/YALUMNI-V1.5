"""Add contribution expense categories.

Revision ID: 20260519_0036
Revises: 20260518_0035
Create Date: 2026-05-19
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260519_0036"
down_revision: str | None = "20260518_0035"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "contribution_expense_reports",
        sa.Column(
            "expense_category",
            sa.String(length=80),
            server_default="OTHER",
            nullable=False,
        ),
    )
    op.create_index(
        "ix_contribution_expense_reports_category_status",
        "contribution_expense_reports",
        ["expense_category", "status"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_contribution_expense_reports_category_status",
        table_name="contribution_expense_reports",
    )
    op.drop_column("contribution_expense_reports", "expense_category")
