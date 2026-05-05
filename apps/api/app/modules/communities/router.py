import re
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import String, and_, cast, func, or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.core.database import get_db_session
from app.core.permissions import ADMIN_ROLE_NAMES
from app.core.security import utcnow
from app.modules.auth.dependencies import get_current_user, require_roles
from app.modules.auth.models import SecurityEvent, User
from app.modules.communities.models import Community, CommunityMembership
from app.modules.communities.schemas import (
    CommunityCreate,
    CommunityListResponse,
    CommunityMemberListResponse,
    CommunityMemberResponse,
    CommunityResponse,
)

router = APIRouter()
community_admin_dependency = require_roles(*ADMIN_ROLE_NAMES)

COMMUNITY_TYPES = {
    "CITY_CHAPTER",
    "COUNTRY_CHAPTER",
    "PROGRAM_COHORT",
    "SECTOR_GROUP",
    "WORKING_GROUP",
}
COMMUNITY_VISIBILITY = {"MEMBER_ONLY", "PRIVATE"}
JOIN_POLICIES = {"OPEN", "REQUEST"}


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


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.strip().lower()).strip("-")
    return slug or "community"


def _unique_slug(db: Session, name: str) -> str:
    base_slug = _slugify(name)
    slug = base_slug
    suffix = 2
    while db.scalar(select(Community.id).where(Community.slug == slug)):
        slug = f"{base_slug}-{suffix}"
        suffix += 1
    return slug


def _validate_payload(payload: CommunityCreate) -> None:
    if payload.community_type not in COMMUNITY_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid community type",
        )
    if payload.visibility not in COMMUNITY_VISIBILITY:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid visibility")
    if payload.join_policy not in JOIN_POLICIES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid join policy")


def _active_member_count(community: Community) -> int:
    return sum(1 for membership in community.memberships if membership.status == "ACTIVE")


def _membership_for_user(
    community: Community,
    user_id: uuid.UUID,
) -> CommunityMembership | None:
    return next(
        (membership for membership in community.memberships if membership.user_id == user_id),
        None,
    )


def _user_role_names(user: User) -> set[str]:
    return {assignment.role.name for assignment in user.role_assignments}


def _can_manage_community(user: User, community: Community) -> bool:
    if _user_role_names(user).intersection(ADMIN_ROLE_NAMES):
        return True

    membership = _membership_for_user(community, user.id)
    return bool(membership and membership.status == "ACTIVE" and membership.role == "OWNER")


def _serialize_community(community: Community, current_user: User) -> CommunityResponse:
    membership = _membership_for_user(community, current_user.id)
    return CommunityResponse(
        id=community.id,
        name=community.name,
        slug=community.slug,
        community_type=community.community_type,
        description=community.description,
        country=community.country,
        city=community.city,
        sector=community.sector,
        program_name=community.program_name,
        cohort_year=community.cohort_year,
        visibility=community.visibility,
        join_policy=community.join_policy,
        member_count=_active_member_count(community),
        membership_status=membership.status if membership else None,
        membership_role=membership.role if membership else None,
        created_at=community.created_at,
    )


def _serialize_member(membership: CommunityMembership) -> CommunityMemberResponse:
    return CommunityMemberResponse(
        id=membership.id,
        user_id=membership.user_id,
        display_name=membership.user.display_name,
        email=membership.user.email,
        role=membership.role,
        status=membership.status,
        joined_at=membership.joined_at,
        created_at=membership.created_at,
    )


def _community_options():
    return (selectinload(Community.memberships),)


def _get_community_or_404(db: Session, community_id: uuid.UUID) -> Community:
    community = db.scalar(
        select(Community).options(*_community_options()).where(Community.id == community_id)
    )
    if community is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Community not found")

    return community


