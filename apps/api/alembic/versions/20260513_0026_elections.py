"""Add elections foundation.

Revision ID: 20260513_0026
Revises: 20260513_0025
Create Date: 2026-05-13
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260513_0026"
down_revision: str | None = "20260513_0025"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "elections",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("summary", sa.String(length=500), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("scope_type", sa.String(length=60), nullable=False, server_default="PLATFORM"),
        sa.Column("scope_label", sa.String(length=160), nullable=True),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="DRAFT"),
        sa.Column(
            "results_visibility",
            sa.String(length=40),
            nullable=False,
            server_default="AFTER_CLOSE",
        ),
        sa.Column(
            "privacy_mode",
            sa.String(length=60),
            nullable=False,
            server_default="BALLOT_LINKED_AUDIT",
        ),
        sa.Column("quorum_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("opened_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_elections_creator_status",
        "elections",
        ["created_by_user_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_elections_scope_status",
        "elections",
        ["scope_type", "status"],
        unique=False,
    )
    op.create_index(
        "ix_elections_status_dates",
        "elections",
        ["status", "starts_at", "ends_at"],
        unique=False,
    )

    op.create_table(
        "election_candidates",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("election_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("display_name", sa.String(length=160), nullable=False),
        sa.Column("headline", sa.String(length=180), nullable=True),
        sa.Column("statement", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="ACTIVE"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["election_id"], ["elections.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_election_candidates_election_sort",
        "election_candidates",
        ["election_id", "sort_order"],
        unique=False,
    )
    op.create_index(
        "ix_election_candidates_election_status",
        "election_candidates",
        ["election_id", "status"],
        unique=False,
    )

    op.create_table(
        "election_voters",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("election_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="ELIGIBLE"),
        sa.Column("invited_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("voted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["election_id"], ["elections.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("election_id", "user_id", name="uq_election_voter_user"),
    )
    op.create_index(
        "ix_election_voters_election_status",
        "election_voters",
        ["election_id", "status"],
        unique=False,
    )

    op.create_table(
        "election_votes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("election_id", sa.Uuid(), nullable=False),
        sa.Column("candidate_id", sa.Uuid(), nullable=False),
        sa.Column("voter_user_id", sa.Uuid(), nullable=False),
        sa.Column("ballot_hash", sa.String(length=128), nullable=False),
        sa.Column("cast_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["candidate_id"], ["election_candidates.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["election_id"], ["elections.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["voter_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("election_id", "voter_user_id", name="uq_election_vote_user"),
    )
    op.create_index(
        "ix_election_votes_election_candidate",
        "election_votes",
        ["election_id", "candidate_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_election_votes_election_candidate", table_name="election_votes")
    op.drop_table("election_votes")
    op.drop_index("ix_election_voters_election_status", table_name="election_voters")
    op.drop_table("election_voters")
    op.drop_index("ix_election_candidates_election_status", table_name="election_candidates")
    op.drop_index("ix_election_candidates_election_sort", table_name="election_candidates")
    op.drop_table("election_candidates")
    op.drop_index("ix_elections_status_dates", table_name="elections")
    op.drop_index("ix_elections_scope_status", table_name="elections")
    op.drop_index("ix_elections_creator_status", table_name="elections")
    op.drop_table("elections")
