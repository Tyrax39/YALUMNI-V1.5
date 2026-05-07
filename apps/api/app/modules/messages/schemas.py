import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ConversationCreate(BaseModel):
    participant_user_id: uuid.UUID
    initial_message: str | None = Field(default=None, max_length=2000)

    @field_validator("initial_message")
    @classmethod
    def normalize_initial_message(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            return None
        return normalized


class MessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)

    @field_validator("body")
    @classmethod
    def normalize_body(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Message body is required")
        return normalized


class UserBlockCreate(BaseModel):
    blocked_user_id: uuid.UUID
    reason: str | None = Field(default=None, max_length=500)

    @field_validator("reason")
    @classmethod
    def normalize_reason(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class ConversationParticipantResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    display_name: str
    email: str
    role: str
    last_read_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_user_id: uuid.UUID | None
    sender_display_name: str
    body: str
    status: str
    sent_at: datetime
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationResponse(BaseModel):
    id: uuid.UUID
    conversation_type: str
    participants: list[ConversationParticipantResponse]
    last_message: MessageResponse | None
    unread_count: int
    last_message_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationListResponse(BaseModel):
    conversations: list[ConversationResponse]
    total: int
    limit: int
    offset: int
    has_more: bool


class MessageListResponse(BaseModel):
    messages: list[MessageResponse]
    total: int
    limit: int
    offset: int
    has_more: bool


class MessageReadResponse(BaseModel):
    conversation_id: uuid.UUID
    last_read_at: datetime
    unread_count: int


class UserBlockResponse(BaseModel):
    id: uuid.UUID
    blocker_user_id: uuid.UUID
    blocked_user_id: uuid.UUID
    blocked_display_name: str
    reason: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
