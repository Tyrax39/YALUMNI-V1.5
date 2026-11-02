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
from app.modules.resources.models import Resource
from app.modules.resources.schemas import (
    ResourceCreate,
    ResourceListResponse,
    ResourceResponse,
    ResourceReviewAction,
)

router = APIRouter()
resource_admin_dependency = require_roles(
    GlobalRole.SUPER_ADMIN.value,
    GlobalRole.PLATFORM_ADMIN.value,
    GlobalRole.MODERATOR.value,
)

RESOURCE_TYPES = {"DATASET", "GUIDE", "POLICY_BRIEF", "TEMPLATE", "TOOLKIT", "VIDEO", "OTHER"}
RESOURCE_FORMATS = {"ARTICLE", "DATASET", "DOCUMENT", "LINK", "TEMPLATE", "VIDEO", "OTHER"}
RESOURCE_STATUSES = {
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


def _normalize_enum(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().upper().replace(" ", "_").replace("-", "_")
    return normalized or None


def _validate_payload(payload: ResourceCreate) -> None:
    if payload.resource_type not in RESOURCE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid resource type",
        )
    if payload.resource_format not in RESOURCE_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid resource format",
        )


def _user_role_names(user: User) -> set[str]:
    return {assignment.role.name for assignment in user.role_assignments}


def _has_admin_role(user: User) -> bool:
    return has_any_role(_user_role_names(user), ADMIN_ROLE_NAMES)


def _resource_options():
    return joinedload(Resource.creator), joinedload(Resource.reviewer)


def _serialize_resource(resource: Resource) -> ResourceResponse:
    return ResourceResponse(
        id=resource.id,
        created_by_user_id=resource.created_by_user_id,
        created_by_display_name=resource.creator.display_name if resource.creator else None,
        reviewed_by_user_id=resource.reviewed_by_user_id,
        reviewed_by_display_name=resource.reviewer.display_name if resource.reviewer else None,
        title=resource.title,
        resource_type=resource.resource_type,
        resource_format=resource.resource_format,
        topic=resource.topic,
        country=resource.country,
        language=resource.language,
        external_url=resource.external_url,
        description=resource.description,
        status=resource.status,
        reviewer_note=resource.reviewer_note,
        published_at=resource.published_at,
        reviewed_at=resource.reviewed_at,
        created_at=resource.created_at,
        updated_at=resource.updated_at,
    )


def _query_resources():
    return select(Resource).options(*_resource_options())


def _get_resource_or_404(db: Session, resource_id: uuid.UUID) -> Resource:
    resource = db.scalar(_query_resources().where(Resource.id == resource_id))
    if resource is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    return resource


def _list_response(
    db: Session,
    query,
    *,
    limit: int,
    offset: int,
) -> ResourceListResponse:
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    resources = db.scalars(
        query.order_by(Resource.created_at.desc()).offset(offset).limit(limit)
    ).all()
    return ResourceListResponse(
        resources=[_serialize_resource(item) for item in resources],
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(resources) < total,
    )


def _apply_filters(
    query,
    *,
    country: str | None = None,
    q: str | None = None,
    resource_format: str | None = None,
    resource_type: str | None = None,
    topic: str | None = None,
):
    if q:
        search_term = f"%{q.strip()}%"
        query = query.where(
            or_(
                Resource.title.ilike(search_term),
                Resource.description.ilike(search_term),
                Resource.topic.ilike(search_term),
                Resource.country.ilike(search_term),
            )
        )
    if country:
        query = query.where(Resource.country.ilike(f"%{country.strip()}%"))
    if topic:
        query = query.where(Resource.topic.ilike(f"%{topic.strip()}%"))
    normalized_type = _normalize_enum(resource_type)
    if normalized_type:
        query = query.where(Resource.resource_type == normalized_type)
    normalized_format = _normalize_enum(resource_format)
    if normalized_format:
        query = query.where(Resource.resource_format == normalized_format)
    return query


