"""Add contributions foundation.

Revision ID: 20260513_0027
Revises: 20260513_0026
Create Date: 2026-05-13
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260513_0027"
down_revision: str | None = "20260513_0026"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "contribution_campaigns",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("summary", sa.String(length=500), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("goal_amount_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="USD"),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="DRAFT"),
        sa.Column("country", sa.String(length=80), nullable=True),
        sa.Column("chapter_name", sa.String(length=160), nullable=True),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cover_image_url", sa.String(length=500), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_contribution_campaigns_country_status",
        "contribution_campaigns",
        ["country", "status"],
        unique=False,
    )
    op.create_index(
        "ix_contribution_campaigns_creator_status",
        "contribution_campaigns",
        ["created_by_user_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_contribution_campaigns_status_dates",
        "contribution_campaigns",
        ["status", "starts_at", "ends_at"],
        unique=False,
    )

    op.create_table(
        "contributions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("campaign_id", sa.Uuid(), nullable=False),
        sa.Column("contributor_user_id", sa.Uuid(), nullable=True),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="USD"),
        sa.Column("payment_method", sa.String(length=60), nullable=False),
        sa.Column("payment_reference", sa.String(length=160), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="RECEIVED"),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("anonymous", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["campaign_id"],
            ["contribution_campaigns.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["contributor_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_contributions_campaign_status",
        "contributions",
        ["campaign_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_contributions_status_paid",
        "contributions",
        ["status", "paid_at"],
        unique=False,
    )
    op.create_index(
        "ix_contributions_user_created",
        "contributions",
        ["contributor_user_id", "created_at"],
        unique=False,
    )

    op.create_table(
        "contribution_receipts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("contribution_id", sa.Uuid(), nullable=False),
        sa.Column("receipt_number", sa.String(length=40), nullable=False),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("issued_to_name", sa.String(length=160), nullable=False),
        sa.Column("issued_to_email", sa.String(length=320), nullable=False),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="USD"),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="ISSUED"),
        sa.Column("tax_note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["contribution_id"], ["contributions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("contribution_id", name="uq_contribution_receipt_contribution"),
        sa.UniqueConstraint("receipt_number"),
    )
    op.create_index(
        "ix_contribution_receipts_issued_at",
        "contribution_receipts",
        ["issued_at"],
        unique=False,
    )

    op.create_table(
        "contribution_ledger_entries",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("contribution_id", sa.Uuid(), nullable=False),
        sa.Column("entry_type", sa.String(length=40), nullable=False),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="USD"),
        sa.Column("memo", sa.String(length=500), nullable=True),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["contribution_id"], ["contributions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_contribution_ledger_entries_contribution",
        "contribution_ledger_entries",
        ["contribution_id"],
        unique=False,
    )
    op.create_index(
        "ix_contribution_ledger_entries_type_created",
        "contribution_ledger_entries",
        ["entry_type", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_contribution_ledger_entries_type_created",
        table_name="contribution_ledger_entries",
    )
    op.drop_index(
        "ix_contribution_ledger_entries_contribution",
        table_name="contribution_ledger_entries",
    )
    op.drop_table("contribution_ledger_entries")
    op.drop_index("ix_contribution_receipts_issued_at", table_name="contribution_receipts")
    op.drop_table("contribution_receipts")
    op.drop_index("ix_contributions_user_created", table_name="contributions")
    op.drop_index("ix_contributions_status_paid", table_name="contributions")
    op.drop_index("ix_contributions_campaign_status", table_name="contributions")
    op.drop_table("contributions")
    op.drop_index("ix_contribution_campaigns_status_dates", table_name="contribution_campaigns")
    op.drop_index("ix_contribution_campaigns_creator_status", table_name="contribution_campaigns")
    op.drop_index("ix_contribution_campaigns_country_status", table_name="contribution_campaigns")
    op.drop_table("contribution_campaigns")
