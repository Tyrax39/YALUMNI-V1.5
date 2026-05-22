import argparse
import json
import sys
import time
from datetime import datetime

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
    return parser


def run_expense_evidence_retention_worker_cycle(
    db: Session,
    *,
    dry_run: bool = False,
    limit: int | None = None,
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

    try:
        result = run_expense_evidence_retention_cleanup(
            db,
            dry_run=dry_run,
            limit=cycle_limit,
        )
        db.add(
            SecurityEvent(
                event_type="contributions.expense_evidence_retention_worker_run",
                metadata_json={
                    "candidate_count": len(result.candidates),
                    "cutoff_at": result.cutoff_at.isoformat(),
                    "deleted_count": result.deleted_count,
                    "dry_run": dry_run,
                    "retention_days": result.retention_days,
                    "scanned_count": result.scanned_count,
                },
            )
        )
        payload = _result_to_dict(
            result,
            error=None,
            finished_at=utcnow(),
            started_at=started_at,
            status="succeeded",
        )
        db.commit()
    except Exception as exc:  # pragma: no cover - defensive worker boundary
        db.rollback()
        error = str(exc)
        payload = {
            "candidate_count": 0,
            "candidate_ids": [],
            "cutoff_at": None,
            "deleted_count": 0,
            "dry_run": dry_run,
            "error": error,
            "finished_at": _isoformat(utcnow()),
            "limit": cycle_limit,
            "retention_days": None,
            "scanned_count": 0,
            "started_at": _isoformat(started_at),
            "status": "failed",
        }

    payload["limit"] = cycle_limit
    return payload


def run_expense_evidence_retention_worker_loop(
    db_factory,
    *,
    dry_run: bool,
    interval_seconds: int,
    limit: int | None = None,
):
    while True:
        with db_factory() as db:
            yield run_expense_evidence_retention_worker_cycle(
                db,
                dry_run=dry_run,
                limit=limit,
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
            )
        print(json.dumps(result, indent=2, sort_keys=True))
        return 1 if result["status"] == "failed" else 0

    for result in run_expense_evidence_retention_worker_loop(
        SessionLocal,
        dry_run=args.dry_run,
        interval_seconds=args.interval_seconds,
        limit=args.limit,
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


def _isoformat(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


if __name__ == "__main__":
    sys.exit(main())
