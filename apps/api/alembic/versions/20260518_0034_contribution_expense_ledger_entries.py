"""Add contribution expense ledger entries.

Revision ID: 20260518_0034
Revises: 20260517_0033
Create Date: 2026-05-18
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy import inspect

from alembic import context, op

revision: str = "20260518_0034"
down_revision: str | None = "20260517_0033"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    if context.get_context().dialect.name == "sqlite":
        inspector = inspect(op.get_bind())
        columns = {
            column["name"]: column
            for column in inspector.get_columns("contribution_ledger_entries")
        }
        indexes = {index["name"] for index in inspector.get_indexes("contribution_ledger_entries")}
        foreign_keys = inspector.get_foreign_keys("contribution_ledger_entries")
        has_expense_foreign_key = any(
            foreign_key["constrained_columns"] == ["expense_report_id"]
            for foreign_key in foreign_keys
        )

        with op.batch_alter_table("contribution_ledger_entries") as batch_op:
            if "expense_report_id" not in columns:
                batch_op.add_column(sa.Column("expense_report_id", sa.Uuid(), nullable=True))
            if not columns["contribution_id"]["nullable"]:
                batch_op.alter_column(
                    "contribution_id",
                    existing_type=sa.Uuid(),
                    nullable=True,
                )
            if not has_expense_foreign_key:
                batch_op.create_foreign_key(
                    "fk_contribution_ledger_entries_expense_report_id",
                    "contribution_expense_reports",
                    ["expense_report_id"],
                    ["id"],
                    ondelete="CASCADE",
                )
            if "ix_contribution_ledger_entries_expense_report" not in indexes:
                batch_op.create_index(
                    "ix_contribution_ledger_entries_expense_report",
                    ["expense_report_id"],
                    unique=False,
                )
        return

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
    if context.get_context().dialect.name == "sqlite":
        op.execute("DELETE FROM contribution_ledger_entries WHERE contribution_id IS NULL")
        with op.batch_alter_table("contribution_ledger_entries") as batch_op:
            batch_op.drop_index("ix_contribution_ledger_entries_expense_report")
            batch_op.drop_constraint(
                "fk_contribution_ledger_entries_expense_report_id",
                type_="foreignkey",
            )
            batch_op.drop_column("expense_report_id")
            batch_op.alter_column(
                "contribution_id",
                existing_type=sa.Uuid(),
                nullable=False,
            )
        return

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
