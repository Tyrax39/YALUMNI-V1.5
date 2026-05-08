import time
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import utcnow
from app.modules.auth.models import SecurityEvent
from app.modules.notifications.digests import NotificationDigestRunResult, run_email_digest

DIGEST_WORKER_EVENT_PREFIX = "notifications.email_digest_worker"
DIGEST_WORKER_CADENCE = {
    "DAILY": timedelta(days=1),
    "WEEKLY": timedelta(days=7),
}


@dataclass(frozen=True)
class NotificationDigestWorkerFrequencyResult:
    frequency: str
    status: str
    dry_run: bool
    candidate_user_count: int = 0
    sent_count: int = 0
    skipped_count: int = 0
    notification_count: int = 0
    error: str | None = None
    skipped_reason: str | None = None


@dataclass(frozen=True)
class NotificationDigestWorkerCycleResult:
    started_at: datetime
    finished_at: datetime
    dry_run: bool
    force: bool
    results: list[NotificationDigestWorkerFrequencyResult]

    @property
    def attempted_count(self) -> int:
        return sum(1 for result in self.results if result.status in {"succeeded", "failed"})

    @property
    def failed_count(self) -> int:
        return sum(1 for result in self.results if result.status == "failed")

    @property
    def sent_count(self) -> int:
        return sum(result.sent_count for result in self.results)

    @property
    def notification_count(self) -> int:
        return sum(result.notification_count for result in self.results)

    @property
    def candidate_user_count(self) -> int:
        return sum(result.candidate_user_count for result in self.results)


def normalize_digest_worker_frequencies(value: str | list[str] | tuple[str, ...]) -> list[str]:
    raw_frequencies = value.split(",") if isinstance(value, str) else value
    normalized: list[str] = []
    seen: set[str] = set()
    for raw_frequency in raw_frequencies:
        frequency = raw_frequency.strip().upper()
        if not frequency:
            continue
        if frequency not in DIGEST_WORKER_CADENCE:
            raise ValueError(f"Unsupported digest worker frequency: {raw_frequency}")
        if frequency not in seen:
            normalized.append(frequency)
            seen.add(frequency)

    if not normalized:
        raise ValueError("At least one digest worker frequency is required")

    return normalized


def run_notification_digest_worker_cycle(
    db: Session,
    *,
    frequencies: str | list[str] | tuple[str, ...] = "DAILY,WEEKLY",
    dry_run: bool = False,
    force: bool = False,
    include_read: bool = False,
    limit: int = 100,
    max_items_per_email: int = 10,
    now: datetime | None = None,
) -> NotificationDigestWorkerCycleResult:
    started_at = _aware_datetime(now or utcnow())
    results: list[NotificationDigestWorkerFrequencyResult] = []

    for frequency in normalize_digest_worker_frequencies(frequencies):
        if not dry_run and not force and not _frequency_is_due(db, frequency, started_at):
            results.append(
                NotificationDigestWorkerFrequencyResult(
                    frequency=frequency,
                    status="skipped",
                    dry_run=dry_run,
                    skipped_reason="cadence_not_due",
                )
            )
            continue

        try:
            digest_result = run_email_digest(
                db,
                dry_run=dry_run,
                frequency=frequency,
                include_read=include_read,
                limit=limit,
                max_items_per_email=max_items_per_email,
            )
        except Exception as exc:  # pragma: no cover - defensive worker boundary
            db.rollback()
            finished_at = utcnow()
            _record_worker_event(
                db,
                frequency=frequency,
                status="failed",
                started_at=started_at,
                finished_at=finished_at,
                dry_run=dry_run,
                error=str(exc),
            )
            results.append(
                NotificationDigestWorkerFrequencyResult(
                    frequency=frequency,
                    status="failed",
                    dry_run=dry_run,
                    error=str(exc),
                )
            )
            continue

        finished_at = utcnow()
        _record_worker_event(
            db,
            frequency=frequency,
            status="dry_run" if dry_run else "succeeded",
            started_at=started_at,
            finished_at=finished_at,
            dry_run=dry_run,
            digest_result=digest_result,
        )
        results.append(_frequency_result_from_digest(digest_result, dry_run=dry_run))

    return NotificationDigestWorkerCycleResult(
        started_at=started_at,
        finished_at=utcnow(),
        dry_run=dry_run,
        force=force,
        results=results,
    )


