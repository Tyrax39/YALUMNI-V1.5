"""Add moderation review metadata.

Revision ID: 20260507_0012
Revises: 20260507_0011
Create Date: 2026-05-07
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260507_0012"
down_revision: str | None = "20260507_0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("community_posts") as batch_op:
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
            "fk_community_posts_escalated_by_user_id_users",
            "users",
            ["escalated_by_user_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_index(
            "ix_community_posts_moderation_escalation",
            ["moderation_severity", "escalation_status"],
            unique=False,
        )

    with op.batch_alter_table("community_post_comments") as batch_op:
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
            "fk_community_post_comments_escalated_by_user_id_users",
            "users",
            ["escalated_by_user_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_index(
            "ix_community_post_comments_moderation_escalation",
            ["moderation_severity", "escalation_status"],
            unique=False,
        )

    with op.batch_alter_table("community_post_reports") as batch_op:
        batch_op.add_column(sa.Column("moderator_note", sa.Text(), nullable=True))
        batch_op.add_column(
            sa.Column("severity", sa.String(length=40), nullable=False, server_default="MEDIUM")
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
            "fk_community_post_reports_escalated_by_user_id_users",
            "users",
            ["escalated_by_user_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_index(
            "ix_community_post_reports_review",
            ["severity", "escalation_status"],
            unique=False,
        )


def downgrade() -> None:
    with op.batch_alter_table("community_post_reports") as batch_op:
        batch_op.drop_index("ix_community_post_reports_review")
        batch_op.drop_constraint(
            "fk_community_post_reports_escalated_by_user_id_users",
            type_="foreignkey",
        )
        batch_op.drop_column("escalated_at")
        batch_op.drop_column("escalated_by_user_id")
        batch_op.drop_column("escalation_status")
        batch_op.drop_column("severity")
        batch_op.drop_column("moderator_note")

    with op.batch_alter_table("community_post_comments") as batch_op:
        batch_op.drop_index("ix_community_post_comments_moderation_escalation")
        batch_op.drop_constraint(
            "fk_community_post_comments_escalated_by_user_id_users",
            type_="foreignkey",
        )
        batch_op.drop_column("escalated_at")
        batch_op.drop_column("escalated_by_user_id")
        batch_op.drop_column("escalation_status")
        batch_op.drop_column("moderation_severity")
        batch_op.drop_column("moderation_note")

    with op.batch_alter_table("community_posts") as batch_op:
        batch_op.drop_index("ix_community_posts_moderation_escalation")
        batch_op.drop_constraint(
            "fk_community_posts_escalated_by_user_id_users",
            type_="foreignkey",
        )
        batch_op.drop_column("escalated_at")
        batch_op.drop_column("escalated_by_user_id")
        batch_op.drop_column("escalation_status")
        batch_op.drop_column("moderation_severity")
        batch_op.drop_column("moderation_note")
