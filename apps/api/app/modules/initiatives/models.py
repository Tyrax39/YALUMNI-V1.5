import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.modules.auth.models import TimestampMixin, User


class Initiative(Base, TimestampMixin):
    __tablename__ = "initiatives"
    __table_args__ = (
        Index("ix_initiatives_status_created", "status", "created_at"),
        Index("ix_initiatives_focus_country", "focus_area", "country"),
        Index("ix_initiatives_creator_status", "created_by_user_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    summary: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    focus_area: Mapped[str] = mapped_column(String(80), default="COMMUNITY_IMPACT", nullable=False)
    stage: Mapped[str] = mapped_column(String(60), default="IDEA", nullable=False)
    country: Mapped[str | None] = mapped_column(String(80))
    city: Mapped[str | None] = mapped_column(String(120))
    partner_organization: Mapped[str | None] = mapped_column(String(180))
    impact_goal: Mapped[str | None] = mapped_column(String(500))
    support_needed: Mapped[str | None] = mapped_column(Text)
    target_beneficiaries: Mapped[int | None] = mapped_column(Integer)
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(40), default="ACTIVE", nullable=False)

    creator: Mapped[User | None] = relationship(foreign_keys=[created_by_user_id])
    milestones: Mapped[list["InitiativeMilestone"]] = relationship(
        cascade="all, delete-orphan",
        order_by="InitiativeMilestone.sort_order",
    )


class InitiativeMilestone(Base, TimestampMixin):
    __tablename__ = "initiative_milestones"
    __table_args__ = (Index("ix_initiative_milestones_sort", "initiative_id", "sort_order"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    initiative_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("initiatives.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(40), default="PLANNED", nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
