from dataclasses import dataclass
from pathlib import Path

from alembic.config import Config
from alembic.migration import MigrationContext
from alembic.script import ScriptDirectory
from redis import Redis
from redis.exceptions import RedisError
from sqlalchemy import text
from sqlalchemy.orm import Session


@dataclass(frozen=True)
class RuntimeReadiness:
    database_reachable: bool
    migrations_current: bool
    migration_current_revisions: tuple[str, ...]
    migration_expected_heads: tuple[str, ...]
    redis_configured: bool
    redis_required: bool
    redis_reachable: bool

    @property
    def ready(self) -> bool:
        return bool(
            self.database_reachable
            and self.migrations_current
            and (not self.redis_required or self.redis_reachable)
        )


def probe_runtime_readiness(db: Session, settings) -> RuntimeReadiness:
    database_reachable = _probe_database(db)
    current_revisions, expected_heads = _migration_revisions(db)
    migrations_current = bool(
        database_reachable
        and expected_heads
        and set(current_revisions) == set(expected_heads)
    )
    redis_configured = bool(settings.redis_url)
    redis_required = _redis_required(settings)
    redis_reachable = _probe_redis(settings) if redis_configured else False
    return RuntimeReadiness(
        database_reachable=database_reachable,
        migrations_current=migrations_current,
        migration_current_revisions=current_revisions,
        migration_expected_heads=expected_heads,
        redis_configured=redis_configured,
        redis_required=redis_required,
        redis_reachable=redis_reachable,
    )


def _probe_database(db: Session) -> bool:
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        return False
    return True


def _migration_revisions(db: Session) -> tuple[tuple[str, ...], tuple[str, ...]]:
    try:
        migration_context = MigrationContext.configure(db.connection())
        current_revisions = tuple(sorted(migration_context.get_current_heads()))
        api_root = Path(__file__).resolve().parents[2]
        config = Config(str(api_root / "alembic.ini"))
        config.set_main_option("script_location", str(api_root / "alembic"))
        expected_heads = tuple(sorted(ScriptDirectory.from_config(config).get_heads()))
    except Exception:
        return (), ()
    return current_revisions, expected_heads


def _redis_required(settings) -> bool:
    lock_provider = (
        settings.contribution_expense_evidence_retention_worker_lock_provider.strip().upper()
    )
    return settings.app_env.strip().lower() in {"production", "staging"} or lock_provider == "REDIS"


def _probe_redis(settings) -> bool:
    timeout_seconds = max(0.1, settings.infrastructure_probe_timeout_seconds)
    client = None
    try:
        client = Redis.from_url(
            settings.redis_url,
            socket_connect_timeout=timeout_seconds,
            socket_timeout=timeout_seconds,
        )
        return bool(client.ping())
    except (OSError, RedisError, ValueError):
        return False
    finally:
        if client is not None:
            client.close()
