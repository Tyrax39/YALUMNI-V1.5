from types import SimpleNamespace

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.core.readiness import probe_runtime_readiness


def _settings(**overrides):
    values = {
        "app_env": "local",
        "contribution_expense_evidence_retention_worker_lock_provider": "NONE",
        "infrastructure_probe_timeout_seconds": 0.1,
        "redis_url": "",
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def test_readiness_reports_database_without_migration_revision() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    with Session(engine) as db:
        readiness = probe_runtime_readiness(db, _settings())

    assert readiness.database_reachable is True
    assert readiness.migrations_current is False
    assert readiness.migration_current_revisions == ()
    assert readiness.migration_expected_heads
    assert readiness.ready is False


def test_readiness_accepts_current_migration_head() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    with Session(engine) as db:
        initial = probe_runtime_readiness(db, _settings())
        assert len(initial.migration_expected_heads) == 1
        db.execute(text("CREATE TABLE alembic_version (version_num VARCHAR(32) PRIMARY KEY)"))
        db.execute(
            text("INSERT INTO alembic_version (version_num) VALUES (:version)"),
            {"version": initial.migration_expected_heads[0]},
        )
        db.commit()
        readiness = probe_runtime_readiness(db, _settings())

    assert readiness.migrations_current is True
    assert readiness.ready is True


def test_readiness_requires_redis_in_staging(monkeypatch) -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    monkeypatch.setattr("app.core.readiness._probe_redis", lambda settings: False)
    with Session(engine) as db:
        initial = probe_runtime_readiness(db, _settings())
        db.execute(text("CREATE TABLE alembic_version (version_num VARCHAR(32) PRIMARY KEY)"))
        db.execute(
            text("INSERT INTO alembic_version (version_num) VALUES (:version)"),
            {"version": initial.migration_expected_heads[0]},
        )
        db.commit()
        readiness = probe_runtime_readiness(
            db,
            _settings(app_env="staging", redis_url="redis://localhost:6379/0"),
        )

    assert readiness.redis_required is True
    assert readiness.redis_reachable is False
    assert readiness.ready is False


def test_readiness_handles_invalid_redis_url() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    with Session(engine) as db:
        readiness = probe_runtime_readiness(
            db,
            _settings(app_env="staging", redis_url="invalid://redis"),
        )

    assert readiness.redis_required is True
    assert readiness.redis_reachable is False
    assert readiness.ready is False
