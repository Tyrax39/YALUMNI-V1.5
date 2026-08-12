import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db_session
from app.core.permissions import ADMIN_ROLE_NAMES, has_any_role
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.models import SecurityEvent, User
from app.modules.initiatives.models import Initiative, InitiativeMilestone
from app.modules.initiatives.schemas import (
    InitiativeCreate,
    InitiativeListResponse,
    InitiativeMilestoneResponse,
    InitiativeResponse,
)

router = APIRouter()

FOCUS_AREAS = {
    "CIVIC_LEADERSHIP",
    "CLIMATE",
    "COMMUNITY_IMPACT",
    "EDUCATION",
    "ENTREPRENEURSHIP",
    "HEALTH",
    "TECHNOLOGY",
    "YOUTH",
    "OTHER",
}
INITIATIVE_STAGES = {"ACTIVE", "IDEA", "PILOT", "SCALING", "SUSTAINED"}
INITIATIVE_STATUSES = {"ACTIVE", "ARCHIVED", "DRAFT", "PAUSED"}
MILESTONE_STATUSES = {"BLOCKED", "COMPLETED", "IN_PROGRESS", "PLANNED"}


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


def _validate_payload(payload: InitiativeCreate) -> None:
    if payload.focus_area not in FOCUS_AREAS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid focus area")
    if payload.stage not in INITIATIVE_STAGES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid stage")
    for milestone in payload.milestones:
        if milestone.status not in MILESTONE_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid milestone status",
            )


def _user_role_names(user: User) -> set[str]:
    return {assignment.role.name for assignment in user.role_assignments}


def _has_admin_role(user: User) -> bool:
    return has_any_role(_user_role_names(user), ADMIN_ROLE_NAMES)


def _initiative_options():
    return [joinedload(Initiative.creator), joinedload(Initiative.milestones)]


def _query_initiatives():
    return select(Initiative).options(*_initiative_options())


def _get_initiative_or_404(db: Session, initiative_id: uuid.UUID) -> Initiative:
    initiative = (
        db.scalars(_query_initiatives().where(Initiative.id == initiative_id))
        .unique()
        .one_or_none()
    )
    if initiative is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Initiative not found")
    return initiative


def _serialize_initiative(
    initiative: Initiative,
    *,
    include_milestones: bool = True,
) -> InitiativeResponse:
    milestones = list(initiative.milestones) if include_milestones else []
    return InitiativeResponse(
        id=initiative.id,
        city=initiative.city,
        country=initiative.country,
        created_at=initiative.created_at,
        created_by_display_name=initiative.creator.display_name if initiative.creator else None,
        created_by_user_id=initiative.created_by_user_id,
        description=initiative.description,
        ends_at=initiative.ends_at,
        focus_area=initiative.focus_area,
        impact_goal=initiative.impact_goal,
        milestone_count=len(initiative.milestones),
        milestones=[InitiativeMilestoneResponse.model_validate(item) for item in milestones],
        partner_organization=initiative.partner_organization,
        stage=initiative.stage,
        starts_at=initiative.starts_at,
        status=initiative.status,
        summary=initiative.summary,
        support_needed=initiative.support_needed,
        target_beneficiaries=initiative.target_beneficiaries,
        title=initiative.title,
        updated_at=initiative.updated_at,
    )


def _ensure_visible(initiative: Initiative, current_user: User) -> None:
    is_creator = initiative.created_by_user_id == current_user.id
    if initiative.status != "ACTIVE" and not is_creator and not _has_admin_role(current_user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Initiative not found")


def _list_response(
    db: Session,
    query,
    *,
    limit: int,
    offset: int,
) -> InitiativeListResponse:
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    initiatives = (
        db.scalars(query.order_by(Initiative.created_at.desc()).offset(offset).limit(limit))
        .unique()
        .all()
    )
    return InitiativeListResponse(
        initiatives=[
            _serialize_initiative(item, include_milestones=False) for item in initiatives
        ],
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(initiatives) < total,
    )


def _apply_filters(
    query,
    *,
    country: str | None = None,
    focus_area: str | None = None,
    q: str | None = None,
    stage: str | None = None,
):
    if q:
        search_term = f"%{q.strip()}%"
        query = query.where(
            or_(
                Initiative.title.ilike(search_term),
                Initiative.summary.ilike(search_term),
                Initiative.description.ilike(search_term),
                Initiative.country.ilike(search_term),
                Initiative.city.ilike(search_term),
                Initiative.partner_organization.ilike(search_term),
                Initiative.impact_goal.ilike(search_term),
            )
        )
    if country:
        query = query.where(Initiative.country.ilike(f"%{country.strip()}%"))
    normalized_focus = _normalize_enum(focus_area)
    if normalized_focus:
        query = query.where(Initiative.focus_area == normalized_focus)
    normalized_stage = _normalize_enum(stage)
    if normalized_stage:
        query = query.where(Initiative.stage == normalized_stage)
    return query


@router.get("", response_model=InitiativeListResponse)
@router.get("/", response_model=InitiativeListResponse)
def list_initiatives(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
    country: Annotated[str | None, Query(max_length=80)] = None,
    focus_area: Annotated[str | None, Query(max_length=80)] = None,
    mine: bool = False,
    q: Annotated[str | None, Query(max_length=120)] = None,
    stage: Annotated[str | None, Query(max_length=60)] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 12,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> InitiativeListResponse:
    query = _query_initiatives()
    if mine:
        query = query.where(Initiative.created_by_user_id == current_user.id)
    else:
        query = query.where(Initiative.status == "ACTIVE")
    query = _apply_filters(
        query,
        country=country,
        focus_area=focus_area,
        q=q,
        stage=stage,
    )
    return _list_response(db, query, limit=limit, offset=offset)


@router.post("", response_model=InitiativeResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=InitiativeResponse, status_code=status.HTTP_201_CREATED)
def create_initiative(
    payload: InitiativeCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> InitiativeResponse:
    _validate_payload(payload)
    initiative = Initiative(
        city=payload.city,
        country=payload.country,
        created_by_user_id=current_user.id,
        description=payload.description,
        ends_at=payload.ends_at,
        focus_area=payload.focus_area,
        impact_goal=payload.impact_goal,
        partner_organization=payload.partner_organization,
        stage=payload.stage,
        starts_at=payload.starts_at,
        status="ACTIVE",
        summary=payload.summary,
        support_needed=payload.support_needed,
        target_beneficiaries=payload.target_beneficiaries,
        title=payload.title,
    )
    db.add(initiative)
    db.flush()

    for index, milestone in enumerate(payload.milestones):
        db.add(
            InitiativeMilestone(
                description=milestone.description,
                due_at=milestone.due_at,
                initiative_id=initiative.id,
                sort_order=index,
                status=milestone.status,
                title=milestone.title,
            )
        )

    _create_security_event(
        db,
        request,
        current_user,
        "initiatives.created",
        {"initiative_id": str(initiative.id), "status": initiative.status},
    )
    db.commit()
    initiative = _get_initiative_or_404(db, initiative.id)
    return _serialize_initiative(initiative)


@router.get("/{initiative_id}", response_model=InitiativeResponse)
def get_initiative(
    initiative_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> InitiativeResponse:
    initiative = _get_initiative_or_404(db, initiative_id)
    _ensure_visible(initiative, current_user)
    return _serialize_initiative(initiative)
