import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class OpportunityCreate(BaseModel):
    title: str = Field(min_length=3, max_length=180)
    organization: str = Field(min_length=2, max_length=180)
    opportunity_type: str = Field(default="FELLOWSHIP", max_length=80)
    location: str | None = Field(default=None, max_length=160)
    country: str | None = Field(default=None, max_length=80)
    remote_policy: str = Field(default="HYBRID", max_length=40)
    description: str = Field(min_length=20, max_length=5000)
    application_url: str | None = Field(default=None, max_length=500)
    deadline_at: datetime | None = None

    @field_validator("title", "organization", "description")
    @classmethod
    def normalize_required_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("This field is required")
        return normalized

    @field_validator("location", "country", "application_url")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("opportunity_type", "remote_policy")
    @classmethod
    def normalize_enums(cls, value: str) -> str:
        normalized = value.strip().upper().replace(" ", "_").replace("-", "_")
        return normalized or "OTHER"


class OpportunityReviewAction(BaseModel):
    reviewer_note: str | None = Field(default=None, max_length=2000)

    @field_validator("reviewer_note")
    @classmethod
    def normalize_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class OpportunityResponse(BaseModel):
    id: uuid.UUID
    created_by_user_id: uuid.UUID | None
    created_by_display_name: str | None
    reviewed_by_user_id: uuid.UUID | None
    reviewed_by_display_name: str | None
    title: str
    organization: str
    opportunity_type: str
    location: str | None
    country: str | None
    remote_policy: str
    description: str
    application_url: str | None
    deadline_at: datetime | None
    status: str
    reviewer_note: str | None
    published_at: datetime | None
    reviewed_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OpportunityListResponse(BaseModel):
    opportunities: list[OpportunityResponse]
    total: int
    limit: int
    offset: int
    has_more: bool
