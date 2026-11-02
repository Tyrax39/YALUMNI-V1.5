import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db_session
from app.core.permissions import ADMIN_ROLE_NAMES, GlobalRole, has_any_role
from app.core.security import utcnow
from app.modules.auth.dependencies import get_current_user, require_roles
from app.modules.auth.models import SecurityEvent, User
from app.modules.success_stories.models import SuccessStory
from app.modules.success_stories.schemas import (
    SuccessStoryCreate,
    SuccessStoryListResponse,
    SuccessStoryResponse,
    SuccessStoryReviewAction,
)

router = APIRouter()
story_admin_dependency = require_roles(
    GlobalRole.SUPER_ADMIN.value,
    GlobalRole.PLATFORM_ADMIN.value,
    GlobalRole.MODERATOR.value,
)

STORY_STATUSES = {
    "ARCHIVED",
    "NEEDS_CHANGES",
    "PENDING_REVIEW",
    "PUBLISHED",
    "REJECTED",
}


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


def _user_role_names(user: User) -> set[str]:
    return {assignment.role.name for assignment in user.role_assignments}


def _has_admin_role(user: User) -> bool:
    return has_any_role(_user_role_names(user), ADMIN_ROLE_NAMES)


def _story_options():
    return joinedload(SuccessStory.creator), joinedload(SuccessStory.reviewer)


def _serialize_story(story: SuccessStory) -> SuccessStoryResponse:
    return SuccessStoryResponse(
        id=story.id,
        created_by_user_id=story.created_by_user_id,
        created_by_display_name=story.creator.display_name if story.creator else None,
        reviewed_by_user_id=story.reviewed_by_user_id,
        reviewed_by_display_name=story.reviewer.display_name if story.reviewer else None,
        title=story.title,
        summary=story.summary,
        body=story.body,
        country=story.country,
        sector=story.sector,
        program=story.program,
        cohort_year=story.cohort_year,
        beneficiary_count=story.beneficiary_count,
        impact_metric=story.impact_metric,
        media_url=story.media_url,
        external_url=story.external_url,
        status=story.status,
        reviewer_note=story.reviewer_note,
        published_at=story.published_at,
        reviewed_at=story.reviewed_at,
        created_at=story.created_at,
        updated_at=story.updated_at,
    )


def _query_stories():
    return select(SuccessStory).options(*_story_options())


def _get_story_or_404(db: Session, story_id: uuid.UUID) -> SuccessStory:
    story = db.scalar(_query_stories().where(SuccessStory.id == story_id))
    if story is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Success story not found")
    return story


def _list_response(
    db: Session,
    query,
    *,
    limit: int,
    offset: int,
) -> SuccessStoryListResponse:
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    stories = db.scalars(
        query.order_by(SuccessStory.created_at.desc()).offset(offset).limit(limit)
    ).all()
    return SuccessStoryListResponse(
        stories=[_serialize_story(item) for item in stories],
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(stories) < total,
    )


def _apply_filters(
    query,
    *,
    country: str | None = None,
    program: str | None = None,
    q: str | None = None,
    sector: str | None = None,
):
    if q:
        search_term = f"%{q.strip()}%"
        query = query.where(
            or_(
                SuccessStory.title.ilike(search_term),
                SuccessStory.summary.ilike(search_term),
                SuccessStory.body.ilike(search_term),
                SuccessStory.country.ilike(search_term),
                SuccessStory.sector.ilike(search_term),
                SuccessStory.program.ilike(search_term),
            )
        )
    if country:
        query = query.where(SuccessStory.country.ilike(f"%{country.strip()}%"))
    if sector:
        query = query.where(SuccessStory.sector.ilike(f"%{sector.strip()}%"))
    if program:
        query = query.where(SuccessStory.program.ilike(f"%{program.strip()}%"))
    return query


