import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ResourceCreate(BaseModel):
    title: str = Field(min_length=3, max_length=180)
    resource_type: str = Field(default="GUIDE", max_length=80)
    resource_format: str = Field(default="LINK", max_length=80)
    topic: str | None = Field(default=None, max_length=120)
    country: str | None = Field(default=None, max_length=80)
    language: str | None = Field(default=None, max_length=80)
    external_url: str | None = Field(default=None, max_length=500)
    description: str = Field(min_length=20, max_length=5000)

    @field_validator("title", "description")
    @classmethod
    def normalize_required_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("This field is required")
        return normalized

    @field_validator("topic", "country", "language", "external_url")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("resource_type", "resource_format")
    @classmethod
    def normalize_enums(cls, value: str) -> str:
        normalized = value.strip().upper().replace(" ", "_").replace("-", "_")
        return normalized or "OTHER"


class ResourceReviewAction(BaseModel):
    reviewer_note: str | None = Field(default=None, max_length=2000)

    @field_validator("reviewer_note")
    @classmethod
    def normalize_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class ResourceResponse(BaseModel):
    id: uuid.UUID
    created_by_user_id: uuid.UUID | None
    created_by_display_name: str | None
    reviewed_by_user_id: uuid.UUID | None
    reviewed_by_display_name: str | None
    title: str
    resource_type: str
    resource_format: str
    topic: str | None
    country: str | None
    language: str | None
    external_url: str | None
    description: str
    status: str
    reviewer_note: str | None
    published_at: datetime | None
    reviewed_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ResourceListResponse(BaseModel):
    resources: list[ResourceResponse]
    total: int
    limit: int
    offset: int
    has_more: bool