def run_notification_digest_worker_loop(
    db_factory,
    *,
    interval_seconds: int,
    frequencies: str | list[str] | tuple[str, ...],
    dry_run: bool = False,
    force: bool = False,
    include_read: bool = False,
    limit: int = 100,
    max_items_per_email: int = 10,
):
    while True:
        with db_factory() as db:
            yield run_notification_digest_worker_cycle(
                db,
                frequencies=frequencies,
                dry_run=dry_run,
                force=force,
                include_read=include_read,
                limit=limit,
                max_items_per_email=max_items_per_email,
            )
        time.sleep(max(1, interval_seconds))


def digest_worker_cycle_to_dict(result: NotificationDigestWorkerCycleResult) -> dict:
    return {
        "attempted_count": result.attempted_count,
        "candidate_user_count": result.candidate_user_count,
        "dry_run": result.dry_run,
        "failed_count": result.failed_count,
        "finished_at": result.finished_at.isoformat(),
        "force": result.force,
        "notification_count": result.notification_count,
        "results": [
            {
                "candidate_user_count": frequency_result.candidate_user_count,
                "dry_run": frequency_result.dry_run,
                "error": frequency_result.error,
                "frequency": frequency_result.frequency,
                "notification_count": frequency_result.notification_count,
                "sent_count": frequency_result.sent_count,
                "skipped_count": frequency_result.skipped_count,
                "skipped_reason": frequency_result.skipped_reason,
                "status": frequency_result.status,
            }
            for frequency_result in result.results
        ],
        "sent_count": result.sent_count,
        "started_at": result.started_at.isoformat(),
    }


def _frequency_result_from_digest(
    digest_result: NotificationDigestRunResult,
    *,
    dry_run: bool,
) -> NotificationDigestWorkerFrequencyResult:
    return NotificationDigestWorkerFrequencyResult(
        frequency=digest_result.frequency,
        status="succeeded",
        dry_run=dry_run,
        candidate_user_count=digest_result.candidate_user_count,
        sent_count=digest_result.sent_count,
        skipped_count=digest_result.skipped_count,
        notification_count=digest_result.notification_count,
    )


def _frequency_is_due(db: Session, frequency: str, now: datetime) -> bool:
    last_success = db.scalar(
        select(SecurityEvent.created_at)
        .where(SecurityEvent.event_type == _worker_event_type(frequency, "succeeded"))
        .order_by(SecurityEvent.created_at.desc())
        .limit(1)
    )
    if last_success is None:
        return True

    return _aware_datetime(now) - _aware_datetime(last_success) >= DIGEST_WORKER_CADENCE[frequency]


def _record_worker_event(
    db: Session,
    *,
    frequency: str,
    status: str,
    started_at: datetime,
    finished_at: datetime,
    dry_run: bool,
    digest_result: NotificationDigestRunResult | None = None,
    error: str | None = None,
) -> None:
    metadata = {
        "dry_run": dry_run,
        "finished_at": finished_at.isoformat(),
        "frequency": frequency,
        "started_at": started_at.isoformat(),
    }
    if digest_result is not None:
        metadata.update(
            {
                "candidate_user_count": digest_result.candidate_user_count,
                "notification_count": digest_result.notification_count,
                "sent_count": digest_result.sent_count,
                "skipped_count": digest_result.skipped_count,
            }
        )
    if error is not None:
        metadata["error"] = error[:500]

    db.add(
        SecurityEvent(
            event_type=_worker_event_type(frequency, status),
            metadata_json=metadata,
            created_at=started_at,
            updated_at=finished_at,
        )
    )
    db.commit()


def _worker_event_type(frequency: str, status: str) -> str:
    return f"{DIGEST_WORKER_EVENT_PREFIX}.{frequency.lower()}_{status}"


def _aware_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value
