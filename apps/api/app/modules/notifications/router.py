import asyncio
import json
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload, sessionmaker

from app.core.config import get_settings
from app.core.database import get_db_session
from app.core.security import utcnow
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.notifications.models import Notification
from app.modules.notifications.schemas import (
    NotificationListResponse,
    NotificationReadAllResponse,
    NotificationResponse,
)

router = APIRouter()
NOTIFICATION_STREAM_MAX_POLL_SECONDS = 60


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
        created_at=notification.created_at,
        updated_at=notification.updated_at,
    )


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
