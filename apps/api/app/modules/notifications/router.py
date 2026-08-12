import asyncio
import json
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload, sessionmaker

from app.core.config import get_settings
from app.core.database import get_db_session
from app.core.permissions import ADMIN_ROLE_NAMES
from app.core.security import utcnow
from app.modules.auth.dependencies import get_current_user, require_roles
from app.modules.auth.models import SecurityEvent, User
from app.modules.notifications.digests import run_email_digest
from app.modules.notifications.models import Notification, NotificationPreference
from app.modules.notifications.schemas import (
    NotificationDigestDeliveryResponse,
    NotificationDigestRunRequest,
    NotificationDigestRunResponse,
    NotificationListResponse,
    NotificationPreferenceResponse,
    NotificationPreferenceUpdate,
    NotificationReadAllResponse,
    NotificationResponse,
)

router = APIRouter()
NOTIFICATION_STREAM_MAX_POLL_SECONDS = 60
notification_admin_dependency = require_roles(*ADMIN_ROLE_NAMES)


def _request_context(request: Request) -> tuple[str | None, str | None]:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        ip_address = forwarded_for.split(",", 1)[0].strip()
    else:
        ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return ip_address, user_agent[:255] if user_agent else None


def _serialize_notification(notification: Notification) -> NotificationResponse:
    return NotificationResponse(
        id=notification.id,
        user_id=notification.user_id,
        actor_user_id=notification.actor_user_id,
        actor_display_name=(
            notification.actor_user.display_name if notification.actor_user else None
        ),
        event_type=notification.event_type,
        title=notification.title,
        body=notification.body,
        target_url=notification.target_url,
        metadata=notification.metadata_json,
        read_at=notification.read_at,
        email_digest_sent_at=notification.email_digest_sent_at,
        created_at=notification.created_at,
        updated_at=notification.updated_at,
    )


def _serialize_preference(preference: NotificationPreference) -> NotificationPreferenceResponse:
    return NotificationPreferenceResponse(
        id=preference.id,
        user_id=preference.user_id,
        in_app_enabled=preference.in_app_enabled,
        email_digest_frequency=preference.email_digest_frequency,
        muted_event_types=preference.muted_event_types or [],
        created_at=preference.created_at,
        updated_at=preference.updated_at,
    )


def _get_or_create_preference(db: Session, user: User) -> NotificationPreference:
    preference = db.scalar(
        select(NotificationPreference).where(NotificationPreference.user_id == user.id)
    )
    if preference is None:
        preference = NotificationPreference(
            user_id=user.id,
            in_app_enabled=True,
            email_digest_frequency="NONE",
            muted_event_types=[],
        )
        db.add(preference)
        db.commit()
        db.refresh(preference)

    return preference


def _unread_count(db: Session, user: User) -> int:
    return (
        db.scalar(
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == user.id, Notification.read_at.is_(None))
        )
        or 0
    )


def _stream_snapshot(db: Session, user_id: uuid.UUID) -> dict:
    latest_notification = db.scalar(
        select(Notification)
        .options(joinedload(Notification.actor_user))
        .where(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(1)
    )
    unread_count = (
        db.scalar(
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == user_id, Notification.read_at.is_(None))
        )
        or 0
    )

    return {
        "generated_at": utcnow().isoformat(),
        "latest_notification": (
            _serialize_notification(latest_notification).model_dump(mode="json")
            if latest_notification
            else None
        ),
        "unread_count": unread_count,
    }


def _sse_event(event_name: str, payload: dict) -> str:
    return f"event: {event_name}\ndata: {json.dumps(payload, separators=(',', ':'))}\n\n"


