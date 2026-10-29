import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db_session
from app.core.permissions import GlobalRole
from app.core.security import utcnow
from app.modules.auth.dependencies import get_current_user, require_roles
from app.modules.auth.models import SecurityEvent, User
from app.modules.opportunities.models import Opportunity
from app.modules.opportunities.schemas import (
    OpportunityCreate,
    OpportunityListResponse,
    OpportunityResponse,
    OpportunityReviewAction,
)

router = APIRouter()
opportunity_admin_dependency = require_roles(
    GlobalRole.SUPER_ADMIN.value,
    GlobalRole.PLATFORM_ADMIN.value,
    GlobalRole.MODERATOR.value,
)

OPPORTUNITY_TYPES = {"FELLOWSHIP", "GRANT", "JOB", "INTERNSHIP", "EVENT", "OTHER"}
REMOTE_POLICIES = {"HYBRID", "IN_PERSON", "REMOTE"}
OPPORTUNITY_STATUSES = {
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


def _normalize_type(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().upper().replace(" ", "_").replace("-", "_")
    return normalized or None


def _validate_payload(payload: OpportunityCreate) -> None:
    if payload.opportunity_type not in OPPORTUNITY_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid opportunity type",
        )
    if payload.remote_policy not in REMOTE_POLICIES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid remote policy")


def _opportunity_options():
    return joinedload(Opportunity.creator), joinedload(Opportunity.reviewer)


def _serialize_opportunity(opportunity: Opportunity) -> OpportunityResponse:
    return OpportunityResponse(
        id=opportunity.id,
        created_by_user_id=opportunity.created_by_user_id,
        created_by_display_name=opportunity.creator.display_name if opportunity.creator else None,
        reviewed_by_user_id=opportunity.reviewed_by_user_id,
        reviewed_by_display_name=(
            opportunity.reviewer.display_name if opportunity.reviewer else None
        ),
        title=opportunity.title,
        organization=opportunity.organization,
        opportunity_type=opportunity.opportunity_type,
        location=opportunity.location,
        country=opportunity.country,
        remote_policy=opportunity.remote_policy,
        description=opportunity.description,
        application_url=opportunity.application_url,
        deadline_at=opportunity.deadline_at,
        status=opportunity.status,
        reviewer_note=opportunity.reviewer_note,
        published_at=opportunity.published_at,
        reviewed_at=opportunity.reviewed_at,
        created_at=opportunity.created_at,
        updated_at=opportunity.updated_at,
    )


def _query_opportunities():
    return select(Opportunity).options(*_opportunity_options())


def _get_opportunity_or_404(db: Session, opportunity_id: uuid.UUID) -> Opportunity:
    opportunity = db.scalar(_query_opportunities().where(Opportunity.id == opportunity_id))
    if opportunity is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")
    return opportunity


def _list_response(
    db: Session,
    query,
    *,
    limit: int,
    offset: int,
) -> OpportunityListResponse:
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    opportunities = db.scalars(
        query.order_by(Opportunity.created_at.desc()).offset(offset).limit(limit)
    ).all()
    return OpportunityListResponse(
        opportunities=[_serialize_opportunity(item) for item in opportunities],
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(opportunities) < total,
    )


def _apply_filters(
    query,
    *,
    country: str | None = None,
    opportunity_type: str | None = None,
    q: str | None = None,
    remote_policy: str | None = None,
):
    if q:
        search_term = f"%{q.strip()}%"
        query = query.where(
            or_(
                Opportunity.title.ilike(search_term),
                Opportunity.organization.ilike(search_term),
                Opportunity.description.ilike(search_term),
                Opportunity.country.ilike(search_term),
                Opportunity.location.ilike(search_term),
            )
        )
    if country:
        query = query.where(Opportunity.country.ilike(f"%{country.strip()}%"))
    normalized_type = _normalize_type(opportunity_type)
    if normalized_type:
        query = query.where(Opportunity.opportunity_type == normalized_type)
    normalized_policy = _normalize_type(remote_policy)
    if normalized_policy:
        query = query.where(Opportunity.remote_policy == normalized_policy)
    return query


@router.get("", response_model=OpportunityListResponse)
@router.get("/", response_model=OpportunityListResponse)
def list_opportunities(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
    country: Annotated[str | None, Query(max_length=80)] = None,
    mine: bool = False,
    opportunity_type: Annotated[str | None, Query(max_length=80)] = None,
    q: Annotated[str | None, Query(max_length=120)] = None,
    remote_policy: Annotated[str | None, Query(max_length=40)] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 12,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> OpportunityListResponse:
    query = _query_opportunities()
    if mine:
        query = query.where(Opportunity.created_by_user_id == current_user.id)
    else:
        query = query.where(Opportunity.status == "PUBLISHED")
    query = _apply_filters(
        query,
        country=country,
        opportunity_type=opportunity_type,
        q=q,
        remote_policy=remote_policy,
    )
    return _list_response(db, query, limit=limit, offset=offset)


@router.post("", response_model=OpportunityResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=OpportunityResponse, status_code=status.HTTP_201_CREATED)
def create_opportunity(
    payload: OpportunityCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> OpportunityResponse:
    _validate_payload(payload)
    opportunity = Opportunity(
        created_by_user_id=current_user.id,
        title=payload.title,
        organization=payload.organization,
        opportunity_type=payload.opportunity_type,
        location=payload.location,
        country=payload.country,
        remote_policy=payload.remote_policy,
        description=payload.description,
        application_url=payload.application_url,
        deadline_at=payload.deadline_at,
        status="PENDING_REVIEW",
    )
    db.add(opportunity)
    db.flush()
    _create_security_event(
        db,
        request,
        current_user,
        "opportunities.submitted",
        {"opportunity_id": str(opportunity.id), "status": opportunity.status},
    )
    db.commit()
    opportunity = _get_opportunity_or_404(db, opportunity.id)
    return _serialize_opportunity(opportunity)


@router.get("/admin/review-queue", response_model=OpportunityListResponse)
def list_admin_opportunity_review_queue(
    current_user: Annotated[User, Depends(opportunity_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
    status_filter: Annotated[
        str,
        Query(
            alias="status",
            pattern="^(PENDING_REVIEW|NEEDS_CHANGES|PUBLISHED|REJECTED|ARCHIVED|ALL)$",
        ),
    ] = "PENDING_REVIEW",
    country: Annotated[str | None, Query(max_length=80)] = None,
    opportunity_type: Annotated[str | None, Query(max_length=80)] = None,
    q: Annotated[str | None, Query(max_length=120)] = None,
    remote_policy: Annotated[str | None, Query(max_length=40)] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 12,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> OpportunityListResponse:
    _ = current_user
    normalized_status = status_filter.strip().upper()
    query = _query_opportunities()
    if normalized_status != "ALL":
        query = query.where(Opportunity.status == normalized_status)
    query = _apply_filters(
        query,
        country=country,
        opportunity_type=opportunity_type,
        q=q,
        remote_policy=remote_policy,
    )
    return _list_response(db, query, limit=limit, offset=offset)


def _review_opportunity(
    *,
    db: Session,
    request: Request,
    current_user: User,
    opportunity_id: uuid.UUID,
    new_status: str,
    payload: OpportunityReviewAction,
    event_type: str,
) -> OpportunityResponse:
    if new_status not in OPPORTUNITY_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")

    opportunity = _get_opportunity_or_404(db, opportunity_id)
    now = utcnow()
    opportunity.status = new_status
    opportunity.reviewer_note = payload.reviewer_note
    opportunity.reviewed_by_user_id = current_user.id
    opportunity.reviewed_at = now
    if new_status == "PUBLISHED":
        opportunity.published_at = opportunity.published_at or now
    if new_status in {"NEEDS_CHANGES", "PENDING_REVIEW", "REJECTED"}:
        opportunity.published_at = None

    _create_security_event(
        db,
        request,
        current_user,
        event_type,
        {"opportunity_id": str(opportunity.id), "status": opportunity.status},
    )
    db.commit()
    opportunity = _get_opportunity_or_404(db, opportunity.id)
    return _serialize_opportunity(opportunity)


@router.post("/admin/{opportunity_id}/approve", response_model=OpportunityResponse)
def approve_opportunity(
    opportunity_id: uuid.UUID,
    payload: OpportunityReviewAction,
    request: Request,
    current_user: Annotated[User, Depends(opportunity_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> OpportunityResponse:
    return _review_opportunity(
        db=db,
        request=request,
        current_user=current_user,
        opportunity_id=opportunity_id,
        new_status="PUBLISHED",
        payload=payload,
        event_type="opportunities.approved",
    )


@router.post("/admin/{opportunity_id}/reject", response_model=OpportunityResponse)
def reject_opportunity(
    opportunity_id: uuid.UUID,
    payload: OpportunityReviewAction,
    request: Request,
    current_user: Annotated[User, Depends(opportunity_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> OpportunityResponse:
    return _review_opportunity(
        db=db,
        request=request,
        current_user=current_user,
        opportunity_id=opportunity_id,
        new_status="REJECTED",
        payload=payload,
        event_type="opportunities.rejected",
    )


@router.post("/admin/{opportunity_id}/request-changes", response_model=OpportunityResponse)
def request_opportunity_changes(
    opportunity_id: uuid.UUID,
    payload: OpportunityReviewAction,
    request: Request,
    current_user: Annotated[User, Depends(opportunity_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> OpportunityResponse:
    return _review_opportunity(
        db=db,
        request=request,
        current_user=current_user,
        opportunity_id=opportunity_id,
        new_status="NEEDS_CHANGES",
        payload=payload,
        event_type="opportunities.changes_requested",
    )


@router.get("/{opportunity_id}", response_model=OpportunityResponse)
def get_opportunity(
    opportunity_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> OpportunityResponse:
    opportunity = _get_opportunity_or_404(db, opportunity_id)
    is_creator = opportunity.created_by_user_id == current_user.id
    if opportunity.status != "PUBLISHED" and not is_creator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")
    return _serialize_opportunity(opportunity)
