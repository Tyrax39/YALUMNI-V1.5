import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class ElectionCreate(BaseModel):
    title: str = Field(min_length=3, max_length=180)
    summary: str = Field(min_length=20, max_length=500)
    description: str = Field(min_length=40, max_length=8000)
    scope_type: str = Field(default="PLATFORM", max_length=60)
    scope_label: str | None = Field(default=None, max_length=160)
    starts_at: datetime
    ends_at: datetime
    results_visibility: str = Field(default="AFTER_CLOSE", max_length=40)
    quorum_count: int = Field(default=0, ge=0, le=1000000)

    @field_validator("title", "summary", "description")
    @classmethod
    def normalize_required_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("This field is required")
        return normalized

    @field_validator("scope_label")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("scope_type", "results_visibility")
    @classmethod
    def normalize_enums(cls, value: str) -> str:
        normalized = value.strip().upper().replace(" ", "_").replace("-", "_")
        return normalized or "PLATFORM"

    @model_validator(mode="after")
    def validate_time_order(self) -> "ElectionCreate":
        if self.ends_at <= self.starts_at:
            raise ValueError("Election end time must be after start time")
        return self


class ElectionCandidateCreate(BaseModel):
    display_name: str = Field(min_length=2, max_length=160)
    headline: str | None = Field(default=None, max_length=180)
    statement: str = Field(min_length=20, max_length=4000)
    user_email: str | None = Field(default=None, max_length=320)
    sort_order: int = Field(default=0, ge=0, le=10000)

    @field_validator("display_name", "statement")
    @classmethod
    def normalize_required_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("This field is required")
        return normalized

    @field_validator("headline", "user_email")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class ElectionVoterRollUpsert(BaseModel):
    emails: list[str] = Field(min_length=1, max_length=500)

    @field_validator("emails")
    @classmethod
    def normalize_emails(cls, value: list[str]) -> list[str]:
        normalized: list[str] = []
        seen: set[str] = set()
        for email in value:
            item = email.strip().lower()
            if not item or "@" not in item or item in seen:
                continue
            seen.add(item)
            normalized.append(item)
        if not normalized:
            raise ValueError("At least one valid email is required")
        return normalized


class ElectionStatusAction(BaseModel):
    note: str | None = Field(default=None, max_length=2000)

    @field_validator("note")
    @classmethod
    def normalize_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class ElectionVoteCreate(BaseModel):
    candidate_id: uuid.UUID


class ElectionCandidateResponse(BaseModel):
    created_at: datetime
    display_name: str
    election_id: uuid.UUID
    headline: str | None
    id: uuid.UUID
    sort_order: int
    statement: str
    status: str
    updated_at: datetime
    user_id: uuid.UUID | None
    vote_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class ElectionVoterResponse(BaseModel):
    display_name: str
    email: str
    id: uuid.UUID
    invited_at: datetime
    status: str
    user_id: uuid.UUID
    voted_at: datetime | None


class ElectionResponse(BaseModel):
    candidate_count: int
    can_vote: bool
    closed_at: datetime | None
    created_at: datetime
    created_by_display_name: str | None
    created_by_user_id: uuid.UUID | None
    description: str
    ends_at: datetime
    has_voted: bool
    id: uuid.UUID
    opened_at: datetime | None
    privacy_mode: str
    quorum_count: int
    results_visibility: str
    scope_label: str | None
    scope_type: str
    starts_at: datetime
    status: str
    summary: str
    title: str
    updated_at: datetime
    voter_count: int
    vote_count: int


class ElectionListResponse(BaseModel):
    elections: list[ElectionResponse]
    has_more: bool
    limit: int
    offset: int
    total: int


class ElectionVoterRollResponse(BaseModel):
    added_count: int = 0
    already_present_count: int = 0
    not_found: list[str] = Field(default_factory=list)
    voters: list[ElectionVoterResponse]


class ElectionResultCandidate(BaseModel):
    candidate_id: uuid.UUID
    display_name: str
    headline: str | None
    percentage: float
    vote_count: int


class ElectionResultsResponse(BaseModel):
    election: ElectionResponse
    eligible_voters: int
    quorum_met: bool
    results_visible: bool
    total_votes: int
    candidates: list[ElectionResultCandidate]


class ElectionAuditEventResponse(BaseModel):
    created_at: datetime
    event_type: str
    id: uuid.UUID
    metadata: dict | None
    user_display_name: str | None
    user_email: str | None


class ElectionAuditResponse(BaseModel):
    events: list[ElectionAuditEventResponse]
    election: ElectionResponse


class ElectionPrivacyResponse(BaseModel):
    audit_note: str
    election: ElectionResponse
    privacy_mode: str
    vote_recording: str
