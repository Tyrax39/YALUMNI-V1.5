"""Add contribution expense reports.

Revision ID: 20260517_0033
Revises: 20260517_0032
Create Date: 2026-05-17
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260517_0033"
down_revision: str | None = "20260517_0032"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "contribution_expense_reports",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("campaign_id", sa.Uuid(), nullable=False),
        sa.Column("disbursement_request_id", sa.Uuid(), nullable=False),
        sa.Column("submitted_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("reviewed_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("vendor_name", sa.String(length=160), nullable=False),
        sa.Column("expense_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("summary", sa.String(length=500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="SUBMITTED"),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("decision_note", sa.Text(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["campaign_id"],
            ["contribution_campaigns.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["disbursement_request_id"],
            ["contribution_disbursement_requests.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["reviewed_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["submitted_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_contribution_expense_reports_campaign_status",
        "contribution_expense_reports",
        ["campaign_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_contribution_expense_reports_disbursement_status",
        "contribution_expense_reports",
        ["disbursement_request_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_contribution_expense_reports_status_created",
        "contribution_expense_reports",
        ["status", "created_at"],
        unique=False,
    )

    op.create_table(
        "contribution_expense_evidence",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("expense_report_id", sa.Uuid(), nullable=False),
        sa.Column("evidence_type", sa.String(length=40), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("reference_url", sa.String(length=500), nullable=True),
        sa.Column("receipt_number", sa.String(length=120), nullable=True),
        sa.Column("amount_cents", sa.Integer(), nullable=True),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["expense_report_id"],
            ["contribution_expense_reports.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_contribution_expense_evidence_report",
        "contribution_expense_evidence",
        ["expense_report_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_contribution_expense_evidence_report",
        table_name="contribution_expense_evidence",
    )
    op.drop_table("contribution_expense_evidence")
    op.drop_index(
        "ix_contribution_expense_reports_status_created",
        table_name="contribution_expense_reports",
    )
    op.drop_index(
        "ix_contribution_expense_reports_disbursement_status",
        table_name="contribution_expense_reports",
    )
    op.drop_index(
        "ix_contribution_expense_reports_campaign_status",
        table_name="contribution_expense_reports",
    )
    op.drop_table("contribution_expense_reports")
