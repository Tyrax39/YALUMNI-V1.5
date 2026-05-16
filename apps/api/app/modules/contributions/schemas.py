import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class ContributionCampaignCreate(BaseModel):
    title: str = Field(min_length=3, max_length=180)
    summary: str = Field(min_length=20, max_length=500)
    description: str = Field(min_length=40, max_length=8000)
    goal_amount_cents: int = Field(default=0, ge=0, le=100_000_000_000)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    country: str | None = Field(default=None, max_length=80)
    chapter_name: str | None = Field(default=None, max_length=160)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    cover_image_url: str | None = Field(default=None, max_length=500)

    @field_validator("title", "summary", "description")
    @classmethod
    def normalize_required_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("This field is required")
        return normalized

    @field_validator("country", "chapter_name", "cover_image_url")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str) -> str:
        return value.strip().upper()

    @model_validator(mode="after")
    def validate_dates(self) -> "ContributionCampaignCreate":
        if self.starts_at and self.ends_at and self.ends_at <= self.starts_at:
            raise ValueError("Campaign end time must be after start time")
        return self


class ContributionCampaignStatusAction(BaseModel):
    note: str | None = Field(default=None, max_length=2000)

    @field_validator("note")
    @classmethod
    def normalize_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class ContributionPaymentCreate(BaseModel):
    amount_cents: int = Field(ge=100, le=100_000_000_000)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    payment_method: str = Field(default="CARD_TEST", max_length=60)
    payment_reference: str | None = Field(default=None, max_length=160)
    note: str | None = Field(default=None, max_length=2000)
    anonymous: bool = False

    @field_validator("currency", "payment_method")
    @classmethod
    def normalize_enum_text(cls, value: str) -> str:
        return value.strip().upper().replace(" ", "_").replace("-", "_")

    @field_validator("payment_reference", "note")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class ContributionPaymentIntentCreate(ContributionPaymentCreate):
    pass


class TreasuryCertificationCreate(BaseModel):
    campaign_id: uuid.UUID | None = None
    limit: int = Field(default=1000, ge=1, le=5000)
    note: str | None = Field(default=None, max_length=2000)
    status: str | None = Field(default=None, max_length=40)

    @field_validator("note", "status")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class ContributionDisbursementRequestCreate(BaseModel):
    amount_cents: int = Field(ge=100, le=100_000_000_000)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    note: str | None = Field(default=None, max_length=2000)
    payee_name: str = Field(min_length=2, max_length=160)
    payee_reference: str | None = Field(default=None, max_length=160)
    purpose: str = Field(min_length=10, max_length=4000)

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str) -> str:
        return value.strip().upper()

    @field_validator("note", "payee_reference")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("payee_name", "purpose")
    @classmethod
    def normalize_required_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("This field is required")
        return normalized


class ContributionDisbursementStatusAction(BaseModel):
    note: str | None = Field(default=None, max_length=2000)

    @field_validator("note")
    @classmethod
    def normalize_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class ContributionPaymentIntentResponse(BaseModel):
    amount_cents: int
    anonymous: bool
    campaign_id: uuid.UUID
    checkout_attempt_id: uuid.UUID | None
    checkout_url: str | None
    client_secret: str | None
    contributor_user_id: uuid.UUID | None
    created_at: datetime
    currency: str
    id: uuid.UUID
    note: str | None
    payment_method: str
    provider: str
    provider_intent_id: str
    status: str
    updated_at: datetime


class ContributionPaymentAttemptResponse(BaseModel):
    amount_cents: int
    campaign_id: uuid.UUID | None
    contributor_user_id: uuid.UUID | None
    created_at: datetime
    currency: str
    error_message: str | None
    has_checkout_url: bool
    has_client_secret: bool
    id: uuid.UUID
    payment_intent_id: uuid.UUID
    payment_intent_status: str | None
    payment_method: str
    provider: str
    provider_intent_id: str
    status: str
    updated_at: datetime


class ContributionPaymentAttemptListResponse(BaseModel):
    attempts: list[ContributionPaymentAttemptResponse]
    has_more: bool
    limit: int
    offset: int
    total: int


