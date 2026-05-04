from app.core.config import get_settings
from app.core.database import SessionLocal
from app.modules.auth.test_accounts import (
    TEST_ACCOUNT_SEEDS,
    ensure_test_accounts,
    test_accounts_allowed,
)


def main() -> None:
    settings = get_settings()
    if not test_accounts_allowed(settings.app_env):
        raise SystemExit("Test account seeding is only allowed in local/test environments.")

    db = SessionLocal()
    try:
        ensure_test_accounts(db, settings.test_accounts_password)
        print("Test accounts ensured:")
        for seed in TEST_ACCOUNT_SEEDS:
            print(f"- {seed.email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
