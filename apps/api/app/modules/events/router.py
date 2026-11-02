import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db_session
from app.core.permissions import ADMIN_ROLE_NAMES, has_any_role
from app.core.security import utcnow
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.models import SecurityEvent, User
from app.modules.events.models import Event, EventAgendaItem, EventAttendee
from app.modules.events.schemas import (
    EventAgendaItemResponse,
    EventAttendeeResponse,
    EventCreate,
    EventListResponse,
    EventResponse,
)

router = APIRouter()

EVENT_TYPES = {
    "CHAPTER_MEETUP",
    "COMMUNITY_FORUM",
    "CONFERENCE",
    "NETWORKING",
    "TRAINING",
    "WEBINAR",
    "OTHER",
}
EVENT_MODES = {"HYBRID", "IN_PERSON", "ONLINE"}
EVENT_STATUSES = {"CANCELLED", "DRAFT", "PUBLISHED"}
ATTENDEE_ACTIVE_STATUS = "REGISTERED"


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


def _validate_payload(payload: EventCreate) -> None:
    if payload.event_type not in EVENT_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid event type")
    if payload.mode not in EVENT_MODES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid event mode")


def _user_role_names(user: User) -> set[str]:
    return {assignment.role.name for assignment in user.role_assignments}


def _has_admin_role(user: User) -> bool:
    return has_any_role(_user_role_names(user), ADMIN_ROLE_NAMES)


def _event_options():
    return [joinedload(Event.creator)]


def _query_events():
    return select(Event).options(*_event_options())


def _get_event_or_404(db: Session, event_id: uuid.UUID) -> Event:
    event = db.scalar(_query_events().where(Event.id == event_id))
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return event


def _attendee_count(db: Session, event_id: uuid.UUID) -> int:
    return (
        db.scalar(
            select(func.count()).where(
                EventAttendee.event_id == event_id,
                EventAttendee.status == ATTENDEE_ACTIVE_STATUS,
            )
        )
        or 0
    )


