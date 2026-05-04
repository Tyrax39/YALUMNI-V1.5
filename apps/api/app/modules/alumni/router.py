import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.core.database import get_db_session
from app.core.permissions import GlobalRole
from app.core.security import utcnow
from app.modules.alumni.models import AlumniProfile, ProgramAffiliation, VerificationRequest
from app.modules.alumni.schemas import (
    AlumniProfileResponse,
    AlumniProfileUpdate,
    ProgramAffiliationCreate,
    VerificationRequestCreate,
    VerificationRequestListResponse,
    VerificationRequestResponse,
    VerificationReviewAction,
)
from app.modules.auth.dependencies import get_current_user, require_roles
from app.modules.auth.models import Role, RoleAssignment, SecurityEvent, User

router = APIRouter()
verification_admin_dependency = require_roles(
    GlobalRole.SUPER_ADMIN.value,
    GlobalRole.PLATFORM_ADMIN.value,
    GlobalRole.VERIFICATION_ADMIN.value,
)

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
PENDING_VERIFICATION_STATUS = "PENDING_REVIEW"
VERIFICATION_REVIEWED_STATUSES = {
    "APPROVED",
    "REJECTED",
    "MORE_INFO_REQUESTED",
}


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


def _serialize_verification_request(
    verification_request: VerificationRequest,
) -> VerificationRequestResponse:
    profile = verification_request.profile
    user = profile.user
    return VerificationRequestResponse(
        id=verification_request.id,
        profile_id=verification_request.profile_id,
        user_id=profile.user_id,
        display_name=user.display_name,
        email=user.email,
        request_type=verification_request.request_type,
        status=verification_request.status,
        submitted_note=verification_request.submitted_note,
        reviewer_note=verification_request.reviewer_note,
        profile_snapshot=verification_request.profile_snapshot,
        reviewed_by_user_id=verification_request.reviewed_by_user_id,
        reviewed_at=verification_request.reviewed_at,
        created_at=verification_request.created_at,
        updated_at=verification_request.updated_at,
    )


def _profile_snapshot(profile: AlumniProfile) -> dict:
    return {
        "completion_percentage": _completion_percentage(profile),
        "headline": profile.headline,
        "bio": profile.bio,
        "country": profile.country,
        "city": profile.city,
        "sector": profile.sector,
        "organization": profile.organization,
        "job_title": profile.job_title,
        "skills": profile.skills or [],
        "program_affiliations": [
            {
                "program_name": affiliation.program_name,
                "cohort_year": affiliation.cohort_year,
                "country": affiliation.country,
                "city": affiliation.city,
                "status": affiliation.status,
            }
            for affiliation in profile.program_affiliations
        ],
    }


def _create_security_event(
    db: Session,
    request: Request,
    user: User | None,
    event_type: str,
) -> None:
    user_agent = request.headers.get("user-agent")
    if user_agent and len(user_agent) > 255:
        user_agent = user_agent[:255]

    db.add(
        SecurityEvent(
            user_id=user.id if user else None,
            event_type=event_type,
            ip_address=request.client.host if request.client else None,
            user_agent=user_agent,
        )
    )


def _ensure_role(db: Session, role_name: str) -> Role:
    role = db.scalar(select(Role).where(Role.name == role_name))
    if role:
        return role

    role = Role(name=role_name)
    db.add(role)
    db.flush()
    return role


def _assign_alumni_member_role(db: Session, user: User) -> None:
    role = _ensure_role(db, GlobalRole.ALUMNI_MEMBER.value)
    assignment = db.scalar(
        select(RoleAssignment).where(
            RoleAssignment.user_id == user.id,
            RoleAssignment.role_id == role.id,
            RoleAssignment.scope_type == "GLOBAL",
            RoleAssignment.scope_id.is_(None),
        )
    )
    if assignment is None:
        db.add(RoleAssignment(user_id=user.id, role_id=role.id))


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


def _verification_request_options():
    return (
        joinedload(VerificationRequest.profile).joinedload(AlumniProfile.user),
        joinedload(VerificationRequest.profile).selectinload(
            AlumniProfile.program_affiliations
        ),
    )


def _get_verification_request_or_404(
    db: Session,
    verification_request_id: uuid.UUID,
) -> VerificationRequest:
    verification_request = db.scalar(
        select(VerificationRequest)
        .options(*_verification_request_options())
        .where(VerificationRequest.id == verification_request_id)
    )
    if verification_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification request not found",
        )

    return verification_request


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


