"""Add profile photo metadata to alumni profiles.

Revision ID: 20260505_0006
Revises: 20260505_0005
Create Date: 2026-05-05
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260505_0006"
down_revision: str | None = "20260505_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "alumni_profiles",
        sa.Column("profile_photo_file_name", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "alumni_profiles",
        sa.Column("profile_photo_content_type", sa.String(length=120), nullable=True),
    )
    op.add_column(
        "alumni_profiles",
        sa.Column("profile_photo_file_size_bytes", sa.Integer(), nullable=True),
    )
    op.add_column(
        "alumni_profiles",
        sa.Column("profile_photo_storage_provider", sa.String(length=40), nullable=True),
    )
    op.add_column(
        "alumni_profiles",
        sa.Column("profile_photo_storage_key", sa.String(length=500), nullable=True),
    )
    op.add_column(
        "alumni_profiles",
        sa.Column("profile_photo_updated_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("alumni_profiles", "profile_photo_updated_at")
    op.drop_column("alumni_profiles", "profile_photo_storage_key")
    op.drop_column("alumni_profiles", "profile_photo_storage_provider")
    op.drop_column("alumni_profiles", "profile_photo_file_size_bytes")
    op.drop_column("alumni_profiles", "profile_photo_content_type")
    op.drop_column("alumni_profiles", "profile_photo_file_name")
