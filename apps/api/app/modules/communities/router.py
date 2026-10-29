import re
import uuid
from datetime import timedelta
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    Response,
    UploadFile,
    status,
)
from sqlalchemy import String, and_, cast, func, or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.core.config import get_settings
from app.core.database import get_db_session
from app.core.permissions import ADMIN_ROLE_NAMES
from app.core.security import create_refresh_token, hash_token, utcnow
from app.core.storage import UploadCategory, upload_response
from app.modules.auth.dependencies import get_current_user, require_roles
from app.modules.auth.models import Role, RoleAssignment, SecurityEvent, User
from app.modules.communities.emails import send_community_invitation_email
from app.modules.communities.models import (
    Community,
    CommunityInvitation,
    CommunityMembership,
    CommunityPost,
    CommunityPostComment,
    CommunityPostMedia,
    CommunityPostReaction,
    CommunityPostReport,
)
from app.modules.communities.schemas import (
    CommunityAdminPostReportQueueItem,
    CommunityAdminPostReportQueueResponse,
    CommunityAdminRemovedCommentQueueItem,
    CommunityAdminRemovedCommentQueueResponse,
    CommunityAdminRemovedPostQueueItem,
    CommunityAdminRemovedPostQueueResponse,
    CommunityCreate,
    CommunityInvitationAccept,
    CommunityInvitationCreate,
    CommunityInvitationListResponse,
    CommunityInvitationResponse,
    CommunityListResponse,
    CommunityMemberListResponse,
    CommunityMemberResponse,
    CommunityMemberRoleUpdate,
    CommunityModerationReviewUpdate,
    CommunityOwnershipTransfer,
    CommunityPostCommentCreate,
    CommunityPostCommentListResponse,
    CommunityPostCommentResponse,
    CommunityPostCreate,
    CommunityPostListResponse,
    CommunityPostMediaResponse,
    CommunityPostReactionCreate,
    CommunityPostReactionResponse,
    CommunityPostReportCreate,
    CommunityPostReportListResponse,
    CommunityPostReportQueueItem,
    CommunityPostReportQueueResponse,
    CommunityPostReportResponse,
    CommunityPostResponse,
    CommunityRemovedCommentQueueItem,
    CommunityRemovedCommentQueueResponse,
    CommunityRemovedPostQueueItem,
    CommunityRemovedPostQueueResponse,
    CommunityResponse,
    CommunityUpdate,
)
from app.modules.communities.storage import store_community_post_media_file
from app.modules.notifications.service import notify_users

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
COMMUNITY_POST_STATUSES = {"ACTIVE", "REMOVED"}
COMMUNITY_REACTION_TYPES = {"LIKE"}
COMMUNITY_REPORT_REASONS = {"HARASSMENT", "MISINFORMATION", "OTHER", "SPAM", "UNRELATED"}
COMMUNITY_REPORT_STATUSES = {"OPEN", "RESOLVED"}
COMMUNITY_MODERATION_SEVERITIES = {"CRITICAL", "HIGH", "LOW", "MEDIUM"}
COMMUNITY_ESCALATION_STATUSES = {"ESCALATED", "NONE"}
COMMUNITY_POST_MEDIA_STATUSES = {"ACTIVE", "REMOVED"}
COMMUNITY_POST_MEDIA_LIMIT = 4


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


def _validate_moderation_review_payload(payload: CommunityModerationReviewUpdate) -> None:
    if payload.severity is not None and payload.severity not in COMMUNITY_MODERATION_SEVERITIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid moderation severity",
        )
    if (
        payload.escalation_status is not None
        and payload.escalation_status not in COMMUNITY_ESCALATION_STATUSES
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid escalation status",
        )


def _apply_escalation_review(
    target: CommunityPost | CommunityPostComment | CommunityPostReport,
    escalation_status: str | None,
    current_user: User,
) -> None:
    if escalation_status is None:
        return
    if escalation_status == "ESCALATED":
        if target.escalation_status != "ESCALATED":
            target.escalated_by_user_id = current_user.id
            target.escalated_at = utcnow()
    else:
        target.escalated_by_user_id = None
        target.escalated_at = None
    target.escalation_status = escalation_status


def _active_member_count(community: Community) -> int:
    return sum(1 for membership in community.memberships if membership.status == "ACTIVE")


def _active_owner_memberships(community: Community) -> list[CommunityMembership]:
    return [
        membership
        for membership in community.memberships
        if membership.status == "ACTIVE" and membership.role == "OWNER"
    ]


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


def _can_access_community_content(user: User, community: Community) -> bool:
    return _has_admin_role(user) or _active_membership_role(user, community) is not None


def _can_edit_community_settings(user: User, community: Community) -> bool:
    if _has_admin_role(user):
        return True

    return _active_membership_role(user, community) == "OWNER"


def _community_target_url(community: Community) -> str:
    return f"/communities/{community.id}"


def _admin_moderation_target_url() -> str:
    return "/admin"


def _community_manager_user_ids(community: Community) -> list[uuid.UUID]:
    return [
        membership.user_id
        for membership in community.memberships
        if membership.status == "ACTIVE" and membership.role in {"MANAGER", "OWNER"}
    ]


def _admin_user_ids(db: Session) -> list[uuid.UUID]:
    return list(
        db.scalars(
            select(RoleAssignment.user_id)
            .join(Role, RoleAssignment.role_id == Role.id)
            .where(
                Role.name.in_(ADMIN_ROLE_NAMES),
                RoleAssignment.scope_type == "GLOBAL",
                RoleAssignment.scope_id.is_(None),
            )
        ).all()
    )


def _notify_community_managers(
    db: Session,
    community: Community,
    actor: User,
    *,
    event_type: str,
    title: str,
    body: str | None = None,
    metadata: dict | None = None,
) -> None:
    notify_users(
        db,
        _community_manager_user_ids(community),
        actor_user_id=actor.id,
        body=body,
        event_type=event_type,
        exclude_user_ids={actor.id},
        metadata=metadata,
        target_url=_community_target_url(community),
        title=title,
    )


def _notify_admins(
    db: Session,
    actor: User,
    *,
    event_type: str,
    title: str,
    body: str | None = None,
    metadata: dict | None = None,
) -> None:
    notify_users(
        db,
        _admin_user_ids(db),
        actor_user_id=actor.id,
        body=body,
        event_type=event_type,
        exclude_user_ids={actor.id},
        metadata=metadata,
        target_url=_admin_moderation_target_url(),
        title=title,
    )


def _notify_moderation_escalation(
    db: Session,
    community: Community,
    actor: User,
    *,
    content_id: uuid.UUID,
    content_type: str,
    severity: str,
) -> None:
    metadata = {
        "community_id": str(community.id),
        "content_id": str(content_id),
        "content_type": content_type,
        "severity": severity,
    }
    body = f"{content_type.replace('_', ' ').title()} was escalated as {severity.lower()}."
    _notify_community_managers(
        db,
        community,
        actor,
        body=body,
        event_type="community.moderation_escalated",
        metadata=metadata,
        title=f"Moderation escalated in {community.name}",
    )
    _notify_admins(
        db,
        actor,
        body=f"{community.name}: {body}",
        event_type="community.moderation_escalated",
        metadata=metadata,
        title="Moderation escalation needs review",
    )


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


def _serialize_post_media(
    media: CommunityPostMedia, post: CommunityPost
) -> CommunityPostMediaResponse:
    return CommunityPostMediaResponse(
        id=media.id,
        post_id=media.post_id,
        uploaded_by_user_id=media.uploaded_by_user_id,
        file_name=media.file_name,
        content_type=media.content_type,
        file_size_bytes=media.file_size_bytes,
        alt_text=media.alt_text,
        status=media.status,
        removed_by_user_id=media.removed_by_user_id,
        removed_at=media.removed_at,
        download_url=(
            f"/api/v1/communities/{post.community_id}/posts/{post.id}/media/{media.id}/download"
        ),
        created_at=media.created_at,
        updated_at=media.updated_at,
    )


