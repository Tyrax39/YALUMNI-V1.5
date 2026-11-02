"""Create alumni profile tables.

Revision ID: 20260504_0003
Revises: 20260504_0002
Create Date: 2026-05-04
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260504_0003"
down_revision: str | None = "20260504_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "alumni_profiles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("headline", sa.String(length=180), nullable=True),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("country", sa.String(length=80), nullable=True),
        sa.Column("city", sa.String(length=100), nullable=True),
        sa.Column("sector", sa.String(length=120), nullable=True),
        sa.Column("organization", sa.String(length=160), nullable=True),
        sa.Column("job_title", sa.String(length=160), nullable=True),
        sa.Column("linkedin_url", sa.String(length=255), nullable=True),
        sa.Column("website_url", sa.String(length=255), nullable=True),
        sa.Column("skills", sa.JSON(), nullable=False),
        sa.Column("visibility", sa.JSON(), nullable=False),
        sa.Column("profile_completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index(
        "ix_alumni_profiles_country_sector",
        "alumni_profiles",
        ["country", "sector"],
        unique=False,
    )
    op.create_table(
        "program_affiliations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("profile_id", sa.Uuid(), nullable=False),
        sa.Column("program_name", sa.String(length=120), nullable=False),
        sa.Column("cohort_year", sa.Integer(), nullable=True),
        sa.Column("country", sa.String(length=80), nullable=True),
        sa.Column("city", sa.String(length=100), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["profile_id"], ["alumni_profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_program_affiliations_program_year",
        "program_affiliations",
        ["program_name", "cohort_year"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_program_affiliations_program_year", table_name="program_affiliations")
    op.drop_table("program_affiliations")
    op.drop_index("ix_alumni_profiles_country_sector", table_name="alumni_profiles")
    op.drop_table("alumni_profiles")
