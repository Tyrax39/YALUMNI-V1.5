from app.core.config import get_settings
from app.core.database import SessionLocal
from app.modules.auth.platform_owner import ensure_platform_owner


def main() -> None:
    settings = get_settings()
    if not settings.platform_owner_password:
        raise SystemExit("Set PLATFORM_OWNER_PASSWORD before running this seed.")

    db = SessionLocal()
    try:
        user = ensure_platform_owner(db, settings.platform_owner_password)
    finally:
        db.close()

    print(f"Platform owner ensured: {user.email}")


if __name__ == "__main__":
    main()
