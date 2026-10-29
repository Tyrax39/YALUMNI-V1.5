import argparse
import json
import sys
import time
from datetime import datetime

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.core.security import utcnow
from app.modules.alumni.models import MwfAlumniSyncRun
from app.modules.alumni.mwf_directory import (
    mwf_cache_status,
    sync_mwf_cache_if_needed,
)
from app.modules.auth.models import SecurityEvent

MWF_SYNC_WORKER_CYCLE_EVENT = "alumni.mwf_sync_worker_cycle"


def build_parser() -> argparse.ArgumentParser:
    settings = get_settings()
    parser = argparse.ArgumentParser(description="Run the YALUMNI MWF alumni cache worker.")
    parser.add_argument("--once", action="store_true", help="Run one cache check and exit.")
    parser.add_argument(
        "--force", action="store_true", help="Refresh even when the cache is fresh."
    )
    parser.add_argument(
        "--interval-seconds",
        default=settings.mwf_directory_sync_worker_interval_seconds,
        type=int,
        help="Seconds between cache checks.",
    )
    return parser


def run_mwf_sync_worker_cycle(db: Session, *, force: bool = False) -> dict:
    started_at = utcnow()
    before = mwf_cache_status(db)
    run: MwfAlumniSyncRun | None = None
    error: str | None = None

    try:
        run = sync_mwf_cache_if_needed(db, force=force)
        db.commit()
    except Exception as exc:  # pragma: no cover - defensive worker boundary
        db.rollback()
        error = str(exc)

    after = mwf_cache_status(db)
    finished_at = utcnow()
    status = "failed" if error else "skipped"
    if run is not None:
        status = run.status.lower()

    payload = {
        "active_profile_count": after["active_profile_count"],
        "cache_stale_before": before["cache_stale"],
        "cache_stale_after": after["cache_stale"],
        "error": error,
        "finished_at": _isoformat(finished_at),
        "force": force,
        "run": _run_to_dict(run),
        "started_at": _isoformat(started_at),
        "status": status,
    }
    db.add(
        SecurityEvent(
            event_type=MWF_SYNC_WORKER_CYCLE_EVENT,
            metadata_json={
                "active_profile_count": payload["active_profile_count"],
                "cache_stale_after": payload["cache_stale_after"],
                "error": error[:500] if error else None,
                "force": force,
                "status": status,
            },
            created_at=started_at,
            updated_at=finished_at,
        )
    )
    db.commit()
    return payload


def run_mwf_sync_worker_loop(db_factory, *, interval_seconds: int, force: bool = False):
    while True:
        with db_factory() as db:
            yield run_mwf_sync_worker_cycle(db, force=force)
        time.sleep(max(1, interval_seconds))


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.once:
        with SessionLocal() as db:
            result = run_mwf_sync_worker_cycle(db, force=args.force)
        print(json.dumps(result, indent=2, sort_keys=True))
        return 1 if result["status"] == "failed" else 0

    for result in run_mwf_sync_worker_loop(
        SessionLocal,
        interval_seconds=args.interval_seconds,
        force=args.force,
    ):
        print(json.dumps(result, sort_keys=True), flush=True)
        if result["status"] == "failed":
            return 1

    return 0


def _run_to_dict(run: MwfAlumniSyncRun | None) -> dict | None:
    if run is None:
        return None
    return {
        "deactivated_count": run.deactivated_count,
        "error_message": run.error_message,
        "fetched_count": run.fetched_count,
        "finished_at": _isoformat(run.finished_at),
        "id": str(run.id),
        "imported_count": run.imported_count,
        "source_url": run.source_url,
        "started_at": _isoformat(run.started_at),
        "status": run.status,
        "updated_count": run.updated_count,
    }


def _isoformat(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


if __name__ == "__main__":
    sys.exit(main())
