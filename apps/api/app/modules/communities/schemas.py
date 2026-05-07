import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class CommunityCreate(BaseModel):
    name: str = Field(min_length=2, max_length=140)
    community_type: str = Field(default="COUNTRY_CHAPTER", max_length=40)
    description: str | None = Field(default=None, max_length=1200)
    country: str | None = Field(default=None, max_length=80)
    city: str | None = Field(default=None, max_length=100)
    sector: str | None = Field(default=None, max_length=120)
    program_name: str | None = Field(default=None, max_length=120)
    cohort_year: int | None = Field(default=None, ge=2000, le=2100)
    visibility: str = Field(default="MEMBER_ONLY", max_length=40)
    join_policy: str = Field(default="OPEN", max_length=40)

    @field_validator(
        "name",
        "description",
        "country",
        "city",
        "sector",
        "program_name",
        "community_type",
        "visibility",
        "join_policy",
    )
    @classmethod
    def normalize_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None

    @field_validator("community_type", "visibility", "join_policy")
    @classmethod
    def normalize_enums(cls, value: str) -> str:
        return value.strip().upper().replace(" ", "_")


class CommunityUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=140)
    community_type: str | None = Field(default=None, max_length=40)
    description: str | None = Field(default=None, max_length=1200)
    country: str | None = Field(default=None, max_length=80)
    city: str | None = Field(default=None, max_length=100)
    sector: str | None = Field(default=None, max_length=120)
    program_name: str | None = Field(default=None, max_length=120)
    cohort_year: int | None = Field(default=None, ge=2000, le=2100)
    visibility: str | None = Field(default=None, max_length=40)
    join_policy: str | None = Field(default=None, max_length=40)

    @field_validator(
        "name",
        "description",
        "country",
        "city",
        "sector",
        "program_name",
        "community_type",
        "visibility",
        "join_policy",
    )
    @classmethod
    def normalize_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None

    @field_validator("community_type", "visibility", "join_policy")
    @classmethod
    def normalize_enums(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip().upper().replace(" ", "_")


class CommunityResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    community_type: str
    description: str | None
    country: str | None
    city: str | None
    sector: str | None
    program_name: str | None
    cohort_year: int | None
    visibility: str
    join_policy: str
    member_count: int
    membership_status: str | None
    membership_role: str | None
    created_at: datetime


class CommunityListResponse(BaseModel):
    communities: list[CommunityResponse]
    total: int
    limit: int
    offset: int
    has_more: bool


class CommunityMemberRoleUpdate(BaseModel):
    role: str = Field(max_length=40)

    @field_validator("role")
    @classmethod
    def normalize_role(cls, value: str) -> str:
        return value.strip().upper().replace(" ", "_")


class CommunityOwnershipTransfer(BaseModel):
    new_owner_membership_id: uuid.UUID


class CommunityPostCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)

    @field_validator("body")
    @classmethod
    def normalize_body(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Post body is required")
        return value


class CommunityPostCommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=1000)

    @field_validator("body")
    @classmethod
    def normalize_body(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Comment body is required")
        return value


class CommunityPostReactionCreate(BaseModel):
    reaction_type: str = Field(default="LIKE", max_length=40)

    @field_validator("reaction_type")
    @classmethod
    def normalize_reaction_type(cls, value: str) -> str:
        return value.strip().upper().replace(" ", "_")


class CommunityPostReportCreate(BaseModel):
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
        value = value.strip()
        return value or None


class CommunityModerationReviewUpdate(BaseModel):
    moderator_note: str | None = Field(default=None, max_length=2000)
    severity: str | None = Field(default=None, max_length=40)
    escalation_status: str | None = Field(default=None, max_length=40)

    @field_validator("moderator_note")
    @classmethod
    def normalize_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None

    @field_validator("severity", "escalation_status")
    @classmethod
    def normalize_enums(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip().upper().replace(" ", "_")


class CommunityInvitationCreate(BaseModel):
    email: str = Field(max_length=320, pattern=EMAIL_PATTERN)
    role: str = Field(default="MEMBER", max_length=40)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("role")
    @classmethod
    def normalize_role(cls, value: str) -> str:
        return value.strip().upper().replace(" ", "_")


class CommunityInvitationAccept(BaseModel):
    token: str = Field(min_length=20, max_length=256)


class CommunityMemberResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    display_name: str
    email: str
    role: str
    status: str
    joined_at: datetime | None
    created_at: datetime


class CommunityMemberListResponse(BaseModel):
    members: list[CommunityMemberResponse]
    total: int
    limit: int
    offset: int
    has_more: bool


class CommunityInvitationResponse(BaseModel):
    id: uuid.UUID
    community_id: uuid.UUID
    invited_email: str
    invited_role: str
    status: str
    invited_by_user_id: uuid.UUID | None
    accepted_by_user_id: uuid.UUID | None
    accepted_at: datetime | None
    canceled_at: datetime | None
    expires_at: datetime
    created_at: datetime
    dev_invitation_token: str | None = None


class CommunityInvitationListResponse(BaseModel):
    invitations: list[CommunityInvitationResponse]
    total: int
    limit: int
    offset: int
    has_more: bool


class CommunityPostMediaResponse(BaseModel):
    id: uuid.UUID
    post_id: uuid.UUID
    uploaded_by_user_id: uuid.UUID | None
    file_name: str
    content_type: str
    file_size_bytes: int
    alt_text: str | None
    status: str
    removed_by_user_id: uuid.UUID | None
    removed_at: datetime | None
    download_url: str
    created_at: datetime
    updated_at: datetime


class CommunityPostResponse(BaseModel):
    id: uuid.UUID
    community_id: uuid.UUID
    author_user_id: uuid.UUID | None
    author_display_name: str
    body: str
    status: str
    removed_by_user_id: uuid.UUID | None
    removed_at: datetime | None
    moderation_note: str | None
    moderation_severity: str | None
    escalation_status: str | None
    escalated_by_user_id: uuid.UUID | None
    escalated_at: datetime | None
    comment_count: int
    reaction_count: int
    viewer_reacted: bool
    open_report_count: int
    media: list[CommunityPostMediaResponse]
    created_at: datetime
    updated_at: datetime


class CommunityPostListResponse(BaseModel):
    posts: list[CommunityPostResponse]
    total: int
    limit: int
    offset: int
    has_more: bool


class CommunityPostCommentResponse(BaseModel):
    id: uuid.UUID
    post_id: uuid.UUID
    author_user_id: uuid.UUID | None
    author_display_name: str
    body: str
    status: str
    removed_by_user_id: uuid.UUID | None
    removed_at: datetime | None
    moderation_note: str | None
    moderation_severity: str | None
    escalation_status: str | None
    escalated_by_user_id: uuid.UUID | None
    escalated_at: datetime | None
    created_at: datetime
    updated_at: datetime


class CommunityPostCommentListResponse(BaseModel):
    comments: list[CommunityPostCommentResponse]
    total: int
    limit: int
    offset: int
    has_more: bool


class CommunityPostReactionResponse(BaseModel):
    post_id: uuid.UUID
    reaction_type: str
    reacted: bool
    reaction_count: int


class CommunityPostReportResponse(BaseModel):
    id: uuid.UUID
    post_id: uuid.UUID
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


class CommunityPostReportListResponse(BaseModel):
    reports: list[CommunityPostReportResponse]
    total: int
    limit: int
    offset: int
    has_more: bool


class CommunityPostReportQueueItem(CommunityPostReportResponse):
    post_author_display_name: str
    post_body: str
    post_status: str
    post_removed_at: datetime | None
    post_created_at: datetime


class CommunityPostReportQueueResponse(BaseModel):
    reports: list[CommunityPostReportQueueItem]
    total: int
    limit: int
    offset: int
    has_more: bool


class CommunityAdminPostReportQueueItem(CommunityPostReportQueueItem):
    community_id: uuid.UUID
    community_name: str
    community_slug: str


class CommunityAdminPostReportQueueResponse(BaseModel):
    reports: list[CommunityAdminPostReportQueueItem]
    total: int
    limit: int
    offset: int
    has_more: bool


class CommunityRemovedPostQueueItem(CommunityPostResponse):
    removed_by_display_name: str


class CommunityRemovedPostQueueResponse(BaseModel):
    posts: list[CommunityRemovedPostQueueItem]
    total: int
    limit: int
    offset: int
    has_more: bool


class CommunityAdminRemovedPostQueueItem(CommunityRemovedPostQueueItem):
    community_name: str
    community_slug: str


class CommunityAdminRemovedPostQueueResponse(BaseModel):
    posts: list[CommunityAdminRemovedPostQueueItem]
    total: int
    limit: int
    offset: int
    has_more: bool


class CommunityRemovedCommentQueueItem(CommunityPostCommentResponse):
    removed_by_display_name: str
    post_author_display_name: str
    post_body: str
    post_status: str
    post_created_at: datetime


class CommunityRemovedCommentQueueResponse(BaseModel):
    comments: list[CommunityRemovedCommentQueueItem]
    total: int
    limit: int
    offset: int
    has_more: bool


class CommunityAdminRemovedCommentQueueItem(CommunityRemovedCommentQueueItem):
    community_id: uuid.UUID
    community_name: str
    community_slug: str


class CommunityAdminRemovedCommentQueueResponse(BaseModel):
    comments: list[CommunityAdminRemovedCommentQueueItem]
    total: int
    limit: int
    offset: int
    has_more: bool