def _serialize_post(
    db: Session,
    post: CommunityPost,
    current_user: User,
    community: Community,
) -> CommunityPostResponse:
    include_moderation = _can_manage_community(current_user, community)
    comment_count = (
        db.scalar(
            select(func.count())
            .select_from(CommunityPostComment)
            .where(
                CommunityPostComment.post_id == post.id,
                CommunityPostComment.status == "ACTIVE",
            )
        )
        or 0
    )
    reaction_count = (
        db.scalar(
            select(func.count())
            .select_from(CommunityPostReaction)
            .where(CommunityPostReaction.post_id == post.id)
        )
        or 0
    )
    viewer_reacted = bool(
        db.scalar(
            select(CommunityPostReaction.id).where(
                CommunityPostReaction.post_id == post.id,
                CommunityPostReaction.user_id == current_user.id,
            )
        )
    )
    open_report_count = 0
    if _can_manage_community(current_user, community):
        open_report_count = (
            db.scalar(
                select(func.count())
                .select_from(CommunityPostReport)
                .where(
                    CommunityPostReport.post_id == post.id,
                    CommunityPostReport.status == "OPEN",
                )
            )
            or 0
        )
    media_items = [
        media for media in post.media_items if media.status == "ACTIVE" or include_moderation
    ]

    return CommunityPostResponse(
        id=post.id,
        community_id=post.community_id,
        author_user_id=post.author_user_id,
        author_display_name=post.author.display_name if post.author else "Removed user",
        body=post.body,
        status=post.status,
        removed_by_user_id=post.removed_by_user_id,
        removed_at=post.removed_at,
        moderation_note=post.moderation_note if include_moderation else None,
        moderation_severity=post.moderation_severity if include_moderation else None,
        escalation_status=post.escalation_status if include_moderation else None,
        escalated_by_user_id=post.escalated_by_user_id if include_moderation else None,
        escalated_at=post.escalated_at if include_moderation else None,
        comment_count=comment_count,
        reaction_count=reaction_count,
        viewer_reacted=viewer_reacted,
        open_report_count=open_report_count,
        media=[_serialize_post_media(media, post) for media in media_items],
        created_at=post.created_at,
        updated_at=post.updated_at,
    )


def _serialize_comment(
    comment: CommunityPostComment,
    *,
    include_moderation: bool = False,
) -> CommunityPostCommentResponse:
    return CommunityPostCommentResponse(
        id=comment.id,
        post_id=comment.post_id,
        author_user_id=comment.author_user_id,
        author_display_name=comment.author.display_name if comment.author else "Removed user",
        body=comment.body,
        status=comment.status,
        removed_by_user_id=comment.removed_by_user_id,
        removed_at=comment.removed_at,
        moderation_note=comment.moderation_note if include_moderation else None,
        moderation_severity=comment.moderation_severity if include_moderation else None,
        escalation_status=comment.escalation_status if include_moderation else None,
        escalated_by_user_id=comment.escalated_by_user_id if include_moderation else None,
        escalated_at=comment.escalated_at if include_moderation else None,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
    )


def _serialize_report(
    report: CommunityPostReport,
    *,
    include_moderation: bool = False,
) -> CommunityPostReportResponse:
    return CommunityPostReportResponse(
        id=report.id,
        post_id=report.post_id,
        reporter_user_id=report.reporter_user_id,
        reporter_display_name=report.reporter.display_name if report.reporter else "Removed user",
        reason=report.reason,
        note=report.note,
        status=report.status,
        moderator_note=report.moderator_note if include_moderation else None,
        severity=report.severity if include_moderation else None,
        escalation_status=report.escalation_status if include_moderation else None,
        escalated_by_user_id=report.escalated_by_user_id if include_moderation else None,
        escalated_at=report.escalated_at if include_moderation else None,
        resolved_by_user_id=report.resolved_by_user_id,
        resolved_at=report.resolved_at,
        created_at=report.created_at,
        updated_at=report.updated_at,
    )


def _serialize_report_queue_item(report: CommunityPostReport) -> CommunityPostReportQueueItem:
    post = report.post
    return CommunityPostReportQueueItem(
        id=report.id,
        post_id=report.post_id,
        reporter_user_id=report.reporter_user_id,
        reporter_display_name=report.reporter.display_name if report.reporter else "Removed user",
        reason=report.reason,
        note=report.note,
        status=report.status,
        moderator_note=report.moderator_note,
        severity=report.severity,
        escalation_status=report.escalation_status,
        escalated_by_user_id=report.escalated_by_user_id,
        escalated_at=report.escalated_at,
        resolved_by_user_id=report.resolved_by_user_id,
        resolved_at=report.resolved_at,
        created_at=report.created_at,
        updated_at=report.updated_at,
        post_author_display_name=post.author.display_name if post.author else "Removed user",
        post_body=post.body,
        post_status=post.status,
        post_removed_at=post.removed_at,
        post_created_at=post.created_at,
    )


def _serialize_admin_report_queue_item(
    report: CommunityPostReport,
) -> CommunityAdminPostReportQueueItem:
    post = report.post
    community = post.community
    return CommunityAdminPostReportQueueItem(
        **_serialize_report_queue_item(report).model_dump(),
        community_id=post.community_id,
        community_name=community.name,
        community_slug=community.slug,
    )


def _serialize_removed_post_queue_item(
    db: Session,
    post: CommunityPost,
    current_user: User,
    community: Community,
) -> CommunityRemovedPostQueueItem:
    return CommunityRemovedPostQueueItem(
        **_serialize_post(db, post, current_user, community).model_dump(),
        removed_by_display_name=(
            post.removed_by_user.display_name if post.removed_by_user else "Removed user"
        ),
    )


def _serialize_admin_removed_post_queue_item(
    db: Session,
    post: CommunityPost,
    current_user: User,
) -> CommunityAdminRemovedPostQueueItem:
    community = post.community
    return CommunityAdminRemovedPostQueueItem(
        **_serialize_removed_post_queue_item(db, post, current_user, community).model_dump(),
        community_name=community.name,
        community_slug=community.slug,
    )


def _serialize_removed_comment_queue_item(
    comment: CommunityPostComment,
) -> CommunityRemovedCommentQueueItem:
    post = comment.post
    return CommunityRemovedCommentQueueItem(
        **_serialize_comment(comment, include_moderation=True).model_dump(),
        removed_by_display_name=(
            comment.removed_by_user.display_name if comment.removed_by_user else "Removed user"
        ),
        post_author_display_name=post.author.display_name if post.author else "Removed user",
        post_body=post.body,
        post_status=post.status,
        post_created_at=post.created_at,
    )


