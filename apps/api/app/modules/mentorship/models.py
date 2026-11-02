import uuid

from sqlalchemy import JSON, ForeignKey, Index, Integer, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.modules.auth.models import TimestampMixin, User


class MentorProfile(Base, TimestampMixin):
    __tablename__ = "mentor_profiles"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_mentor_profiles_user_id"),
        Index("ix_mentor_profiles_active_accepting", "is_active", "is_accepting_requests"),
        Index("ix_mentor_profiles_availability", "availability_status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    headline: Mapped[str] = mapped_column(String(180), nullable=False)
    bio: Mapped[str] = mapped_column(Text, nullable=False)
    expertise_areas: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    sectors: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    countries: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    availability_status: Mapped[str] = mapped_column(
        String(40),
        default="AVAILABLE",
        nullable=False,
    )
    preferred_meeting_format: Mapped[str] = mapped_column(
        String(40),
        default="VIRTUAL",
        nullable=False,
    )
    max_active_mentees: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    years_experience: Mapped[int | None] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    is_accepting_requests: Mapped[bool] = mapped_column(default=True, nullable=False)

    user: Mapped[User] = relationship()
    requests: Mapped[list["MentorshipRequest"]] = relationship(
        back_populates="mentor_profile",
        cascade="all, delete-orphan",
    )


class MentorshipRequest(Base, TimestampMixin):
    __tablename__ = "mentorship_requests"
    __table_args__ = (
        Index("ix_mentorship_requests_requester_status", "requester_user_id", "status"),
        Index("ix_mentorship_requests_mentor_status", "mentor_profile_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mentor_profile_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("mentor_profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    requester_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    focus_area: Mapped[str] = mapped_column(String(120), nullable=False)
    goals: Mapped[str] = mapped_column(Text, nullable=False)
    message: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(40), default="PENDING", nullable=False)
    reviewer_note: Mapped[str | None] = mapped_column(Text)

    mentor_profile: Mapped[MentorProfile] = relationship(back_populates="requests")
    requester: Mapped[User] = relationship(foreign_keys=[requester_user_id])
