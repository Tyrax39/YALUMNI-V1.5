import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class InitiativeMilestoneCreate(BaseModel):
    title: str = Field(min_length=2, max_length=180)
    description: str | None = Field(default=None, max_length=2000)
    due_at: datetime | None = None
    status: str = Field(default="PLANNED", max_length=40)

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("This field is required")
        return normalized

    @field_validator("description")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("status")
    @classmethod
    def normalize_status(cls, value: str) -> str:
        normalized = value.strip().upper().replace(" ", "_").replace("-", "_")
        return normalized or "PLANNED"


class InitiativeCreate(BaseModel):
    title: str = Field(min_length=3, max_length=180)
    summary: str = Field(min_length=20, max_length=500)
    description: str = Field(min_length=40, max_length=8000)
    focus_area: str = Field(default="COMMUNITY_IMPACT", max_length=80)
    stage: str = Field(default="IDEA", max_length=60)
    country: str | None = Field(default=None, max_length=80)
    city: str | None = Field(default=None, max_length=120)
    partner_organization: str | None = Field(default=None, max_length=180)
    impact_goal: str | None = Field(default=None, max_length=500)
    support_needed: str | None = Field(default=None, max_length=4000)
    target_beneficiaries: int | None = Field(default=None, ge=0, le=100000000)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    milestones: list[InitiativeMilestoneCreate] = Field(default_factory=list, max_length=12)

    @field_validator("title", "summary", "description")
    @classmethod
    def normalize_required_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("This field is required")
        return normalized

    @field_validator(
        "country",
        "city",
        "partner_organization",
        "impact_goal",
        "support_needed",
    )
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("focus_area", "stage")
    @classmethod
    def normalize_enums(cls, value: str) -> str:
        normalized = value.strip().upper().replace(" ", "_").replace("-", "_")
        return normalized or "OTHER"

    @model_validator(mode="after")
    def validate_time_order(self) -> "InitiativeCreate":
        if self.starts_at and self.ends_at and self.ends_at <= self.starts_at:
            raise ValueError("Initiative end date must be after start date")
        return self


class InitiativeMilestoneResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    due_at: datetime | None
    status: str
    sort_order: int

    model_config = ConfigDict(from_attributes=True)


class InitiativeResponse(BaseModel):
    id: uuid.UUID
    city: str | None
    country: str | None
    created_at: datetime
    created_by_display_name: str | None
    created_by_user_id: uuid.UUID | None
    description: str
    ends_at: datetime | None
    focus_area: str
    impact_goal: str | None
    milestone_count: int
    milestones: list[InitiativeMilestoneResponse] = Field(default_factory=list)
    partner_organization: str | None
    stage: str
    starts_at: datetime | None
    status: str
    summary: str
    support_needed: str | None
    target_beneficiaries: int | None
    title: str
    updated_at: datetime


class InitiativeListResponse(BaseModel):
    initiatives: list[InitiativeResponse]
    total: int
    limit: int
    offset: int
    has_more: bool
