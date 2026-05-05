import re
import uuid
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import String, and_, cast, func, or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.core.config import get_settings
from app.core.database import get_db_session
from app.core.permissions import ADMIN_ROLE_NAMES
from app.core.security import create_refresh_token, hash_token, utcnow
from app.modules.auth.dependencies import get_current_user, require_roles
from app.modules.auth.models import SecurityEvent, User
from app.modules.communities.models import Community, CommunityInvitation, CommunityMembership
from app.modules.communities.schemas import (
    CommunityCreate,
    CommunityInvitationAccept,
    CommunityInvitationCreate,
    CommunityInvitationListResponse,
    CommunityInvitationResponse,
    CommunityListResponse,
    CommunityMemberListResponse,
    CommunityMemberResponse,
    CommunityMemberRoleUpdate,
    CommunityResponse,
    CommunityUpdate,
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
COMMUNITY_MEMBER_ROLES = {"MEMBER", "MANAGER"}
COMMUNITY_INVITATION_STATUSES = {"ACCEPTED", "CANCELED", "EXPIRED", "PENDING"}
COMMUNITY_INVITATION_DAYS = 14


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


def _is_local_environment() -> bool:
    return get_settings().app_env.lower() in {"dev", "development", "local", "test"}


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


def _validate_settings(
    community_type: str | None,
    visibility: str | None,
    join_policy: str | None,
) -> None:
    if community_type is not None and community_type not in COMMUNITY_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid community type",
        )
    if visibility is not None and visibility not in COMMUNITY_VISIBILITY:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid visibility")
    if join_policy is not None and join_policy not in JOIN_POLICIES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid join policy")


def _validate_payload(payload: CommunityCreate) -> None:
    _validate_settings(payload.community_type, payload.visibility, payload.join_policy)


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


def _has_admin_role(user: User) -> bool:
    return bool(_user_role_names(user).intersection(ADMIN_ROLE_NAMES))


def _active_membership_role(user: User, community: Community) -> str | None:
    membership = _membership_for_user(community, user.id)
    if membership and membership.status == "ACTIVE":
        return membership.role
    return None


def _can_manage_community(user: User, community: Community) -> bool:
    if _has_admin_role(user):
        return True

    return _active_membership_role(user, community) in {"OWNER", "MANAGER"}


def _can_edit_community_settings(user: User, community: Community) -> bool:
    if _has_admin_role(user):
        return True

    return _active_membership_role(user, community) == "OWNER"


def _can_manage_membership(
    user: User,
    community: Community,
    membership: CommunityMembership,
) -> bool:
    if membership.role == "OWNER":
        return False
    if _has_admin_role(user):
        return True

    actor_role = _active_membership_role(user, community)
    if actor_role == "OWNER":
        return True
    return actor_role == "MANAGER" and membership.role == "MEMBER"


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


def _invitation_status(invitation: CommunityInvitation) -> str:
    now = utcnow()
    expires_at = invitation.expires_at
    if expires_at.tzinfo is None:
        now = now.replace(tzinfo=None)
    if invitation.status == "PENDING" and expires_at <= now:
        return "EXPIRED"
    return invitation.status


def _serialize_invitation(
    invitation: CommunityInvitation,
    *,
    dev_invitation_token: str | None = None,
) -> CommunityInvitationResponse:
    return CommunityInvitationResponse(
        id=invitation.id,
        community_id=invitation.community_id,
        invited_email=invitation.invited_email,
        invited_role=invitation.invited_role,
        status=_invitation_status(invitation),
        invited_by_user_id=invitation.invited_by_user_id,
        accepted_by_user_id=invitation.accepted_by_user_id,
        accepted_at=invitation.accepted_at,
        canceled_at=invitation.canceled_at,
        expires_at=invitation.expires_at,
        created_at=invitation.created_at,
        dev_invitation_token=dev_invitation_token if _is_local_environment() else None,
    )


def _community_options():
    return (selectinload(Community.memberships), selectinload(Community.invitations))


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


