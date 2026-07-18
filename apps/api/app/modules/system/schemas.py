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


class RuntimeDiagnostics(BaseModel):
    api_base_url: str
    web_base_url: str
    admin_console_base_url: str
    super_admin_console_base_url: str
    cors_origin_count: int
    redis_configured: bool
    sentry_configured: bool
    upload_storage_provider: str
    email_provider: str
    email_ready: bool


class AuthDiagnostics(BaseModel):
    platform_owner_email: str
    platform_owner_alias_count: int
    platform_owner_password_configured: bool
    admin_two_factor_required: bool
    seed_test_accounts_enabled: bool
    test_accounts_password_configured: bool


class RateLimitDiagnostics(BaseModel):
    login_attempts: int
    login_window_seconds: int
    password_reset_attempts: int
    password_reset_window_seconds: int
    admin_action_attempts: int
    admin_action_window_seconds: int


class StorageDiagnostics(BaseModel):
    provider: str
    s3_bucket_configured: bool
    malware_scanner_provider: str
    malware_scanner_ready: bool
    retention_days: int
    verification_upload_max_bytes: int
    profile_photo_upload_max_bytes: int
    contribution_expense_evidence_upload_max_bytes: int


class WorkerDiagnostics(BaseModel):
    mwf_sync_interval_seconds: int
    notification_digest_interval_seconds: int
    expense_retention_interval_seconds: int
    expense_retention_limit: int
    expense_retention_lock_provider: str


class StripeDiagnostics(BaseModel):
    secret_key_configured: bool
    webhook_secret_configured: bool
    success_url_configured: bool
    cancel_url_configured: bool
    checkout_ready: bool
    webhook_url: str


class FlutterwaveDiagnostics(BaseModel):
    secret_key_configured: bool
    webhook_secret_configured: bool
    redirect_url_configured: bool
    checkout_ready: bool
    webhook_url: str


class PaymentDiagnostics(BaseModel):
    checkout_provider: str
    refund_provider: str
    provider_request_timeout_seconds: float
    webhook_base_url: str
    stripe: StripeDiagnostics
    flutterwave: FlutterwaveDiagnostics


class SystemDiagnosticsResponse(BaseModel):
    status: str
    service: str
    environment: str
    release: ReleaseDiagnostics
    runtime: RuntimeDiagnostics
    auth: AuthDiagnostics
    rate_limits: RateLimitDiagnostics
    storage: StorageDiagnostics
    workers: WorkerDiagnostics
    payments: PaymentDiagnostics