@router.get("", response_model=ResourceListResponse)
@router.get("/", response_model=ResourceListResponse)
def list_resources(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
    country: Annotated[str | None, Query(max_length=80)] = None,
    mine: bool = False,
    q: Annotated[str | None, Query(max_length=120)] = None,
    resource_format: Annotated[str | None, Query(max_length=80)] = None,
    resource_type: Annotated[str | None, Query(max_length=80)] = None,
    topic: Annotated[str | None, Query(max_length=120)] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 12,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ResourceListResponse:
    query = _query_resources()
    if mine:
        query = query.where(Resource.created_by_user_id == current_user.id)
    else:
        query = query.where(Resource.status == "PUBLISHED")
    query = _apply_filters(
        query,
        country=country,
        q=q,
        resource_format=resource_format,
        resource_type=resource_type,
        topic=topic,
    )
    return _list_response(db, query, limit=limit, offset=offset)


@router.post("", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
def create_resource(
    payload: ResourceCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ResourceResponse:
    _validate_payload(payload)
    resource = Resource(
        created_by_user_id=current_user.id,
        title=payload.title,
        resource_type=payload.resource_type,
        resource_format=payload.resource_format,
        topic=payload.topic,
        country=payload.country,
        language=payload.language,
        external_url=payload.external_url,
        description=payload.description,
        status="PENDING_REVIEW",
    )
    db.add(resource)
    db.flush()
    _create_security_event(
        db,
        request,
        current_user,
        "resources.submitted",
        {"resource_id": str(resource.id), "status": resource.status},
    )
    db.commit()
    resource = _get_resource_or_404(db, resource.id)
    return _serialize_resource(resource)


@router.get("/admin/review-queue", response_model=ResourceListResponse)
def list_admin_resource_review_queue(
    current_user: Annotated[User, Depends(resource_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
    status_filter: Annotated[
        str,
        Query(
            alias="status",
            pattern="^(PENDING_REVIEW|NEEDS_CHANGES|PUBLISHED|REJECTED|ARCHIVED|ALL)$",
        ),
    ] = "PENDING_REVIEW",
    country: Annotated[str | None, Query(max_length=80)] = None,
    q: Annotated[str | None, Query(max_length=120)] = None,
    resource_format: Annotated[str | None, Query(max_length=80)] = None,
    resource_type: Annotated[str | None, Query(max_length=80)] = None,
    topic: Annotated[str | None, Query(max_length=120)] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 12,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ResourceListResponse:
    _ = current_user
    normalized_status = status_filter.strip().upper()
    query = _query_resources()
    if normalized_status != "ALL":
        query = query.where(Resource.status == normalized_status)
    query = _apply_filters(
        query,
        country=country,
        q=q,
        resource_format=resource_format,
        resource_type=resource_type,
        topic=topic,
    )
    return _list_response(db, query, limit=limit, offset=offset)


def _review_resource(
    *,
    db: Session,
    request: Request,
    current_user: User,
    resource_id: uuid.UUID,
    new_status: str,
    payload: ResourceReviewAction,
    event_type: str,
) -> ResourceResponse:
    if new_status not in RESOURCE_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")

    resource = _get_resource_or_404(db, resource_id)
    now = utcnow()
    resource.status = new_status
    resource.reviewer_note = payload.reviewer_note
    resource.reviewed_by_user_id = current_user.id
    resource.reviewed_at = now
    if new_status == "PUBLISHED":
        resource.published_at = resource.published_at or now
    if new_status in {"NEEDS_CHANGES", "PENDING_REVIEW", "REJECTED"}:
        resource.published_at = None

    _create_security_event(
        db,
        request,
        current_user,
        event_type,
        {"resource_id": str(resource.id), "status": resource.status},
    )
    db.commit()
    resource = _get_resource_or_404(db, resource.id)
    return _serialize_resource(resource)


@router.post("/admin/{resource_id}/approve", response_model=ResourceResponse)
def approve_resource(
    resource_id: uuid.UUID,
    payload: ResourceReviewAction,
    request: Request,
    current_user: Annotated[User, Depends(resource_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ResourceResponse:
    return _review_resource(
        db=db,
        request=request,
        current_user=current_user,
        resource_id=resource_id,
        new_status="PUBLISHED",
        payload=payload,
        event_type="resources.approved",
    )


@router.post("/admin/{resource_id}/reject", response_model=ResourceResponse)
def reject_resource(
    resource_id: uuid.UUID,
    payload: ResourceReviewAction,
    request: Request,
    current_user: Annotated[User, Depends(resource_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ResourceResponse:
    return _review_resource(
        db=db,
        request=request,
        current_user=current_user,
        resource_id=resource_id,
        new_status="REJECTED",
        payload=payload,
        event_type="resources.rejected",
    )


@router.post("/admin/{resource_id}/request-changes", response_model=ResourceResponse)
def request_resource_changes(
    resource_id: uuid.UUID,
    payload: ResourceReviewAction,
    request: Request,
    current_user: Annotated[User, Depends(resource_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ResourceResponse:
    return _review_resource(
        db=db,
        request=request,
        current_user=current_user,
        resource_id=resource_id,
        new_status="NEEDS_CHANGES",
        payload=payload,
        event_type="resources.changes_requested",
    )


@router.get("/{resource_id}", response_model=ResourceResponse)
def get_resource(
    resource_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ResourceResponse:
    resource = _get_resource_or_404(db, resource_id)
    is_creator = resource.created_by_user_id == current_user.id
    if resource.status != "PUBLISHED" and not is_creator and not _has_admin_role(current_user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    return _serialize_resource(resource)