def _serialize_admin_removed_comment_queue_item(
    comment: CommunityPostComment,
) -> CommunityAdminRemovedCommentQueueItem:
    post = comment.post
    community = post.community
    return CommunityAdminRemovedCommentQueueItem(
        **_serialize_removed_comment_queue_item(comment).model_dump(),
        community_id=post.community_id,
        community_name=community.name,
        community_slug=community.slug,
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
    invitation_body = (
        f"{current_user.display_name} accepted an invitation as {invitation.invited_role.lower()}."
    )
    _notify_community_managers(
        db,
        community,
        current_user,
        body=invitation_body,
        event_type="community.invitation_accepted",
        metadata={
            "community_id": str(community.id),
            "invitation_id": str(invitation.id),
            "target_user_id": str(current_user.id),
        },
        title=f"Invitation accepted in {community.name}",
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
        _notify_community_managers(
            db,
            community,
            current_user,
            body=f"{current_user.display_name} updated {', '.join(changed_fields)}.",
            event_type="community.updated",
            metadata={"changed_fields": changed_fields, "community_id": str(community.id)},
            title=f"{community.name} settings updated",
        )
        db.commit()
    else:
        db.rollback()

    community = _get_community_or_404(db, community.id)
    return _serialize_community(community, current_user)


@router.get("/{community_id}/posts", response_model=CommunityPostListResponse)
def list_community_posts(
    community_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
    status_filter: Annotated[
        str,
        Query(alias="status", pattern="^(ACTIVE|REMOVED|ALL)$"),
    ] = "ACTIVE",
    limit: Annotated[int, Query(ge=1, le=30)] = 10,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> CommunityPostListResponse:
    community = _get_community_or_404(db, community_id)
    if not _can_access_community_content(current_user, community):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Community posts are available to active members",
        )

    normalized_status = status_filter.strip().upper()
    if normalized_status != "ACTIVE" and not _can_manage_community(current_user, community):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view moderated posts",
        )

    query = (
        select(CommunityPost)
        .options(joinedload(CommunityPost.author), selectinload(CommunityPost.media_items))
        .where(CommunityPost.community_id == community.id)
    )
    if normalized_status != "ALL":
        query = query.where(CommunityPost.status == normalized_status)

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    posts = db.scalars(
        query.order_by(CommunityPost.created_at.desc()).offset(offset).limit(limit)
    ).all()
    return CommunityPostListResponse(
        posts=[_serialize_post(db, post, current_user, community) for post in posts],
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(posts) < total,
    )


@router.post(
    "/{community_id}/posts",
    response_model=CommunityPostResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_community_post(
    community_id: uuid.UUID,
    payload: CommunityPostCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> CommunityPostResponse:
    community = _get_community_or_404(db, community_id)
    if not _can_access_community_content(current_user, community):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Community posts are available to active members",
        )

    post = CommunityPost(
        community_id=community.id,
        author_user_id=current_user.id,
        body=payload.body,
        status="ACTIVE",
    )
    db.add(post)
    _create_security_event(
        db,
        request,
        current_user,
        "community.post_created",
        metadata={"community_id": str(community.id)},
    )
    db.commit()
    db.refresh(post)
    post = _get_post_or_404(db, community, post.id)
    return _serialize_post(db, post, current_user, community)


@router.post("/{community_id}/posts/{post_id}/remove", response_model=CommunityPostResponse)
def remove_community_post(
    community_id: uuid.UUID,
    post_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> CommunityPostResponse:
    community = _get_community_or_404(db, community_id)
    if not _can_access_community_content(current_user, community):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Community posts are available to active members",
        )

    post = _get_post_or_404(db, community, post_id)
    actor_is_author = post.author_user_id == current_user.id
    if not actor_is_author and not _can_manage_community(current_user, community):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to remove this post",
        )
    if post.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only active posts can be removed",
        )

    post.status = "REMOVED"
    post.removed_by_user_id = current_user.id
    post.removed_at = utcnow()
    _create_security_event(
        db,
        request,
        current_user,
        "community.post_removed",
        metadata={
            "community_id": str(community.id),
            "post_id": str(post.id),
            "post_author_user_id": str(post.author_user_id) if post.author_user_id else None,
        },
    )
    if post.author_user_id:
        notify_users(
            db,
            [post.author_user_id],
            actor_user_id=current_user.id,
            body=f"A post was removed in {community.name}.",
            event_type="community.post_removed",
            exclude_user_ids={current_user.id},
            metadata={"community_id": str(community.id), "post_id": str(post.id)},
            target_url=_community_target_url(community),
            title="Your community post was removed",
        )
    db.commit()
    db.refresh(post)
    return _serialize_post(db, post, current_user, community)


@router.post("/{community_id}/posts/{post_id}/restore", response_model=CommunityPostResponse)
def restore_community_post(
    community_id: uuid.UUID,
    post_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> CommunityPostResponse:
    community = _get_community_or_404(db, community_id)
    if not _can_manage_community(current_user, community):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to restore this post",
        )

    post = _get_post_or_404(db, community, post_id)
    if post.status != "REMOVED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only removed posts can be restored",
        )

    post.status = "ACTIVE"
    post.removed_by_user_id = None
    post.removed_at = None
    _create_security_event(
        db,
        request,
        current_user,
        "community.post_restored",
        metadata={
            "community_id": str(community.id),
            "post_id": str(post.id),
            "post_author_user_id": str(post.author_user_id) if post.author_user_id else None,
        },
    )
    if post.author_user_id:
        notify_users(
            db,
            [post.author_user_id],
            actor_user_id=current_user.id,
            body=f"A removed post was restored in {community.name}.",
            event_type="community.post_restored",
            exclude_user_ids={current_user.id},
            metadata={"community_id": str(community.id), "post_id": str(post.id)},
            target_url=_community_target_url(community),
            title="Your community post was restored",
        )
    db.commit()
    db.refresh(post)
    return _serialize_post(db, post, current_user, community)


@router.patch(
    "/{community_id}/posts/{post_id}/moderation-review",
    response_model=CommunityPostResponse,
)
def update_community_post_moderation_review(
    community_id: uuid.UUID,
    post_id: uuid.UUID,
    payload: CommunityModerationReviewUpdate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> CommunityPostResponse:
    _validate_moderation_review_payload(payload)
    community = _get_community_or_404(db, community_id)
    if not _can_manage_community(current_user, community):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update post moderation review",
        )

    post = _get_post_or_404(db, community, post_id)
    if post.status != "REMOVED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only removed posts can receive moderation review metadata",
        )

    if "moderator_note" in payload.model_fields_set:
        post.moderation_note = payload.moderator_note
    if payload.severity is not None:
        post.moderation_severity = payload.severity
    previous_escalation_status = post.escalation_status
    _apply_escalation_review(post, payload.escalation_status, current_user)
    _create_security_event(
        db,
        request,
        current_user,
        "community.post_moderation_review_updated",
        metadata={
            "community_id": str(community.id),
            "escalation_status": post.escalation_status,
            "moderation_severity": post.moderation_severity,
            "post_id": str(post.id),
        },
    )
    if payload.escalation_status == "ESCALATED" and previous_escalation_status != "ESCALATED":
        _notify_moderation_escalation(
            db,
            community,
            current_user,
            content_id=post.id,
            content_type="removed_post",
            severity=post.moderation_severity,
        )
    db.commit()
    db.refresh(post)
    return _serialize_post(db, post, current_user, community)


@router.post(
    "/{community_id}/posts/{post_id}/media",
    response_model=CommunityPostMediaResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_community_post_media(
    community_id: uuid.UUID,
    post_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
    media_file: Annotated[UploadFile, File(alias="file")],
    alt_text: Annotated[str | None, Form(max_length=180)] = None,
) -> CommunityPostMediaResponse:
    community = _get_community_or_404(db, community_id)
    if not _can_access_community_content(current_user, community):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Community media is available to active members",
        )

    post = _get_post_or_404(db, community, post_id)
    _ensure_post_active(post)
    if post.author_user_id != current_user.id and not _can_manage_community(
        current_user, community
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to attach media to this post",
        )

    active_media_count = (
        db.scalar(
            select(func.count())
            .select_from(CommunityPostMedia)
            .where(
                CommunityPostMedia.post_id == post.id,
                CommunityPostMedia.status == "ACTIVE",
            )
        )
        or 0
    )
    if active_media_count >= COMMUNITY_POST_MEDIA_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Posts can have up to {COMMUNITY_POST_MEDIA_LIMIT} active attachments",
        )

    media_id = uuid.uuid4()
    stored_file = await store_community_post_media_file(
        media_id=media_id,
        post_id=post.id,
        upload=media_file,
    )
    media = CommunityPostMedia(
        id=media_id,
        post_id=post.id,
        uploaded_by_user_id=current_user.id,
        file_name=stored_file.file_name,
        content_type=stored_file.content_type,
        file_size_bytes=stored_file.file_size_bytes,
        storage_provider=stored_file.storage_provider,
        storage_key=stored_file.storage_key,
        alt_text=alt_text.strip() if alt_text else None,
        status="ACTIVE",
    )
    db.add(media)
    _create_security_event(
        db,
        request,
        current_user,
        "community.post_media_uploaded",
        metadata={
            "community_id": str(community.id),
            "content_type": media.content_type,
            "media_id": str(media.id),
            "post_id": str(post.id),
        },
    )
    db.commit()
    db.refresh(media)
    return _serialize_post_media(media, post)


