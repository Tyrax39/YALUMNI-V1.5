import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class EventAgendaItemCreate(BaseModel):
    title: str = Field(min_length=2, max_length=180)
    description: str | None = Field(default=None, max_length=2000)
    speaker_name: str | None = Field(default=None, max_length=160)
    starts_at: datetime | None = None
    ends_at: datetime | None = None

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("This field is required")
        return normalized

    @field_validator("description", "speaker_name")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @model_validator(mode="after")
    def validate_time_order(self) -> "EventAgendaItemCreate":
        if self.starts_at and self.ends_at and self.ends_at <= self.starts_at:
            raise ValueError("Agenda item end time must be after start time")
        return self


class EventCreate(BaseModel):
    title: str = Field(min_length=3, max_length=180)
    summary: str = Field(min_length=20, max_length=500)
    description: str = Field(min_length=40, max_length=8000)
    event_type: str = Field(default="NETWORKING", max_length=80)
    mode: str = Field(default="HYBRID", max_length=40)
    country: str | None = Field(default=None, max_length=80)
    city: str | None = Field(default=None, max_length=120)
    location: str | None = Field(default=None, max_length=200)
    timezone: str = Field(default="Africa/Cairo", max_length=80)
    starts_at: datetime
    ends_at: datetime
    registration_url: str | None = Field(default=None, max_length=500)
    capacity: int | None = Field(default=None, ge=0, le=1000000)
    agenda_items: list[EventAgendaItemCreate] = Field(default_factory=list, max_length=12)

    @field_validator("title", "summary", "description")
    @classmethod
    def normalize_required_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("This field is required")
        return normalized

    @field_validator("country", "city", "location", "registration_url")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("event_type", "mode")
    @classmethod
    def normalize_enums(cls, value: str) -> str:
        normalized = value.strip().upper().replace(" ", "_").replace("-", "_")
        return normalized or "OTHER"

    @field_validator("timezone")
    @classmethod
    def normalize_timezone(cls, value: str) -> str:
        normalized = value.strip()
        return normalized or "Africa/Cairo"

    @model_validator(mode="after")
    def validate_time_order(self) -> "EventCreate":
        if self.ends_at <= self.starts_at:
            raise ValueError("Event end time must be after start time")
        return self


class EventAgendaItemResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    speaker_name: str | None
    starts_at: datetime | None
    ends_at: datetime | None
    sort_order: int

    model_config = ConfigDict(from_attributes=True)


class EventAttendeeResponse(BaseModel):
    id: uuid.UUID
    display_name: str
    email: str
    registered_at: datetime
    status: str
    user_id: uuid.UUID


class EventResponse(BaseModel):
    id: uuid.UUID
    attendee_count: int
    capacity: int | None
    city: str | None
    country: str | None
    created_at: datetime
    created_by_display_name: str | None
    created_by_user_id: uuid.UUID | None
    description: str
    ends_at: datetime
    event_type: str
    is_registered: bool
    location: str | None
    mode: str
    registration_url: str | None
    starts_at: datetime
    status: str
    summary: str
    timezone: str
    title: str
    updated_at: datetime


class EventListResponse(BaseModel):
    events: list[EventResponse]
    total: int
    limit: int
    offset: int
    has_more: bool
