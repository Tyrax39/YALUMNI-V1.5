import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.modules.auth.models import TimestampMixin, User


class ContributionCampaign(Base, TimestampMixin):
    __tablename__ = "contribution_campaigns"
    __table_args__ = (
        Index("ix_contribution_campaigns_status_dates", "status", "starts_at", "ends_at"),
        Index("ix_contribution_campaigns_creator_status", "created_by_user_id", "status"),
        Index("ix_contribution_campaigns_country_status", "country", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    summary: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    goal_amount_cents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="DRAFT", nullable=False)
    country: Mapped[str | None] = mapped_column(String(80))
    chapter_name: Mapped[str | None] = mapped_column(String(160))
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cover_image_url: Mapped[str | None] = mapped_column(String(500))
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    creator: Mapped[User | None] = relationship(foreign_keys=[created_by_user_id])
    contributions: Mapped[list["Contribution"]] = relationship(
        back_populates="campaign",
        cascade="all, delete-orphan",
    )
    payment_intents: Mapped[list["ContributionPaymentIntent"]] = relationship(
        back_populates="campaign",
        cascade="all, delete-orphan",
    )


class ContributionPaymentIntent(Base, TimestampMixin):
    __tablename__ = "contribution_payment_intents"
    __table_args__ = (
        Index("ix_contribution_payment_intents_campaign_status", "campaign_id", "status"),
        Index("ix_contribution_payment_intents_user_created", "contributor_user_id", "created_at"),
        UniqueConstraint("provider_intent_id", name="uq_contribution_payment_intents_provider_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("contribution_campaigns.id", ondelete="CASCADE"),
        nullable=False,
    )
    contributor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    payment_method: Mapped[str] = mapped_column(String(60), nullable=False)
    provider: Mapped[str] = mapped_column(String(60), default="LOCAL_TEST", nullable=False)
    provider_intent_id: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="REQUIRES_CONFIRMATION", nullable=False)
    note: Mapped[str | None] = mapped_column(Text)
    anonymous: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    campaign: Mapped[ContributionCampaign] = relationship(
        back_populates="payment_intents",
        foreign_keys=[campaign_id],
    )
    contributor: Mapped[User | None] = relationship(foreign_keys=[contributor_user_id])
    payment_attempts: Mapped[list["ContributionPaymentAttempt"]] = relationship(
        back_populates="payment_intent",
        cascade="all, delete-orphan",
        order_by="ContributionPaymentAttempt.created_at",
    )


class ContributionPaymentAttempt(Base, TimestampMixin):
    __tablename__ = "contribution_payment_attempts"
    __table_args__ = (
        Index(
            "ix_contribution_payment_attempts_intent_status",
            "payment_intent_id",
            "status",
        ),
        Index(
            "ix_contribution_payment_attempts_provider_intent",
            "provider",
            "provider_intent_id",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    payment_intent_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("contribution_payment_intents.id", ondelete="CASCADE"),
        nullable=False,
    )
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    payment_method: Mapped[str] = mapped_column(String(60), nullable=False)
    provider: Mapped[str] = mapped_column(String(60), nullable=False)
    provider_intent_id: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False)
    client_secret: Mapped[str | None] = mapped_column(String(220))
    checkout_url: Mapped[str | None] = mapped_column(String(500))
    request_payload_json: Mapped[dict | None] = mapped_column(JSON)
    response_payload_json: Mapped[dict | None] = mapped_column(JSON)
    error_message: Mapped[str | None] = mapped_column(String(500))

    payment_intent: Mapped[ContributionPaymentIntent] = relationship(
        back_populates="payment_attempts",
        foreign_keys=[payment_intent_id],
    )


class ContributionWebhookEvent(Base, TimestampMixin):
    __tablename__ = "contribution_webhook_events"
    __table_args__ = (
        Index("ix_contribution_webhook_events_provider_event", "provider", "provider_event_id"),
        Index(
            "ix_contribution_webhook_events_provider_intent",
            "provider",
            "provider_intent_id",
        ),
        Index("ix_contribution_webhook_events_status_created", "status", "created_at"),
        UniqueConstraint(
            "provider",
            "provider_event_id",
            name="uq_contribution_webhook_events_provider_event",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider: Mapped[str] = mapped_column(String(60), nullable=False)
    provider_event_id: Mapped[str | None] = mapped_column(String(160))
    provider_intent_id: Mapped[str] = mapped_column(String(120), nullable=False)
    event_type: Mapped[str] = mapped_column(String(80), nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False)
    amount_cents: Mapped[int | None] = mapped_column(Integer)
    currency: Mapped[str | None] = mapped_column(String(3))
    failure_reason: Mapped[str | None] = mapped_column(String(500))
    error_message: Mapped[str | None] = mapped_column(String(500))
    delivery_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    payload_json: Mapped[dict | None] = mapped_column(JSON)
    payment_intent_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("contribution_payment_intents.id", ondelete="SET NULL"),
    )
    contribution_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("contributions.id", ondelete="SET NULL"),
    )

    payment_intent: Mapped[ContributionPaymentIntent | None] = relationship(
        foreign_keys=[payment_intent_id],
    )
    contribution: Mapped["Contribution | None"] = relationship(foreign_keys=[contribution_id])


class Contribution(Base, TimestampMixin):
    __tablename__ = "contributions"
    __table_args__ = (
        Index("ix_contributions_campaign_status", "campaign_id", "status"),
        Index("ix_contributions_user_created", "contributor_user_id", "created_at"),
        Index("ix_contributions_status_paid", "status", "paid_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("contribution_campaigns.id", ondelete="CASCADE"),
        nullable=False,
    )
    contributor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    payment_method: Mapped[str] = mapped_column(String(60), nullable=False)
    payment_reference: Mapped[str | None] = mapped_column(String(160))
    status: Mapped[str] = mapped_column(String(40), default="RECEIVED", nullable=False)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    note: Mapped[str | None] = mapped_column(Text)
    anonymous: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    campaign: Mapped[ContributionCampaign] = relationship(
        back_populates="contributions",
        foreign_keys=[campaign_id],
    )
    contributor: Mapped[User | None] = relationship(foreign_keys=[contributor_user_id])
    receipt: Mapped["ContributionReceipt | None"] = relationship(
        back_populates="contribution",
        cascade="all, delete-orphan",
        uselist=False,
    )
    ledger_entries: Mapped[list["ContributionLedgerEntry"]] = relationship(
        back_populates="contribution",
        cascade="all, delete-orphan",
    )


class ContributionReceipt(Base, TimestampMixin):
    __tablename__ = "contribution_receipts"
    __table_args__ = (
        UniqueConstraint("contribution_id", name="uq_contribution_receipt_contribution"),
        Index("ix_contribution_receipts_issued_at", "issued_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contribution_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("contributions.id", ondelete="CASCADE"),
        nullable=False,
    )
    receipt_number: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    issued_to_name: Mapped[str] = mapped_column(String(160), nullable=False)
    issued_to_email: Mapped[str] = mapped_column(String(320), nullable=False)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="ISSUED", nullable=False)
    tax_note: Mapped[str | None] = mapped_column(Text)

    contribution: Mapped[Contribution] = relationship(back_populates="receipt")


class ContributionLedgerEntry(Base, TimestampMixin):
    __tablename__ = "contribution_ledger_entries"
    __table_args__ = (
        Index("ix_contribution_ledger_entries_type_created", "entry_type", "created_at"),
        Index("ix_contribution_ledger_entries_contribution", "contribution_id"),
        Index("ix_contribution_ledger_entries_expense_report", "expense_report_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contribution_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("contributions.id", ondelete="CASCADE"),
    )
    expense_report_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("contribution_expense_reports.id", ondelete="CASCADE"),
    )
    entry_type: Mapped[str] = mapped_column(String(40), nullable=False)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    memo: Mapped[str | None] = mapped_column(String(500))
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )

    contribution: Mapped[Contribution | None] = relationship(
        back_populates="ledger_entries",
        foreign_keys=[contribution_id],
    )
    expense_report: Mapped["ContributionExpenseReport | None"] = relationship(
        back_populates="ledger_entries",
        foreign_keys=[expense_report_id],
    )
    created_by: Mapped[User | None] = relationship(foreign_keys=[created_by_user_id])


class ContributionTreasuryCertification(Base, TimestampMixin):
    __tablename__ = "contribution_treasury_certifications"
    __table_args__ = (
        Index(
            "ix_contribution_treasury_certifications_certified_at",
            "certified_at",
        ),
        Index(
            "ix_contribution_treasury_certifications_campaign",
            "campaign_id",
            "certified_at",
        ),
        Index(
            "ix_contribution_treasury_certifications_digest",
            "canonical_sha256",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("contribution_campaigns.id", ondelete="SET NULL"),
    )
    certified_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    certified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status_filter: Mapped[str | None] = mapped_column(String(40))
    limit: Mapped[int] = mapped_column(Integer, nullable=False)
    contribution_count: Mapped[int] = mapped_column(Integer, nullable=False)
    ledger_entry_count: Mapped[int] = mapped_column(Integer, nullable=False)
    receipt_count: Mapped[int] = mapped_column(Integer, nullable=False)
    received_amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    pending_amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    currencies_json: Mapped[list[str] | None] = mapped_column(JSON)
    canonical_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    signature: Mapped[str] = mapped_column(String(128), nullable=False)
    signature_algorithm: Mapped[str] = mapped_column(String(40), nullable=False)
    note: Mapped[str | None] = mapped_column(Text)
    package_json: Mapped[dict] = mapped_column(JSON, nullable=False)

    campaign: Mapped[ContributionCampaign | None] = relationship(foreign_keys=[campaign_id])
    certified_by: Mapped[User | None] = relationship(foreign_keys=[certified_by_user_id])


class ContributionDisbursementRequest(Base, TimestampMixin):
    __tablename__ = "contribution_disbursement_requests"
    __table_args__ = (
        Index(
            "ix_contribution_disbursement_requests_campaign_status",
            "campaign_id",
            "status",
        ),
        Index(
            "ix_contribution_disbursement_requests_requested_by_status",
            "requested_by_user_id",
            "status",
        ),
        Index(
            "ix_contribution_disbursement_requests_status_created",
            "status",
            "created_at",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("contribution_campaigns.id", ondelete="CASCADE"),
        nullable=False,
    )
    requested_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    reviewed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    paid_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    payee_name: Mapped[str] = mapped_column(String(160), nullable=False)
    payee_reference: Mapped[str | None] = mapped_column(String(160))
    purpose: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="REQUESTED", nullable=False)
    note: Mapped[str | None] = mapped_column(Text)
    decision_note: Mapped[str | None] = mapped_column(Text)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    campaign: Mapped[ContributionCampaign] = relationship(foreign_keys=[campaign_id])
    requested_by: Mapped[User | None] = relationship(foreign_keys=[requested_by_user_id])
    reviewed_by: Mapped[User | None] = relationship(foreign_keys=[reviewed_by_user_id])
    paid_by: Mapped[User | None] = relationship(foreign_keys=[paid_by_user_id])


class ContributionExpenseReport(Base, TimestampMixin):
    __tablename__ = "contribution_expense_reports"
    __table_args__ = (
        Index(
            "ix_contribution_expense_reports_campaign_status",
            "campaign_id",
            "status",
        ),
        Index(
            "ix_contribution_expense_reports_disbursement_status",
            "disbursement_request_id",
            "status",
        ),
        Index(
            "ix_contribution_expense_reports_status_created",
            "status",
            "created_at",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("contribution_campaigns.id", ondelete="CASCADE"),
        nullable=False,
    )
    disbursement_request_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("contribution_disbursement_requests.id", ondelete="CASCADE"),
        nullable=False,
    )
    submitted_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    reviewed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    vendor_name: Mapped[str] = mapped_column(String(160), nullable=False)
    expense_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    summary: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(40), default="SUBMITTED", nullable=False)
    note: Mapped[str | None] = mapped_column(Text)
    decision_note: Mapped[str | None] = mapped_column(Text)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    campaign: Mapped[ContributionCampaign] = relationship(foreign_keys=[campaign_id])
    disbursement_request: Mapped[ContributionDisbursementRequest] = relationship(
        foreign_keys=[disbursement_request_id],
    )
    submitted_by: Mapped[User | None] = relationship(foreign_keys=[submitted_by_user_id])
    reviewed_by: Mapped[User | None] = relationship(foreign_keys=[reviewed_by_user_id])
    evidence_items: Mapped[list["ContributionExpenseEvidence"]] = relationship(
        back_populates="expense_report",
        cascade="all, delete-orphan",
        order_by="ContributionExpenseEvidence.created_at",
    )
    ledger_entries: Mapped[list[ContributionLedgerEntry]] = relationship(
        back_populates="expense_report",
        cascade="all, delete-orphan",
    )


class ContributionExpenseEvidence(Base, TimestampMixin):
    __tablename__ = "contribution_expense_evidence"
    __table_args__ = (
        Index(
            "ix_contribution_expense_evidence_report",
            "expense_report_id",
            "created_at",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    expense_report_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("contribution_expense_reports.id", ondelete="CASCADE"),
        nullable=False,
    )
    evidence_type: Mapped[str] = mapped_column(String(40), nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    reference_url: Mapped[str | None] = mapped_column(String(500))
    receipt_number: Mapped[str | None] = mapped_column(String(120))
    amount_cents: Mapped[int | None] = mapped_column(Integer)
    issued_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    note: Mapped[str | None] = mapped_column(Text)
    uploaded_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    file_name: Mapped[str | None] = mapped_column(String(255))
    content_type: Mapped[str | None] = mapped_column(String(120))
    file_size_bytes: Mapped[int | None] = mapped_column(Integer)
    storage_provider: Mapped[str | None] = mapped_column(String(40))
    storage_key: Mapped[str | None] = mapped_column(String(1024))

    expense_report: Mapped[ContributionExpenseReport] = relationship(
        back_populates="evidence_items",
        foreign_keys=[expense_report_id],
    )
    uploaded_by: Mapped[User | None] = relationship(foreign_keys=[uploaded_by_user_id])