@router.get(
    "/{community_id}/posts/{post_id}/media/{media_id}/download",
)
def download_community_post_media(
    community_id: uuid.UUID,
    post_id: uuid.UUID,
    media_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> Response:
    community = _get_community_or_404(db, community_id)
    if not _can_access_community_content(current_user, community):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Community media is available to active members",
        )

    post = _get_post_or_404(db, community, post_id)
    media = _get_post_media_or_404(db, post, media_id)
    can_manage = _can_manage_community(current_user, community)
    if (post.status != "ACTIVE" or media.status != "ACTIVE") and not can_manage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community post media not found",
        )

    return upload_response(
        category=UploadCategory.COMMUNITY_POST_MEDIA,
        content_type=media.content_type,
        file_name=media.file_name,
        storage_key=media.storage_key,
        storage_provider=media.storage_provider,
    )


@router.post(
    "/{community_id}/posts/{post_id}/media/{media_id}/remove",
    response_model=CommunityPostMediaResponse,
)
def remove_community_post_media(
    community_id: uuid.UUID,
    post_id: uuid.UUID,
    media_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> CommunityPostMediaResponse:
    community = _get_community_or_404(db, community_id)
    if not _can_access_community_content(current_user, community):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Community media is available to active members",
        )

    post = _get_post_or_404(db, community, post_id)
    media = _get_post_media_or_404(db, post, media_id)
    actor_can_remove = (
        media.uploaded_by_user_id == current_user.id
        or post.author_user_id == current_user.id
        or _can_manage_community(current_user, community)
    )
    if not actor_can_remove:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to remove this attachment",
        )
    if media.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only active media can be removed",
        )

    media.status = "REMOVED"
    media.removed_by_user_id = current_user.id
    media.removed_at = utcnow()
    _create_security_event(
        db,
        request,
        current_user,
        "community.post_media_removed",
        metadata={
            "community_id": str(community.id),
            "media_id": str(media.id),
            "post_id": str(post.id),
        },
    )
    if media.uploaded_by_user_id:
        notify_users(
            db,
            [media.uploaded_by_user_id],
            actor_user_id=current_user.id,
            body=f"An attachment was removed from a post in {community.name}.",
            event_type="community.post_media_removed",
            exclude_user_ids={current_user.id},
            metadata={
                "community_id": str(community.id),
                "media_id": str(media.id),
                "post_id": str(post.id),
            },
            target_url=_community_target_url(community),
            title="Community post attachment removed",
        )
    db.commit()
    db.refresh(media)
    return _serialize_post_media(media, post)


@router.post(
    "/{community_id}/posts/{post_id}/media/{media_id}/restore",
    response_model=CommunityPostMediaResponse,
)
def restore_community_post_media(
    community_id: uuid.UUID,
    post_id: uuid.UUID,
    media_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> CommunityPostMediaResponse:
    community = _get_community_or_404(db, community_id)
    if not _can_manage_community(current_user, community):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to restore this attachment",
        )

    post = _get_post_or_404(db, community, post_id)
    media = _get_post_media_or_404(db, post, media_id)
    if media.status != "REMOVED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only removed media can be restored",
        )

    media.status = "ACTIVE"
    media.removed_by_user_id = None
    media.removed_at = None
    _create_security_event(
        db,
        request,
        current_user,
        "community.post_media_restored",
        metadata={
            "community_id": str(community.id),
            "media_id": str(media.id),
            "post_id": str(post.id),
        },
    )
    if media.uploaded_by_user_id:
        notify_users(
            db,
            [media.uploaded_by_user_id],
            actor_user_id=current_user.id,
            body=f"An attachment was restored on a post in {community.name}.",
            event_type="community.post_media_restored",
            exclude_user_ids={current_user.id},
            metadata={
                "community_id": str(community.id),
                "media_id": str(media.id),
                "post_id": str(post.id),
            },
            target_url=_community_target_url(community),
            title="Community post attachment restored",
        )
    db.commit()
    db.refresh(media)
    return _serialize_post_media(media, post)


@router.get(
    "/{community_id}/posts/{post_id}/comments",
    response_model=CommunityPostCommentListResponse,
)
def list_community_post_comments(
    community_id: uuid.UUID,
    post_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
    status_filter: Annotated[
        str,
        Query(alias="status", pattern="^(ACTIVE|REMOVED|ALL)$"),
    ] = "ACTIVE",
    limit: Annotated[int, Query(ge=1, le=30)] = 10,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> CommunityPostCommentListResponse:
    community = _get_community_or_404(db, community_id)
    if not _can_access_community_content(current_user, community):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Community comments are available to active members",
        )

    post = _get_post_or_404(db, community, post_id)
    normalized_status = status_filter.strip().upper()
    if (normalized_status != "ACTIVE" or post.status != "ACTIVE") and not _can_manage_community(
        current_user, community
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view moderated comments",
        )

    query = (
        select(CommunityPostComment)
        .options(joinedload(CommunityPostComment.author))
        .where(CommunityPostComment.post_id == post.id)
    )
    if normalized_status != "ALL":
        query = query.where(CommunityPostComment.status == normalized_status)

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    comments = db.scalars(
        query.order_by(CommunityPostComment.created_at.asc()).offset(offset).limit(limit)
    ).all()
    return CommunityPostCommentListResponse(
        comments=[
            _serialize_comment(
                comment,
                include_moderation=_can_manage_community(current_user, community),
            )
            for comment in comments
        ],
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(comments) < total,
    )


@router.post(
    "/{community_id}/posts/{post_id}/comments",
    response_model=CommunityPostCommentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_community_post_comment(
    community_id: uuid.UUID,
    post_id: uuid.UUID,
    payload: CommunityPostCommentCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> CommunityPostCommentResponse:
    community = _get_community_or_404(db, community_id)
    if not _can_access_community_content(current_user, community):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Community comments are available to active members",
        )

    post = _get_post_or_404(db, community, post_id)
    _ensure_post_active(post)
    comment = CommunityPostComment(
        post_id=post.id,
        author_user_id=current_user.id,
        body=payload.body,
        status="ACTIVE",
    )
    db.add(comment)
    db.flush()
    _create_security_event(
        db,
        request,
        current_user,
        "community.post_comment_created",
        metadata={"community_id": str(community.id), "post_id": str(post.id)},
    )
    if post.author_user_id:
        notify_users(
            db,
            [post.author_user_id],
            actor_user_id=current_user.id,
            body=f"{current_user.display_name} commented on your post in {community.name}.",
            event_type="community.post_comment_created",
            exclude_user_ids={current_user.id},
            metadata={
                "community_id": str(community.id),
                "comment_id": str(comment.id),
                "post_id": str(post.id),
            },
            target_url=_community_target_url(community),
            title="New comment on your post",
        )
    db.commit()
    db.refresh(comment)
    comment = _get_comment_or_404(db, post, comment.id)
    return _serialize_comment(comment)


@router.post(
    "/{community_id}/posts/{post_id}/comments/{comment_id}/remove",
    response_model=CommunityPostCommentResponse,
)
def remove_community_post_comment(
    community_id: uuid.UUID,
    post_id: uuid.UUID,
    comment_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> CommunityPostCommentResponse:
    community = _get_community_or_404(db, community_id)
    if not _can_access_community_content(current_user, community):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Community comments are available to active members",
        )

    post = _get_post_or_404(db, community, post_id)
    comment = _get_comment_or_404(db, post, comment_id)
    actor_is_author = comment.author_user_id == current_user.id
    if not actor_is_author and not _can_manage_community(current_user, community):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to remove this comment",
        )
    if comment.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only active comments can be removed",
        )

    comment.status = "REMOVED"
    comment.removed_by_user_id = current_user.id
    comment.removed_at = utcnow()
    _create_security_event(
        db,
        request,
        current_user,
        "community.post_comment_removed",
        metadata={
            "comment_id": str(comment.id),
            "community_id": str(community.id),
            "post_id": str(post.id),
        },
    )
    if comment.author_user_id:
        notify_users(
            db,
            [comment.author_user_id],
            actor_user_id=current_user.id,
            body=f"A comment was removed in {community.name}.",
            event_type="community.post_comment_removed",
            exclude_user_ids={current_user.id},
            metadata={
                "comment_id": str(comment.id),
                "community_id": str(community.id),
                "post_id": str(post.id),
            },
            target_url=_community_target_url(community),
            title="Your community comment was removed",
        )
    db.commit()
    db.refresh(comment)
    return _serialize_comment(
        comment,
        include_moderation=_can_manage_community(current_user, community),
    )


