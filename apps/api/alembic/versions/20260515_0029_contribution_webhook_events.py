"""Add contribution webhook events.

Revision ID: 20260515_0029
Revises: 20260514_0028
Create Date: 2026-05-15
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260515_0029"
down_revision: str | None = "20260514_0028"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "contribution_webhook_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("provider", sa.String(length=60), nullable=False),
        sa.Column("provider_event_id", sa.String(length=160), nullable=True),
        sa.Column("provider_intent_id", sa.String(length=120), nullable=False),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("amount_cents", sa.Integer(), nullable=True),
        sa.Column("currency", sa.String(length=3), nullable=True),
        sa.Column("failure_reason", sa.String(length=500), nullable=True),
        sa.Column("error_message", sa.String(length=500), nullable=True),
        sa.Column("delivery_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("payload_json", sa.JSON(), nullable=True),
        sa.Column("payment_intent_id", sa.Uuid(), nullable=True),
        sa.Column("contribution_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["contribution_id"],
            ["contributions.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["payment_intent_id"],
            ["contribution_payment_intents.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "provider",
            "provider_event_id",
            name="uq_contribution_webhook_events_provider_event",
        ),
    )
    op.create_index(
        "ix_contribution_webhook_events_provider_event",
        "contribution_webhook_events",
        ["provider", "provider_event_id"],
        unique=False,
    )
    op.create_index(
        "ix_contribution_webhook_events_provider_intent",
        "contribution_webhook_events",
        ["provider", "provider_intent_id"],
        unique=False,
    )
    op.create_index(
        "ix_contribution_webhook_events_status_created",
        "contribution_webhook_events",
        ["status", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_contribution_webhook_events_status_created",
        table_name="contribution_webhook_events",
    )
    op.drop_index(
        "ix_contribution_webhook_events_provider_intent",
        table_name="contribution_webhook_events",
    )
    op.drop_index(
        "ix_contribution_webhook_events_provider_event",
        table_name="contribution_webhook_events",
    )
    op.drop_table("contribution_webhook_events")
