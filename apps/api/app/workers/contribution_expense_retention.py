import argparse
import json
import sys
import time
import uuid
from dataclasses import dataclass
from datetime import datetime

from redis import Redis
from redis.exceptions import RedisError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.core.security import utcnow
from app.modules.auth.models import SecurityEvent
from app.modules.contributions.retention import (
    ExpenseEvidenceRetentionResult,
    run_expense_evidence_retention_cleanup,
)


def build_parser() -> argparse.ArgumentParser:
    settings = get_settings()
    parser = argparse.ArgumentParser(
        description="Run YALUMNI contribution expense evidence retention cleanup."
    )
    parser.add_argument("--once", action="store_true", help="Run one cleanup cycle and exit.")
    parser.add_argument("--dry-run", action="store_true", help="Preview cleanup candidates.")
    parser.add_argument(
        "--interval-seconds",
        default=settings.contribution_expense_evidence_retention_worker_interval_seconds,
        type=int,
        help="Seconds between cleanup cycles.",
    )
    parser.add_argument(
        "--limit",
        default=settings.contribution_expense_evidence_retention_worker_limit,
        type=int,
        help="Maximum stored evidence records to process per cycle.",
    )
    parser.add_argument(
        "--lock-provider",
        default=settings.contribution_expense_evidence_retention_worker_lock_provider,
        help="Worker lock provider: NONE or REDIS.",
    )
    parser.add_argument(
        "--lock-ttl-seconds",
        default=settings.contribution_expense_evidence_retention_worker_lock_ttl_seconds,
        type=int,
        help="Seconds before a REDIS worker lock expires.",
    )
    return parser


@dataclass
class WorkerLockHandle:
    acquired: bool
    name: str
    provider: str
    token: str | None = None
    error: str | None = None
    redis_client: Redis | None = None

    def release(self) -> None:
        if self.provider != "REDIS" or not self.acquired or not self.redis_client:
            return
        script = (
            "if redis.call('get', KEYS[1]) == ARGV[1] "
            "then return redis.call('del', KEYS[1]) else return 0 end"
        )
        try:
            self.redis_client.eval(script, 1, self.name, self.token)
        except RedisError:
            return


def _normalize_lock_provider(value: str | None) -> str:
    normalized = (value or "").strip().upper().replace("-", "_")
    return normalized or "NONE"


def acquire_expense_evidence_retention_worker_lock(
    *,
    lock_provider: str | None = None,
    ttl_seconds: int | None = None,
) -> WorkerLockHandle:
    settings = get_settings()
    provider = _normalize_lock_provider(
        lock_provider
        if lock_provider is not None
        else settings.contribution_expense_evidence_retention_worker_lock_provider
    )
    lock_name = "yalumni:worker:contribution-expense-evidence-retention"
    if provider == "NONE":
        return WorkerLockHandle(acquired=True, name=lock_name, provider=provider)
    if provider != "REDIS":
        return WorkerLockHandle(
            acquired=False,
            error="Unsupported worker lock provider",
            name=lock_name,
            provider=provider,
        )

    token = str(uuid.uuid4())
    ttl = max(
        1,
        ttl_seconds
        if ttl_seconds is not None
        else settings.contribution_expense_evidence_retention_worker_lock_ttl_seconds,
    )
    try:
        redis_client = Redis.from_url(settings.redis_url, decode_responses=True)
        acquired = bool(redis_client.set(lock_name, token, nx=True, ex=ttl))
    except RedisError as exc:
        return WorkerLockHandle(
            acquired=False,
            error=str(exc),
            name=lock_name,
            provider=provider,
        )
    return WorkerLockHandle(
        acquired=acquired,
        name=lock_name,
        provider=provider,
        redis_client=redis_client,
        token=token,
    )


