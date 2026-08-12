import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.modules.auth.models import TimestampMixin, User


class Resource(Base, TimestampMixin):
    __tablename__ = "resources"
    __table_args__ = (
        Index("ix_resources_status_created", "status", "created_at"),
        Index("ix_resources_type_topic", "resource_type", "topic"),
        Index("ix_resources_creator_status", "created_by_user_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    reviewed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(80), default="GUIDE", nullable=False)
    resource_format: Mapped[str] = mapped_column(String(80), default="LINK", nullable=False)
    topic: Mapped[str | None] = mapped_column(String(120))
    country: Mapped[str | None] = mapped_column(String(80))
    language: Mapped[str | None] = mapped_column(String(80))
    external_url: Mapped[str | None] = mapped_column(String(500))
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="PENDING_REVIEW", nullable=False)
    reviewer_note: Mapped[str | None] = mapped_column(Text)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    creator: Mapped[User | None] = relationship(foreign_keys=[created_by_user_id])
    reviewer: Mapped[User | None] = relationship(foreign_keys=[reviewed_by_user_id])
