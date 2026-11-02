from types import SimpleNamespace

import pytest

from app.core.readiness import RuntimeReadiness
from scripts.verify_local_postgres import verify_local_postgres


class _Session:
    def __init__(self) -> None:
        self.closed = False

    def close(self) -> None:
        self.closed = True


def _settings(database_url: str) -> SimpleNamespace:
    return SimpleNamespace(database_url=database_url)


def _ready_readiness() -> RuntimeReadiness:
    return RuntimeReadiness(
        database_reachable=True,
        migrations_current=True,
        migration_current_revisions=("head",),
        migration_expected_heads=("head",),
        redis_configured=False,
        redis_required=False,
        redis_reachable=False,
    )


def test_verify_local_postgres_accepts_ready_loopback_database(monkeypatch) -> None:
    session = _Session()
    monkeypatch.setattr(
        "scripts.verify_local_postgres.probe_runtime_readiness",
        lambda db, settings: _ready_readiness(),
    )

    result = verify_local_postgres(
        _settings("postgresql+psycopg://yalumni@127.0.0.1:54331/yalumni_v15"),
        session_factory=lambda: session,
    )

    assert result.connection_url.database == "yalumni_v15"
    assert result.readiness.ready is True
    assert session.closed is True


@pytest.mark.parametrize(
    "database_url",
    [
        "sqlite+pysqlite:///D:/YALUMNI-V1.5/.local/yalumni.sqlite3",
        "postgresql+psycopg://yalumni@db.example.test:5432/yalumni_v15",
    ],
)
def test_verify_local_postgres_rejects_nonlocal_database_targets(database_url: str) -> None:
    with pytest.raises(ValueError):
        verify_local_postgres(_settings(database_url), session_factory=_Session)


def test_verify_local_postgres_reports_runtime_readiness_failure(monkeypatch) -> None:
    session = _Session()
    monkeypatch.setattr(
        "scripts.verify_local_postgres.probe_runtime_readiness",
        lambda db, settings: RuntimeReadiness(
            database_reachable=True,
            migrations_current=False,
            migration_current_revisions=("old",),
            migration_expected_heads=("head",),
            redis_configured=False,
            redis_required=False,
            redis_reachable=False,
        ),
    )

    with pytest.raises(RuntimeError, match="migrations_current=False"):
        verify_local_postgres(
            _settings("postgresql+psycopg://yalumni@localhost:54331/yalumni_v15"),
            session_factory=lambda: session,
        )

    assert session.closed is True
