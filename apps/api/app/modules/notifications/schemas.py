import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


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
