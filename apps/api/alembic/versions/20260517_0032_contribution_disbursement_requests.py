"""Add contribution disbursement requests.

Revision ID: 20260517_0032
Revises: 20260517_0031
Create Date: 2026-05-17
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260517_0032"
down_revision: str | None = "20260517_0031"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "contribution_disbursement_requests",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("campaign_id", sa.Uuid(), nullable=False),
        sa.Column("requested_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("reviewed_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("paid_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("payee_name", sa.String(length=160), nullable=False),
        sa.Column("payee_reference", sa.String(length=160), nullable=True),
        sa.Column("purpose", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="REQUESTED"),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("decision_note", sa.Text(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["campaign_id"],
            ["contribution_campaigns.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["paid_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["requested_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["reviewed_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_contribution_disbursement_requests_campaign_status",
        "contribution_disbursement_requests",
        ["campaign_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_contribution_disbursement_requests_requested_by_status",
        "contribution_disbursement_requests",
        ["requested_by_user_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_contribution_disbursement_requests_status_created",
        "contribution_disbursement_requests",
        ["status", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_contribution_disbursement_requests_status_created",
        table_name="contribution_disbursement_requests",
    )
    op.drop_index(
        "ix_contribution_disbursement_requests_requested_by_status",
        table_name="contribution_disbursement_requests",
    )
    op.drop_index(
        "ix_contribution_disbursement_requests_campaign_status",
        table_name="contribution_disbursement_requests",
    )
    op.drop_table("contribution_disbursement_requests")
