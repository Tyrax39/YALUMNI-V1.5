"""Add introduction requests and onboarding workflow state.

Revision ID: 20260708_0037
Revises: 20260519_0036
Create Date: 2026-07-08
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260708_0037"
down_revision: str | None = "20260519_0036"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "introduction_requests",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("requester_user_id", sa.Uuid(), nullable=False),
        sa.Column("recipient_user_id", sa.Uuid(), nullable=False),
        sa.Column("conversation_id", sa.Uuid(), nullable=True),
        sa.Column("responded_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["recipient_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["requester_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["responded_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_introduction_requests_recipient_status",
        "introduction_requests",
        ["recipient_user_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_introduction_requests_requester_status",
        "introduction_requests",
        ["requester_user_id", "status"],
        unique=False,
    )

    op.create_table(
        "onboarding_workflow_states",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("current_step_key", sa.String(length=80), nullable=True),
        sa.Column("completed_step_keys", sa.JSON(), nullable=False),
        sa.Column("last_viewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index(
        "ix_onboarding_workflow_states_current_step",
        "onboarding_workflow_states",
        ["current_step_key"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_onboarding_workflow_states_current_step",
        table_name="onboarding_workflow_states",
    )
    op.drop_table("onboarding_workflow_states")
    op.drop_index(
        "ix_introduction_requests_requester_status",
        table_name="introduction_requests",
    )
    op.drop_index(
        "ix_introduction_requests_recipient_status",
        table_name="introduction_requests",
    )
    op.drop_table("introduction_requests")
