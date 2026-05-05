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
