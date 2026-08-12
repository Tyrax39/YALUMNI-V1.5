"""Add contribution expense ledger entries.

Revision ID: 20260518_0034
Revises: 20260517_0033
Create Date: 2026-05-18
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260518_0034"
down_revision: str | None = "20260517_0033"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "contribution_ledger_entries",
        sa.Column("expense_report_id", sa.Uuid(), nullable=True),
    )
    op.alter_column(
        "contribution_ledger_entries",
        "contribution_id",
        existing_type=sa.Uuid(),
        nullable=True,
    )
    op.create_foreign_key(
        "fk_contribution_ledger_entries_expense_report_id",
        "contribution_ledger_entries",
        "contribution_expense_reports",
        ["expense_report_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index(
        "ix_contribution_ledger_entries_expense_report",
        "contribution_ledger_entries",
        ["expense_report_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_contribution_ledger_entries_expense_report",
        table_name="contribution_ledger_entries",
    )
    op.drop_constraint(
        "fk_contribution_ledger_entries_expense_report_id",
        "contribution_ledger_entries",
        type_="foreignkey",
    )
    op.drop_column("contribution_ledger_entries", "expense_report_id")
    op.execute("DELETE FROM contribution_ledger_entries WHERE contribution_id IS NULL")
    op.alter_column(
        "contribution_ledger_entries",
        "contribution_id",
        existing_type=sa.Uuid(),
        nullable=False,
    )