class ContributionWebhookPayload(BaseModel):
    event_type: str = Field(min_length=1, max_length=80)
    provider_event_id: str | None = Field(default=None, max_length=160)
    provider_intent_id: str = Field(min_length=3, max_length=120)
    amount_cents: int | None = Field(default=None, ge=1, le=100_000_000_000)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    failure_reason: str | None = Field(default=None, max_length=500)

    @field_validator("event_type")
    @classmethod
    def normalize_event_type(cls, value: str) -> str:
        return value.strip().upper().replace(" ", "_").replace("-", "_").replace(".", "_")

    @field_validator("currency")
    @classmethod
    def normalize_optional_currency(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip().upper()

    @field_validator("provider_intent_id")
    @classmethod
    def normalize_provider_intent_id(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("provider_intent_id is required")
        return normalized

    @field_validator("provider_event_id", "failure_reason")
    @classmethod
    def normalize_optional_webhook_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class ContributionWebhookResponse(BaseModel):
    contribution_id: uuid.UUID | None
    event_type: str
    message: str
    payment_intent_id: uuid.UUID
    payment_intent_status: str
    provider: str
    provider_event_id: str | None
    provider_intent_id: str
    receipt_id: uuid.UUID | None
    reconciled: bool


class ContributionWebhookEventResponse(BaseModel):
    amount_cents: int | None
    contribution_id: uuid.UUID | None
    created_at: datetime
    currency: str | None
    delivery_count: int
    error_message: str | None
    event_type: str
    failure_reason: str | None
    id: uuid.UUID
    payment_intent_id: uuid.UUID | None
    processed_at: datetime | None
    provider: str
    provider_event_id: str | None
    provider_intent_id: str
    status: str
    updated_at: datetime


class ContributionWebhookEventListResponse(BaseModel):
    events: list[ContributionWebhookEventResponse]
    has_more: bool
    limit: int
    offset: int
    total: int


class ContributionCampaignResponse(BaseModel):
    chapter_name: str | None
    closed_at: datetime | None
    contribution_count: int
    country: str | None
    cover_image_url: str | None
    created_at: datetime
    created_by_display_name: str | None
    created_by_user_id: uuid.UUID | None
    currency: str
    description: str
    ends_at: datetime | None
    goal_amount_cents: int
    id: uuid.UUID
    is_contributor: bool
    pending_amount_cents: int
    published_at: datetime | None
    received_amount_cents: int
    starts_at: datetime | None
    status: str
    summary: str
    title: str
    updated_at: datetime


class ContributionCampaignListResponse(BaseModel):
    campaigns: list[ContributionCampaignResponse]
    has_more: bool
    limit: int
    offset: int
    total: int


class ContributionResponse(BaseModel):
    amount_cents: int
    anonymous: bool
    campaign_id: uuid.UUID
    campaign_title: str | None
    contributor_display_name: str | None
    contributor_user_id: uuid.UUID | None
    created_at: datetime
    currency: str
    id: uuid.UUID
    note: str | None
    paid_at: datetime | None
    payment_method: str
    payment_reference: str | None
    receipt_id: uuid.UUID | None
    receipt_number: str | None
    status: str
    updated_at: datetime


class ContributionListResponse(BaseModel):
    contributions: list[ContributionResponse]
    has_more: bool
    limit: int
    offset: int
    total: int


class ContributionReceiptResponse(BaseModel):
    amount_cents: int
    campaign_id: uuid.UUID
    campaign_title: str
    contribution_id: uuid.UUID
    contributor_display_name: str | None
    currency: str
    id: uuid.UUID
    issued_at: datetime
    issued_to_email: str
    issued_to_name: str
    receipt_number: str
    status: str
    tax_note: str | None

    model_config = ConfigDict(from_attributes=True)


class ContributionLedgerEntryResponse(BaseModel):
    amount_cents: int
    contribution_id: uuid.UUID
    created_at: datetime
    currency: str
    entry_type: str
    id: uuid.UUID
    memo: str | None


class TreasurySummaryResponse(BaseModel):
    campaign_count: int
    campaigns: list[ContributionCampaignResponse]
    ledger_entries: list[ContributionLedgerEntryResponse]
    pending_amount_cents: int
    published_campaign_count: int
    receipt_count: int
    received_amount_cents: int
    recent_contributions: list[ContributionResponse]


class TreasuryCertificationResponse(BaseModel):
    campaign_id: uuid.UUID | None
    campaign_title: str | None
    canonical_sha256: str
    certified_at: datetime
    certified_by_display_name: str | None
    certified_by_email: str | None
    certified_by_user_id: uuid.UUID | None
    contribution_count: int
    currencies: list[str]
    id: uuid.UUID
    ledger_entry_count: int
    limit: int
    note: str | None
    package_json: dict
    pending_amount_cents: int
    receipt_count: int
    received_amount_cents: int
    signature: str
    signature_algorithm: str
    status_filter: str | None


class TreasuryCertificationListResponse(BaseModel):
    certifications: list[TreasuryCertificationResponse]
    has_more: bool
    limit: int
    offset: int
    total: int


class ContributionDisbursementRequestResponse(BaseModel):
    amount_cents: int
    campaign_id: uuid.UUID
    campaign_title: str | None
    created_at: datetime
    currency: str
    decision_note: str | None
    id: uuid.UUID
    note: str | None
    paid_at: datetime | None
    paid_by_display_name: str | None
    paid_by_email: str | None
    paid_by_user_id: uuid.UUID | None
    payee_name: str
    payee_reference: str | None
    purpose: str
    requested_by_display_name: str | None
    requested_by_email: str | None
    requested_by_user_id: uuid.UUID | None
    reviewed_at: datetime | None
    reviewed_by_display_name: str | None
    reviewed_by_email: str | None
    reviewed_by_user_id: uuid.UUID | None
    status: str
    updated_at: datetime


class ContributionDisbursementRequestListResponse(BaseModel):
    disbursement_requests: list[ContributionDisbursementRequestResponse]
    has_more: bool
    limit: int
    offset: int
    total: int
