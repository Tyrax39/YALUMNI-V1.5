"""Add contribution expense evidence files.

Revision ID: 20260518_0035
Revises: 20260518_0034
Create Date: 2026-05-18
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260518_0035"
down_revision: str | None = "20260518_0034"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "contribution_expense_evidence",
        sa.Column("uploaded_by_user_id", sa.Uuid(), nullable=True),
    )
    op.add_column(
        "contribution_expense_evidence",
        sa.Column("file_name", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "contribution_expense_evidence",
        sa.Column("content_type", sa.String(length=120), nullable=True),
    )
    op.add_column(
        "contribution_expense_evidence",
        sa.Column("file_size_bytes", sa.Integer(), nullable=True),
    )
    op.add_column(
        "contribution_expense_evidence",
        sa.Column("storage_provider", sa.String(length=40), nullable=True),
    )
    op.add_column(
        "contribution_expense_evidence",
        sa.Column("storage_key", sa.String(length=1024), nullable=True),
    )
    op.create_foreign_key(
        "fk_contribution_expense_evidence_uploaded_by_user_id",
        "contribution_expense_evidence",
        "users",
        ["uploaded_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_contribution_expense_evidence_uploaded_by_user_id",
        "contribution_expense_evidence",
        type_="foreignkey",
    )
    op.drop_column("contribution_expense_evidence", "storage_key")
    op.drop_column("contribution_expense_evidence", "storage_provider")
    op.drop_column("contribution_expense_evidence", "file_size_bytes")
    op.drop_column("contribution_expense_evidence", "content_type")
    op.drop_column("contribution_expense_evidence", "file_name")
    op.drop_column("contribution_expense_evidence", "uploaded_by_user_id")
