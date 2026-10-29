import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db_session
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.models import SecurityEvent, User
from app.modules.mentorship.models import MentorProfile, MentorshipRequest
from app.modules.mentorship.schemas import (
    MentorProfileListResponse,
    MentorProfileResponse,
    MentorProfileUpsert,
    MentorshipRequestCreate,
    MentorshipRequestListResponse,
    MentorshipRequestResponse,
    MentorshipRequestReview,
    MentorshipSummaryResponse,
)

router = APIRouter()

AVAILABILITY_STATUSES = {"AVAILABLE", "LIMITED", "PAUSED"}
MEETING_FORMATS = {"HYBRID", "IN_PERSON", "PHONE", "VIRTUAL"}
ACTIVE_REQUEST_STATUSES = {"PENDING", "ACCEPTED"}


def _request_context(request: Request) -> tuple[str | None, str | None]:
    user_agent = request.headers.get("user-agent")
    if user_agent and len(user_agent) > 255:
        user_agent = user_agent[:255]
    return request.client.host if request.client else None, user_agent


def _create_security_event(
    db: Session,
    request: Request,
    user: User,
    event_type: str,
    metadata: dict | None = None,
) -> None:
    ip_address, user_agent = _request_context(request)
    db.add(
        SecurityEvent(
            user_id=user.id,
            event_type=event_type,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata_json=metadata,
        )
    )


def _normalize_query_enum(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().upper().replace(" ", "_").replace("-", "_")
    return normalized or None


def _validate_profile_payload(payload: MentorProfileUpsert) -> None:
    if payload.availability_status not in AVAILABILITY_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid availability status",
        )
    if payload.preferred_meeting_format not in MEETING_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid meeting format",
        )


def _profile_options():
    return [joinedload(MentorProfile.user)]


def _request_options():
    return [
        joinedload(MentorshipRequest.mentor_profile).joinedload(MentorProfile.user),
        joinedload(MentorshipRequest.requester),
    ]


def _get_profile_by_id_or_404(db: Session, profile_id: uuid.UUID) -> MentorProfile:
    profile = db.scalar(
        select(MentorProfile).options(*_profile_options()).where(MentorProfile.id == profile_id)
    )
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mentor not found")
    return profile


def _get_request_or_404(db: Session, request_id: uuid.UUID) -> MentorshipRequest:
    mentorship_request = db.scalar(
        select(MentorshipRequest)
        .options(*_request_options())
        .where(MentorshipRequest.id == request_id)
    )
    if mentorship_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mentorship request not found",
        )
    return mentorship_request


def _get_my_profile(db: Session, current_user: User) -> MentorProfile | None:
    return db.scalar(
        select(MentorProfile)
        .options(*_profile_options())
        .where(MentorProfile.user_id == current_user.id)
    )


def _active_request_counts(db: Session, profile_ids: list[uuid.UUID]) -> dict[uuid.UUID, int]:
    if not profile_ids:
        return {}
    rows = db.execute(
        select(MentorshipRequest.mentor_profile_id, func.count())
        .where(
            MentorshipRequest.mentor_profile_id.in_(profile_ids),
            MentorshipRequest.status.in_(ACTIVE_REQUEST_STATUSES),
        )
        .group_by(MentorshipRequest.mentor_profile_id)
    ).all()
    return {profile_id: count for profile_id, count in rows}


def _serialize_profile(
    profile: MentorProfile,
    *,
    active_request_count: int = 0,
) -> MentorProfileResponse:
    return MentorProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        display_name=profile.user.display_name,
        headline=profile.headline,
        bio=profile.bio,
        expertise_areas=profile.expertise_areas or [],
        sectors=profile.sectors or [],
        countries=profile.countries or [],
        availability_status=profile.availability_status,
        preferred_meeting_format=profile.preferred_meeting_format,
        max_active_mentees=profile.max_active_mentees,
        years_experience=profile.years_experience,
        is_active=profile.is_active,
        is_accepting_requests=profile.is_accepting_requests,
        active_request_count=active_request_count,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


