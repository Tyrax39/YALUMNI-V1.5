import uuid
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.core.email import EmailMessage, build_web_url, send_email
from app.core.security import utcnow
from app.modules.auth.models import User
from app.modules.notifications.models import Notification, NotificationPreference


@dataclass(frozen=True)
class NotificationDigestDelivery:
    user_id: uuid.UUID
    email: str
    frequency: str
    notification_count: int
    delivered: bool
    error: str | None = None


@dataclass(frozen=True)
class NotificationDigestRunResult:
    frequency: str
    dry_run: bool
    generated_at: datetime
    candidate_user_count: int
    sent_count: int
    skipped_count: int
    notification_count: int
    deliveries: list[NotificationDigestDelivery]


def run_email_digest(
    db: Session,
    *,
    dry_run: bool = False,
    frequency: str = "DAILY",
    include_read: bool = False,
    limit: int = 100,
    max_items_per_email: int = 10,
) -> NotificationDigestRunResult:
    normalized_frequency = frequency.strip().upper()
    generated_at = utcnow()
    preferences = db.scalars(
        select(NotificationPreference)
        .options(joinedload(NotificationPreference.user))
        .where(NotificationPreference.email_digest_frequency == normalized_frequency)
        .order_by(NotificationPreference.created_at.asc())
        .limit(limit)
    ).all()
    active_preferences = [
        preference
        for preference in preferences
        if preference.user is not None and preference.user.status == "ACTIVE"
    ]

    deliveries: list[NotificationDigestDelivery] = []
    delivered_notification_ids: list[uuid.UUID] = []
    for preference in active_preferences:
        user = preference.user
        notifications = _eligible_notifications(
            db,
            preference=preference,
            include_read=include_read,
            max_items=max_items_per_email,
        )
        if not notifications:
            continue

        if dry_run:
            deliveries.append(
                NotificationDigestDelivery(
                    user_id=user.id,
                    email=user.email,
                    frequency=normalized_frequency,
                    notification_count=len(notifications),
                    delivered=False,
                )
            )
            continue

        delivery_result = send_email(
            EmailMessage(
                to_email=user.email,
                subject=f"Your YALUMNI {normalized_frequency.lower()} notification digest",
                text_body=_build_digest_text(
                    user=user,
                    frequency=normalized_frequency,
                    notifications=notifications,
                ),
            )
        )
        deliveries.append(
            NotificationDigestDelivery(
                user_id=user.id,
                email=user.email,
                frequency=normalized_frequency,
                notification_count=len(notifications),
                delivered=delivery_result.delivered,
                error=delivery_result.error,
            )
        )
        if delivery_result.delivered:
            delivered_notification_ids.extend(notification.id for notification in notifications)

    if delivered_notification_ids:
        sent_at = utcnow()
        sent_notifications = db.scalars(
            select(Notification).where(Notification.id.in_(delivered_notification_ids))
        ).all()
        for notification in sent_notifications:
            notification.email_digest_sent_at = sent_at
        db.commit()

    sent_count = sum(1 for delivery in deliveries if delivery.delivered)
    return NotificationDigestRunResult(
        frequency=normalized_frequency,
        dry_run=dry_run,
        generated_at=generated_at,
        candidate_user_count=len(active_preferences),
        sent_count=sent_count,
        skipped_count=max(len(active_preferences) - len(deliveries), 0),
        notification_count=sum(delivery.notification_count for delivery in deliveries),
        deliveries=deliveries,
    )


def _eligible_notifications(
    db: Session,
    *,
    preference: NotificationPreference,
    include_read: bool,
    max_items: int,
) -> list[Notification]:
    query = select(Notification).where(
        Notification.user_id == preference.user_id,
        Notification.email_digest_sent_at.is_(None),
    )
    if not include_read:
        query = query.where(Notification.read_at.is_(None))

    muted_event_types = {
        event_type.strip().lower()
        for event_type in (preference.muted_event_types or [])
        if event_type.strip()
    }
    if muted_event_types:
        query = query.where(func.lower(Notification.event_type).notin_(muted_event_types))

    return db.scalars(query.order_by(Notification.created_at.desc()).limit(max_items)).all()


def _build_digest_text(
    *,
    user: User,
    frequency: str,
    notifications: list[Notification],
) -> str:
    notification_label = "update" if len(notifications) == 1 else "updates"
    lines = [
        f"Hi {user.display_name},",
        "",
        (
            f"You have {len(notifications)} unread YALUMNI {notification_label} "
            f"in your {frequency.lower()} digest."
        ),
        "",
    ]
    for index, notification in enumerate(notifications, start=1):
        lines.append(f"{index}. {notification.title}")
        if notification.body:
            lines.append(f"   {notification.body}")
        lines.append(f"   Created: {notification.created_at.isoformat()}")
        if notification.target_url:
            lines.append(f"   Open: {build_web_url(notification.target_url)}")
        lines.append("")

    lines.extend(
        [
            "Open your notification center:",
            build_web_url("/dashboard"),
            "",
            "YALUMNI",
        ]
    )
    return "\n".join(lines)