@router.get("", response_model=NotificationListResponse)
def list_my_notifications(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
    status_filter: Annotated[
        str,
        Query(alias="status", pattern="^(ALL|READ|UNREAD)$"),
    ] = "UNREAD",
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> NotificationListResponse:
    normalized_status = status_filter.strip().upper()
    query = (
        select(Notification)
        .options(joinedload(Notification.actor_user))
        .where(Notification.user_id == current_user.id)
    )
    if normalized_status == "UNREAD":
        query = query.where(Notification.read_at.is_(None))
    if normalized_status == "READ":
        query = query.where(Notification.read_at.is_not(None))

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    notifications = db.scalars(
        query.order_by(Notification.created_at.desc()).offset(offset).limit(limit)
    ).all()
    return NotificationListResponse(
        notifications=[_serialize_notification(notification) for notification in notifications],
        total=total,
        unread_count=_unread_count(db, current_user),
        limit=limit,
        offset=offset,
        has_more=offset + len(notifications) < total,
    )


@router.get("/stream")
def stream_my_notifications(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
    poll_seconds: Annotated[
        int | None, Query(ge=1, le=NOTIFICATION_STREAM_MAX_POLL_SECONDS)
    ] = None,
    max_events: Annotated[int | None, Query(ge=1, le=50)] = None,
) -> StreamingResponse:
    interval = poll_seconds or get_settings().notification_stream_poll_seconds
    interval = min(max(1, interval), NOTIFICATION_STREAM_MAX_POLL_SECONDS)
    stream_session_local = sessionmaker(autocommit=False, autoflush=False, bind=db.get_bind())
    user_id = current_user.id

    async def events():
        emitted_events = 0
        while True:
            with stream_session_local() as stream_db:
                yield _sse_event("snapshot", _stream_snapshot(stream_db, user_id))

            emitted_events += 1
            if max_events is not None and emitted_events >= max_events:
                break

            await asyncio.sleep(interval)

    return StreamingResponse(
        events(),
        headers={
            "Cache-Control": "no-store",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
        media_type="text/event-stream",
    )


@router.get("/preferences", response_model=NotificationPreferenceResponse)
def get_my_notification_preferences(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> NotificationPreferenceResponse:
    return _serialize_preference(_get_or_create_preference(db, current_user))


@router.patch("/preferences", response_model=NotificationPreferenceResponse)
def update_my_notification_preferences(
    payload: NotificationPreferenceUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> NotificationPreferenceResponse:
    preference = _get_or_create_preference(db, current_user)
    if payload.in_app_enabled is not None:
        preference.in_app_enabled = payload.in_app_enabled
    if payload.email_digest_frequency is not None:
        preference.email_digest_frequency = payload.email_digest_frequency
    if payload.muted_event_types is not None:
        preference.muted_event_types = payload.muted_event_types

    db.commit()
    db.refresh(preference)
    return _serialize_preference(preference)


@router.post("/admin/email-digests/run", response_model=NotificationDigestRunResponse)
def run_notification_email_digests(
    payload: NotificationDigestRunRequest,
    request: Request,
    current_user: Annotated[User, Depends(notification_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> NotificationDigestRunResponse:
    result = run_email_digest(
        db,
        dry_run=payload.dry_run,
        frequency=payload.frequency,
        include_read=payload.include_read,
        limit=payload.limit,
        max_items_per_email=payload.max_items_per_email,
    )
    ip_address, user_agent = _request_context(request)
    db.add(
        SecurityEvent(
            user_id=current_user.id,
            event_type="notifications.email_digest_run",
            ip_address=ip_address,
            user_agent=user_agent,
            metadata_json={
                "candidate_user_count": result.candidate_user_count,
                "dry_run": result.dry_run,
                "frequency": result.frequency,
                "notification_count": result.notification_count,
                "sent_count": result.sent_count,
                "skipped_count": result.skipped_count,
            },
        )
    )
    db.commit()

    return NotificationDigestRunResponse(
        frequency=result.frequency,
        dry_run=result.dry_run,
        generated_at=result.generated_at,
        candidate_user_count=result.candidate_user_count,
        sent_count=result.sent_count,
        skipped_count=result.skipped_count,
        notification_count=result.notification_count,
        deliveries=[
            NotificationDigestDeliveryResponse(
                user_id=delivery.user_id,
                email=delivery.email,
                frequency=delivery.frequency,
                notification_count=delivery.notification_count,
                delivered=delivery.delivered,
                error=delivery.error,
            )
            for delivery in result.deliveries
        ],
    )


@router.post("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> NotificationResponse:
    notification = db.scalar(
        select(Notification)
        .options(joinedload(Notification.actor_user))
        .where(Notification.id == notification_id, Notification.user_id == current_user.id)
    )
    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    if notification.read_at is None:
        notification.read_at = utcnow()
    db.commit()
    db.refresh(notification)
    return _serialize_notification(notification)


@router.post("/read-all", response_model=NotificationReadAllResponse)
def mark_all_notifications_read(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> NotificationReadAllResponse:
    unread_notifications = db.scalars(
        select(Notification).where(
            Notification.user_id == current_user.id,
            Notification.read_at.is_(None),
        )
    ).all()
    now = utcnow()
    for notification in unread_notifications:
        notification.read_at = now

    db.commit()
    return NotificationReadAllResponse(marked_read=len(unread_notifications), unread_count=0)