def _is_registered(db: Session, event_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    attendee = db.scalar(
        select(EventAttendee.id).where(
            EventAttendee.event_id == event_id,
            EventAttendee.status == ATTENDEE_ACTIVE_STATUS,
            EventAttendee.user_id == user_id,
        )
    )
    return attendee is not None


def _serialize_event(db: Session, event: Event, current_user: User) -> EventResponse:
    return EventResponse(
        id=event.id,
        attendee_count=_attendee_count(db, event.id),
        capacity=event.capacity,
        city=event.city,
        country=event.country,
        created_at=event.created_at,
        created_by_display_name=event.creator.display_name if event.creator else None,
        created_by_user_id=event.created_by_user_id,
        description=event.description,
        ends_at=event.ends_at,
        event_type=event.event_type,
        is_registered=_is_registered(db, event.id, current_user.id),
        location=event.location,
        mode=event.mode,
        registration_url=event.registration_url,
        starts_at=event.starts_at,
        status=event.status,
        summary=event.summary,
        timezone=event.timezone,
        title=event.title,
        updated_at=event.updated_at,
    )


def _ensure_visible(event: Event, current_user: User) -> None:
    is_creator = event.created_by_user_id == current_user.id
    if event.status != "PUBLISHED" and not is_creator and not _has_admin_role(current_user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")


def _list_response(
    db: Session,
    query,
    *,
    current_user: User,
    limit: int,
    offset: int,
) -> EventListResponse:
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    events = db.scalars(query.order_by(Event.starts_at.asc()).offset(offset).limit(limit)).all()
    return EventListResponse(
        events=[_serialize_event(db, item, current_user) for item in events],
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(events) < total,
    )


def _apply_filters(
    query,
    *,
    country: str | None = None,
    event_type: str | None = None,
    mode: str | None = None,
    q: str | None = None,
):
    if q:
        search_term = f"%{q.strip()}%"
        query = query.where(
            or_(
                Event.title.ilike(search_term),
                Event.summary.ilike(search_term),
                Event.description.ilike(search_term),
                Event.country.ilike(search_term),
                Event.city.ilike(search_term),
                Event.location.ilike(search_term),
            )
        )
    if country:
        query = query.where(Event.country.ilike(f"%{country.strip()}%"))
    normalized_type = _normalize_enum(event_type)
    if normalized_type:
        query = query.where(Event.event_type == normalized_type)
    normalized_mode = _normalize_enum(mode)
    if normalized_mode:
        query = query.where(Event.mode == normalized_mode)
    return query


@router.get("", response_model=EventListResponse)
@router.get("/", response_model=EventListResponse)
def list_events(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
    country: Annotated[str | None, Query(max_length=80)] = None,
    event_type: Annotated[str | None, Query(max_length=80)] = None,
    mine: bool = False,
    mode: Annotated[str | None, Query(max_length=40)] = None,
    q: Annotated[str | None, Query(max_length=120)] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 12,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> EventListResponse:
    query = _query_events()
    if mine:
        query = query.where(Event.created_by_user_id == current_user.id)
    else:
        query = query.where(Event.status == "PUBLISHED")
    query = _apply_filters(query, country=country, event_type=event_type, mode=mode, q=q)
    return _list_response(db, query, current_user=current_user, limit=limit, offset=offset)


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: EventCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> EventResponse:
    _validate_payload(payload)
    event = Event(
        capacity=payload.capacity,
        city=payload.city,
        country=payload.country,
        created_by_user_id=current_user.id,
        description=payload.description,
        ends_at=payload.ends_at,
        event_type=payload.event_type,
        location=payload.location,
        mode=payload.mode,
        registration_url=payload.registration_url,
        starts_at=payload.starts_at,
        status="PUBLISHED",
        summary=payload.summary,
        timezone=payload.timezone,
        title=payload.title,
    )
    db.add(event)
    db.flush()

    for index, agenda_item in enumerate(payload.agenda_items):
        db.add(
            EventAgendaItem(
                description=agenda_item.description,
                ends_at=agenda_item.ends_at,
                event_id=event.id,
                sort_order=index,
                speaker_name=agenda_item.speaker_name,
                starts_at=agenda_item.starts_at,
                title=agenda_item.title,
            )
        )

    db.add(
        EventAttendee(
            event_id=event.id,
            registered_at=utcnow(),
            status=ATTENDEE_ACTIVE_STATUS,
            user_id=current_user.id,
        )
    )
    _create_security_event(
        db,
        request,
        current_user,
        "events.created",
        {"event_id": str(event.id), "status": event.status},
    )
    db.commit()
    event = _get_event_or_404(db, event.id)
    return _serialize_event(db, event, current_user)


@router.get("/{event_id}", response_model=EventResponse)
def get_event(
    event_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> EventResponse:
    event = _get_event_or_404(db, event_id)
    _ensure_visible(event, current_user)
    return _serialize_event(db, event, current_user)


@router.get("/{event_id}/agenda", response_model=list[EventAgendaItemResponse])
def get_event_agenda(
    event_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> list[EventAgendaItemResponse]:
    event = _get_event_or_404(db, event_id)
    _ensure_visible(event, current_user)
    items = db.scalars(
        select(EventAgendaItem)
        .where(EventAgendaItem.event_id == event.id)
        .order_by(EventAgendaItem.sort_order.asc(), EventAgendaItem.starts_at.asc())
    ).all()
    return [EventAgendaItemResponse.model_validate(item) for item in items]


@router.get("/{event_id}/attendees", response_model=list[EventAttendeeResponse])
def get_event_attendees(
    event_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> list[EventAttendeeResponse]:
    event = _get_event_or_404(db, event_id)
    _ensure_visible(event, current_user)
    attendees = db.scalars(
        select(EventAttendee)
        .options(joinedload(EventAttendee.user))
        .where(
            EventAttendee.event_id == event.id,
            EventAttendee.status == ATTENDEE_ACTIVE_STATUS,
        )
        .order_by(EventAttendee.registered_at.asc())
    ).all()
    return [
        EventAttendeeResponse(
            display_name=attendee.user.display_name,
            email=attendee.user.email,
            id=attendee.id,
            registered_at=attendee.registered_at,
            status=attendee.status,
            user_id=attendee.user_id,
        )
        for attendee in attendees
    ]


@router.post("/{event_id}/rsvp", response_model=EventResponse)
def rsvp_event(
    event_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> EventResponse:
    event = _get_event_or_404(db, event_id)
    _ensure_visible(event, current_user)
    if event.status != "PUBLISHED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Event is not open")

    attendee = db.scalar(
        select(EventAttendee).where(
            EventAttendee.event_id == event.id,
            EventAttendee.user_id == current_user.id,
        )
    )
    if attendee is None:
        attendee = EventAttendee(
            event_id=event.id,
            registered_at=utcnow(),
            status=ATTENDEE_ACTIVE_STATUS,
            user_id=current_user.id,
        )
        db.add(attendee)
    else:
        attendee.registered_at = utcnow()
        attendee.status = ATTENDEE_ACTIVE_STATUS

    _create_security_event(
        db,
        request,
        current_user,
        "events.rsvp_registered",
        {"event_id": str(event.id), "status": attendee.status},
    )
    db.commit()
    event = _get_event_or_404(db, event.id)
    return _serialize_event(db, event, current_user)
