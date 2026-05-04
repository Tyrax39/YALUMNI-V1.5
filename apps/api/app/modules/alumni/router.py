import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db_session
from app.core.security import utcnow
from app.modules.alumni.models import AlumniProfile, ProgramAffiliation
from app.modules.alumni.schemas import (
    AlumniProfileResponse,
    AlumniProfileUpdate,
    ProgramAffiliationCreate,
)
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.models import User

router = APIRouter()

DEFAULT_VISIBILITY = {
    "email": False,
    "location": True,
    "organization": True,
    "program": True,
    "skills": True,
}

COMPLETION_FIELDS = (
    "headline",
    "bio",
    "country",
    "sector",
    "organization",
    "job_title",
    "skills",
    "program_affiliations",
)


def _completion_percentage(profile: AlumniProfile) -> int:
    completed = 0
    for field_name in COMPLETION_FIELDS:
        value = getattr(profile, field_name)
        if isinstance(value, list):
            completed += int(len(value) > 0)
        else:
            completed += int(bool(value))

    return round((completed / len(COMPLETION_FIELDS)) * 100)


def _sync_completion(profile: AlumniProfile) -> None:
    if _completion_percentage(profile) >= 100:
        profile.profile_completed_at = profile.profile_completed_at or utcnow()
        return

    profile.profile_completed_at = None


def _serialize_profile(profile: AlumniProfile) -> AlumniProfileResponse:
    return AlumniProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        headline=profile.headline,
        bio=profile.bio,
        country=profile.country,
        city=profile.city,
        sector=profile.sector,
        organization=profile.organization,
        job_title=profile.job_title,
        linkedin_url=profile.linkedin_url,
        website_url=profile.website_url,
        skills=profile.skills or [],
        visibility=profile.visibility or DEFAULT_VISIBILITY.copy(),
        profile_completed_at=profile.profile_completed_at,
        completion_percentage=_completion_percentage(profile),
        program_affiliations=profile.program_affiliations,
    )


def _get_profile_query(user: User):
    return (
        select(AlumniProfile)
        .options(selectinload(AlumniProfile.program_affiliations))
        .where(AlumniProfile.user_id == user.id)
    )


def _get_or_create_profile(db: Session, user: User) -> AlumniProfile:
    profile = db.scalar(_get_profile_query(user))
    if profile:
        return profile

    profile = AlumniProfile(
        user_id=user.id,
        skills=[],
        visibility=DEFAULT_VISIBILITY.copy(),
    )
    db.add(profile)
    db.commit()
    return db.scalar(_get_profile_query(user)) or profile


@router.get("/me/profile", response_model=AlumniProfileResponse)
def get_my_profile(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> AlumniProfileResponse:
    profile = _get_or_create_profile(db, current_user)
    return _serialize_profile(profile)


@router.patch("/me/profile", response_model=AlumniProfileResponse)
def update_my_profile(
    payload: AlumniProfileUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> AlumniProfileResponse:
    profile = _get_or_create_profile(db, current_user)
    updates = payload.model_dump(exclude_unset=True)

    if "visibility" in updates and updates["visibility"] is not None:
        updates["visibility"] = {
            **DEFAULT_VISIBILITY,
            **updates["visibility"],
        }

    for field_name, value in updates.items():
        setattr(profile, field_name, value)

    _sync_completion(profile)
    db.commit()
    profile = db.scalar(_get_profile_query(current_user)) or profile
    return _serialize_profile(profile)


@router.post(
    "/me/program-affiliations",
    response_model=AlumniProfileResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_my_program_affiliation(
    payload: ProgramAffiliationCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> AlumniProfileResponse:
    profile = _get_or_create_profile(db, current_user)
    affiliation = ProgramAffiliation(
        profile_id=profile.id,
        program_name=payload.program_name,
        cohort_year=payload.cohort_year,
        country=payload.country,
        city=payload.city,
        status=payload.status,
    )
    db.add(affiliation)
    db.flush()
    db.expire(profile, ["program_affiliations"])
    _sync_completion(profile)
    db.commit()
    profile = db.scalar(_get_profile_query(current_user)) or profile
    return _serialize_profile(profile)


@router.delete("/me/program-affiliations/{affiliation_id}", response_model=AlumniProfileResponse)
def delete_my_program_affiliation(
    affiliation_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> AlumniProfileResponse:
    profile = _get_or_create_profile(db, current_user)
    affiliation = db.scalar(
        select(ProgramAffiliation).where(
            ProgramAffiliation.id == affiliation_id,
            ProgramAffiliation.profile_id == profile.id,
        )
    )
    if not affiliation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Program not found")

    db.delete(affiliation)
    db.flush()
    db.expire(profile, ["program_affiliations"])
    _sync_completion(profile)
    db.commit()
    profile = db.scalar(_get_profile_query(current_user)) or profile
    return _serialize_profile(profile)
