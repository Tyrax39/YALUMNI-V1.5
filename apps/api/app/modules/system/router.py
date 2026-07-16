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
    ReleaseDiagnostics,
    RuntimeDiagnostics,
    StripeDiagnostics,
    SystemDiagnosticsResponse,
    SystemStatusResponse,
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
            admin_two_factor_required=settings.admin_two_factor_required,
            seed_test_accounts_enabled=settings.seed_test_accounts,
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

