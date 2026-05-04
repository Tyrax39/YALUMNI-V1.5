from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "local"
    app_name: str = "YALI Alumni Platform"
    api_base_url: str = "http://localhost:8000"
    web_base_url: str = "http://localhost:3000"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/yali_alumni"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret_key: str = "change-me"
    jwt_access_token_minutes: int = 15
    jwt_refresh_token_days: int = 30
    email_verification_token_hours: int = 24
    password_reset_token_minutes: int = 30
    login_rate_limit_attempts: int = 5
    login_rate_limit_window_seconds: int = 300
    password_reset_rate_limit_attempts: int = 5
    password_reset_rate_limit_window_seconds: int = 900
    admin_action_rate_limit_attempts: int = 10
    admin_action_rate_limit_window_seconds: int = 300
    password_hash_scheme: str = "argon2id"
    platform_owner_email: str = "t.shiva@yalumni.org"
    platform_owner_aliases: str = "tshiva@yalumni.org"
    platform_owner_display_name: str = "Patient0"
    platform_owner_password: str | None = None
    seed_test_accounts: bool = False
    test_accounts_password: str = "YalumniTest@12345!"
    verification_upload_dir: str = ".local/uploads/verification"
    verification_upload_max_bytes: int = 5 * 1024 * 1024
    verification_upload_allowed_types: str = "application/pdf,image/jpeg,image/png,image/webp"
    profile_photo_upload_dir: str = ".local/uploads/profile-photos"
    profile_photo_upload_max_bytes: int = 2 * 1024 * 1024
    profile_photo_upload_allowed_types: str = "image/jpeg,image/png,image/webp"
    cors_origins: str = (
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3010,http://127.0.0.1:3010"
    )
    sentry_dsn: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
