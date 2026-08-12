"""Add contribution treasury certifications.

Revision ID: 20260517_0031
Revises: 20260516_0030
Create Date: 2026-05-17
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260517_0031"
down_revision: str | None = "20260516_0030"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "contribution_treasury_certifications",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("campaign_id", sa.Uuid(), nullable=True),
        sa.Column("certified_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("certified_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status_filter", sa.String(length=40), nullable=True),
        sa.Column("limit", sa.Integer(), nullable=False),
        sa.Column("contribution_count", sa.Integer(), nullable=False),
        sa.Column("ledger_entry_count", sa.Integer(), nullable=False),
        sa.Column("receipt_count", sa.Integer(), nullable=False),
        sa.Column("received_amount_cents", sa.Integer(), nullable=False),
        sa.Column("pending_amount_cents", sa.Integer(), nullable=False),
        sa.Column("currencies_json", sa.JSON(), nullable=True),
        sa.Column("canonical_sha256", sa.String(length=64), nullable=False),
        sa.Column("signature", sa.String(length=128), nullable=False),
        sa.Column("signature_algorithm", sa.String(length=40), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("package_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["campaign_id"],
            ["contribution_campaigns.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(["certified_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_contribution_treasury_certifications_campaign",
        "contribution_treasury_certifications",
        ["campaign_id", "certified_at"],
        unique=False,
    )
    op.create_index(
        "ix_contribution_treasury_certifications_certified_at",
        "contribution_treasury_certifications",
        ["certified_at"],
        unique=False,
    )
    op.create_index(
        "ix_contribution_treasury_certifications_digest",
        "contribution_treasury_certifications",
        ["canonical_sha256"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_contribution_treasury_certifications_digest",
        table_name="contribution_treasury_certifications",
    )
    op.drop_index(
        "ix_contribution_treasury_certifications_certified_at",
        table_name="contribution_treasury_certifications",
    )
    op.drop_index(
        "ix_contribution_treasury_certifications_campaign",
        table_name="contribution_treasury_certifications",
    )
    op.drop_table("contribution_treasury_certifications")