@router.post(
    "/{community_id}/posts/{post_id}/comments/{comment_id}/restore",
    response_model=CommunityPostCommentResponse,
)
def restore_community_post_comment(
    community_id: uuid.UUID,
    post_id: uuid.UUID,
    comment_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> CommunityPostCommentResponse:
    community = _get_community_or_404(db, community_id)
    if not _can_manage_community(current_user, community):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to restore this comment",
        )

    post = _get_post_or_404(db, community, post_id)
    comment = _get_comment_or_404(db, post, comment_id)
    if comment.status != "REMOVED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only removed comments can be restored",
        )

    comment.status = "ACTIVE"
    comment.removed_by_user_id = None
    comment.removed_at = None
    _create_security_event(
        db,
        request,
        current_user,
        "community.post_comment_restored",
        metadata={
            "comment_id": str(comment.id),
            "community_id": str(community.id),
            "post_id": str(post.id),
        },
    )
    if comment.author_user_id:
        notify_users(
            db,
            [comment.author_user_id],
            actor_user_id=current_user.id,
            body=f"A removed comment was restored in {community.name}.",
            event_type="community.post_comment_restored",
            exclude_user_ids={current_user.id},
            metadata={
                "comment_id": str(comment.id),
                "community_id": str(community.id),
                "post_id": str(post.id),
            },
            target_url=_community_target_url(community),
            title="Your community comment was restored",
        )
    db.commit()
    db.refresh(comment)
    return _serialize_comment(comment, include_moderation=True)


@router.patch(
    "/{community_id}/posts/{post_id}/comments/{comment_id}/moderation-review",
    response_model=CommunityPostCommentResponse,
)
def update_community_post_comment_moderation_review(
    community_id: uuid.UUID,
    post_id: uuid.UUID,
    comment_id: uuid.UUID,
    payload: CommunityModerationReviewUpdate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> CommunityPostCommentResponse:
    _validate_moderation_review_payload(payload)
    community = _get_community_or_404(db, community_id)
    if not _can_manage_community(current_user, community):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update comment moderation review",
        )

    post = _get_post_or_404(db, community, post_id)
    comment = _get_comment_or_404(db, post, comment_id)
    if comment.status != "REMOVED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only removed comments can receive moderation review metadata",
        )

    if "moderator_note" in payload.model_fields_set:
        comment.moderation_note = payload.moderator_note
    if payload.severity is not None:
        comment.moderation_severity = payload.severity
    previous_escalation_status = comment.escalation_status
    _apply_escalation_review(comment, payload.escalation_status, current_user)
    _create_security_event(
        db,
        request,
        current_user,
        "community.post_comment_moderation_review_updated",
        metadata={
            "comment_id": str(comment.id),
            "community_id": str(community.id),
            "escalation_status": comment.escalation_status,
            "moderation_severity": comment.moderation_severity,
            "post_id": str(post.id),
        },
    )
    if payload.escalation_status == "ESCALATED" and previous_escalation_status != "ESCALATED":
        _notify_moderation_escalation(
            db,
            community,
            current_user,
            content_id=comment.id,
            content_type="removed_comment",
            severity=comment.moderation_severity,
        )
    db.commit()
    db.refresh(comment)
    return _serialize_comment(comment, include_moderation=True)


@router.post(
    "/{community_id}/posts/{post_id}/reaction",
    response_model=CommunityPostReactionResponse,
)
def toggle_community_post_reaction(
    community_id: uuid.UUID,
    post_id: uuid.UUID,
    payload: CommunityPostReactionCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> CommunityPostReactionResponse:
    community = _get_community_or_404(db, community_id)
    if not _can_access_community_content(current_user, community):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Community reactions are available to active members",
        )
    if payload.reaction_type not in COMMUNITY_REACTION_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reaction")

    post = _get_post_or_404(db, community, post_id)
    _ensure_post_active(post)
    existing_reaction = db.scalar(
        select(CommunityPostReaction).where(
            CommunityPostReaction.post_id == post.id,
            CommunityPostReaction.user_id == current_user.id,
        )
    )
    reacted = existing_reaction is None
    if existing_reaction:
        db.delete(existing_reaction)
        event_type = "community.post_reaction_removed"
    else:
        db.add(
            CommunityPostReaction(
                post_id=post.id,
                user_id=current_user.id,
                reaction_type=payload.reaction_type,
            )
        )
        event_type = "community.post_reaction_added"

    _create_security_event(
        db,
        request,
        current_user,
        event_type,
        metadata={"community_id": str(community.id), "post_id": str(post.id)},
    )
    db.commit()
    reaction_count = (
        db.scalar(
            select(func.count())
            .select_from(CommunityPostReaction)
            .where(CommunityPostReaction.post_id == post.id)
        )
        or 0
    )
    return CommunityPostReactionResponse(
        post_id=post.id,
        reaction_type=payload.reaction_type,
        reacted=reacted,
        reaction_count=reaction_count,
    )


@router.post(
    "/{community_id}/posts/{post_id}/reports",
    response_model=CommunityPostReportResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_community_post_report(
    community_id: uuid.UUID,
    post_id: uuid.UUID,
    payload: CommunityPostReportCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> CommunityPostReportResponse:
    community = _get_community_or_404(db, community_id)
    if not _can_access_community_content(current_user, community):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Community reports are available to active members",
        )
    if payload.reason not in COMMUNITY_REPORT_REASONS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid report reason")

    post = _get_post_or_404(db, community, post_id)
    _ensure_post_active(post)
    existing_open_report = db.scalar(
        select(CommunityPostReport.id).where(
            CommunityPostReport.post_id == post.id,
            CommunityPostReport.reporter_user_id == current_user.id,
            CommunityPostReport.status == "OPEN",
        )
    )
    if existing_open_report:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have an open report for this post",
        )

    report = CommunityPostReport(
        post_id=post.id,
        reporter_user_id=current_user.id,
        reason=payload.reason,
        note=payload.note,
        status="OPEN",
    )
    db.add(report)
    db.flush()
    _create_security_event(
        db,
        request,
        current_user,
        "community.post_report_created",
        metadata={
            "community_id": str(community.id),
            "post_id": str(post.id),
            "reason": report.reason,
        },
    )
    report_reason = report.reason.lower().replace("_", " ")
    _notify_community_managers(
        db,
        community,
        current_user,
        body=f"{current_user.display_name} reported a post for {report_reason}.",
        event_type="community.post_report_created",
        metadata={
            "community_id": str(community.id),
            "post_id": str(post.id),
            "reason": report.reason,
            "report_id": str(report.id),
        },
        title=f"New post report in {community.name}",
    )
    db.commit()
    db.refresh(report)
    report = _get_report_or_404(db, post, report.id)
    return _serialize_report(report)


