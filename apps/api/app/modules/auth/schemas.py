import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class RegisterRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=10, max_length=128)
    display_name: str = Field(min_length=2, max_length=160)
    first_name: str | None = Field(default=None, max_length=80)
    last_name: str | None = Field(default=None, max_length=80)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        value = value.strip().lower()
        if "@" not in value:
            raise ValueError("Enter a valid email address")
        return value

    @field_validator("display_name", "first_name", "last_name")
    @classmethod
    def strip_names(cls, value: str | None) -> str | None:
        return value.strip() if value else value


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=32)


class LogoutRequest(BaseModel):
    refresh_token: str = Field(min_length=32)


class ForgotPasswordRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=32)
    new_password: str = Field(min_length=10, max_length=128)


class VerifyEmailRequest(BaseModel):
    token: str = Field(min_length=32)


class DevTokenResponse(BaseModel):
    message: str
    dev_token: str | None = None


class AuthSessionInfo(BaseModel):
    id: uuid.UUID
    ip_address: str | None
    user_agent: str | None
    created_at: datetime
    expires_at: datetime
    revoked_at: datetime | None
    is_current: bool
    is_active: bool


class AuthSessionsResponse(BaseModel):
    sessions: list[AuthSessionInfo]


class SessionRevocationResponse(BaseModel):
    message: str
    revoked_session_id: uuid.UUID
    revoked_current_session: bool


class AdminSecurityEvent(BaseModel):
    id: uuid.UUID
    event_type: str
    user_id: uuid.UUID | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminAuditEvent(BaseModel):
    id: uuid.UUID
    event_type: str
    user_id: uuid.UUID | None
    user_email: str | None
    user_display_name: str | None
    ip_address: str | None
    user_agent: str | None
    metadata: dict | None
    created_at: datetime


class AdminAuditEventListResponse(BaseModel):
    events: list[AdminAuditEvent]
    total: int
    limit: int
    offset: int


class AdminOverview(BaseModel):
    total_users: int
    verified_users: int
    unverified_users: int
    active_sessions: int
    admin_users: int
    pending_verification_users: int
    latest_security_events: list[AdminSecurityEvent]


class AuthUser(BaseModel):
    id: uuid.UUID
    email: str
    display_name: str
    first_name: str | None
    last_name: str | None
    status: str
    email_verified_at: datetime | None
    roles: list[str]

    model_config = ConfigDict(from_attributes=True)


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: AuthUser
    dev_email_verification_token: str | None = None
