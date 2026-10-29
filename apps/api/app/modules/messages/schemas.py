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


class IntroductionRequestCreate(BaseModel):
    recipient_user_id: uuid.UUID
    note: str | None = Field(default=None, max_length=1200)

    @field_validator("note")
    @classmethod
    def normalize_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class IntroductionRequestReview(BaseModel):
    note: str | None = Field(default=None, max_length=1200)

    @field_validator("note")
    @classmethod
    def normalize_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class MessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)

    @field_validator("body")
    @classmethod
    def normalize_body(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Message body is required")
        return normalized


class MessageReportCreate(BaseModel):
    reason: str = Field(default="OTHER", max_length=80)
    note: str | None = Field(default=None, max_length=1000)

    @field_validator("reason")
    @classmethod
    def normalize_reason(cls, value: str) -> str:
        value = value.strip().upper().replace(" ", "_")
        return value or "OTHER"

    @field_validator("note")
    @classmethod
    def normalize_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class MessageModerationReviewUpdate(BaseModel):
    moderator_note: str | None = Field(default=None, max_length=2000)
    severity: str | None = Field(default=None, max_length=40)
    escalation_status: str | None = Field(default=None, max_length=40)

    @field_validator("moderator_note")
    @classmethod
    def normalize_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("severity", "escalation_status")
    @classmethod
    def normalize_enums(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip().upper().replace(" ", "_")


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
    removed_by_user_id: uuid.UUID | None
    removed_at: datetime | None
    moderation_note: str | None
    moderation_severity: str | None
    escalation_status: str | None
    escalated_by_user_id: uuid.UUID | None
    escalated_at: datetime | None
    sent_at: datetime
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MessageReportResponse(BaseModel):
    id: uuid.UUID
    message_id: uuid.UUID
    conversation_id: uuid.UUID
    reporter_user_id: uuid.UUID | None
    reporter_display_name: str
    reason: str
    note: str | None
    status: str
    moderator_note: str | None
    severity: str | None
    escalation_status: str | None
    escalated_by_user_id: uuid.UUID | None
    escalated_at: datetime | None
    resolved_by_user_id: uuid.UUID | None
    resolved_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MessageReportQueueItem(MessageReportResponse):
    sender_display_name: str
    sender_user_id: uuid.UUID | None
    message_body: str
    message_status: str
    message_removed_at: datetime | None
    message_sent_at: datetime


class MessageReportQueueResponse(BaseModel):
    reports: list[MessageReportQueueItem]
    total: int
    limit: int
    offset: int
    has_more: bool


class RemovedMessageQueueItem(MessageResponse):
    removed_by_display_name: str
    report_count: int


class RemovedMessageQueueResponse(BaseModel):
    messages: list[RemovedMessageQueueItem]
    total: int
    limit: int
    offset: int
    has_more: bool


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


class IntroductionRequestResponse(BaseModel):
    id: uuid.UUID
    requester_user_id: uuid.UUID
    requester_display_name: str
    requester_email: str
    recipient_user_id: uuid.UUID
    recipient_display_name: str
    recipient_email: str
    conversation_id: uuid.UUID | None
    note: str | None
    status: str
    responded_by_user_id: uuid.UUID | None
    responded_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IntroductionRequestListResponse(BaseModel):
    incoming: list[IntroductionRequestResponse]
    outgoing: list[IntroductionRequestResponse]
    actionable_count: int
