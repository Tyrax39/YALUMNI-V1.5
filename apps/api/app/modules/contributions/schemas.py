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


class ContributionExpenseEvidenceCreate(BaseModel):
    evidence_type: str = Field(default="RECEIPT", max_length=40)
    title: str = Field(min_length=2, max_length=160)
    reference_url: str | None = Field(default=None, max_length=500)
    receipt_number: str | None = Field(default=None, max_length=120)
    amount_cents: int | None = Field(default=None, ge=1, le=100_000_000_000)
    issued_at: datetime | None = None
    note: str | None = Field(default=None, max_length=2000)

    @field_validator("evidence_type")
    @classmethod
    def normalize_evidence_type(cls, value: str) -> str:
        normalized = value.strip().upper().replace(" ", "_").replace("-", "_")
        if not normalized:
            raise ValueError("evidence_type is required")
        return normalized

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("title is required")
        return normalized

    @field_validator("reference_url", "receipt_number", "note")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class ContributionExpenseReportCreate(BaseModel):
    amount_cents: int = Field(ge=100, le=100_000_000_000)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    expense_category: str = Field(default="OTHER", min_length=2, max_length=80)
    vendor_name: str = Field(min_length=2, max_length=160)
    expense_at: datetime | None = None
    summary: str = Field(min_length=10, max_length=500)
    description: str | None = Field(default=None, max_length=4000)
    note: str | None = Field(default=None, max_length=2000)
    evidence_items: list[ContributionExpenseEvidenceCreate] = Field(
        default_factory=list,
        max_length=20,
    )

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str) -> str:
        return value.strip().upper()

    @field_validator("expense_category")
    @classmethod
    def normalize_expense_category(cls, value: str) -> str:
        normalized = value.strip().upper().replace(" ", "_").replace("-", "_")
        if not normalized:
            raise ValueError("expense_category is required")
        return normalized

    @field_validator("vendor_name", "summary")
    @classmethod
    def normalize_required_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("This field is required")
        return normalized

    @field_validator("description", "note")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
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
    contribution_id: uuid.UUID | None
    created_at: datetime
    currency: str
    entry_type: str
    expense_category: str | None
    expense_report_id: uuid.UUID | None
    id: uuid.UUID
    memo: str | None


class TreasuryExpenseCategorySummaryResponse(BaseModel):
    approved_amount_cents: int
    approved_report_count: int
    currency: str
    expense_category: str
    rejected_amount_cents: int
    rejected_report_count: int
    report_count: int
    submitted_amount_cents: int
    submitted_report_count: int
    total_amount_cents: int


class TreasuryCurrencySummaryResponse(BaseModel):
    contribution_count: int
    currency: str
    ledger_entry_count: int
    ledger_net_amount_cents: int
    pending_amount_cents: int
    receipt_count: int
    received_amount_cents: int


class TreasurySummaryResponse(BaseModel):
    campaign_count: int
    campaigns: list[ContributionCampaignResponse]
    currency_summaries: list[TreasuryCurrencySummaryResponse]
    expense_category_summaries: list[TreasuryExpenseCategorySummaryResponse]
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
    currency_summaries: list[TreasuryCurrencySummaryResponse]
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


class ContributionExpenseEvidenceResponse(BaseModel):
    amount_cents: int | None
    content_type: str | None
    created_at: datetime
    download_url: str | None
    evidence_type: str
    expense_report_id: uuid.UUID
    file_name: str | None
    file_size_bytes: int | None
    id: uuid.UUID
    issued_at: datetime | None
    note: str | None
    receipt_number: str | None
    reference_url: str | None
    storage_provider: str | None
    title: str
    updated_at: datetime
    uploaded_by_user_id: uuid.UUID | None


class ContributionExpenseEvidencePolicyResponse(BaseModel):
    allowed_content_types: list[str]
    blocked_signature_count: int
    max_file_size_bytes: int
    retention_days: int
    storage_provider: str


class ContributionExpenseCategoryPolicyItemResponse(BaseModel):
    approved_amount_cents: int
    approved_report_count: int
    budget_amount_cents: int | None
    currency: str
    expense_category: str
    label: str
    managed: bool
    rejected_amount_cents: int
    rejected_report_count: int
    remaining_budget_cents: int | None
    report_count: int
    submitted_amount_cents: int
    submitted_report_count: int
    total_amount_cents: int


class ContributionExpenseCategoryPolicyResponse(BaseModel):
    categories: list[ContributionExpenseCategoryPolicyItemResponse]
    default_currency: str


class ContributionExpenseReportResponse(BaseModel):
    amount_cents: int
    campaign_id: uuid.UUID
    campaign_title: str | None
    created_at: datetime
    currency: str
    decision_note: str | None
    description: str | None
    disbursement_request_id: uuid.UUID
    evidence_items: list[ContributionExpenseEvidenceResponse]
    expense_at: datetime | None
    expense_category: str
    id: uuid.UUID
    note: str | None
    reviewed_at: datetime | None
    reviewed_by_display_name: str | None
    reviewed_by_email: str | None
    reviewed_by_user_id: uuid.UUID | None
    status: str
    submitted_by_display_name: str | None
    submitted_by_email: str | None
    submitted_by_user_id: uuid.UUID | None
    summary: str
    updated_at: datetime
    vendor_name: str


class ContributionExpenseReportListResponse(BaseModel):
    expense_reports: list[ContributionExpenseReportResponse]
    has_more: bool
    limit: int
    offset: int
    total: int