def _serialize_request(mentorship_request: MentorshipRequest) -> MentorshipRequestResponse:
    mentor_profile = mentorship_request.mentor_profile
    return MentorshipRequestResponse(
        id=mentorship_request.id,
        mentor_profile_id=mentor_profile.id,
        mentor_user_id=mentor_profile.user_id,
        mentor_display_name=mentor_profile.user.display_name,
        requester_user_id=mentorship_request.requester_user_id,
        requester_display_name=mentorship_request.requester.display_name,
        focus_area=mentorship_request.focus_area,
        goals=mentorship_request.goals,
        message=mentorship_request.message,
        status=mentorship_request.status,
        reviewer_note=mentorship_request.reviewer_note,
        created_at=mentorship_request.created_at,
        updated_at=mentorship_request.updated_at,
    )


def _mentor_query():
    return select(MentorProfile).options(*_profile_options())


def _apply_mentor_filters(
    query,
    *,
    availability_status: str | None = None,
    country: str | None = None,
    expertise: str | None = None,
    q: str | None = None,
    sector: str | None = None,
):
    if q:
        term = f"%{q.strip()}%"
        query = query.join(User, MentorProfile.user_id == User.id).where(
            or_(
                User.display_name.ilike(term),
                MentorProfile.headline.ilike(term),
                MentorProfile.bio.ilike(term),
                cast(MentorProfile.expertise_areas, String).ilike(term),
                cast(MentorProfile.sectors, String).ilike(term),
                cast(MentorProfile.countries, String).ilike(term),
            )
        )
    normalized_availability = _normalize_query_enum(availability_status)
    if normalized_availability:
        query = query.where(MentorProfile.availability_status == normalized_availability)
    if country:
        query = query.where(cast(MentorProfile.countries, String).ilike(f"%{country.strip()}%"))
    if expertise:
        query = query.where(
            cast(MentorProfile.expertise_areas, String).ilike(f"%{expertise.strip()}%")
        )
    if sector:
        query = query.where(cast(MentorProfile.sectors, String).ilike(f"%{sector.strip()}%"))
    return query


def _list_mentors_response(
    db: Session,
    query,
    *,
    limit: int,
    offset: int,
) -> MentorProfileListResponse:
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    mentors = db.scalars(
        query.order_by(MentorProfile.updated_at.desc()).offset(offset).limit(limit)
    ).all()
    counts = _active_request_counts(db, [profile.id for profile in mentors])
    return MentorProfileListResponse(
        mentors=[
            _serialize_profile(profile, active_request_count=counts.get(profile.id, 0))
            for profile in mentors
        ],
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(mentors) < total,
    )


def _list_requests_response(
    db: Session,
    query,
    *,
    limit: int,
    offset: int,
) -> MentorshipRequestListResponse:
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    requests = db.scalars(
        query.order_by(MentorshipRequest.created_at.desc()).offset(offset).limit(limit)
    ).all()
    return MentorshipRequestListResponse(
        requests=[_serialize_request(item) for item in requests],
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(requests) < total,
    )


