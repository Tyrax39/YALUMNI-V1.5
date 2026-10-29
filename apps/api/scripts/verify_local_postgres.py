from dataclasses import dataclass

from sqlalchemy.engine import URL, make_url

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.core.readiness import RuntimeReadiness, probe_runtime_readiness

LOCAL_POSTGRES_HOSTS = {"127.0.0.1", "localhost", "::1"}


@dataclass(frozen=True)
class LocalPostgresVerification:
    connection_url: URL
    readiness: RuntimeReadiness


def verify_local_postgres(settings, session_factory=SessionLocal) -> LocalPostgresVerification:
    connection_url = make_url(settings.database_url)
    if not connection_url.drivername.startswith("postgresql"):
        raise ValueError(
            "DATABASE_URL must use PostgreSQL for local persistent runtime verification."
        )
    if connection_url.host not in LOCAL_POSTGRES_HOSTS:
        raise ValueError(
            "DATABASE_URL must target a loopback PostgreSQL host for this local check."
        )

    db = session_factory()
    try:
        readiness = probe_runtime_readiness(db, settings)
    finally:
        db.close()

    if not readiness.ready:
        raise RuntimeError(
            "Local PostgreSQL runtime is not ready: "
            f"database_reachable={readiness.database_reachable}; "
            f"migrations_current={readiness.migrations_current}; "
            f"redis_required={readiness.redis_required}; "
            f"redis_reachable={readiness.redis_reachable}."
        )

    return LocalPostgresVerification(
        connection_url=connection_url,
        readiness=readiness,
    )


def main() -> None:
    verification = verify_local_postgres(get_settings())
    database_name = verification.connection_url.database or "unnamed"
    print(
        "Local PostgreSQL verification passed: "
        f"{verification.connection_url.host}/{database_name}; "
        "database reachable and Alembic head current."
    )


if __name__ == "__main__":
    main()