@router.post("/invitations/accept", response_model=CommunityResponse)
def accept_community_invitation(
    payload: CommunityInvitationAccept,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> CommunityResponse:
    invitation = db.scalar(
        select(CommunityInvitation).where(
            CommunityInvitation.token_hash == hash_token(payload.token)
        )
    )
    if invitation is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired invitation",
        )

    if _invitation_status(invitation) == "EXPIRED":
        invitation.status = "EXPIRED"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired invitation",
        )
    if invitation.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Invitation is no longer pending",
        )
    if current_user.email.strip().lower() != invitation.invited_email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This invitation belongs to another email address",
        )

    community = _get_community_or_404(db, invitation.community_id)
    membership = _membership_for_user(community, current_user.id)
    if membership and membership.status == "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already an active member of this community",
        )

    if membership:
        membership.role = invitation.invited_role
        membership.status = "ACTIVE"
        membership.joined_at = utcnow()
    else:
        db.add(
            CommunityMembership(
                community_id=community.id,
                user_id=current_user.id,
                role=invitation.invited_role,
                status="ACTIVE",
                joined_at=utcnow(),
            )
        )
    invitation.status = "ACCEPTED"
    invitation.accepted_by_user_id = current_user.id
    invitation.accepted_at = utcnow()
    _create_security_event(
        db,
        request,
        current_user,
        "community.invitation_accepted",
        metadata={
            "community_id": str(community.id),
            "invitation_id": str(invitation.id),
            "invited_role": invitation.invited_role,
        },
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


@router.patch("/{community_id}", response_model=CommunityResponse)
def update_community(
    community_id: uuid.UUID,
    payload: CommunityUpdate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> CommunityResponse:
    community = _get_community_or_404(db, community_id)
    if not _can_edit_community_settings(current_user, community):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to edit this community",
        )

    required_fields = {"community_type", "join_policy", "name", "visibility"}
    missing_required = [
        field
        for field in required_fields
        if field in payload.model_fields_set and getattr(payload, field) is None
    ]
    if missing_required:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{missing_required[0]} cannot be empty",
        )

    _validate_settings(payload.community_type, payload.visibility, payload.join_policy)

    editable_fields = (
        "name",
        "community_type",
        "description",
        "country",
        "city",
        "sector",
        "program_name",
        "cohort_year",
        "visibility",
        "join_policy",
    )
    changed_fields: list[str] = []
    previous_values: dict[str, str | int | None] = {}
    next_values: dict[str, str | int | None] = {}
    for field in editable_fields:
        if field not in payload.model_fields_set:
            continue
        next_value = getattr(payload, field)
        previous_value = getattr(community, field)
        if previous_value == next_value:
            continue
        setattr(community, field, next_value)
        changed_fields.append(field)
        previous_values[field] = previous_value
        next_values[field] = next_value

    if changed_fields:
        _create_security_event(
            db,
            request,
            current_user,
            "community.updated",
            metadata={
                "changed_fields": changed_fields,
                "community_id": str(community.id),
                "next_values": next_values,
                "previous_values": previous_values,
            },
        )
        db.commit()
    else:
        db.rollback()

    community = _get_community_or_404(db, community.id)
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


@router.get("/{community_id}/invitations", response_model=CommunityInvitationListResponse)
def list_community_invitations(
    community_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
    status_filter: Annotated[
        str,
        Query(alias="status", pattern="^(ACCEPTED|CANCELED|EXPIRED|PENDING|ALL)$"),
    ] = "PENDING",
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> CommunityInvitationListResponse:
    community = _get_community_or_404(db, community_id)
    if not _can_manage_community(current_user, community):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view community invitations",
        )

    invitations = db.scalars(
        select(CommunityInvitation)
        .where(CommunityInvitation.community_id == community.id)
        .order_by(CommunityInvitation.created_at.desc())
    ).all()
    normalized_status = status_filter.strip().upper()
    filtered_invitations = [
        invitation
        for invitation in invitations
        if normalized_status == "ALL" or _invitation_status(invitation) == normalized_status
    ]
    page = filtered_invitations[offset : offset + limit]
    return CommunityInvitationListResponse(
        invitations=[_serialize_invitation(invitation) for invitation in page],
        total=len(filtered_invitations),
        limit=limit,
        offset=offset,
        has_more=offset + len(page) < len(filtered_invitations),
    )


