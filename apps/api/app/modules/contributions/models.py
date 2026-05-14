import uuid
from datetime import datetime

from sqlalchemy import (
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
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contribution_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("contributions.id", ondelete="CASCADE"),
        nullable=False,
    )
    entry_type: Mapped[str] = mapped_column(String(40), nullable=False)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    memo: Mapped[str | None] = mapped_column(String(500))
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )

    contribution: Mapped[Contribution] = relationship(
        back_populates="ledger_entries",
        foreign_keys=[contribution_id],
    )
    created_by: Mapped[User | None] = relationship(foreign_keys=[created_by_user_id])
