import uuid
from collections.abc import Iterable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.notifications.models import Notification, NotificationPreference


def create_notification(
    db: Session,
    *,
    user_id: uuid.UUID,
    event_type: str,
    title: str,
    actor_user_id: uuid.UUID | None = None,
    body: str | None = None,
    target_url: str | None = None,
    metadata: dict | None = None,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        actor_user_id=actor_user_id,
        event_type=event_type,
        title=title,
        body=body,
        target_url=target_url,
        metadata_json=metadata,
    )
    db.add(notification)
    return notification


def notify_users(
    db: Session,
    user_ids: Iterable[uuid.UUID],
    *,
    event_type: str,
    title: str,
    actor_user_id: uuid.UUID | None = None,
    body: str | None = None,
    exclude_user_ids: Iterable[uuid.UUID] = (),
    target_url: str | None = None,
    metadata: dict | None = None,
) -> list[Notification]:
    excluded = set(exclude_user_ids)
    candidate_user_ids = [user_id for user_id in dict.fromkeys(user_ids) if user_id not in excluded]
    preferences = {
        preference.user_id: preference
        for preference in db.scalars(
            select(NotificationPreference).where(
                NotificationPreference.user_id.in_(candidate_user_ids)
            )
        ).all()
    }
    notifications: list[Notification] = []
    for user_id in candidate_user_ids:
        preference = preferences.get(user_id)
        if preference and (
            not preference.in_app_enabled
            or event_type.strip().lower() in set(preference.muted_event_types or [])
        ):
            continue
        notifications.append(
            create_notification(
                db,
                user_id=user_id,
                actor_user_id=actor_user_id,
                body=body,
                event_type=event_type,
                metadata=metadata,
                target_url=target_url,
                title=title,
            )
        )
    return notifications
