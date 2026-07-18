from pydantic import BaseModel


class SystemStatusResponse(BaseModel):
    status: str
    service: str
    environment: str


class ReleaseDiagnostics(BaseModel):
    commit_sha: str | None
    release_version: str | None
    deployed_at: str | None
    deployment_target: str | None
    source_control_ref: str | None
    instance_id_present: bool
    metadata_complete: bool
    source_control_reported: bool
    azure_app_service_target: bool


class RuntimeDiagnostics(BaseModel):
    api_base_url: str
    web_base_url: str
    admin_console_base_url: str
    super_admin_console_base_url: str
    cors_origin_count: int
    trusted_origin_count: int
    redis_configured: bool
    sentry_configured: bool
    upload_storage_provider: str
    email_provider: str
    email_ready: bool
    email_from_address_configured: bool
    smtp_host_configured: bool
    smtp_user_configured: bool
    smtp_password_configured: bool
    smtp_use_tls: bool
    csrf_same_origin_enforced: bool


class AuthDiagnostics(BaseModel):
    platform_owner_email: str
    platform_owner_alias_count: int
    platform_owner_password_configured: bool
    admin_two_factor_required: bool
    seed_test_accounts_enabled: bool
    test_accounts_password_configured: bool
    two_factor_recovery_supported: bool
    two_factor_recovery_code_count: int
    two_factor_totp_digits: int
    two_factor_totp_period_seconds: int


class SessionDiagnostics(BaseModel):
    access_token_minutes: int
    refresh_token_days: int
    refresh_cookie_days: int
    cookie_same_site: str
    cookie_secure: bool
    trusted_member_origin_configured: bool
    trusted_admin_origin_configured: bool
    trusted_super_admin_origin_configured: bool
    refresh_rotation_enabled: bool


class RateLimitDiagnostics(BaseModel):
    login_attempts: int
    login_window_seconds: int
    password_reset_attempts: int
    password_reset_window_seconds: int
    admin_action_attempts: int
    admin_action_window_seconds: int


class StorageDiagnostics(BaseModel):
    provider: str
    uses_local_disk: bool
    local_upload_paths_configured: bool
    storage_target_ready: bool
    s3_bucket_configured: bool
    s3_endpoint_configured: bool
    s3_region_configured: bool
    s3_access_key_configured: bool
    s3_secret_key_configured: bool
    s3_credentials_ready: bool
    malware_scanner_provider: str
    malware_scanner_ready: bool
    malware_scanner_url_configured: bool
    malware_scanner_timeout_seconds: float
    retention_days: int
    verification_upload_max_bytes: int
    profile_photo_upload_max_bytes: int
    community_post_media_upload_max_bytes: int
    contribution_expense_evidence_upload_max_bytes: int


class WorkerDiagnostics(BaseModel):
    mwf_sync_interval_seconds: int
    mwf_cache_ttl_hours: int
    mwf_user_agent_configured: bool
    notification_digest_interval_seconds: int
    notification_digest_limit: int
    notification_digest_max_items_per_email: int
    notification_digest_include_read: bool
    expense_retention_interval_seconds: int
    expense_retention_limit: int
    expense_retention_lock_provider: str
    expense_retention_lock_ready: bool
    expense_retention_lock_ttl_seconds: int
    worker_pipeline_ready: bool


class StripeDiagnostics(BaseModel):
    secret_key_configured: bool
    webhook_secret_configured: bool
    success_url_configured: bool
    cancel_url_configured: bool
    checkout_ready: bool
    refund_ready: bool
    return_urls_ready: bool
    webhook_url: str


class FlutterwaveDiagnostics(BaseModel):
    secret_key_configured: bool
    webhook_secret_configured: bool
    redirect_url_configured: bool
    checkout_ready: bool
    refund_ready: bool
    return_url_ready: bool
    webhook_url: str


class PaymentDiagnostics(BaseModel):
    checkout_provider: str
    refund_provider: str
    provider_mode: str
    provider_request_timeout_seconds: float
    webhook_base_url: str
    webhook_signing_ready: bool
    checkout_return_url_ready: bool
    refund_provider_ready: bool
    staging_candidate_ready: bool
    stripe: StripeDiagnostics
    flutterwave: FlutterwaveDiagnostics


class SystemDiagnosticsResponse(BaseModel):
    status: str
    service: str
    environment: str
    release: ReleaseDiagnostics
    runtime: RuntimeDiagnostics
    auth: AuthDiagnostics
    session: SessionDiagnostics
    rate_limits: RateLimitDiagnostics
    storage: StorageDiagnostics
    workers: WorkerDiagnostics
    payments: PaymentDiagnostics
