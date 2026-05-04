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
    program_affiliations: list[ProgramAffiliationResponse]

    model_config = ConfigDict(from_attributes=True)
