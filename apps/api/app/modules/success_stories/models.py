import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.modules.auth.models import TimestampMixin, User


class SuccessStory(Base, TimestampMixin):
    __tablename__ = "success_stories"
    __table_args__ = (
        Index("ix_success_stories_status_created", "status", "created_at"),
        Index("ix_success_stories_country_sector", "country", "sector"),
        Index("ix_success_stories_creator_status", "created_by_user_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    reviewed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    summary: Mapped[str] = mapped_column(String(500), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    country: Mapped[str | None] = mapped_column(String(80))
    sector: Mapped[str | None] = mapped_column(String(120))
    program: Mapped[str | None] = mapped_column(String(120))
    cohort_year: Mapped[int | None] = mapped_column(Integer)
    beneficiary_count: Mapped[int | None] = mapped_column(Integer)
    impact_metric: Mapped[str | None] = mapped_column(String(180))
    media_url: Mapped[str | None] = mapped_column(String(500))
    external_url: Mapped[str | None] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(40), default="PENDING_REVIEW", nullable=False)
    reviewer_note: Mapped[str | None] = mapped_column(Text)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    creator: Mapped[User | None] = relationship(foreign_keys=[created_by_user_id])
    reviewer: Mapped[User | None] = relationship(foreign_keys=[reviewed_by_user_id])