@router.get("/me/verification-requests", response_model=VerificationRequestListResponse)
def list_my_verification_requests(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> VerificationRequestListResponse:
    profile = _get_or_create_profile(db, current_user)
    verification_requests = db.scalars(
        select(VerificationRequest)
        .options(*_verification_request_options())
        .where(VerificationRequest.profile_id == profile.id)
        .order_by(VerificationRequest.created_at.desc())
    ).all()

    return VerificationRequestListResponse(
        requests=[
            _serialize_verification_request(verification_request)
            for verification_request in verification_requests
        ]
    )


@router.post(
    "/me/verification-requests",
    response_model=VerificationRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
def submit_my_verification_request(
    payload: VerificationRequestCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> VerificationRequestResponse:
    profile = _get_or_create_profile(db, current_user)
    if _completion_percentage(profile) < 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complete your profile before submitting a verification request",
        )

    pending_request = db.scalar(
        select(VerificationRequest).where(
            VerificationRequest.profile_id == profile.id,
            VerificationRequest.status == PENDING_VERIFICATION_STATUS,
        )
    )
    if pending_request:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A verification request is already pending review",
        )

    verification_request = VerificationRequest(
        profile_id=profile.id,
        request_type=payload.request_type,
        status=PENDING_VERIFICATION_STATUS,
        submitted_note=payload.submitted_note,
        profile_snapshot=_profile_snapshot(profile),
    )
    db.add(verification_request)
    _create_security_event(db, request, current_user, "alumni.verification_submitted")
    db.commit()
    verification_request = _get_verification_request_or_404(db, verification_request.id)
    return _serialize_verification_request(verification_request)


@router.get("/admin/verification-requests", response_model=VerificationRequestListResponse)
def list_verification_requests_for_admin(
    current_user: Annotated[User, Depends(verification_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
    status_filter: Annotated[str, Query(alias="status")] = PENDING_VERIFICATION_STATUS,
) -> VerificationRequestListResponse:
    _ = current_user
    normalized_status = status_filter.strip().upper().replace(" ", "_")
    query = select(VerificationRequest).options(*_verification_request_options())
    if normalized_status != "ALL":
        query = query.where(VerificationRequest.status == normalized_status)

    verification_requests = db.scalars(
        query.order_by(VerificationRequest.created_at.desc()).limit(50)
    ).all()
    return VerificationRequestListResponse(
        requests=[
            _serialize_verification_request(verification_request)
            for verification_request in verification_requests
        ]
    )


@router.post(
    "/admin/verification-requests/{verification_request_id}/approve",
    response_model=VerificationRequestResponse,
)
def approve_verification_request(
    verification_request_id: uuid.UUID,
    payload: VerificationReviewAction,
    request: Request,
    current_user: Annotated[User, Depends(verification_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> VerificationRequestResponse:
    return _review_verification_request(
        db=db,
        request=request,
        current_user=current_user,
        verification_request_id=verification_request_id,
        reviewer_note=payload.reviewer_note,
        new_status="APPROVED",
    )


@router.post(
    "/admin/verification-requests/{verification_request_id}/reject",
    response_model=VerificationRequestResponse,
)
def reject_verification_request(
    verification_request_id: uuid.UUID,
    payload: VerificationReviewAction,
    request: Request,
    current_user: Annotated[User, Depends(verification_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> VerificationRequestResponse:
    return _review_verification_request(
        db=db,
        request=request,
        current_user=current_user,
        verification_request_id=verification_request_id,
        reviewer_note=payload.reviewer_note,
        new_status="REJECTED",
    )


@router.post(
    "/admin/verification-requests/{verification_request_id}/request-info",
    response_model=VerificationRequestResponse,
)
def request_more_verification_info(
    verification_request_id: uuid.UUID,
    payload: VerificationReviewAction,
    request: Request,
    current_user: Annotated[User, Depends(verification_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> VerificationRequestResponse:
    return _review_verification_request(
        db=db,
        request=request,
        current_user=current_user,
        verification_request_id=verification_request_id,
        reviewer_note=payload.reviewer_note,
        new_status="MORE_INFO_REQUESTED",
    )


def _review_verification_request(
    *,
    db: Session,
    request: Request,
    current_user: User,
    verification_request_id: uuid.UUID,
    reviewer_note: str | None,
    new_status: str,
) -> VerificationRequestResponse:
    if new_status not in VERIFICATION_REVIEWED_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")

    verification_request = _get_verification_request_or_404(db, verification_request_id)
    if verification_request.status != PENDING_VERIFICATION_STATUS:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only pending verification requests can be reviewed",
        )

    verification_request.status = new_status
    verification_request.reviewer_note = reviewer_note
    verification_request.reviewed_by_user_id = current_user.id
    verification_request.reviewed_at = utcnow()

    if new_status == "APPROVED":
        _assign_alumni_member_role(db, verification_request.profile.user)

    event_suffix = new_status.lower()
    _create_security_event(
        db,
        request,
        verification_request.profile.user,
        f"admin.verification_{event_suffix}",
    )
    db.commit()
    verification_request = _get_verification_request_or_404(db, verification_request_id)
    return _serialize_verification_request(verification_request)