def run_expense_evidence_retention_worker_cycle(
    db: Session,
    *,
    dry_run: bool = False,
    limit: int | None = None,
    lock_provider: str | None = None,
    lock_ttl_seconds: int | None = None,
) -> dict:
    settings = get_settings()
    cycle_limit = (
        limit
        if limit is not None
        else settings.contribution_expense_evidence_retention_worker_limit
    )
    started_at = utcnow()
    error: str | None = None
    result: ExpenseEvidenceRetentionResult | None = None
    worker_lock = acquire_expense_evidence_retention_worker_lock(
        lock_provider=lock_provider,
        ttl_seconds=lock_ttl_seconds,
    )

    if not worker_lock.acquired:
        status = "failed" if worker_lock.error else "skipped_locked"
        payload = _empty_worker_payload(
            dry_run=dry_run,
            error=worker_lock.error,
            finished_at=utcnow(),
            limit=cycle_limit,
            started_at=started_at,
            status=status,
        )
        _add_worker_lock_payload(payload, worker_lock=worker_lock)
        _add_worker_audit_event(db, payload, worker_lock=worker_lock)
        db.commit()
        return payload

    try:
        result = run_expense_evidence_retention_cleanup(
            db,
            dry_run=dry_run,
            limit=cycle_limit,
        )
        payload = _result_to_dict(
            result,
            error=None,
            finished_at=utcnow(),
            started_at=started_at,
            status="succeeded",
        )
        _add_worker_audit_event(db, payload, worker_lock=worker_lock)
        db.commit()
    except Exception as exc:  # pragma: no cover - defensive worker boundary
        db.rollback()
        error = str(exc)
        payload = _empty_worker_payload(
            dry_run=dry_run,
            error=error,
            finished_at=utcnow(),
            limit=cycle_limit,
            started_at=started_at,
            status="failed",
        )
    finally:
        worker_lock.release()

    payload["limit"] = cycle_limit
    _add_worker_lock_payload(payload, worker_lock=worker_lock)
    return payload


def run_expense_evidence_retention_worker_loop(
    db_factory,
    *,
    dry_run: bool,
    interval_seconds: int,
    limit: int | None = None,
    lock_provider: str | None = None,
    lock_ttl_seconds: int | None = None,
):
    while True:
        with db_factory() as db:
            yield run_expense_evidence_retention_worker_cycle(
                db,
                dry_run=dry_run,
                limit=limit,
                lock_provider=lock_provider,
                lock_ttl_seconds=lock_ttl_seconds,
            )
        time.sleep(max(1, interval_seconds))


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.once:
        with SessionLocal() as db:
            result = run_expense_evidence_retention_worker_cycle(
                db,
                dry_run=args.dry_run,
                limit=args.limit,
                lock_provider=args.lock_provider,
                lock_ttl_seconds=args.lock_ttl_seconds,
            )
        print(json.dumps(result, indent=2, sort_keys=True))
        return 1 if result["status"] == "failed" else 0

    for result in run_expense_evidence_retention_worker_loop(
        SessionLocal,
        dry_run=args.dry_run,
        interval_seconds=args.interval_seconds,
        limit=args.limit,
        lock_provider=args.lock_provider,
        lock_ttl_seconds=args.lock_ttl_seconds,
    ):
        print(json.dumps(result, sort_keys=True), flush=True)
        if result["status"] == "failed":
            return 1

    return 0


def _result_to_dict(
    result: ExpenseEvidenceRetentionResult,
    *,
    error: str | None,
    finished_at: datetime,
    started_at: datetime,
    status: str,
) -> dict:
    return {
        "candidate_count": len(result.candidates),
        "candidate_ids": [str(candidate.id) for candidate in result.candidates],
        "cutoff_at": _isoformat(result.cutoff_at),
        "deleted_count": result.deleted_count,
        "dry_run": result.dry_run,
        "error": error,
        "finished_at": _isoformat(finished_at),
        "retention_days": result.retention_days,
        "scanned_count": result.scanned_count,
        "started_at": _isoformat(started_at),
        "status": status,
    }


def _empty_worker_payload(
    *,
    dry_run: bool,
    error: str | None,
    finished_at: datetime,
    limit: int,
    started_at: datetime,
    status: str,
) -> dict:
    return {
        "candidate_count": 0,
        "candidate_ids": [],
        "cutoff_at": None,
        "deleted_count": 0,
        "dry_run": dry_run,
        "error": error,
        "finished_at": _isoformat(finished_at),
        "limit": limit,
        "retention_days": None,
        "scanned_count": 0,
        "started_at": _isoformat(started_at),
        "status": status,
    }


def _add_worker_audit_event(
    db: Session,
    payload: dict,
    *,
    worker_lock: WorkerLockHandle,
) -> None:
    db.add(
        SecurityEvent(
            event_type="contributions.expense_evidence_retention_worker_run",
            metadata_json={
                "candidate_count": payload["candidate_count"],
                "cutoff_at": payload["cutoff_at"],
                "deleted_count": payload["deleted_count"],
                "dry_run": payload["dry_run"],
                "error": payload["error"],
                "lock_acquired": worker_lock.acquired,
                "lock_name": worker_lock.name,
                "lock_provider": worker_lock.provider,
                "retention_days": payload["retention_days"],
                "scanned_count": payload["scanned_count"],
                "status": payload["status"],
            },
        )
    )


def _add_worker_lock_payload(payload: dict, *, worker_lock: WorkerLockHandle) -> None:
    payload["lock_acquired"] = worker_lock.acquired
    payload["lock_name"] = worker_lock.name
    payload["lock_provider"] = worker_lock.provider


def _isoformat(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


if __name__ == "__main__":
    sys.exit(main())
