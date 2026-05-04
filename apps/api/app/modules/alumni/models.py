import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Index, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.modules.auth.models import TimestampMixin, User


class AlumniProfile(Base, TimestampMixin):
    __tablename__ = "alumni_profiles"
    __table_args__ = (Index("ix_alumni_profiles_country_sector", "country", "sector"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    headline: Mapped[str | None] = mapped_column(String(180))
    bio: Mapped[str | None] = mapped_column(Text)
    country: Mapped[str | None] = mapped_column(String(80))
    city: Mapped[str | None] = mapped_column(String(100))
    sector: Mapped[str | None] = mapped_column(String(120))
    organization: Mapped[str | None] = mapped_column(String(160))
    job_title: Mapped[str | None] = mapped_column(String(160))
    linkedin_url: Mapped[str | None] = mapped_column(String(255))
    website_url: Mapped[str | None] = mapped_column(String(255))
    skills: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    visibility: Mapped[dict[str, bool]] = mapped_column(JSON, default=dict, nullable=False)
    profile_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship()
    program_affiliations: Mapped[list["ProgramAffiliation"]] = relationship(
        back_populates="profile",
        cascade="all, delete-orphan",
        order_by="ProgramAffiliation.created_at.desc()",
    )
    verification_requests: Mapped[list["VerificationRequest"]] = relationship(
        back_populates="profile",
        cascade="all, delete-orphan",
        order_by="VerificationRequest.created_at.desc()",
    )


class ProgramAffiliation(Base, TimestampMixin):
    __tablename__ = "program_affiliations"
    __table_args__ = (Index("ix_program_affiliations_program_year", "program_name", "cohort_year"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("alumni_profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    program_name: Mapped[str] = mapped_column(String(120), nullable=False)
    cohort_year: Mapped[int | None] = mapped_column(Integer)
    country: Mapped[str | None] = mapped_column(String(80))
    city: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(40), default="COMPLETED", nullable=False)

    profile: Mapped[AlumniProfile] = relationship(back_populates="program_affiliations")


class VerificationRequest(Base, TimestampMixin):
    __tablename__ = "verification_requests"
    __table_args__ = (
        Index("ix_verification_requests_status_created", "status", "created_at"),
        Index("ix_verification_requests_profile_status", "profile_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("alumni_profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    request_type: Mapped[str] = mapped_column(
        String(60),
        default="ALUMNI_IDENTITY",
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(40),
        default="PENDING_REVIEW",
        nullable=False,
    )
    submitted_note: Mapped[str | None] = mapped_column(Text)
    reviewer_note: Mapped[str | None] = mapped_column(Text)
    profile_snapshot: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    reviewed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    profile: Mapped[AlumniProfile] = relationship(back_populates="verification_requests")
    reviewed_by_user: Mapped[User | None] = relationship()
    evidence_items: Mapped[list["VerificationEvidence"]] = relationship(
        back_populates="verification_request",
        cascade="all, delete-orphan",
        order_by="VerificationEvidence.created_at.desc()",
    )


class VerificationEvidence(Base, TimestampMixin):
    __tablename__ = "verification_evidence"
    __table_args__ = (
        Index(
            "ix_verification_evidence_request_created",
            "verification_request_id",
            "created_at",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    verification_request_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("verification_requests.id", ondelete="CASCADE"),
        nullable=False,
    )
    uploaded_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    label: Mapped[str | None] = mapped_column(String(120))
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(120), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_provider: Mapped[str] = mapped_column(String(40), default="LOCAL", nullable=False)
    storage_key: Mapped[str] = mapped_column(String(500), nullable=False)

    verification_request: Mapped[VerificationRequest] = relationship(
        back_populates="evidence_items"
    )
    uploaded_by_user: Mapped[User | None] = relationship()