@router.get("", response_model=CommunityListResponse)
def list_communities(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
    q: Annotated[str | None, Query(max_length=120)] = None,
    community_type: Annotated[str | None, Query(max_length=40)] = None,
    country: Annotated[str | None, Query(max_length=80)] = None,
    sector: Annotated[str | None, Query(max_length=120)] = None,
    membership: Annotated[str | None, Query(pattern="^(all|mine|not_joined)$")] = "all",
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> CommunityListResponse:
    query = select(Community).options(*_community_options())
    if q:
        search_term = f"%{q.strip()}%"
        query = query.where(
            or_(
                Community.name.ilike(search_term),
                Community.description.ilike(search_term),
                Community.country.ilike(search_term),
                Community.city.ilike(search_term),
                Community.sector.ilike(search_term),
                Community.program_name.ilike(search_term),
                cast(Community.cohort_year, String).ilike(search_term),
            )
        )
    if community_type:
        query = query.where(Community.community_type == community_type.strip().upper())
    if country:
        query = query.where(Community.country.ilike(f"%{country.strip()}%"))
    if sector:
        query = query.where(Community.sector.ilike(f"%{sector.strip()}%"))
    if membership == "mine":
        query = query.where(
            Community.memberships.any(
                and_(
                    CommunityMembership.user_id == current_user.id,
                    CommunityMembership.status == "ACTIVE",
                )
            )
        )
    if membership == "not_joined":
        query = query.where(
            ~Community.memberships.any(
                and_(
                    CommunityMembership.user_id == current_user.id,
                    CommunityMembership.status.in_(["ACTIVE", "PENDING"]),
                )
            )
        )

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    communities = db.scalars(
        query.order_by(Community.created_at.desc(), Community.name.asc())
        .offset(offset)
        .limit(limit)
    ).all()
    return CommunityListResponse(
        communities=[_serialize_community(community, current_user) for community in communities],
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(communities) < total,
    )


@router.post("", response_model=CommunityResponse, status_code=status.HTTP_201_CREATED)
def create_community(
    payload: CommunityCreate,
    request: Request,
    current_user: Annotated[User, Depends(community_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> CommunityResponse:
    _validate_payload(payload)
    community = Community(
        name=payload.name,
        slug=_unique_slug(db, payload.name),
        community_type=payload.community_type,
        description=payload.description,
        country=payload.country,
        city=payload.city,
        sector=payload.sector,
        program_name=payload.program_name,
        cohort_year=payload.cohort_year,
        visibility=payload.visibility,
        join_policy=payload.join_policy,
        created_by_user_id=current_user.id,
    )
    db.add(community)
    db.flush()
    db.add(
        CommunityMembership(
            community_id=community.id,
            user_id=current_user.id,
            role="OWNER",
            status="ACTIVE",
            joined_at=utcnow(),
        )
    )
    _create_security_event(
        db,
        request,
        current_user,
        "community.created",
        metadata={"community_id": str(community.id), "community_type": community.community_type},
    )
    db.commit()
    community = _get_community_or_404(db, community.id)
    return _serialize_community(community, current_user)


@router.get("/{community_id}", response_model=CommunityResponse)
def get_community(
    community_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> CommunityResponse:
    community = _get_community_or_404(db, community_id)
    return _serialize_community(community, current_user)


@router.get("/{community_id}/members", response_model=CommunityMemberListResponse)
def list_community_members(
    community_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
    status_filter: Annotated[
        str,
        Query(alias="status", pattern="^(ACTIVE|PENDING|LEFT|REJECTED|ALL)$"),
    ] = "ACTIVE",
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> CommunityMemberListResponse:
    community = _get_community_or_404(db, community_id)
    normalized_status = status_filter.strip().upper()
    if normalized_status != "ACTIVE" and not _can_manage_community(current_user, community):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this member status",
        )

    query = (
        select(CommunityMembership)
        .options(joinedload(CommunityMembership.user))
        .where(CommunityMembership.community_id == community.id)
    )
    if normalized_status != "ALL":
        query = query.where(CommunityMembership.status == normalized_status)

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    members = db.scalars(
        query.order_by(
            CommunityMembership.role.desc(),
            CommunityMembership.joined_at.desc(),
            CommunityMembership.created_at.desc(),
        )
        .offset(offset)
        .limit(limit)
    ).all()
    return CommunityMemberListResponse(
        members=[_serialize_member(membership) for membership in members],
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(members) < total,
    )


def _get_membership_or_404(
    db: Session,
    community: Community,
    membership_id: uuid.UUID,
) -> CommunityMembership:
    membership = db.scalar(
        select(CommunityMembership)
        .options(joinedload(CommunityMembership.user))
        .where(
            CommunityMembership.id == membership_id,
            CommunityMembership.community_id == community.id,
        )
    )
    if membership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    return membership


@router.post(
    "/{community_id}/members/{membership_id}/approve",
    response_model=CommunityMemberResponse,
)
def approve_community_member(
    community_id: uuid.UUID,
    membership_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> CommunityMemberResponse:
    community = _get_community_or_404(db, community_id)
    if not _can_manage_community(current_user, community):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to review community memberships",
        )

    membership = _get_membership_or_404(db, community, membership_id)
    if membership.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only pending memberships can be approved",
        )

    membership.status = "ACTIVE"
    membership.role = membership.role or "MEMBER"
    membership.joined_at = utcnow()
    _create_security_event(
        db,
        request,
        current_user,
        "community.member_approved",
        metadata={
            "community_id": str(community.id),
            "membership_id": str(membership.id),
            "target_user_id": str(membership.user_id),
        },
    )
    db.commit()
    db.refresh(membership)
    return _serialize_member(membership)


@router.post(
    "/{community_id}/members/{membership_id}/reject",
    response_model=CommunityMemberResponse,
)
def reject_community_member(
    community_id: uuid.UUID,
    membership_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> CommunityMemberResponse:
    community = _get_community_or_404(db, community_id)
    if not _can_manage_community(current_user, community):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to review community memberships",
        )

    membership = _get_membership_or_404(db, community, membership_id)
    if membership.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only pending memberships can be rejected",
        )

    membership.status = "REJECTED"
    membership.joined_at = None
    _create_security_event(
        db,
        request,
        current_user,
        "community.member_rejected",
        metadata={
            "community_id": str(community.id),
            "membership_id": str(membership.id),
            "target_user_id": str(membership.user_id),
        },
    )
    db.commit()
    db.refresh(membership)
    return _serialize_member(membership)


@router.post("/{community_id}/join", response_model=CommunityResponse)
def join_community(
    community_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> CommunityResponse:
    community = _get_community_or_404(db, community_id)
    membership = _membership_for_user(community, current_user.id)
    status_value = "ACTIVE" if community.join_policy == "OPEN" else "PENDING"
    joined_at = utcnow() if status_value == "ACTIVE" else None
    if membership:
        if membership.status == "ACTIVE":
            return _serialize_community(community, current_user)
        membership.status = status_value
        membership.role = membership.role or "MEMBER"
        membership.joined_at = joined_at
    else:
        db.add(
            CommunityMembership(
                community_id=community.id,
                user_id=current_user.id,
                role="MEMBER",
                status=status_value,
                joined_at=joined_at,
            )
        )
    _create_security_event(
        db,
        request,
        current_user,
        "community.join_requested" if status_value == "PENDING" else "community.joined",
        metadata={"community_id": str(community.id)},
    )
    db.commit()
    community = _get_community_or_404(db, community.id)
    return _serialize_community(community, current_user)


@router.post("/{community_id}/leave", response_model=CommunityResponse)
def leave_community(
    community_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> CommunityResponse:
    community = _get_community_or_404(db, community_id)
    membership = _membership_for_user(community, current_user.id)
    if membership is None or membership.status not in {"ACTIVE", "PENDING"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are not a member of this community",
        )
    if membership.role == "OWNER":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Community owners cannot leave yet",
        )

    membership.status = "LEFT"
    membership.joined_at = None
    _create_security_event(
        db,
        request,
        current_user,
        "community.left",
        metadata={"community_id": str(community.id)},
    )
    db.commit()
    community = _get_community_or_404(db, community.id)
    return _serialize_community(community, current_user)