@router.get(
    "/{community_id}/posts/{post_id}/reports",
    response_model=CommunityPostReportListResponse,
)
def list_community_post_reports(
    community_id: uuid.UUID,
    post_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
    status_filter: Annotated[
        str,
        Query(alias="status", pattern="^(OPEN|RESOLVED|ALL)$"),
    ] = "OPEN",
    limit: Annotated[int, Query(ge=1, le=30)] = 10,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> CommunityPostReportListResponse:
    community = _get_community_or_404(db, community_id)
    if not _can_manage_community(current_user, community):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to review post reports",
        )

    post = _get_post_or_404(db, community, post_id)
    normalized_status = status_filter.strip().upper()
    query = (
        select(CommunityPostReport)
        .options(joinedload(CommunityPostReport.reporter))
        .where(CommunityPostReport.post_id == post.id)
    )
    if normalized_status != "ALL":
        query = query.where(CommunityPostReport.status == normalized_status)

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    reports = db.scalars(
        query.order_by(CommunityPostReport.created_at.desc()).offset(offset).limit(limit)
    ).all()
    return CommunityPostReportListResponse(
        reports=[_serialize_report(report, include_moderation=True) for report in reports],
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(reports) < total,
    )


@router.post(
    "/{community_id}/posts/{post_id}/reports/{report_id}/resolve",
    response_model=CommunityPostReportResponse,
)
def resolve_community_post_report(
    community_id: uuid.UUID,
    post_id: uuid.UUID,
    report_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> CommunityPostReportResponse:
    community = _get_community_or_404(db, community_id)
    if not _can_manage_community(current_user, community):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to review post reports",
        )

    post = _get_post_or_404(db, community, post_id)
    report = _get_report_or_404(db, post, report_id)
    if report.status != "OPEN":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only open reports can be resolved",
        )

    report.status = "RESOLVED"
    report.resolved_by_user_id = current_user.id
    report.resolved_at = utcnow()
    _create_security_event(
        db,
        request,
        current_user,
        "community.post_report_resolved",
        metadata={
            "community_id": str(community.id),
            "post_id": str(post.id),
            "report_id": str(report.id),
        },
    )
    if report.reporter_user_id:
        notify_users(
            db,
            [report.reporter_user_id],
            actor_user_id=current_user.id,
            body=f"A report you submitted in {community.name} has been resolved.",
            event_type="community.post_report_resolved",
            exclude_user_ids={current_user.id},
            metadata={
                "community_id": str(community.id),
                "post_id": str(post.id),
                "report_id": str(report.id),
            },
            target_url=_community_target_url(community),
            title="Your post report was resolved",
        )
    db.commit()
    db.refresh(report)
    return _serialize_report(report, include_moderation=True)


@router.patch(
    "/{community_id}/posts/{post_id}/reports/{report_id}/review",
    response_model=CommunityPostReportResponse,
)
def update_community_post_report_review(
    community_id: uuid.UUID,
    post_id: uuid.UUID,
    report_id: uuid.UUID,
    payload: CommunityModerationReviewUpdate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> CommunityPostReportResponse:
    _validate_moderation_review_payload(payload)
    community = _get_community_or_404(db, community_id)
    if not _can_manage_community(current_user, community):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update post report review",
        )

    post = _get_post_or_404(db, community, post_id)
    report = _get_report_or_404(db, post, report_id)
    if "moderator_note" in payload.model_fields_set:
        report.moderator_note = payload.moderator_note
    if payload.severity is not None:
        report.severity = payload.severity
    previous_escalation_status = report.escalation_status
    _apply_escalation_review(report, payload.escalation_status, current_user)
    _create_security_event(
        db,
        request,
        current_user,
        "community.post_report_review_updated",
        metadata={
            "community_id": str(community.id),
            "escalation_status": report.escalation_status,
            "post_id": str(post.id),
            "report_id": str(report.id),
            "severity": report.severity,
        },
    )
    if payload.escalation_status == "ESCALATED" and previous_escalation_status != "ESCALATED":
        _notify_moderation_escalation(
            db,
            community,
            current_user,
            content_id=report.id,
            content_type="post_report",
            severity=report.severity,
        )
    db.commit()
    db.refresh(report)
    return _serialize_report(report, include_moderation=True)


