"""Add MWF alumni directory cache.

Revision ID: 20260512_0024
Revises: 20260512_0023
Create Date: 2026-05-12
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260512_0024"
down_revision: str | None = "20260512_0023"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "mwf_alumni_profiles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("source_id", sa.Integer(), nullable=False),
        sa.Column("first_name", sa.String(length=120), nullable=True),
        sa.Column("last_name", sa.String(length=120), nullable=True),
        sa.Column("display_name", sa.String(length=240), nullable=False),
        sa.Column("country_slug", sa.String(length=120), nullable=True),
        sa.Column("country_label", sa.String(length=160), nullable=True),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("field_of_study", sa.String(length=180), nullable=True),
        sa.Column("expertise_slugs", sa.JSON(), nullable=False),
        sa.Column("expertise_labels", sa.JSON(), nullable=False),
        sa.Column("leadership_institute", sa.String(length=220), nullable=True),
        sa.Column("us_state", sa.String(length=120), nullable=True),
        sa.Column("program_years", sa.JSON(), nullable=False),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("source_detail_url", sa.String(length=500), nullable=True),
        sa.Column("raw_source_payload", sa.JSON(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("imported_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deactivated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_id"),
    )
    op.create_index(
        "ix_mwf_alumni_profiles_active_country",
        "mwf_alumni_profiles",
        ["active", "country_label"],
        unique=False,
    )
    op.create_index(
        "ix_mwf_alumni_profiles_active_field",
        "mwf_alumni_profiles",
        ["active", "field_of_study"],
        unique=False,
    )
    op.create_index(
        "ix_mwf_alumni_profiles_active_institute",
        "mwf_alumni_profiles",
        ["active", "leadership_institute"],
        unique=False,
    )
    op.create_index(
        "ix_mwf_alumni_profiles_active_name",
        "mwf_alumni_profiles",
        ["active", "display_name"],
        unique=False,
    )
    op.create_index(
        "ix_mwf_alumni_profiles_source_id",
        "mwf_alumni_profiles",
        ["source_id"],
        unique=False,
    )

    op.create_table(
        "mwf_alumni_sync_runs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("source_url", sa.String(length=500), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("fetched_count", sa.Integer(), nullable=False),
        sa.Column("imported_count", sa.Integer(), nullable=False),
        sa.Column("updated_count", sa.Integer(), nullable=False),
        sa.Column("deactivated_count", sa.Integer(), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_mwf_alumni_sync_runs_finished",
        "mwf_alumni_sync_runs",
        ["finished_at"],
        unique=False,
    )
    op.create_index(
        "ix_mwf_alumni_sync_runs_status_started",
        "mwf_alumni_sync_runs",
        ["status", "started_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_mwf_alumni_sync_runs_status_started", table_name="mwf_alumni_sync_runs")
    op.drop_index("ix_mwf_alumni_sync_runs_finished", table_name="mwf_alumni_sync_runs")
    op.drop_table("mwf_alumni_sync_runs")
    op.drop_index("ix_mwf_alumni_profiles_source_id", table_name="mwf_alumni_profiles")
    op.drop_index("ix_mwf_alumni_profiles_active_name", table_name="mwf_alumni_profiles")
    op.drop_index("ix_mwf_alumni_profiles_active_institute", table_name="mwf_alumni_profiles")
    op.drop_index("ix_mwf_alumni_profiles_active_field", table_name="mwf_alumni_profiles")
    op.drop_index("ix_mwf_alumni_profiles_active_country", table_name="mwf_alumni_profiles")
    op.drop_table("mwf_alumni_profiles")
