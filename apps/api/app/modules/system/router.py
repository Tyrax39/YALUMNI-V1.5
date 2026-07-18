import os
from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.config import get_settings
from app.core.permissions import GlobalRole
from app.modules.auth.dependencies import require_roles
from app.modules.system.schemas import (
    AuthDiagnostics,
    FlutterwaveDiagnostics,
    PaymentDiagnostics,
    RateLimitDiagnostics,
    ReleaseDiagnostics,
    RuntimeDiagnostics,
    StorageDiagnostics,
    StripeDiagnostics,
    SystemDiagnosticsResponse,
    SystemStatusResponse,
    WorkerDiagnostics,
)

router = APIRouter()
super_admin_dependency = require_roles(GlobalRole.SUPER_ADMIN.value)


def _configured_env_value(*names: str) -> str | None:
    for name in names:
        value = os.getenv(name)
        if value and value.strip():
            return value.strip()
    return None


def _email_ready(settings) -> bool:
    if settings.email_provider.strip().lower() == "console":
        return True
    return bool(settings.smtp_host and settings.smtp_user and settings.smtp_password)


def _malware_scanner_ready(settings) -> bool:
    provider = settings.contribution_expense_evidence_malware_scanner_provider.strip().upper()
    if provider == "SIGNATURE_ONLY":
        return True
    return bool(settings.contribution_expense_evidence_malware_scanner_url)


@router.get("/status", response_model=SystemStatusResponse)
def system_status() -> SystemStatusResponse:
    settings = get_settings()
    return SystemStatusResponse(
        status="ok",
        service=settings.app_name,
        environment=settings.app_env,
    )


@router.get("/diagnostics", response_model=SystemDiagnosticsResponse)
def system_diagnostics(
    current_user: Annotated[object, Depends(super_admin_dependency)],
) -> SystemDiagnosticsResponse:
    _ = current_user
    settings = get_settings()
    webhook_base_url = f"{settings.api_base_url.rstrip('/')}/api/v1/contributions/webhooks"

    stripe = StripeDiagnostics(
        secret_key_configured=bool(settings.stripe_secret_key),
        webhook_secret_configured=bool(settings.stripe_webhook_secret),
        success_url_configured=bool(settings.stripe_checkout_success_url),
        cancel_url_configured=bool(settings.stripe_checkout_cancel_url),
        checkout_ready=bool(
            settings.stripe_secret_key
            and settings.stripe_webhook_secret
            and settings.stripe_checkout_success_url
            and settings.stripe_checkout_cancel_url
        ),
        webhook_url=f"{webhook_base_url}/stripe",
    )
    flutterwave = FlutterwaveDiagnostics(
        secret_key_configured=bool(settings.flutterwave_secret_key),
        webhook_secret_configured=bool(settings.flutterwave_webhook_secret_hash),
        redirect_url_configured=bool(settings.flutterwave_checkout_redirect_url),
        checkout_ready=bool(
            settings.flutterwave_secret_key
            and settings.flutterwave_webhook_secret_hash
            and settings.flutterwave_checkout_redirect_url
        ),
        webhook_url=f"{webhook_base_url}/flutterwave",
    )

    return SystemDiagnosticsResponse(
        status="ok",
        service=settings.app_name,
        environment=settings.app_env,
        release=ReleaseDiagnostics(
            commit_sha=_configured_env_value("YALUMNI_RELEASE_SHA", "SOURCE_VERSION"),
            release_version=_configured_env_value("YALUMNI_RELEASE_VERSION"),
            deployed_at=_configured_env_value("YALUMNI_DEPLOYED_AT"),
            deployment_target=_configured_env_value("WEBSITE_SITE_NAME"),
            source_control_ref=_configured_env_value(
                "YALUMNI_SOURCE_CONTROL_REF",
                "WEBSITE_BRANCH",
            ),
            instance_id_present=bool(_configured_env_value("WEBSITE_INSTANCE_ID")),
        ),
        runtime=RuntimeDiagnostics(
            api_base_url=settings.api_base_url,
            web_base_url=settings.web_base_url,
            admin_console_base_url=settings.admin_console_base_url,
            super_admin_console_base_url=settings.super_admin_console_base_url,
            cors_origin_count=len(settings.cors_origin_list),
            redis_configured=bool(settings.redis_url),
            sentry_configured=bool(settings.sentry_dsn),
            upload_storage_provider=settings.upload_storage_provider,
            email_provider=settings.email_provider,
            email_ready=_email_ready(settings),
        ),
        auth=AuthDiagnostics(
            platform_owner_email=settings.platform_owner_email,
            platform_owner_alias_count=len(
                [alias for alias in settings.platform_owner_aliases.split(",") if alias.strip()]
            ),
            platform_owner_password_configured=bool(settings.platform_owner_password),
            admin_two_factor_required=settings.admin_two_factor_required,
            seed_test_accounts_enabled=settings.seed_test_accounts,
            test_accounts_password_configured=bool(settings.test_accounts_password),
        ),
        rate_limits=RateLimitDiagnostics(
            login_attempts=settings.login_rate_limit_attempts,
            login_window_seconds=settings.login_rate_limit_window_seconds,
            password_reset_attempts=settings.password_reset_rate_limit_attempts,
            password_reset_window_seconds=settings.password_reset_rate_limit_window_seconds,
            admin_action_attempts=settings.admin_action_rate_limit_attempts,
            admin_action_window_seconds=settings.admin_action_rate_limit_window_seconds,
        ),
        storage=StorageDiagnostics(
            provider=settings.upload_storage_provider,
            s3_bucket_configured=bool(settings.s3_bucket_name),
            malware_scanner_provider=(
                settings.contribution_expense_evidence_malware_scanner_provider.strip().upper()
            ),
            malware_scanner_ready=_malware_scanner_ready(settings),
            retention_days=settings.contribution_expense_evidence_retention_days,
            verification_upload_max_bytes=settings.verification_upload_max_bytes,
            profile_photo_upload_max_bytes=settings.profile_photo_upload_max_bytes,
            contribution_expense_evidence_upload_max_bytes=(
                settings.contribution_expense_evidence_upload_max_bytes
            ),
        ),
        workers=WorkerDiagnostics(
            mwf_sync_interval_seconds=settings.mwf_directory_sync_worker_interval_seconds,
            notification_digest_interval_seconds=settings.notification_digest_worker_interval_seconds,
            expense_retention_interval_seconds=(
                settings.contribution_expense_evidence_retention_worker_interval_seconds
            ),
            expense_retention_limit=settings.contribution_expense_evidence_retention_worker_limit,
            expense_retention_lock_provider=(
                settings.contribution_expense_evidence_retention_worker_lock_provider.strip().upper()
            ),
        ),
        payments=PaymentDiagnostics(
            checkout_provider=settings.contribution_checkout_provider.strip().upper(),
            refund_provider=settings.contribution_refund_provider.strip().upper(),
            provider_request_timeout_seconds=settings.contribution_provider_request_timeout_seconds,
            webhook_base_url=webhook_base_url,
            stripe=stripe,
            flutterwave=flutterwave,
        ),
    )

