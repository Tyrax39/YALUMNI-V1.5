import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class SuccessStoryCreate(BaseModel):
    title: str = Field(min_length=3, max_length=180)
    summary: str = Field(min_length=20, max_length=500)
    body: str = Field(min_length=80, max_length=12000)
    country: str | None = Field(default=None, max_length=80)
    sector: str | None = Field(default=None, max_length=120)
    program: str | None = Field(default=None, max_length=120)
    cohort_year: int | None = Field(default=None, ge=2010, le=2100)
    beneficiary_count: int | None = Field(default=None, ge=0, le=100000000)
    impact_metric: str | None = Field(default=None, max_length=180)
    media_url: str | None = Field(default=None, max_length=500)
    external_url: str | None = Field(default=None, max_length=500)

    @field_validator("title", "summary", "body")
    @classmethod
    def normalize_required_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("This field is required")
        return normalized

    @field_validator(
        "country",
        "sector",
        "program",
        "impact_metric",
        "media_url",
        "external_url",
    )
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class SuccessStoryReviewAction(BaseModel):
    reviewer_note: str | None = Field(default=None, max_length=2000)

    @field_validator("reviewer_note")
    @classmethod
    def normalize_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class SuccessStoryResponse(BaseModel):
    id: uuid.UUID
    created_by_user_id: uuid.UUID | None
    created_by_display_name: str | None
    reviewed_by_user_id: uuid.UUID | None
    reviewed_by_display_name: str | None
    title: str
    summary: str
    body: str
    country: str | None
    sector: str | None
    program: str | None
    cohort_year: int | None
    beneficiary_count: int | None
    impact_metric: str | None
    media_url: str | None
    external_url: str | None
    status: str
    reviewer_note: str | None
    published_at: datetime | None
    reviewed_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SuccessStoryListResponse(BaseModel):
    stories: list[SuccessStoryResponse]
    total: int
    limit: int
    offset: int
    has_more: bool
