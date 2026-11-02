"""Create verification evidence table.

Revision ID: 20260505_0005
Revises: 20260504_0004
Create Date: 2026-05-05
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260505_0005"
down_revision: str | None = "20260504_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "verification_evidence",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("verification_request_id", sa.Uuid(), nullable=False),
        sa.Column("uploaded_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("label", sa.String(length=120), nullable=True),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=120), nullable=False),
        sa.Column("file_size_bytes", sa.Integer(), nullable=False),
        sa.Column("storage_provider", sa.String(length=40), nullable=False),
        sa.Column("storage_key", sa.String(length=500), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["uploaded_by_user_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["verification_request_id"],
            ["verification_requests.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_verification_evidence_request_created",
        "verification_evidence",
        ["verification_request_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_verification_evidence_request_created",
        table_name="verification_evidence",
    )
    op.drop_table("verification_evidence")