@router.get("", response_model=SuccessStoryListResponse)
@router.get("/", response_model=SuccessStoryListResponse)
def list_success_stories(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
    country: Annotated[str | None, Query(max_length=80)] = None,
    mine: bool = False,
    program: Annotated[str | None, Query(max_length=120)] = None,
    q: Annotated[str | None, Query(max_length=120)] = None,
    sector: Annotated[str | None, Query(max_length=120)] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 12,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> SuccessStoryListResponse:
    query = _query_stories()
    if mine:
        query = query.where(SuccessStory.created_by_user_id == current_user.id)
    else:
        query = query.where(SuccessStory.status == "PUBLISHED")
    query = _apply_filters(
        query,
        country=country,
        program=program,
        q=q,
        sector=sector,
    )
    return _list_response(db, query, limit=limit, offset=offset)


@router.post("", response_model=SuccessStoryResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=SuccessStoryResponse, status_code=status.HTTP_201_CREATED)
def create_success_story(
    payload: SuccessStoryCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> SuccessStoryResponse:
    story = SuccessStory(
        created_by_user_id=current_user.id,
        title=payload.title,
        summary=payload.summary,
        body=payload.body,
        country=payload.country,
        sector=payload.sector,
        program=payload.program,
        cohort_year=payload.cohort_year,
        beneficiary_count=payload.beneficiary_count,
        impact_metric=payload.impact_metric,
        media_url=payload.media_url,
        external_url=payload.external_url,
        status="PENDING_REVIEW",
    )
    db.add(story)
    db.flush()
    _create_security_event(
        db,
        request,
        current_user,
        "success_stories.submitted",
        {"story_id": str(story.id), "status": story.status},
    )
    db.commit()
    story = _get_story_or_404(db, story.id)
    return _serialize_story(story)


@router.get("/admin/review-queue", response_model=SuccessStoryListResponse)
def list_admin_success_story_review_queue(
    current_user: Annotated[User, Depends(story_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
    status_filter: Annotated[
        str,
        Query(
            alias="status",
            pattern="^(PENDING_REVIEW|NEEDS_CHANGES|PUBLISHED|REJECTED|ARCHIVED|ALL)$",
        ),
    ] = "PENDING_REVIEW",
    country: Annotated[str | None, Query(max_length=80)] = None,
    program: Annotated[str | None, Query(max_length=120)] = None,
    q: Annotated[str | None, Query(max_length=120)] = None,
    sector: Annotated[str | None, Query(max_length=120)] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 12,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> SuccessStoryListResponse:
    _ = current_user
    normalized_status = status_filter.strip().upper()
    query = _query_stories()
    if normalized_status != "ALL":
        query = query.where(SuccessStory.status == normalized_status)
    query = _apply_filters(
        query,
        country=country,
        program=program,
        q=q,
        sector=sector,
    )
    return _list_response(db, query, limit=limit, offset=offset)


def _review_story(
    *,
    db: Session,
    request: Request,
    current_user: User,
    story_id: uuid.UUID,
    new_status: str,
    payload: SuccessStoryReviewAction,
    event_type: str,
) -> SuccessStoryResponse:
    if new_status not in STORY_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")

    story = _get_story_or_404(db, story_id)
    now = utcnow()
    story.status = new_status
    story.reviewer_note = payload.reviewer_note
    story.reviewed_by_user_id = current_user.id
    story.reviewed_at = now
    if new_status == "PUBLISHED":
        story.published_at = story.published_at or now
    if new_status in {"NEEDS_CHANGES", "PENDING_REVIEW", "REJECTED"}:
        story.published_at = None

    _create_security_event(
        db,
        request,
        current_user,
        event_type,
        {"story_id": str(story.id), "status": story.status},
    )
    db.commit()
    story = _get_story_or_404(db, story.id)
    return _serialize_story(story)


@router.post("/admin/{story_id}/approve", response_model=SuccessStoryResponse)
def approve_success_story(
    story_id: uuid.UUID,
    payload: SuccessStoryReviewAction,
    request: Request,
    current_user: Annotated[User, Depends(story_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> SuccessStoryResponse:
    return _review_story(
        db=db,
        request=request,
        current_user=current_user,
        story_id=story_id,
        new_status="PUBLISHED",
        payload=payload,
        event_type="success_stories.approved",
    )


@router.post("/admin/{story_id}/reject", response_model=SuccessStoryResponse)
def reject_success_story(
    story_id: uuid.UUID,
    payload: SuccessStoryReviewAction,
    request: Request,
    current_user: Annotated[User, Depends(story_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> SuccessStoryResponse:
    return _review_story(
        db=db,
        request=request,
        current_user=current_user,
        story_id=story_id,
        new_status="REJECTED",
        payload=payload,
        event_type="success_stories.rejected",
    )


@router.post("/admin/{story_id}/request-changes", response_model=SuccessStoryResponse)
def request_success_story_changes(
    story_id: uuid.UUID,
    payload: SuccessStoryReviewAction,
    request: Request,
    current_user: Annotated[User, Depends(story_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> SuccessStoryResponse:
    return _review_story(
        db=db,
        request=request,
        current_user=current_user,
        story_id=story_id,
        new_status="NEEDS_CHANGES",
        payload=payload,
        event_type="success_stories.changes_requested",
    )


@router.get("/{story_id}", response_model=SuccessStoryResponse)
def get_success_story(
    story_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> SuccessStoryResponse:
    story = _get_story_or_404(db, story_id)
    is_creator = story.created_by_user_id == current_user.id
    if story.status != "PUBLISHED" and not is_creator and not _has_admin_role(current_user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Success story not found")
    return _serialize_story(story)
