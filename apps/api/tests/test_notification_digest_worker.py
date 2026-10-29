from collections.abc import Generator

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.core.email import clear_email_outbox, email_outbox
from app.core.rate_limit import clear_rate_limits
from app.core.security import hash_password
from app.modules.auth import models as auth_models
from app.modules.auth.models import SecurityEvent, User
from app.modules.notifications import models as notification_models
from app.modules.notifications.models import Notification, NotificationPreference
from app.modules.notifications.worker import (
    DIGEST_WORKER_CYCLE_EVENT,
    run_notification_digest_worker_cycle,
)

_ = auth_models, notification_models


@pytest.fixture
def db_session() -> Generator[Session]:
    clear_rate_limits()
    clear_email_outbox()
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = testing_session_local()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)
        clear_rate_limits()
        clear_email_outbox()


def create_digest_ready_user(
    db: Session,
    *,
    email: str = "worker.digest@example.com",
    frequency: str = "DAILY",
) -> Notification:
    user = User(
        email=email,
        display_name="Worker Digest",
        password_hash=hash_password("SecurePass123!"),
        status="ACTIVE",
    )
    db.add(user)
    db.flush()
    db.add(
        NotificationPreference(
            user_id=user.id,
            email_digest_frequency=frequency,
            in_app_enabled=True,
            muted_event_types=[],
        )
    )
    notification = Notification(
        user_id=user.id,
        event_type="community.join_requested",
        title="New membership request",
        body="A member asked to join the chapter.",
        target_url="/communities/worker-digest",
        metadata_json={"community_id": "worker-digest"},
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def test_notification_digest_worker_sends_records_and_respects_cadence(
    db_session: Session,
) -> None:
    notification = create_digest_ready_user(db_session)

    first_cycle = run_notification_digest_worker_cycle(
        db_session,
        frequencies=["DAILY"],
        max_items_per_email=5,
    )

    assert first_cycle.failed_count == 0
    assert first_cycle.attempted_count == 1
    assert first_cycle.sent_count == 1
    assert first_cycle.notification_count == 1
    assert first_cycle.results[0].status == "succeeded"
    assert len(email_outbox()) == 1
    assert email_outbox()[0].to_email == "worker.digest@example.com"
    db_session.refresh(notification)
    assert notification.email_digest_sent_at is not None

    recorded_event = db_session.scalar(
        select(SecurityEvent).where(
            SecurityEvent.event_type == "notifications.email_digest_worker.daily_succeeded"
        )
    )
    assert recorded_event is not None
    assert recorded_event.metadata_json["sent_count"] == 1
    assert recorded_event.metadata_json["notification_count"] == 1
    first_heartbeat = db_session.scalar(
        select(SecurityEvent).where(SecurityEvent.event_type == DIGEST_WORKER_CYCLE_EVENT)
    )
    assert first_heartbeat is not None
    assert first_heartbeat.metadata_json["status"] == "succeeded"

    second_cycle = run_notification_digest_worker_cycle(
        db_session,
        frequencies=["DAILY"],
        max_items_per_email=5,
    )

    assert second_cycle.attempted_count == 0
    assert second_cycle.sent_count == 0
    assert second_cycle.results[0].status == "skipped"
    assert second_cycle.results[0].skipped_reason == "cadence_not_due"
    heartbeats = db_session.scalars(
        select(SecurityEvent)
        .where(SecurityEvent.event_type == DIGEST_WORKER_CYCLE_EVENT)
        .order_by(SecurityEvent.created_at.asc())
    ).all()
    assert len(heartbeats) == 2
    assert heartbeats[1].metadata_json["status"] == "skipped"


def test_notification_digest_worker_dry_run_does_not_mark_sent_or_block_delivery(
    db_session: Session,
) -> None:
    notification = create_digest_ready_user(
        db_session,
        email="worker.preview@example.com",
    )

    dry_cycle = run_notification_digest_worker_cycle(
        db_session,
        frequencies="DAILY",
        dry_run=True,
        max_items_per_email=5,
    )

    assert dry_cycle.attempted_count == 1
    assert dry_cycle.sent_count == 0
    assert dry_cycle.notification_count == 1
    assert dry_cycle.results[0].status == "succeeded"
    assert email_outbox() == []
    db_session.refresh(notification)
    assert notification.email_digest_sent_at is None

    dry_run_event = db_session.scalar(
        select(SecurityEvent).where(
            SecurityEvent.event_type == "notifications.email_digest_worker.daily_dry_run"
        )
    )
    assert dry_run_event is not None

    send_cycle = run_notification_digest_worker_cycle(
        db_session,
        frequencies="DAILY",
        max_items_per_email=5,
    )

    assert send_cycle.attempted_count == 1
    assert send_cycle.sent_count == 1
    assert len(email_outbox()) == 1
