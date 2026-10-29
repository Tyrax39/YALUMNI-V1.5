"""Add contribution payment attempts.

Revision ID: 20260516_0030
Revises: 20260515_0029
Create Date: 2026-05-16
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260516_0030"
down_revision: str | None = "20260515_0029"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "contribution_payment_attempts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("payment_intent_id", sa.Uuid(), nullable=False),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("payment_method", sa.String(length=60), nullable=False),
        sa.Column("provider", sa.String(length=60), nullable=False),
        sa.Column("provider_intent_id", sa.String(length=120), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("client_secret", sa.String(length=220), nullable=True),
        sa.Column("checkout_url", sa.String(length=500), nullable=True),
        sa.Column("request_payload_json", sa.JSON(), nullable=True),
        sa.Column("response_payload_json", sa.JSON(), nullable=True),
        sa.Column("error_message", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["payment_intent_id"],
            ["contribution_payment_intents.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_contribution_payment_attempts_intent_status",
        "contribution_payment_attempts",
        ["payment_intent_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_contribution_payment_attempts_provider_intent",
        "contribution_payment_attempts",
        ["provider", "provider_intent_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_contribution_payment_attempts_provider_intent",
        table_name="contribution_payment_attempts",
    )
    op.drop_index(
        "ix_contribution_payment_attempts_intent_status",
        table_name="contribution_payment_attempts",
    )
    op.drop_table("contribution_payment_attempts")
