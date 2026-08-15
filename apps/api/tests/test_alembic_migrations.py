from pathlib import Path

from alembic.config import Config
from alembic.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import create_engine, text

from alembic import command
from app.core.config import get_settings


def test_sqlite_migrations_upgrade_to_head(tmp_path, monkeypatch) -> None:
    database_path = tmp_path / "migrations.sqlite3"
    database_url = f"sqlite+pysqlite:///{database_path.as_posix()}"
    api_root = Path(__file__).resolve().parents[1]
    config = Config(str(api_root / "alembic.ini"))
    config.set_main_option("script_location", str(api_root / "alembic"))
    monkeypatch.setenv("DATABASE_URL", database_url)
    get_settings.cache_clear()

    try:
        command.upgrade(config, "head")
        engine = create_engine(database_url)
        with engine.connect() as connection:
            current_heads = tuple(
                sorted(MigrationContext.configure(connection).get_current_heads())
            )
        assert current_heads == tuple(sorted(ScriptDirectory.from_config(config).get_heads()))
    finally:
        get_settings.cache_clear()


def test_sqlite_migrations_complete_a_partially_shaped_0034_table(tmp_path, monkeypatch) -> None:
    database_path = tmp_path / "legacy-migrations.sqlite3"
    database_url = f"sqlite+pysqlite:///{database_path.as_posix()}"
    api_root = Path(__file__).resolve().parents[1]
    config = Config(str(api_root / "alembic.ini"))
    config.set_main_option("script_location", str(api_root / "alembic"))
    monkeypatch.setenv("DATABASE_URL", database_url)
    get_settings.cache_clear()

    try:
        command.upgrade(config, "20260517_0033")
        engine = create_engine(database_url)
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE contribution_ledger_entries "
                    "ADD COLUMN expense_report_id CHAR(32)"
                )
            )
            connection.execute(
                text("ALTER TABLE users ADD COLUMN two_factor_recovery_codes JSON")
            )

        command.upgrade(config, "head")
        with engine.connect() as connection:
            current_heads = tuple(
                sorted(MigrationContext.configure(connection).get_current_heads())
            )
        assert current_heads == tuple(sorted(ScriptDirectory.from_config(config).get_heads()))
    finally:
        get_settings.cache_clear()
