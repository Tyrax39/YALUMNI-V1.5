import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ProgramAffiliationCreate(BaseModel):
    program_name: str = Field(min_length=2, max_length=120)
    cohort_year: int | None = Field(default=None, ge=2000, le=2100)
    country: str | None = Field(default=None, max_length=80)
    city: str | None = Field(default=None, max_length=100)
    status: str = Field(default="COMPLETED", max_length=40)

    @field_validator("program_name", "country", "city", "status")
    @classmethod
    def normalize_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None

    @field_validator("status")
    @classmethod
    def normalize_status(cls, value: str) -> str:
        return value.strip().upper().replace(" ", "_")


class ProgramAffiliationResponse(BaseModel):
    id: uuid.UUID
    program_name: str
    cohort_year: int | None
    country: str | None
    city: str | None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AlumniProfileUpdate(BaseModel):
    headline: str | None = Field(default=None, max_length=180)
    bio: str | None = Field(default=None, max_length=1800)
    country: str | None = Field(default=None, max_length=80)
    city: str | None = Field(default=None, max_length=100)
    sector: str | None = Field(default=None, max_length=120)
    organization: str | None = Field(default=None, max_length=160)
    job_title: str | None = Field(default=None, max_length=160)
    linkedin_url: str | None = Field(default=None, max_length=255)
    website_url: str | None = Field(default=None, max_length=255)
    skills: list[str] | None = Field(default=None, max_length=20)
    visibility: dict[str, bool] | None = None

    @field_validator(
        "headline",
        "bio",
        "country",
        "city",
        "sector",
        "organization",
        "job_title",
        "linkedin_url",
        "website_url",
    )
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None

    @field_validator("skills")
    @classmethod
    def normalize_skills(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        normalized = []
        seen = set()
        for skill in value:
            cleaned = skill.strip()
            key = cleaned.lower()
            if cleaned and key not in seen:
                normalized.append(cleaned[:60])
                seen.add(key)
        return normalized[:20]


class AlumniProfileResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    headline: str | None
    bio: str | None
    country: str | None
    city: str | None
    sector: str | None
    organization: str | None
    job_title: str | None
    linkedin_url: str | None
    website_url: str | None
    skills: list[str]
    visibility: dict[str, bool]
    profile_completed_at: datetime | None
    completion_percentage: int
    profile_photo_url: str | None
    profile_photo_file_name: str | None
    profile_photo_content_type: str | None
    profile_photo_file_size_bytes: int | None
    profile_photo_updated_at: datetime | None
    program_affiliations: list[ProgramAffiliationResponse]

    model_config = ConfigDict(from_attributes=True)


class OnboardingWorkflowStateUpdate(BaseModel):
    current_step_key: str | None = Field(default=None, max_length=80)
    completed_step_keys: list[str] | None = Field(default=None, max_length=8)
    mark_complete: bool | None = None

    @field_validator("current_step_key")
    @classmethod
    def normalize_step_key(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower().replace(" ", "-")
        return normalized or None

    @field_validator("completed_step_keys")
    @classmethod
    def normalize_completed_step_keys(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        normalized: list[str] = []
        seen: set[str] = set()
        for item in value:
            cleaned = item.strip().lower().replace(" ", "-")
            if cleaned and cleaned not in seen:
                normalized.append(cleaned[:80])
                seen.add(cleaned)
        return normalized[:8]


class OnboardingWorkflowStateResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    current_step_key: str | None
    completed_step_keys: list[str]
    last_viewed_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VerificationRequestCreate(BaseModel):
    request_type: str = Field(default="ALUMNI_IDENTITY", max_length=60)
    submitted_note: str | None = Field(default=None, max_length=1200)

    @field_validator("request_type")
    @classmethod
    def normalize_request_type(cls, value: str) -> str:
        return value.strip().upper().replace(" ", "_") or "ALUMNI_IDENTITY"

    @field_validator("submitted_note")
    @classmethod
    def normalize_submitted_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class VerificationReviewAction(BaseModel):
    reviewer_note: str | None = Field(default=None, max_length=1200)

    @field_validator("reviewer_note")
    @classmethod
    def normalize_reviewer_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class VerificationEvidenceResponse(BaseModel):
    id: uuid.UUID
    label: str | None
    file_name: str
    content_type: str
    file_size_bytes: int
    storage_provider: str
    uploaded_by_user_id: uuid.UUID | None
    created_at: datetime


class VerificationRequestResponse(BaseModel):
    id: uuid.UUID
    profile_id: uuid.UUID
    user_id: uuid.UUID
    display_name: str
    email: str
    request_type: str
    status: str
    submitted_note: str | None
    reviewer_note: str | None
    profile_snapshot: dict
    reviewed_by_user_id: uuid.UUID | None
    reviewed_at: datetime | None
    created_at: datetime
    updated_at: datetime
    evidence: list[VerificationEvidenceResponse]


class VerificationRequestListResponse(BaseModel):
    requests: list[VerificationRequestResponse]


class AlumniDirectoryProgramResponse(BaseModel):
    program_name: str
    cohort_year: int | None
    country: str | None
    city: str | None
    status: str


class AlumniDirectoryProfileResponse(BaseModel):
    user_id: uuid.UUID
    display_name: str
    email: str | None
    headline: str | None
    country: str | None
    city: str | None
    sector: str | None
    organization: str | None
    job_title: str | None
    profile_photo_url: str | None
    skills: list[str]
    program_affiliations: list[AlumniDirectoryProgramResponse]
    profile_completed_at: datetime | None


class AlumniDirectorySearchResponse(BaseModel):
    profiles: list[AlumniDirectoryProfileResponse]
    total: int
    limit: int
    offset: int
    has_more: bool


class MwfAlumniProfileResponse(BaseModel):
    source_id: int
    display_name: str
    first_name: str | None
    last_name: str | None
    country_slug: str | None
    country_label: str | None
    bio: str | None
    field_of_study: str | None
    expertise_labels: list[str]
    leadership_institute: str | None
    us_state: str | None
    program_years: list[str]
    image_url: str | None
    source_detail_url: str | None
    last_seen_at: datetime


class MwfAlumniSyncRunResponse(BaseModel):
    id: uuid.UUID
    source_url: str
    status: str
    started_at: datetime
    finished_at: datetime | None
    fetched_count: int
    imported_count: int
    updated_count: int
    deactivated_count: int
    error_message: str | None

    model_config = ConfigDict(from_attributes=True)


class MwfAlumniSyncStatusResponse(BaseModel):
    active_profile_count: int
    cache_stale: bool
    cache_empty: bool
    sync_in_progress: bool
    cache_ttl_hours: int
    worker_interval_seconds: int
    last_synced_at: datetime | None
    latest_run: MwfAlumniSyncRunResponse | None


class MwfAlumniSyncRunListResponse(BaseModel):
    runs: list[MwfAlumniSyncRunResponse]
    total: int
    limit: int


class MwfAlumniSearchResponse(BaseModel):
    profiles: list[MwfAlumniProfileResponse]
    total: int
    limit: int
    offset: int
    has_more: bool
    sync: MwfAlumniSyncStatusResponse
