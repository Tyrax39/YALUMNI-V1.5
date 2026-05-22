import uuid
from collections.abc import Generator
from datetime import timedelta
from pathlib import Path

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings
from app.core.database import Base
from app.core.security import utcnow
from app.modules.auth import models as auth_models
from app.modules.auth.models import SecurityEvent
from app.modules.contributions import models as contribution_models
from app.modules.contributions.models import (
    ContributionCampaign,
    ContributionDisbursementRequest,
    ContributionExpenseEvidence,
    ContributionExpenseReport,
)
from app.workers.contribution_expense_retention import (
    run_expense_evidence_retention_worker_cycle,
)

_ = auth_models, contribution_models


@pytest.fixture
def db_session() -> Generator[Session]:
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


def create_retention_candidate(
    db: Session,
    upload_dir: Path,
) -> tuple[ContributionExpenseEvidence, Path]:
    campaign = ContributionCampaign(
        created_by_user_id=None,
        currency="USD",
        description="Retention worker campaign for stored expense evidence cleanup.",
        goal_amount_cents=500000,
        status="PUBLISHED",
        summary="Retention worker campaign for cleanup tests.",
        title="Retention worker campaign",
    )
    db.add(campaign)
    db.flush()

    disbursement = ContributionDisbursementRequest(
        amount_cents=25000,
        campaign_id=campaign.id,
        currency="USD",
        payee_name="Retention Vendor",
        purpose="Retention worker expense evidence cleanup test.",
        status="APPROVED",
    )
    db.add(disbursement)
    db.flush()

    report = ContributionExpenseReport(
        amount_cents=25000,
        campaign_id=campaign.id,
        currency="USD",
        disbursement_request_id=disbursement.id,
        expense_category="TRAVEL",
        status="SUBMITTED",
        summary="Retention worker report with stored evidence.",
        vendor_name="Retention Vendor",
    )
    db.add(report)
    db.flush()

    evidence_id = uuid.uuid4()
    storage_key = f"{report.id}/{evidence_id}.pdf"
    file_path = upload_dir / str(report.id) / f"{evidence_id}.pdf"
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_bytes(b"%PDF-1.4 retention worker evidence")
    evidence = ContributionExpenseEvidence(
        id=evidence_id,
        amount_cents=25000,
        content_type="application/pdf",
        created_at=utcnow() - timedelta(days=1),
        evidence_type="RECEIPT",
        expense_report_id=report.id,
        file_name="retention-worker.pdf",
        file_size_bytes=file_path.stat().st_size,
        issued_at=utcnow() - timedelta(days=1),
        storage_key=storage_key,
        storage_provider="LOCAL",
        title="Retention worker receipt",
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)
    return evidence, file_path


def test_expense_evidence_retention_worker_deletes_files_and_records_audit_event(
    db_session: Session,
    tmp_path: Path,
) -> None:
    settings = get_settings()
    previous_days = settings.contribution_expense_evidence_retention_days
    previous_dir = settings.contribution_expense_evidence_upload_dir
    previous_limit = settings.contribution_expense_evidence_retention_worker_limit
    previous_provider = settings.upload_storage_provider
    settings.contribution_expense_evidence_retention_days = 0
    settings.contribution_expense_evidence_retention_worker_limit = 10
    settings.contribution_expense_evidence_upload_dir = str(tmp_path)
    settings.upload_storage_provider = "LOCAL"
    try:
        evidence, file_path = create_retention_candidate(db_session, tmp_path)

        dry_run = run_expense_evidence_retention_worker_cycle(
            db_session,
            dry_run=True,
        )

        assert dry_run["status"] == "succeeded"
        assert dry_run["candidate_count"] == 1
        assert dry_run["deleted_count"] == 0
        assert dry_run["dry_run"] is True
        assert str(evidence.id) in dry_run["candidate_ids"]
        assert file_path.exists()
        db_session.refresh(evidence)
        assert evidence.storage_key is not None
        assert evidence.storage_provider == "LOCAL"

        cleanup = run_expense_evidence_retention_worker_cycle(
            db_session,
            dry_run=False,
        )

        assert cleanup["status"] == "succeeded"
        assert cleanup["candidate_count"] == 1
        assert cleanup["deleted_count"] == 1
        assert cleanup["dry_run"] is False
        assert not file_path.exists()
        db_session.refresh(evidence)
        assert evidence.storage_key is None
        assert evidence.storage_provider is None

        events = db_session.scalars(
            select(SecurityEvent)
            .where(
                SecurityEvent.event_type
                == "contributions.expense_evidence_retention_worker_run"
            )
            .order_by(SecurityEvent.created_at.asc())
        ).all()
        assert len(events) == 2
        assert events[0].metadata_json["dry_run"] is True
        assert events[0].metadata_json["deleted_count"] == 0
        assert events[1].metadata_json["dry_run"] is False
        assert events[1].metadata_json["deleted_count"] == 1
    finally:
        settings.contribution_expense_evidence_retention_days = previous_days
        settings.contribution_expense_evidence_retention_worker_limit = previous_limit
        settings.contribution_expense_evidence_upload_dir = previous_dir
        settings.upload_storage_provider = previous_provider