@router.post(
    "/{community_id}/invitations",
    response_model=CommunityInvitationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_community_invitation(
    community_id: uuid.UUID,
    payload: CommunityInvitationCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> CommunityInvitationResponse:
    community = _get_community_or_404(db, community_id)
    if not _can_manage_community(current_user, community):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to create community invitations",
        )
    if payload.role not in COMMUNITY_MEMBER_ROLES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid invite role")
    if payload.role == "MANAGER" and not _can_edit_community_settings(current_user, community):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only community owners and admins can invite managers",
        )

    invited_user = db.scalar(select(User).where(func.lower(User.email) == payload.email))
    if invited_user:
        existing_membership = _membership_for_user(community, invited_user.id)
        if existing_membership and existing_membership.status == "ACTIVE":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="That email is already an active member",
            )

    existing_invitation = _active_pending_invitation_for_email(community, payload.email)
    if existing_invitation:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A pending invitation already exists for that email",
        )

    invitation_token = create_refresh_token()
    invitation = CommunityInvitation(
        community_id=community.id,
        invited_email=payload.email,
        invited_role=payload.role,
        status="PENDING",
        token_hash=hash_token(invitation_token),
        invited_by_user_id=current_user.id,
        expires_at=utcnow() + timedelta(days=COMMUNITY_INVITATION_DAYS),
    )
    db.add(invitation)
    _create_security_event(
        db,
        request,
        current_user,
        "community.invitation_created",
        metadata={
            "community_id": str(community.id),
            "invited_email": invitation.invited_email,
            "invited_role": invitation.invited_role,
        },
    )
    db.commit()
    db.refresh(invitation)
    return _serialize_invitation(invitation, dev_invitation_token=invitation_token)


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


def _get_invitation_or_404(
    db: Session,
    community: Community,
    invitation_id: uuid.UUID,
) -> CommunityInvitation:
    invitation = db.scalar(
        select(CommunityInvitation).where(
            CommunityInvitation.id == invitation_id,
            CommunityInvitation.community_id == community.id,
        )
    )
    if invitation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found")

    return invitation


def _active_pending_invitation_for_email(
    community: Community,
    email: str,
) -> CommunityInvitation | None:
    return next(
        (
            invitation
            for invitation in community.invitations
            if invitation.invited_email == email and _invitation_status(invitation) == "PENDING"
        ),
        None,
    )


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


@router.patch(
    "/{community_id}/members/{membership_id}",
    response_model=CommunityMemberResponse,
)
def update_community_member_role(
    community_id: uuid.UUID,
    membership_id: uuid.UUID,
    payload: CommunityMemberRoleUpdate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> CommunityMemberResponse:
    community = _get_community_or_404(db, community_id)
    if not _can_manage_community(current_user, community):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to manage community members",
        )
    if payload.role not in COMMUNITY_MEMBER_ROLES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid member role")

    membership = _get_membership_or_404(db, community, membership_id)
    if membership.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only active memberships can be updated",
        )
    if not _can_manage_membership(current_user, community, membership):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to manage this member",
        )

    previous_role = membership.role
    membership.role = payload.role
    _create_security_event(
        db,
        request,
        current_user,
        "community.member_role_updated",
        metadata={
            "community_id": str(community.id),
            "membership_id": str(membership.id),
            "target_user_id": str(membership.user_id),
            "previous_role": previous_role,
            "new_role": membership.role,
        },
    )
    db.commit()
    db.refresh(membership)
    return _serialize_member(membership)


@router.post(
    "/{community_id}/members/{membership_id}/remove",
    response_model=CommunityMemberResponse,
)
def remove_community_member(
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
            detail="You do not have permission to manage community members",
        )

    membership = _get_membership_or_404(db, community, membership_id)
    if membership.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only active memberships can be removed",
        )
    if not _can_manage_membership(current_user, community, membership):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to manage this member",
        )

    membership.status = "LEFT"
    membership.joined_at = None
    _create_security_event(
        db,
        request,
        current_user,
        "community.member_removed",
        metadata={
            "community_id": str(community.id),
            "membership_id": str(membership.id),
            "target_user_id": str(membership.user_id),
            "previous_role": membership.role,
        },
    )
    db.commit()
    db.refresh(membership)
    return _serialize_member(membership)


@router.post(
    "/{community_id}/invitations/{invitation_id}/cancel",
    response_model=CommunityInvitationResponse,
)
def cancel_community_invitation(
    community_id: uuid.UUID,
    invitation_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> CommunityInvitationResponse:
    community = _get_community_or_404(db, community_id)
    if not _can_manage_community(current_user, community):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to cancel community invitations",
        )

    invitation = _get_invitation_or_404(db, community, invitation_id)
    if _invitation_status(invitation) != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only pending invitations can be canceled",
        )

    invitation.status = "CANCELED"
    invitation.canceled_at = utcnow()
    _create_security_event(
        db,
        request,
        current_user,
        "community.invitation_canceled",
        metadata={
            "community_id": str(community.id),
            "invitation_id": str(invitation.id),
            "invited_email": invitation.invited_email,
        },
    )
    db.commit()
    db.refresh(invitation)
    return _serialize_invitation(invitation)


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
