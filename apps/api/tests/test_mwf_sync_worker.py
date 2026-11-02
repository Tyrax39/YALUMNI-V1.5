from collections.abc import Generator

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.modules.alumni import models as alumni_models
from app.modules.auth import models as auth_models
from app.modules.auth.models import SecurityEvent
from app.workers import mwf_alumni_sync

_ = alumni_models, auth_models


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


def test_mwf_worker_records_heartbeat_when_fresh_cache_skips_sync(
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    cache_status = {
        "active_profile_count": 125,
        "cache_stale": False,
    }
    monkeypatch.setattr(mwf_alumni_sync, "mwf_cache_status", lambda db: cache_status)
    monkeypatch.setattr(
        mwf_alumni_sync,
        "sync_mwf_cache_if_needed",
        lambda db, force=False: None,
    )

    result = mwf_alumni_sync.run_mwf_sync_worker_cycle(db_session)

    assert result["status"] == "skipped"
    heartbeat = db_session.scalar(
        select(SecurityEvent).where(
            SecurityEvent.event_type == mwf_alumni_sync.MWF_SYNC_WORKER_CYCLE_EVENT
        )
    )
    assert heartbeat is not None
    assert heartbeat.metadata_json == {
        "active_profile_count": 125,
        "cache_stale_after": False,
        "error": None,
        "force": False,
        "status": "skipped",
    }
