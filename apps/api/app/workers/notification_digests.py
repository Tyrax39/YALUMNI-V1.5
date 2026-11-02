import argparse
import json
import sys

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.modules.notifications.worker import (
    digest_worker_cycle_to_dict,
    run_notification_digest_worker_cycle,
    run_notification_digest_worker_loop,
)


def build_parser() -> argparse.ArgumentParser:
    settings = get_settings()
    parser = argparse.ArgumentParser(description="Run YALUMNI notification digest worker.")
    parser.add_argument("--once", action="store_true", help="Run one cycle and exit.")
    parser.add_argument("--dry-run", action="store_true", help="Preview digest candidates.")
    parser.add_argument("--force", action="store_true", help="Ignore digest cadence checks.")
    parser.add_argument(
        "--frequencies",
        default=settings.notification_digest_worker_frequencies,
        help="Comma-separated digest frequencies to process.",
    )
    parser.add_argument(
        "--interval-seconds",
        default=settings.notification_digest_worker_interval_seconds,
        type=int,
        help="Seconds between loop cycles.",
    )
    parser.add_argument(
        "--include-read",
        action="store_true",
        default=settings.notification_digest_worker_include_read,
        help="Include read notifications that have not been digest-sent.",
    )
    parser.add_argument(
        "--limit",
        default=settings.notification_digest_worker_limit,
        type=int,
        help="Maximum digest preference candidates per frequency.",
    )
    parser.add_argument(
        "--max-items-per-email",
        default=settings.notification_digest_worker_max_items_per_email,
        type=int,
        help="Maximum notifications included in each digest email.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.once:
        with SessionLocal() as db:
            result = run_notification_digest_worker_cycle(
                db,
                frequencies=args.frequencies,
                dry_run=args.dry_run,
                force=args.force,
                include_read=args.include_read,
                limit=args.limit,
                max_items_per_email=args.max_items_per_email,
            )
        print(json.dumps(digest_worker_cycle_to_dict(result), indent=2, sort_keys=True))
        return 1 if result.failed_count else 0

    for result in run_notification_digest_worker_loop(
        SessionLocal,
        interval_seconds=args.interval_seconds,
        frequencies=args.frequencies,
        dry_run=args.dry_run,
        force=args.force,
        include_read=args.include_read,
        limit=args.limit,
        max_items_per_email=args.max_items_per_email,
    ):
        print(json.dumps(digest_worker_cycle_to_dict(result), sort_keys=True), flush=True)
        if result.failed_count:
            return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
