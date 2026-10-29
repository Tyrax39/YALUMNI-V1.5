import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.modules.auth.models import TimestampMixin, User


class Event(Base, TimestampMixin):
    __tablename__ = "events"
    __table_args__ = (
        Index("ix_events_status_starts", "status", "starts_at"),
        Index("ix_events_country_type", "country", "event_type"),
        Index("ix_events_creator_status", "created_by_user_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    summary: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    event_type: Mapped[str] = mapped_column(String(80), default="NETWORKING", nullable=False)
    mode: Mapped[str] = mapped_column(String(40), default="HYBRID", nullable=False)
    country: Mapped[str | None] = mapped_column(String(80))
    city: Mapped[str | None] = mapped_column(String(120))
    location: Mapped[str | None] = mapped_column(String(200))
    timezone: Mapped[str] = mapped_column(String(80), default="Africa/Cairo", nullable=False)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    registration_url: Mapped[str | None] = mapped_column(String(500))
    capacity: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(40), default="PUBLISHED", nullable=False)

    creator: Mapped[User | None] = relationship(foreign_keys=[created_by_user_id])
    agenda_items: Mapped[list["EventAgendaItem"]] = relationship(
        cascade="all, delete-orphan",
        order_by="EventAgendaItem.sort_order",
    )
    attendees: Mapped[list["EventAttendee"]] = relationship(cascade="all, delete-orphan")


class EventAgendaItem(Base, TimestampMixin):
    __tablename__ = "event_agenda_items"
    __table_args__ = (Index("ix_event_agenda_items_event_sort", "event_id", "sort_order"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    speaker_name: Mapped[str | None] = mapped_column(String(160))
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class EventAttendee(Base, TimestampMixin):
    __tablename__ = "event_attendees"
    __table_args__ = (
        UniqueConstraint("event_id", "user_id", name="uq_event_attendee_user"),
        Index("ix_event_attendees_event_status", "event_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(String(40), default="REGISTERED", nullable=False)
    registered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    user: Mapped[User] = relationship(foreign_keys=[user_id])
