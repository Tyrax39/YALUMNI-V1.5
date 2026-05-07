import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

NOTIFICATION_DIGEST_FREQUENCIES = {"DAILY", "NONE", "WEEKLY"}


class NotificationResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    actor_user_id: uuid.UUID | None
    actor_display_name: str | None
    event_type: str
    title: str
    body: str | None
    target_url: str | None
    metadata: dict | None
    read_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationListResponse(BaseModel):
    notifications: list[NotificationResponse]
    total: int
    unread_count: int
    limit: int
    offset: int
    has_more: bool


class NotificationReadAllResponse(BaseModel):
    marked_read: int
    unread_count: int


class NotificationPreferenceResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    in_app_enabled: bool
    email_digest_frequency: str
    muted_event_types: list[str]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationPreferenceUpdate(BaseModel):
    in_app_enabled: bool | None = None
    email_digest_frequency: str | None = None
    muted_event_types: list[str] | None = Field(default=None, max_length=100)

    @field_validator("email_digest_frequency")
    @classmethod
    def normalize_digest_frequency(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().upper()
        if normalized not in NOTIFICATION_DIGEST_FREQUENCIES:
            raise ValueError("Invalid notification digest frequency")
        return normalized

    @field_validator("muted_event_types")
    @classmethod
    def normalize_muted_event_types(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None

        normalized_event_types: list[str] = []
        seen_event_types: set[str] = set()
        for event_type in value:
            normalized = event_type.strip().lower()
            if not normalized:
                continue
            if len(normalized) > 100:
                raise ValueError("Notification event type is too long")
            if not normalized.replace(".", "").replace("_", "").replace("-", "").isalnum():
                raise ValueError("Notification event type contains unsupported characters")
            if normalized not in seen_event_types:
                normalized_event_types.append(normalized)
                seen_event_types.add(normalized)

        return normalized_event_types