@router.get("/summary", response_model=MentorshipSummaryResponse)
def get_mentorship_summary(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> MentorshipSummaryResponse:
    mentor_profile = _get_my_profile(db, current_user)
    mentor_counts = _active_request_counts(db, [mentor_profile.id] if mentor_profile else [])
    recommended_query = (
        _mentor_query()
        .where(
            MentorProfile.is_active.is_(True),
            MentorProfile.is_accepting_requests.is_(True),
            MentorProfile.user_id != current_user.id,
        )
        .limit(4)
    )
    recommended = db.scalars(recommended_query.order_by(MentorProfile.updated_at.desc())).all()
    recommended_counts = _active_request_counts(db, [profile.id for profile in recommended])
    outgoing = db.scalars(
        select(MentorshipRequest)
        .options(*_request_options())
        .where(MentorshipRequest.requester_user_id == current_user.id)
        .order_by(MentorshipRequest.created_at.desc())
        .limit(5)
    ).all()
    incoming: list[MentorshipRequest] = []
    if mentor_profile:
        incoming = db.scalars(
            select(MentorshipRequest)
            .options(*_request_options())
            .where(MentorshipRequest.mentor_profile_id == mentor_profile.id)
            .order_by(MentorshipRequest.created_at.desc())
            .limit(5)
        ).all()

    return MentorshipSummaryResponse(
        mentor_profile=_serialize_profile(
            mentor_profile,
            active_request_count=mentor_counts.get(mentor_profile.id, 0),
        )
        if mentor_profile
        else None,
        recommended_mentors=[
            _serialize_profile(profile, active_request_count=recommended_counts.get(profile.id, 0))
            for profile in recommended
        ],
        outgoing_requests=[_serialize_request(item) for item in outgoing],
        incoming_requests=[_serialize_request(item) for item in incoming],
    )


@router.get("/mentors", response_model=MentorProfileListResponse)
def list_mentors(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
    availability_status: Annotated[str | None, Query(max_length=40)] = None,
    country: Annotated[str | None, Query(max_length=80)] = None,
    expertise: Annotated[str | None, Query(max_length=120)] = None,
    include_self: bool = False,
    q: Annotated[str | None, Query(max_length=120)] = None,
    sector: Annotated[str | None, Query(max_length=120)] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 12,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> MentorProfileListResponse:
    query = _mentor_query().where(
        MentorProfile.is_active.is_(True),
        MentorProfile.is_accepting_requests.is_(True),
    )
    if not include_self:
        query = query.where(MentorProfile.user_id != current_user.id)
    query = _apply_mentor_filters(
        query,
        availability_status=availability_status,
        country=country,
        expertise=expertise,
        q=q,
        sector=sector,
    )
    return _list_mentors_response(db, query, limit=limit, offset=offset)


@router.get("/mentors/me", response_model=MentorProfileResponse | None)
def get_my_mentor_profile(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> MentorProfileResponse | None:
    profile = _get_my_profile(db, current_user)
    if profile is None:
        return None
    counts = _active_request_counts(db, [profile.id])
    return _serialize_profile(profile, active_request_count=counts.get(profile.id, 0))


@router.put("/mentors/me", response_model=MentorProfileResponse)
def upsert_my_mentor_profile(
    payload: MentorProfileUpsert,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> MentorProfileResponse:
    _validate_profile_payload(payload)
    profile = _get_my_profile(db, current_user)
    values = payload.model_dump()
    if profile is None:
        profile = MentorProfile(user_id=current_user.id, **values)
        db.add(profile)
        event_type = "mentorship.mentor_profile_created"
    else:
        for field_name, value in values.items():
            setattr(profile, field_name, value)
        event_type = "mentorship.mentor_profile_updated"

    _create_security_event(db, request, current_user, event_type, {"profile_id": str(profile.id)})
    db.commit()
    profile = _get_my_profile(db, current_user) or profile
    counts = _active_request_counts(db, [profile.id])
    return _serialize_profile(profile, active_request_count=counts.get(profile.id, 0))


@router.get("/requests", response_model=MentorshipRequestListResponse)
def list_mentorship_requests(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
    direction: Annotated[str, Query(pattern="^(outgoing|incoming)$")] = "outgoing",
    status_filter: Annotated[str | None, Query(alias="status", max_length=40)] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 12,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> MentorshipRequestListResponse:
    query = select(MentorshipRequest).options(*_request_options())
    if direction == "incoming":
        profile = _get_my_profile(db, current_user)
        if profile is None:
            return MentorshipRequestListResponse(
                requests=[],
                total=0,
                limit=limit,
                offset=offset,
                has_more=False,
            )
        query = query.where(MentorshipRequest.mentor_profile_id == profile.id)
    else:
        query = query.where(MentorshipRequest.requester_user_id == current_user.id)
    normalized_status = _normalize_query_enum(status_filter)
    if normalized_status:
        query = query.where(MentorshipRequest.status == normalized_status)
    return _list_requests_response(db, query, limit=limit, offset=offset)


@router.post(
    "/requests",
    response_model=MentorshipRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_mentorship_request(
    payload: MentorshipRequestCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> MentorshipRequestResponse:
    mentor_profile = _get_profile_by_id_or_404(db, payload.mentor_profile_id)
    if (
        not mentor_profile.is_active
        or not mentor_profile.is_accepting_requests
        or mentor_profile.availability_status == "PAUSED"
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Mentor is not accepting requests",
        )
    if mentor_profile.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot request mentorship from yourself",
        )
    existing = db.scalar(
        select(MentorshipRequest).where(
            MentorshipRequest.mentor_profile_id == mentor_profile.id,
            MentorshipRequest.requester_user_id == current_user.id,
            MentorshipRequest.status.in_(ACTIVE_REQUEST_STATUSES),
        )
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A mentorship request with this mentor is already active",
        )

    mentorship_request = MentorshipRequest(
        focus_area=payload.focus_area,
        goals=payload.goals,
        mentor_profile_id=mentor_profile.id,
        message=payload.message,
        requester_user_id=current_user.id,
        status="PENDING",
    )
    db.add(mentorship_request)
    _create_security_event(
        db,
        request,
        current_user,
        "mentorship.request_created",
        {"mentor_profile_id": str(mentor_profile.id)},
    )
    db.commit()
    mentorship_request = _get_request_or_404(db, mentorship_request.id)
    return _serialize_request(mentorship_request)


@router.post("/requests/{request_id}/accept", response_model=MentorshipRequestResponse)
def accept_mentorship_request(
    request_id: uuid.UUID,
    payload: MentorshipRequestReview,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> MentorshipRequestResponse:
    return _review_mentorship_request(
        db=db,
        request=request,
        current_user=current_user,
        request_id=request_id,
        reviewer_note=payload.reviewer_note,
        status_value="ACCEPTED",
    )


@router.post("/requests/{request_id}/decline", response_model=MentorshipRequestResponse)
def decline_mentorship_request(
    request_id: uuid.UUID,
    payload: MentorshipRequestReview,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> MentorshipRequestResponse:
    return _review_mentorship_request(
        db=db,
        request=request,
        current_user=current_user,
        request_id=request_id,
        reviewer_note=payload.reviewer_note,
        status_value="DECLINED",
    )


@router.post("/requests/{request_id}/cancel", response_model=MentorshipRequestResponse)
def cancel_mentorship_request(
    request_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> MentorshipRequestResponse:
    mentorship_request = _get_request_or_404(db, request_id)
    if mentorship_request.requester_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mentorship request not found",
        )
    if mentorship_request.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only pending requests can be cancelled",
        )
    mentorship_request.status = "CANCELLED"
    _create_security_event(
        db,
        request,
        current_user,
        "mentorship.request_cancelled",
        {"request_id": str(mentorship_request.id)},
    )
    db.commit()
    mentorship_request = _get_request_or_404(db, request_id)
    return _serialize_request(mentorship_request)


def _review_mentorship_request(
    *,
    db: Session,
    request: Request,
    current_user: User,
    request_id: uuid.UUID,
    reviewer_note: str | None,
    status_value: str,
) -> MentorshipRequestResponse:
    mentorship_request = _get_request_or_404(db, request_id)
    if mentorship_request.mentor_profile.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mentorship request not found",
        )
    if mentorship_request.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only pending requests can be reviewed",
        )
    mentorship_request.status = status_value
    mentorship_request.reviewer_note = reviewer_note
    _create_security_event(
        db,
        request,
        current_user,
        f"mentorship.request_{status_value.lower()}",
        {"request_id": str(mentorship_request.id)},
    )
    db.commit()
    mentorship_request = _get_request_or_404(db, request_id)
    return _serialize_request(mentorship_request)
