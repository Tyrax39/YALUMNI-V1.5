from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "local"
    app_name: str = "YALI Alumni Platform"
    api_base_url: str = "http://localhost:8002"
    web_base_url: str = "http://localhost:3010"
    admin_console_base_url: str = "http://localhost:3011"
    super_admin_console_base_url: str = "http://localhost:3012"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/yali_alumni"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret_key: str = "change-me"
    jwt_access_token_minutes: int = 15
    jwt_refresh_token_days: int = 30
    email_verification_token_hours: int = 24
    password_reset_token_minutes: int = 30
    email_provider: str = "console"
    email_from_address: str = "no-reply@yalumni.org"
    email_from_name: str = "YALUMNI"
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_use_tls: bool = True
    login_rate_limit_attempts: int = 5
    login_rate_limit_window_seconds: int = 300
    password_reset_rate_limit_attempts: int = 5
    password_reset_rate_limit_window_seconds: int = 900
    admin_action_rate_limit_attempts: int = 10
    admin_action_rate_limit_window_seconds: int = 300
    admin_two_factor_required: bool = False
    password_hash_scheme: str = "argon2id"
    platform_owner_email: str = "t.shiva@yalumni.org"
    platform_owner_aliases: str = "tshiva@yalumni.org"
    platform_owner_display_name: str = "Patient0"
    platform_owner_password: str | None = None
    seed_test_accounts: bool = False
    test_accounts_password: str = "YalumniTest@12345!"
    upload_storage_provider: str = "LOCAL"
    upload_storage_prefix: str = "yalumni"
    verification_upload_dir: str = ".local/uploads/verification"
    verification_upload_max_bytes: int = 5 * 1024 * 1024
    verification_upload_allowed_types: str = "application/pdf,image/jpeg,image/png,image/webp"
    profile_photo_upload_dir: str = ".local/uploads/profile-photos"
    profile_photo_upload_max_bytes: int = 2 * 1024 * 1024
    profile_photo_upload_allowed_types: str = "image/jpeg,image/png,image/webp"
    community_post_media_upload_dir: str = ".local/uploads/community-post-media"
    community_post_media_upload_max_bytes: int = 8 * 1024 * 1024
    community_post_media_allowed_types: str = "image/jpeg,image/png,image/webp,application/pdf"
    notification_stream_poll_seconds: int = 8
    notification_digest_worker_interval_seconds: int = 3600
    notification_digest_worker_frequencies: str = "DAILY,WEEKLY"
    notification_digest_worker_limit: int = 100
    notification_digest_worker_max_items_per_email: int = 10
    notification_digest_worker_include_read: bool = False
    s3_endpoint_url: str | None = None
    s3_access_key_id: str | None = None
    s3_secret_access_key: str | None = None
    s3_bucket_name: str | None = None
    s3_region: str | None = None
    cors_origins: str = (
        "http://localhost:3000,http://127.0.0.1:3000,"
        "http://localhost:3010,http://127.0.0.1:3010,"
        "http://localhost:3011,http://127.0.0.1:3011,"
        "http://localhost:3012,http://127.0.0.1:3012"
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
