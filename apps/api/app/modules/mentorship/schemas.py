import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class MentorProfileUpsert(BaseModel):
    headline: str = Field(min_length=3, max_length=180)
    bio: str = Field(min_length=20, max_length=3000)
    expertise_areas: list[str] = Field(default_factory=list, max_length=12)
    sectors: list[str] = Field(default_factory=list, max_length=12)
    countries: list[str] = Field(default_factory=list, max_length=10)
    availability_status: str = Field(default="AVAILABLE", max_length=40)
    preferred_meeting_format: str = Field(default="VIRTUAL", max_length=40)
    max_active_mentees: int = Field(default=3, ge=1, le=20)
    years_experience: int | None = Field(default=None, ge=0, le=80)
    is_active: bool = True
    is_accepting_requests: bool = True

    @field_validator("headline", "bio")
    @classmethod
    def normalize_required_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("This field is required")
        return normalized

    @field_validator("expertise_areas", "sectors", "countries")
    @classmethod
    def normalize_list(cls, value: list[str]) -> list[str]:
        normalized: list[str] = []
        seen: set[str] = set()
        for item in value:
            cleaned = item.strip()
            key = cleaned.lower()
            if cleaned and key not in seen:
                normalized.append(cleaned[:120])
                seen.add(key)
        return normalized

    @field_validator("availability_status", "preferred_meeting_format")
    @classmethod
    def normalize_enum(cls, value: str) -> str:
        normalized = value.strip().upper().replace(" ", "_").replace("-", "_")
        return normalized or "OTHER"


class MentorProfileResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    display_name: str
    headline: str
    bio: str
    expertise_areas: list[str]
    sectors: list[str]
    countries: list[str]
    availability_status: str
    preferred_meeting_format: str
    max_active_mentees: int
    years_experience: int | None
    is_active: bool
    is_accepting_requests: bool
    active_request_count: int
    created_at: datetime
    updated_at: datetime


class MentorshipRequestCreate(BaseModel):
    mentor_profile_id: uuid.UUID
    focus_area: str = Field(min_length=2, max_length=120)
    goals: str = Field(min_length=20, max_length=3000)
    message: str | None = Field(default=None, max_length=2000)

    @field_validator("focus_area", "goals", "message")
    @classmethod
    def normalize_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class MentorshipRequestReview(BaseModel):
    reviewer_note: str | None = Field(default=None, max_length=1200)

    @field_validator("reviewer_note")
    @classmethod
    def normalize_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class MentorshipRequestResponse(BaseModel):
    id: uuid.UUID
    mentor_profile_id: uuid.UUID
    mentor_user_id: uuid.UUID
    mentor_display_name: str
    requester_user_id: uuid.UUID
    requester_display_name: str
    focus_area: str
    goals: str
    message: str | None
    status: str
    reviewer_note: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MentorProfileListResponse(BaseModel):
    mentors: list[MentorProfileResponse]
    total: int
    limit: int
    offset: int
    has_more: bool


class MentorshipRequestListResponse(BaseModel):
    requests: list[MentorshipRequestResponse]
    total: int
    limit: int
    offset: int
    has_more: bool


class MentorshipSummaryResponse(BaseModel):
    mentor_profile: MentorProfileResponse | None
    recommended_mentors: list[MentorProfileResponse]
    outgoing_requests: list[MentorshipRequestResponse]
    incoming_requests: list[MentorshipRequestResponse]