@router.get(
    "/admin/moderation/post-reports",
    response_model=CommunityAdminPostReportQueueResponse,
)
def list_admin_community_post_report_queue(
    current_user: Annotated[User, Depends(community_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
    status_filter: Annotated[
        str,
        Query(alias="status", pattern="^(OPEN|RESOLVED|ALL)$"),
    ] = "OPEN",
    community_id_filter: Annotated[uuid.UUID | None, Query(alias="community_id")] = None,
    reason: Annotated[
        str | None,
        Query(pattern="^(HARASSMENT|MISINFORMATION|OTHER|SPAM|UNRELATED)$"),
    ] = None,
    severity: Annotated[
        str | None,
        Query(pattern="^(CRITICAL|HIGH|LOW|MEDIUM)$"),
    ] = None,
    escalation_status: Annotated[
        str | None,
        Query(pattern="^(ESCALATED|NONE)$"),
    ] = None,
    q: Annotated[str | None, Query(max_length=120)] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> CommunityAdminPostReportQueueResponse:
    _ = current_user
    normalized_status = status_filter.strip().upper()
    query = (
        select(CommunityPostReport)
        .join(CommunityPost, CommunityPostReport.post_id == CommunityPost.id)
        .join(Community, CommunityPost.community_id == Community.id)
        .options(
            joinedload(CommunityPostReport.reporter),
            joinedload(CommunityPostReport.post).joinedload(CommunityPost.author),
            joinedload(CommunityPostReport.post).joinedload(CommunityPost.community),
        )
    )
    if normalized_status != "ALL":
        query = query.where(CommunityPostReport.status == normalized_status)
    if community_id_filter:
        query = query.where(Community.id == community_id_filter)
    if reason:
        query = query.where(CommunityPostReport.reason == reason.strip().upper())
    if severity:
        query = query.where(CommunityPostReport.severity == severity.strip().upper())
    if escalation_status:
        query = query.where(
            CommunityPostReport.escalation_status == escalation_status.strip().upper()
        )
    if q:
        search_term = f"%{q.strip()}%"
        query = query.where(
            or_(
                Community.name.ilike(search_term),
                Community.slug.ilike(search_term),
                CommunityPost.body.ilike(search_term),
                CommunityPostReport.note.ilike(search_term),
                CommunityPostReport.moderator_note.ilike(search_term),
            )
        )

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    reports = db.scalars(
        query.order_by(CommunityPostReport.created_at.desc()).offset(offset).limit(limit)
    ).all()
    return CommunityAdminPostReportQueueResponse(
        reports=[_serialize_admin_report_queue_item(report) for report in reports],
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(reports) < total,
    )


@router.get(
    "/admin/moderation/removed-posts",
    response_model=CommunityAdminRemovedPostQueueResponse,
)
def list_admin_community_removed_posts(
    current_user: Annotated[User, Depends(community_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
    community_id_filter: Annotated[uuid.UUID | None, Query(alias="community_id")] = None,
    severity: Annotated[
        str | None,
        Query(pattern="^(CRITICAL|HIGH|LOW|MEDIUM)$"),
    ] = None,
    escalation_status: Annotated[
        str | None,
        Query(pattern="^(ESCALATED|NONE)$"),
    ] = None,
    q: Annotated[str | None, Query(max_length=120)] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> CommunityAdminRemovedPostQueueResponse:
    query = (
        select(CommunityPost)
        .join(Community, CommunityPost.community_id == Community.id)
        .options(
            joinedload(CommunityPost.author),
            joinedload(CommunityPost.community),
            selectinload(CommunityPost.media_items),
            joinedload(CommunityPost.removed_by_user),
        )
        .where(CommunityPost.status == "REMOVED")
    )
    if community_id_filter:
        query = query.where(Community.id == community_id_filter)
    if severity:
        query = query.where(CommunityPost.moderation_severity == severity.strip().upper())
    if escalation_status:
        query = query.where(CommunityPost.escalation_status == escalation_status.strip().upper())
    if q:
        search_term = f"%{q.strip()}%"
        query = query.where(
            or_(
                Community.name.ilike(search_term),
                Community.slug.ilike(search_term),
                CommunityPost.body.ilike(search_term),
                CommunityPost.moderation_note.ilike(search_term),
            )
        )

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    posts = db.scalars(
        query.order_by(CommunityPost.removed_at.desc(), CommunityPost.created_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return CommunityAdminRemovedPostQueueResponse(
        posts=[_serialize_admin_removed_post_queue_item(db, post, current_user) for post in posts],
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(posts) < total,
    )


@router.get(
    "/admin/moderation/removed-comments",
    response_model=CommunityAdminRemovedCommentQueueResponse,
)
def list_admin_community_removed_comments(
    current_user: Annotated[User, Depends(community_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
    community_id_filter: Annotated[uuid.UUID | None, Query(alias="community_id")] = None,
    severity: Annotated[
        str | None,
        Query(pattern="^(CRITICAL|HIGH|LOW|MEDIUM)$"),
    ] = None,
    escalation_status: Annotated[
        str | None,
        Query(pattern="^(ESCALATED|NONE)$"),
    ] = None,
    q: Annotated[str | None, Query(max_length=120)] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> CommunityAdminRemovedCommentQueueResponse:
    _ = current_user
    query = (
        select(CommunityPostComment)
        .join(CommunityPost, CommunityPostComment.post_id == CommunityPost.id)
        .join(Community, CommunityPost.community_id == Community.id)
        .options(
            joinedload(CommunityPostComment.author),
            joinedload(CommunityPostComment.removed_by_user),
            joinedload(CommunityPostComment.post).joinedload(CommunityPost.author),
            joinedload(CommunityPostComment.post).joinedload(CommunityPost.community),
        )
        .where(CommunityPostComment.status == "REMOVED")
    )
    if community_id_filter:
        query = query.where(Community.id == community_id_filter)
    if severity:
        query = query.where(CommunityPostComment.moderation_severity == severity.strip().upper())
    if escalation_status:
        query = query.where(
            CommunityPostComment.escalation_status == escalation_status.strip().upper()
        )
    if q:
        search_term = f"%{q.strip()}%"
        query = query.where(
            or_(
                Community.name.ilike(search_term),
                Community.slug.ilike(search_term),
                CommunityPost.body.ilike(search_term),
                CommunityPostComment.body.ilike(search_term),
                CommunityPostComment.moderation_note.ilike(search_term),
            )
        )

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    comments = db.scalars(
        query.order_by(
            CommunityPostComment.removed_at.desc(),
            CommunityPostComment.created_at.desc(),
        )
        .offset(offset)
        .limit(limit)
    ).all()
    return CommunityAdminRemovedCommentQueueResponse(
        comments=[_serialize_admin_removed_comment_queue_item(comment) for comment in comments],
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(comments) < total,
    )


@router.get(
    "/{community_id}/post-reports",
    response_model=CommunityPostReportQueueResponse,
)
def list_community_post_report_queue(
    community_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
    status_filter: Annotated[
        str,
        Query(alias="status", pattern="^(OPEN|RESOLVED|ALL)$"),
    ] = "OPEN",
    severity: Annotated[
        str | None,
        Query(pattern="^(CRITICAL|HIGH|LOW|MEDIUM)$"),
    ] = None,
    escalation_status: Annotated[
        str | None,
        Query(pattern="^(ESCALATED|NONE)$"),
    ] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> CommunityPostReportQueueResponse:
    community = _get_community_or_404(db, community_id)
    if not _can_manage_community(current_user, community):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to review community reports",
        )

    normalized_status = status_filter.strip().upper()
    query = (
        select(CommunityPostReport)
        .join(CommunityPost, CommunityPostReport.post_id == CommunityPost.id)
        .options(
            joinedload(CommunityPostReport.reporter),
            joinedload(CommunityPostReport.post).joinedload(CommunityPost.author),
        )
        .where(CommunityPost.community_id == community.id)
    )
    if normalized_status != "ALL":
        query = query.where(CommunityPostReport.status == normalized_status)
    if severity:
        query = query.where(CommunityPostReport.severity == severity.strip().upper())
    if escalation_status:
        query = query.where(
            CommunityPostReport.escalation_status == escalation_status.strip().upper()
        )

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    reports = db.scalars(
        query.order_by(CommunityPostReport.created_at.desc()).offset(offset).limit(limit)
    ).all()
    return CommunityPostReportQueueResponse(
        reports=[_serialize_report_queue_item(report) for report in reports],
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(reports) < total,
    )


@router.get(
    "/{community_id}/removed-posts",
    response_model=CommunityRemovedPostQueueResponse,
)
def list_community_removed_posts(
    community_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
    severity: Annotated[
        str | None,
        Query(pattern="^(CRITICAL|HIGH|LOW|MEDIUM)$"),
    ] = None,
    escalation_status: Annotated[
        str | None,
        Query(pattern="^(ESCALATED|NONE)$"),
    ] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> CommunityRemovedPostQueueResponse:
    community = _get_community_or_404(db, community_id)
    if not _can_manage_community(current_user, community):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to review removed posts",
        )

    query = (
        select(CommunityPost)
        .options(
            joinedload(CommunityPost.author),
            selectinload(CommunityPost.media_items),
            joinedload(CommunityPost.removed_by_user),
        )
        .where(
            CommunityPost.community_id == community.id,
            CommunityPost.status == "REMOVED",
        )
    )
    if severity:
        query = query.where(CommunityPost.moderation_severity == severity.strip().upper())
    if escalation_status:
        query = query.where(CommunityPost.escalation_status == escalation_status.strip().upper())
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    posts = db.scalars(
        query.order_by(CommunityPost.removed_at.desc(), CommunityPost.created_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return CommunityRemovedPostQueueResponse(
        posts=[
            _serialize_removed_post_queue_item(db, post, current_user, community) for post in posts
        ],
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(posts) < total,
    )


@router.get(
    "/{community_id}/removed-comments",
    response_model=CommunityRemovedCommentQueueResponse,
)
def list_community_removed_comments(
    community_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
    severity: Annotated[
        str | None,
        Query(pattern="^(CRITICAL|HIGH|LOW|MEDIUM)$"),
    ] = None,
    escalation_status: Annotated[
        str | None,
        Query(pattern="^(ESCALATED|NONE)$"),
    ] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> CommunityRemovedCommentQueueResponse:
    community = _get_community_or_404(db, community_id)
    if not _can_manage_community(current_user, community):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to review removed comments",
        )

    query = (
        select(CommunityPostComment)
        .join(CommunityPost, CommunityPostComment.post_id == CommunityPost.id)
        .options(
            joinedload(CommunityPostComment.author),
            joinedload(CommunityPostComment.removed_by_user),
            joinedload(CommunityPostComment.post).joinedload(CommunityPost.author),
        )
        .where(
            CommunityPost.community_id == community.id,
            CommunityPostComment.status == "REMOVED",
        )
    )
    if severity:
        query = query.where(CommunityPostComment.moderation_severity == severity.strip().upper())
    if escalation_status:
        query = query.where(
            CommunityPostComment.escalation_status == escalation_status.strip().upper()
        )
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    comments = db.scalars(
        query.order_by(
            CommunityPostComment.removed_at.desc(),
            CommunityPostComment.created_at.desc(),
        )
        .offset(offset)
        .limit(limit)
    ).all()
    return CommunityRemovedCommentQueueResponse(
        comments=[_serialize_removed_comment_queue_item(comment) for comment in comments],
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(comments) < total,
    )


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
    db.flush()
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
    if invited_user:
        invitation_body = (
            f"{current_user.display_name} invited you to join {community.name} as "
            f"{invitation.invited_role.lower()}."
        )
        notify_users(
            db,
            [invited_user.id],
            actor_user_id=current_user.id,
            body=invitation_body,
            event_type="community.invitation_created",
            exclude_user_ids={current_user.id},
            metadata={
                "community_id": str(community.id),
                "invitation_id": str(invitation.id),
                "invited_role": invitation.invited_role,
            },
            target_url="/communities/invitations/accept",
            title=f"Invitation to {community.name}",
        )
    send_community_invitation_email(
        community=community,
        invitation=invitation,
        invitation_token=invitation_token,
        invited_by=current_user,
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


def _get_post_or_404(
    db: Session,
    community: Community,
    post_id: uuid.UUID,
) -> CommunityPost:
    post = db.scalar(
        select(CommunityPost)
        .options(joinedload(CommunityPost.author), selectinload(CommunityPost.media_items))
        .where(
            CommunityPost.id == post_id,
            CommunityPost.community_id == community.id,
        )
    )
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    return post


def _ensure_post_active(post: CommunityPost) -> None:
    if post.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only active posts can be used for this action",
        )


def _get_comment_or_404(
    db: Session,
    post: CommunityPost,
    comment_id: uuid.UUID,
) -> CommunityPostComment:
    comment = db.scalar(
        select(CommunityPostComment)
        .options(joinedload(CommunityPostComment.author))
        .where(
            CommunityPostComment.id == comment_id,
            CommunityPostComment.post_id == post.id,
        )
    )
    if comment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")

    return comment


def _get_post_media_or_404(
    db: Session,
    post: CommunityPost,
    media_id: uuid.UUID,
) -> CommunityPostMedia:
    media = db.scalar(
        select(CommunityPostMedia).where(
            CommunityPostMedia.id == media_id,
            CommunityPostMedia.post_id == post.id,
        )
    )
    if media is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community post media not found",
        )

    return media


def _get_report_or_404(
    db: Session,
    post: CommunityPost,
    report_id: uuid.UUID,
) -> CommunityPostReport:
    report = db.scalar(
        select(CommunityPostReport)
        .options(joinedload(CommunityPostReport.reporter))
        .where(
            CommunityPostReport.id == report_id,
            CommunityPostReport.post_id == post.id,
        )
    )
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    return report


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
    notify_users(
        db,
        [membership.user_id],
        actor_user_id=current_user.id,
        body=f"Your request to join {community.name} was approved.",
        event_type="community.member_approved",
        exclude_user_ids={current_user.id},
        metadata={"community_id": str(community.id), "membership_id": str(membership.id)},
        target_url=_community_target_url(community),
        title=f"You are now a member of {community.name}",
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
    notify_users(
        db,
        [membership.user_id],
        actor_user_id=current_user.id,
        body=f"Your request to join {community.name} was not approved.",
        event_type="community.member_rejected",
        exclude_user_ids={current_user.id},
        metadata={"community_id": str(community.id), "membership_id": str(membership.id)},
        target_url=_community_target_url(community),
        title=f"Join request update for {community.name}",
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
    role_update_body = (
        f"Your role in {community.name} changed from {previous_role.lower()} "
        f"to {membership.role.lower()}."
    )
    notify_users(
        db,
        [membership.user_id],
        actor_user_id=current_user.id,
        body=role_update_body,
        event_type="community.member_role_updated",
        exclude_user_ids={current_user.id},
        metadata={
            "community_id": str(community.id),
            "membership_id": str(membership.id),
            "new_role": membership.role,
            "previous_role": previous_role,
        },
        target_url=_community_target_url(community),
        title=f"Role updated in {community.name}",
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
    notify_users(
        db,
        [membership.user_id],
        actor_user_id=current_user.id,
        body=f"Your membership in {community.name} was removed.",
        event_type="community.member_removed",
        exclude_user_ids={current_user.id},
        metadata={
            "community_id": str(community.id),
            "membership_id": str(membership.id),
            "previous_role": membership.role,
        },
        target_url=_community_target_url(community),
        title=f"Membership update for {community.name}",
    )
    db.commit()
    db.refresh(membership)
    return _serialize_member(membership)


@router.post(
    "/{community_id}/ownership-transfer",
    response_model=CommunityResponse,
)
def transfer_community_ownership(
    community_id: uuid.UUID,
    payload: CommunityOwnershipTransfer,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> CommunityResponse:
    community = _get_community_or_404(db, community_id)
    if not _can_edit_community_settings(current_user, community):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to transfer community ownership",
        )

    new_owner = _get_membership_or_404(db, community, payload.new_owner_membership_id)
    if new_owner.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only active members can receive ownership",
        )
    if new_owner.role == "OWNER":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That member is already an owner",
        )

    previous_owners = _active_owner_memberships(community)
    previous_owner_ids = [str(owner.id) for owner in previous_owners]
    for owner in previous_owners:
        owner.role = "MANAGER"
    new_owner.role = "OWNER"
    _create_security_event(
        db,
        request,
        current_user,
        "community.ownership_transferred",
        metadata={
            "community_id": str(community.id),
            "new_owner_membership_id": str(new_owner.id),
            "new_owner_user_id": str(new_owner.user_id),
            "previous_owner_membership_ids": previous_owner_ids,
        },
    )
    notify_users(
        db,
        [new_owner.user_id, *(owner.user_id for owner in previous_owners)],
        actor_user_id=current_user.id,
        body=f"Ownership for {community.name} was transferred.",
        event_type="community.ownership_transferred",
        exclude_user_ids={current_user.id},
        metadata={
            "community_id": str(community.id),
            "new_owner_membership_id": str(new_owner.id),
            "new_owner_user_id": str(new_owner.user_id),
            "previous_owner_membership_ids": previous_owner_ids,
        },
        target_url=_community_target_url(community),
        title=f"Ownership updated for {community.name}",
    )
    db.commit()
    community = _get_community_or_404(db, community.id)
    return _serialize_community(community, current_user)


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
    invited_user = db.scalar(select(User).where(func.lower(User.email) == invitation.invited_email))
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
    if invited_user:
        notify_users(
            db,
            [invited_user.id],
            actor_user_id=current_user.id,
            body=f"An invitation to join {community.name} was canceled.",
            event_type="community.invitation_canceled",
            exclude_user_ids={current_user.id},
            metadata={
                "community_id": str(community.id),
                "invitation_id": str(invitation.id),
            },
            target_url=_community_target_url(community),
            title=f"Invitation canceled for {community.name}",
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
        membership = CommunityMembership(
            community_id=community.id,
            user_id=current_user.id,
            role="MEMBER",
            status=status_value,
            joined_at=joined_at,
        )
        db.add(membership)
    db.flush()
    _create_security_event(
        db,
        request,
        current_user,
        "community.join_requested" if status_value == "PENDING" else "community.joined",
        metadata={"community_id": str(community.id)},
    )
    if status_value == "PENDING":
        _notify_community_managers(
            db,
            community,
            current_user,
            body=f"{current_user.display_name} requested to join {community.name}.",
            event_type="community.join_requested",
            metadata={"community_id": str(community.id), "membership_id": str(membership.id)},
            title=f"New join request for {community.name}",
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
