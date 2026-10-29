"""Add events member workflow.

Revision ID: 20260512_0022
Revises: 20260512_0021
Create Date: 2026-05-12
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260512_0022"
down_revision: str | None = "20260512_0021"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("summary", sa.String(length=500), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("event_type", sa.String(length=80), nullable=False, server_default="NETWORKING"),
        sa.Column("mode", sa.String(length=40), nullable=False, server_default="HYBRID"),
        sa.Column("country", sa.String(length=80), nullable=True),
        sa.Column("city", sa.String(length=120), nullable=True),
        sa.Column("location", sa.String(length=200), nullable=True),
        sa.Column("timezone", sa.String(length=80), nullable=False, server_default="Africa/Cairo"),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("registration_url", sa.String(length=500), nullable=True),
        sa.Column("capacity", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="PUBLISHED"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_events_country_type",
        "events",
        ["country", "event_type"],
        unique=False,
    )
    op.create_index(
        "ix_events_creator_status",
        "events",
        ["created_by_user_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_events_status_starts",
        "events",
        ["status", "starts_at"],
        unique=False,
    )

    op.create_table(
        "event_agenda_items",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("event_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("speaker_name", sa.String(length=160), nullable=True),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_event_agenda_items_event_sort",
        "event_agenda_items",
        ["event_id", "sort_order"],
        unique=False,
    )

    op.create_table(
        "event_attendees",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("event_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="REGISTERED"),
        sa.Column("registered_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("event_id", "user_id", name="uq_event_attendee_user"),
    )
    op.create_index(
        "ix_event_attendees_event_status",
        "event_attendees",
        ["event_id", "status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_event_attendees_event_status", table_name="event_attendees")
    op.drop_table("event_attendees")
    op.drop_index("ix_event_agenda_items_event_sort", table_name="event_agenda_items")
    op.drop_table("event_agenda_items")
    op.drop_index("ix_events_status_starts", table_name="events")
    op.drop_index("ix_events_creator_status", table_name="events")
    op.drop_index("ix_events_country_type", table_name="events")
    op.drop_table("events")
