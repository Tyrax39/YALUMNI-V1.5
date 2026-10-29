"""Add contribution payment intents.

Revision ID: 20260514_0028
Revises: 20260513_0027
Create Date: 2026-05-14
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260514_0028"
down_revision: str | None = "20260513_0027"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "contribution_payment_intents",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("campaign_id", sa.Uuid(), nullable=False),
        sa.Column("contributor_user_id", sa.Uuid(), nullable=True),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="USD"),
        sa.Column("payment_method", sa.String(length=60), nullable=False),
        sa.Column("provider", sa.String(length=60), nullable=False, server_default="LOCAL_TEST"),
        sa.Column("provider_intent_id", sa.String(length=120), nullable=False),
        sa.Column(
            "status",
            sa.String(length=40),
            nullable=False,
            server_default="REQUIRES_CONFIRMATION",
        ),
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
        sa.UniqueConstraint(
            "provider_intent_id",
            name="uq_contribution_payment_intents_provider_id",
        ),
    )
    op.create_index(
        "ix_contribution_payment_intents_campaign_status",
        "contribution_payment_intents",
        ["campaign_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_contribution_payment_intents_user_created",
        "contribution_payment_intents",
        ["contributor_user_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_contribution_payment_intents_user_created",
        table_name="contribution_payment_intents",
    )
    op.drop_index(
        "ix_contribution_payment_intents_campaign_status",
        table_name="contribution_payment_intents",
    )
    op.drop_table("contribution_payment_intents")
