import os
from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.config import get_settings
from app.core.permissions import GlobalRole
from app.core.totp import RECOVERY_CODE_COUNT, TOTP_DIGITS, TOTP_PERIOD_SECONDS
from app.modules.auth.dependencies import require_roles
from app.modules.system.schemas import (
    AuthDiagnostics,
    FlutterwaveDiagnostics,
    PaymentDiagnostics,
    RateLimitDiagnostics,
    ReleaseDiagnostics,
    RuntimeDiagnostics,
    SessionDiagnostics,
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


def _expense_retention_lock_ready(settings) -> bool:
    provider = settings.contribution_expense_evidence_retention_worker_lock_provider.strip().upper()
    if provider == "NONE":
        return True
    if provider == "REDIS":
        return bool(settings.redis_url)
    return False


def _local_upload_paths_configured(settings) -> bool:
    return bool(
        settings.verification_upload_dir
        and settings.profile_photo_upload_dir
        and settings.community_post_media_upload_dir
        and settings.contribution_expense_evidence_upload_dir
    )


def _csv_count(value: str) -> int:
    return len([item for item in value.split(",") if item.strip()])


def _s3_credentials_ready(settings) -> bool:
    return bool(
        settings.s3_access_key_id
        and settings.s3_secret_access_key
        and settings.s3_bucket_name
        and settings.s3_region
    )


def _storage_target_ready(settings) -> bool:
    provider = settings.upload_storage_provider.strip().upper()
    if provider == "LOCAL":
        return _local_upload_paths_configured(settings)
    if provider == "S3":
        return _s3_credentials_ready(settings)
    return False


def _malware_scanner_transport_ready(settings) -> bool:
    provider = settings.contribution_expense_evidence_malware_scanner_provider.strip().upper()
    if provider == "SIGNATURE_ONLY":
        return True
    return bool(
        settings.contribution_expense_evidence_malware_scanner_url
        and settings.contribution_expense_evidence_malware_scanner_timeout_seconds > 0
    )


def _mwf_source_configured(url: str) -> bool:
    normalized = url.strip().lower()
    return normalized.startswith("https://") and "mandelawashingtonfellowship.org" in normalized


def _worker_pipeline_ready(settings) -> bool:
    return bool(
        settings.mwf_directory_cache_ttl_hours > 0
        and settings.mwf_directory_sync_worker_interval_seconds > 0
        and settings.mwf_directory_user_agent.strip()
        and settings.notification_digest_worker_interval_seconds > 0
        and settings.notification_digest_worker_limit > 0
        and settings.notification_digest_worker_max_items_per_email > 0
        and settings.contribution_expense_evidence_retention_worker_interval_seconds > 0
        and settings.contribution_expense_evidence_retention_worker_limit > 0
        and settings.contribution_expense_evidence_retention_worker_lock_ttl_seconds > 0
        and _expense_retention_lock_ready(settings)
    )


def _resolve_cookie_same_site(settings) -> str:
    configured_value = settings.yalumni_cookie_same_site.strip().lower()
    if configured_value in {"strict", "none"}:
        return configured_value
    return "lax"


def _resolve_cookie_secure(settings, same_site: str) -> bool:
    configured_value = (settings.yalumni_cookie_secure or "").strip().lower()
    if configured_value == "true":
        return True
    if configured_value == "false":
        return same_site == "none"
    return settings.app_env.lower() in {"production", "staging"} or same_site == "none"


def _origin_configured(origin_value: str, trusted_origins: set[str]) -> bool:
    return origin_value.rstrip("/") in trusted_origins


def _release_metadata_complete(
    commit_sha: str | None,
    release_version: str | None,
    deployed_at: str | None,
    deployment_target: str | None,
    source_control_ref: str | None,
) -> bool:
    return bool(
        commit_sha
        and release_version
        and deployed_at
        and deployment_target
        and source_control_ref
    )


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
    cookie_same_site = _resolve_cookie_same_site(settings)
    cookie_secure = _resolve_cookie_secure(settings, cookie_same_site)
    trusted_origins = {origin.rstrip("/") for origin in settings.trusted_origin_list}
    commit_sha = _configured_env_value("YALUMNI_RELEASE_SHA", "SOURCE_VERSION")
    release_version = _configured_env_value("YALUMNI_RELEASE_VERSION")
    deployed_at = _configured_env_value("YALUMNI_DEPLOYED_AT")
    deployment_target = _configured_env_value("WEBSITE_SITE_NAME")
    source_control_ref = _configured_env_value(
        "YALUMNI_SOURCE_CONTROL_REF",
        "WEBSITE_BRANCH",
    )
    metadata_complete = _release_metadata_complete(
        commit_sha,
        release_version,
        deployed_at,
        deployment_target,
        source_control_ref,
    )
    azure_app_service_target = bool(deployment_target and deployment_target.strip())

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
        refund_ready=bool(settings.stripe_secret_key),
        return_urls_ready=bool(
            settings.stripe_checkout_success_url and settings.stripe_checkout_cancel_url
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
        refund_ready=bool(settings.flutterwave_secret_key),
        return_url_ready=bool(settings.flutterwave_checkout_redirect_url),
        webhook_url=f"{webhook_base_url}/flutterwave",
    )
    webhook_signing_ready = (
        stripe.webhook_secret_configured
        if settings.contribution_checkout_provider.strip().upper() == "STRIPE"
        else flutterwave.webhook_secret_configured
        if settings.contribution_checkout_provider.strip().upper() == "FLUTTERWAVE"
        else bool(settings.contribution_webhook_secret)
    )
    checkout_return_url_ready = (
        stripe.return_urls_ready
        if settings.contribution_checkout_provider.strip().upper() == "STRIPE"
        else flutterwave.return_url_ready
        if settings.contribution_checkout_provider.strip().upper() == "FLUTTERWAVE"
        else True
    )
    refund_provider_ready = (
        stripe.refund_ready
        if settings.contribution_refund_provider.strip().upper() == "STRIPE"
        else flutterwave.refund_ready
        if settings.contribution_refund_provider.strip().upper() == "FLUTTERWAVE"
        else True
    )
    provider_mode = (
        "LOCAL_TEST"
        if settings.contribution_checkout_provider.strip().upper() == "LOCAL_TEST"
        else "PROVIDER_BACKED"
    )

    return SystemDiagnosticsResponse(
        status="ok",
        service=settings.app_name,
        environment=settings.app_env,
        release=ReleaseDiagnostics(
            commit_sha=commit_sha,
            release_version=release_version,
            deployed_at=deployed_at,
            deployment_target=deployment_target,
            source_control_ref=source_control_ref,
            instance_id_present=bool(_configured_env_value("WEBSITE_INSTANCE_ID")),
            metadata_complete=metadata_complete,
            source_control_reported=bool(source_control_ref),
            azure_app_service_target=azure_app_service_target,
        ),
        runtime=RuntimeDiagnostics(
            api_base_url=settings.api_base_url,
            web_base_url=settings.web_base_url,
            admin_console_base_url=settings.admin_console_base_url,
            super_admin_console_base_url=settings.super_admin_console_base_url,
            cors_origin_count=len(settings.cors_origin_list),
            trusted_origin_count=len(trusted_origins),
            redis_configured=bool(settings.redis_url),
            sentry_configured=bool(settings.sentry_dsn),
            upload_storage_provider=settings.upload_storage_provider,
            email_provider=settings.email_provider,
            email_ready=_email_ready(settings),
            email_from_address_configured=bool(settings.email_from_address.strip()),
            smtp_host_configured=bool(settings.smtp_host),
            smtp_user_configured=bool(settings.smtp_user),
            smtp_password_configured=bool(settings.smtp_password),
            smtp_use_tls=settings.smtp_use_tls,
            csrf_same_origin_enforced=True,
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
            two_factor_recovery_supported=True,
            two_factor_recovery_code_count=RECOVERY_CODE_COUNT,
            two_factor_totp_digits=TOTP_DIGITS,
            two_factor_totp_period_seconds=TOTP_PERIOD_SECONDS,
        ),
        session=SessionDiagnostics(
            access_token_minutes=settings.jwt_access_token_minutes,
            refresh_token_days=settings.jwt_refresh_token_days,
            refresh_cookie_days=settings.yalumni_refresh_cookie_days,
            cookie_same_site=cookie_same_site,
            cookie_secure=cookie_secure,
            trusted_member_origin_configured=_origin_configured(
                settings.web_base_url,
                trusted_origins,
            ),
            trusted_admin_origin_configured=_origin_configured(
                settings.admin_console_base_url,
                trusted_origins,
            ),
            trusted_super_admin_origin_configured=_origin_configured(
                settings.super_admin_console_base_url,
                trusted_origins,
            ),
            refresh_rotation_enabled=True,
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
            uses_local_disk=settings.upload_storage_provider.strip().upper() == "LOCAL",
            local_upload_paths_configured=_local_upload_paths_configured(settings),
            storage_target_ready=_storage_target_ready(settings),
            s3_bucket_configured=bool(settings.s3_bucket_name),
            s3_endpoint_configured=bool(settings.s3_endpoint_url),
            s3_region_configured=bool(settings.s3_region),
            s3_access_key_configured=bool(settings.s3_access_key_id),
            s3_secret_key_configured=bool(settings.s3_secret_access_key),
            s3_credentials_ready=_s3_credentials_ready(settings),
            malware_scanner_provider=(
                settings.contribution_expense_evidence_malware_scanner_provider.strip().upper()
            ),
            malware_scanner_ready=_malware_scanner_ready(settings),
            malware_scanner_transport_ready=_malware_scanner_transport_ready(settings),
            malware_scanner_url_configured=bool(
                settings.contribution_expense_evidence_malware_scanner_url
            ),
            malware_scanner_timeout_seconds=(
                settings.contribution_expense_evidence_malware_scanner_timeout_seconds
            ),
            retention_days=settings.contribution_expense_evidence_retention_days,
            verification_upload_max_bytes=settings.verification_upload_max_bytes,
            verification_upload_allowed_type_count=_csv_count(
                settings.verification_upload_allowed_types
            ),
            profile_photo_upload_max_bytes=settings.profile_photo_upload_max_bytes,
            profile_photo_upload_allowed_type_count=_csv_count(
                settings.profile_photo_upload_allowed_types
            ),
            community_post_media_upload_max_bytes=settings.community_post_media_upload_max_bytes,
            community_post_media_allowed_type_count=_csv_count(
                settings.community_post_media_allowed_types
            ),
            contribution_expense_evidence_upload_max_bytes=(
                settings.contribution_expense_evidence_upload_max_bytes
            ),
            contribution_expense_evidence_allowed_type_count=_csv_count(
                settings.contribution_expense_evidence_allowed_types
            ),
            contribution_expense_evidence_blocked_signature_count=_csv_count(
                settings.contribution_expense_evidence_blocked_signatures
            ),
        ),
        workers=WorkerDiagnostics(
            mwf_sync_interval_seconds=settings.mwf_directory_sync_worker_interval_seconds,
            mwf_cache_ttl_hours=settings.mwf_directory_cache_ttl_hours,
            mwf_user_agent_configured=bool(settings.mwf_directory_user_agent.strip()),
            mwf_fellows_source_configured=_mwf_source_configured(
                settings.mwf_directory_fellows_url
            ),
            mwf_filters_source_configured=_mwf_source_configured(
                settings.mwf_directory_filters_url
            ),
            notification_digest_interval_seconds=settings.notification_digest_worker_interval_seconds,
            notification_digest_frequency_count=_csv_count(
                settings.notification_digest_worker_frequencies
            ),
            notification_digest_frequencies_configured=bool(
                settings.notification_digest_worker_frequencies.strip()
            ),
            notification_digest_limit=settings.notification_digest_worker_limit,
            notification_digest_max_items_per_email=(
                settings.notification_digest_worker_max_items_per_email
            ),
            notification_digest_include_read=settings.notification_digest_worker_include_read,
            expense_retention_interval_seconds=(
                settings.contribution_expense_evidence_retention_worker_interval_seconds
            ),
            expense_retention_limit=settings.contribution_expense_evidence_retention_worker_limit,
            expense_retention_lock_provider=(
                settings.contribution_expense_evidence_retention_worker_lock_provider.strip().upper()
            ),
            expense_retention_lock_ready=_expense_retention_lock_ready(settings),
            expense_retention_lock_ttl_seconds=(
                settings.contribution_expense_evidence_retention_worker_lock_ttl_seconds
            ),
            expense_category_taxonomy_configured=bool(
                settings.contribution_expense_category_taxonomy.strip()
            ),
            expense_category_budget_policy_configured=bool(
                settings.contribution_expense_category_budget_policy.strip()
            ),
            expense_category_enforcement_mode=(
                settings.contribution_expense_category_enforcement_mode.strip().upper()
            ),
            expense_category_default_currency=(
                settings.contribution_expense_category_policy_default_currency.strip().upper()
            ),
            worker_pipeline_ready=_worker_pipeline_ready(settings),
        ),
        payments=PaymentDiagnostics(
            checkout_provider=settings.contribution_checkout_provider.strip().upper(),
            refund_provider=settings.contribution_refund_provider.strip().upper(),
            provider_mode=provider_mode,
            provider_request_timeout_seconds=settings.contribution_provider_request_timeout_seconds,
            webhook_base_url=webhook_base_url,
            webhook_signing_ready=webhook_signing_ready,
            checkout_return_url_ready=checkout_return_url_ready,
            refund_provider_ready=refund_provider_ready,
            staging_candidate_ready=bool(
                provider_mode == "PROVIDER_BACKED"
                and webhook_signing_ready
                and checkout_return_url_ready
                and refund_provider_ready
                and settings.contribution_provider_request_timeout_seconds > 0
                and metadata_complete
            ),
            stripe=stripe,
            flutterwave=flutterwave,
        ),
    )

