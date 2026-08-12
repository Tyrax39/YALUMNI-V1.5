import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Index, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.modules.auth.models import TimestampMixin, User


class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"
    __table_args__ = (
        Index("ix_notifications_user_read_created", "user_id", "read_at", "created_at"),
        Index(
            "ix_notifications_user_digest_created",
            "user_id",
            "email_digest_sent_at",
            "created_at",
        ),
        Index("ix_notifications_event_created", "event_type", "created_at"),
    )
    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    body: Mapped[str | None] = mapped_column(Text)
    target_url: Mapped[str | None] = mapped_column(String(500))
    metadata_json: Mapped[dict | None] = mapped_column("metadata", JSON)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    email_digest_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship(foreign_keys=[user_id])
    actor_user: Mapped[User | None] = relationship(foreign_keys=[actor_user_id])


class NotificationPreference(Base, TimestampMixin):
    __tablename__ = "notification_preferences"
    __table_args__ = (Index("ix_notification_preferences_user", "user_id", unique=True),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    in_app_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    email_digest_frequency: Mapped[str] = mapped_column(String(20), nullable=False, default="NONE")
    muted_event_types: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)

    user: Mapped[User] = relationship(foreign_keys=[user_id])
