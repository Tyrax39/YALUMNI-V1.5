from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import utcnow
from app.core.storage import UploadCategory, delete_upload
from app.modules.contributions.models import ContributionExpenseEvidence


@dataclass(frozen=True)
class ExpenseEvidenceRetentionResult:
    candidates: list[ContributionExpenseEvidence]
    cutoff_at: datetime
    deleted_count: int
    dry_run: bool
    retention_days: int
    scanned_count: int


def expense_evidence_retention_cutoff() -> tuple[int, datetime]:
    retention_days = max(0, get_settings().contribution_expense_evidence_retention_days)
    return retention_days, utcnow() - timedelta(days=retention_days)


def expense_evidence_retention_candidates(
    db: Session,
    cutoff_at: datetime,
    *,
    limit: int,
) -> tuple[int, list[ContributionExpenseEvidence]]:
    filters = (
        ContributionExpenseEvidence.storage_key.is_not(None),
        ContributionExpenseEvidence.created_at <= cutoff_at,
    )
    total = db.scalar(select(func.count()).where(*filters)) or 0
    candidates = db.scalars(
        select(ContributionExpenseEvidence)
        .where(*filters)
        .order_by(ContributionExpenseEvidence.created_at.asc())
        .limit(limit)
    ).all()
    return int(total), list(candidates)


def run_expense_evidence_retention_cleanup(
    db: Session,
    *,
    dry_run: bool,
    limit: int,
) -> ExpenseEvidenceRetentionResult:
    retention_days, cutoff_at = expense_evidence_retention_cutoff()
    scanned_count, candidates = expense_evidence_retention_candidates(
        db,
        cutoff_at,
        limit=limit,
    )
    deleted_count = 0
    if not dry_run:
        for evidence in candidates:
            delete_upload(
                category=UploadCategory.CONTRIBUTION_EXPENSE_EVIDENCE,
                storage_key=evidence.storage_key,
                storage_provider=evidence.storage_provider,
            )
            evidence.storage_key = None
            evidence.storage_provider = None
            deleted_count += 1

    return ExpenseEvidenceRetentionResult(
        candidates=candidates,
        cutoff_at=cutoff_at,
        deleted_count=deleted_count,
        dry_run=dry_run,
        retention_days=retention_days,
        scanned_count=scanned_count,
    )
