"""Add mentorship foundation.

Revision ID: 20260513_0025
Revises: 20260512_0024
Create Date: 2026-05-13
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260513_0025"
down_revision: str | None = "20260512_0024"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "mentor_profiles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("headline", sa.String(length=180), nullable=False),
        sa.Column("bio", sa.Text(), nullable=False),
        sa.Column("expertise_areas", sa.JSON(), nullable=False),
        sa.Column("sectors", sa.JSON(), nullable=False),
        sa.Column("countries", sa.JSON(), nullable=False),
        sa.Column(
            "availability_status",
            sa.String(length=40),
            nullable=False,
            server_default="AVAILABLE",
        ),
        sa.Column(
            "preferred_meeting_format",
            sa.String(length=40),
            nullable=False,
            server_default="VIRTUAL",
        ),
        sa.Column("max_active_mentees", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("years_experience", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_accepting_requests", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_mentor_profiles_user_id"),
    )
    op.create_index(
        "ix_mentor_profiles_active_accepting",
        "mentor_profiles",
        ["is_active", "is_accepting_requests"],
        unique=False,
    )
    op.create_index(
        "ix_mentor_profiles_availability",
        "mentor_profiles",
        ["availability_status"],
        unique=False,
    )

    op.create_table(
        "mentorship_requests",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("mentor_profile_id", sa.Uuid(), nullable=False),
        sa.Column("requester_user_id", sa.Uuid(), nullable=False),
        sa.Column("focus_area", sa.String(length=120), nullable=False),
        sa.Column("goals", sa.Text(), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="PENDING"),
        sa.Column("reviewer_note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["mentor_profile_id"],
            ["mentor_profiles.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["requester_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_mentorship_requests_mentor_status",
        "mentorship_requests",
        ["mentor_profile_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_mentorship_requests_requester_status",
        "mentorship_requests",
        ["requester_user_id", "status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_mentorship_requests_requester_status", table_name="mentorship_requests")
    op.drop_index("ix_mentorship_requests_mentor_status", table_name="mentorship_requests")
    op.drop_table("mentorship_requests")
    op.drop_index("ix_mentor_profiles_availability", table_name="mentor_profiles")
    op.drop_index("ix_mentor_profiles_active_accepting", table_name="mentor_profiles")
    op.drop_table("mentor_profiles")
