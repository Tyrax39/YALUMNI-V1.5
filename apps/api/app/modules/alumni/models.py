import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Index, Integer, String, Text, Uuid
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
    profile_photo_file_name: Mapped[str | None] = mapped_column(String(255))
    profile_photo_content_type: Mapped[str | None] = mapped_column(String(120))
    profile_photo_file_size_bytes: Mapped[int | None] = mapped_column(Integer)
    profile_photo_storage_provider: Mapped[str | None] = mapped_column(String(40))
    profile_photo_storage_key: Mapped[str | None] = mapped_column(String(500))
    profile_photo_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

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


class OnboardingWorkflowState(Base, TimestampMixin):
    __tablename__ = "onboarding_workflow_states"
    __table_args__ = (
        Index("ix_onboarding_workflow_states_current_step", "current_step_key"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    current_step_key: Mapped[str | None] = mapped_column(String(80))
    completed_step_keys: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    last_viewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship()


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


class MwfAlumniProfile(Base, TimestampMixin):
    __tablename__ = "mwf_alumni_profiles"
    __table_args__ = (
        Index("ix_mwf_alumni_profiles_active_name", "active", "display_name"),
        Index("ix_mwf_alumni_profiles_active_country", "active", "country_label"),
        Index("ix_mwf_alumni_profiles_active_field", "active", "field_of_study"),
        Index("ix_mwf_alumni_profiles_active_institute", "active", "leadership_institute"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_id: Mapped[int] = mapped_column(Integer, unique=True, nullable=False, index=True)
    first_name: Mapped[str | None] = mapped_column(String(120))
    last_name: Mapped[str | None] = mapped_column(String(120))
    display_name: Mapped[str] = mapped_column(String(240), nullable=False)
    country_slug: Mapped[str | None] = mapped_column(String(120))
    country_label: Mapped[str | None] = mapped_column(String(160))
    bio: Mapped[str | None] = mapped_column(Text)
    field_of_study: Mapped[str | None] = mapped_column(String(180))
    expertise_slugs: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    expertise_labels: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    leadership_institute: Mapped[str | None] = mapped_column(String(220))
    us_state: Mapped[str | None] = mapped_column(String(120))
    program_years: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500))
    source_detail_url: Mapped[str | None] = mapped_column(String(500))
    raw_source_payload: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    imported_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    deactivated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class MwfAlumniSyncRun(Base):
    __tablename__ = "mwf_alumni_sync_runs"
    __table_args__ = (
        Index("ix_mwf_alumni_sync_runs_status_started", "status", "started_at"),
        Index("ix_mwf_alumni_sync_runs_finished", "finished_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_url: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="STARTED", nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    fetched_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    imported_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    updated_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    deactivated_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text)
