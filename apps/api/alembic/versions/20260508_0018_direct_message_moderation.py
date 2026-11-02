"""Add direct message moderation queues.

Revision ID: 20260508_0018
Revises: 20260508_0017
Create Date: 2026-05-08
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260508_0018"
down_revision: str | None = "20260508_0017"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("direct_messages") as batch_op:
        batch_op.add_column(sa.Column("removed_by_user_id", sa.Uuid(), nullable=True))
        batch_op.add_column(sa.Column("moderation_note", sa.Text(), nullable=True))
        batch_op.add_column(
            sa.Column(
                "moderation_severity",
                sa.String(length=40),
                nullable=False,
                server_default="MEDIUM",
            )
        )
        batch_op.add_column(
            sa.Column(
                "escalation_status",
                sa.String(length=40),
                nullable=False,
                server_default="NONE",
            )
        )
        batch_op.add_column(sa.Column("escalated_by_user_id", sa.Uuid(), nullable=True))
        batch_op.add_column(sa.Column("escalated_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.create_foreign_key(
            "fk_direct_messages_removed_by_user_id_users",
            "users",
            ["removed_by_user_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_foreign_key(
            "fk_direct_messages_escalated_by_user_id_users",
            "users",
            ["escalated_by_user_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_index(
            "ix_direct_messages_moderation_escalation",
            ["moderation_severity", "escalation_status"],
            unique=False,
        )

    op.create_table(
        "direct_message_reports",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("message_id", sa.Uuid(), nullable=False),
        sa.Column("conversation_id", sa.Uuid(), nullable=False),
        sa.Column("reporter_user_id", sa.Uuid(), nullable=True),
        sa.Column("reason", sa.String(length=80), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="OPEN"),
        sa.Column("moderator_note", sa.Text(), nullable=True),
        sa.Column("severity", sa.String(length=40), nullable=False, server_default="MEDIUM"),
        sa.Column(
            "escalation_status",
            sa.String(length=40),
            nullable=False,
            server_default="NONE",
        ),
        sa.Column("escalated_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("escalated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["message_id"], ["direct_messages.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["reporter_user_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["escalated_by_user_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["resolved_by_user_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("message_id", "reporter_user_id", name="uq_direct_message_reporter"),
    )
    op.create_index(
        "ix_direct_message_reports_conversation_status",
        "direct_message_reports",
        ["conversation_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_direct_message_reports_message_status",
        "direct_message_reports",
        ["message_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_direct_message_reports_reporter_status",
        "direct_message_reports",
        ["reporter_user_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_direct_message_reports_review",
        "direct_message_reports",
        ["severity", "escalation_status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_direct_message_reports_review", table_name="direct_message_reports")
    op.drop_index("ix_direct_message_reports_reporter_status", table_name="direct_message_reports")
    op.drop_index("ix_direct_message_reports_message_status", table_name="direct_message_reports")
    op.drop_index(
        "ix_direct_message_reports_conversation_status",
        table_name="direct_message_reports",
    )
    op.drop_table("direct_message_reports")

    with op.batch_alter_table("direct_messages") as batch_op:
        batch_op.drop_index("ix_direct_messages_moderation_escalation")
        batch_op.drop_constraint(
            "fk_direct_messages_escalated_by_user_id_users",
            type_="foreignkey",
        )
        batch_op.drop_constraint(
            "fk_direct_messages_removed_by_user_id_users",
            type_="foreignkey",
        )
        batch_op.drop_column("escalated_at")
        batch_op.drop_column("escalated_by_user_id")
        batch_op.drop_column("escalation_status")
        batch_op.drop_column("moderation_severity")
        batch_op.drop_column("moderation_note")
        batch_op.drop_column("removed_by_user_id")
