"""Create direct messaging tables.

Revision ID: 20260508_0017
Revises: 20260507_0016
Create Date: 2026-05-08
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260508_0017"
down_revision: str | None = "20260507_0016"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "conversations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("conversation_type", sa.String(length=40), nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_conversations_created_by",
        "conversations",
        ["created_by_user_id"],
        unique=False,
    )
    op.create_index(
        "ix_conversations_type_last_message",
        "conversations",
        ["conversation_type", "last_message_at"],
        unique=False,
    )
    op.create_table(
        "conversation_participants",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("conversation_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("role", sa.String(length=40), nullable=False),
        sa.Column("last_read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("muted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "conversation_id",
            "user_id",
            name="uq_conversation_participant_user",
        ),
    )
    op.create_index(
        "ix_conversation_participants_conversation",
        "conversation_participants",
        ["conversation_id"],
        unique=False,
    )
    op.create_index(
        "ix_conversation_participants_user",
        "conversation_participants",
        ["user_id"],
        unique=False,
    )
    op.create_table(
        "direct_messages",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("conversation_id", sa.Uuid(), nullable=False),
        sa.Column("sender_user_id", sa.Uuid(), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("edited_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["sender_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_direct_messages_conversation_created",
        "direct_messages",
        ["conversation_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_direct_messages_sender_created",
        "direct_messages",
        ["sender_user_id", "created_at"],
        unique=False,
    )
    op.create_table(
        "user_blocks",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("blocker_user_id", sa.Uuid(), nullable=False),
        sa.Column("blocked_user_id", sa.Uuid(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["blocked_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["blocker_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("blocker_user_id", "blocked_user_id", name="uq_user_block_pair"),
    )
    op.create_index("ix_user_blocks_blocked", "user_blocks", ["blocked_user_id"], unique=False)
    op.create_index("ix_user_blocks_blocker", "user_blocks", ["blocker_user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_user_blocks_blocker", table_name="user_blocks")
    op.drop_index("ix_user_blocks_blocked", table_name="user_blocks")
    op.drop_table("user_blocks")
    op.drop_index("ix_direct_messages_sender_created", table_name="direct_messages")
    op.drop_index("ix_direct_messages_conversation_created", table_name="direct_messages")
    op.drop_table("direct_messages")
    op.drop_index("ix_conversation_participants_user", table_name="conversation_participants")
    op.drop_index(
        "ix_conversation_participants_conversation",
        table_name="conversation_participants",
    )
    op.drop_table("conversation_participants")
    op.drop_index("ix_conversations_type_last_message", table_name="conversations")
    op.drop_index("ix_conversations_created_by", table_name="conversations")
    op.drop_table("conversations")
