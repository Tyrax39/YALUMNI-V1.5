from collections.abc import Generator
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings
from app.core.database import Base, get_db_session
from app.core.email import clear_email_outbox
from app.core.rate_limit import clear_rate_limits
from app.core.readiness import RuntimeReadiness
from app.main import app
from app.modules.alumni.models import MwfAlumniSyncRun
from app.modules.auth import models as auth_models
from app.modules.auth.models import SecurityEvent

_ = auth_models


@pytest.fixture
def client() -> Generator[TestClient]:
    clear_rate_limits()
    clear_email_outbox()
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db_session() -> Generator[Session]:
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db_session] = override_get_db_session

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    clear_rate_limits()
    clear_email_outbox()


def register_user(client: TestClient, email: str = "system.owner@example.com") -> dict:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "display_name": "System Owner",
            "email": email,
            "password": "SecurePass123!",
        },
    )
    assert response.status_code == 201
    return response.json()


def auth_headers(access_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {access_token}"}


def test_system_status_remains_public_and_minimal(client: TestClient) -> None:
    response = client.get("/api/v1/system/status")

    assert response.status_code == 200
    assert response.json() == {
        "environment": "local",
        "service": "YALI Alumni Platform",
        "status": "ok",
    }


def test_system_readiness_returns_503_when_runtime_is_not_ready(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "app.modules.system.router.probe_runtime_readiness",
        lambda db, settings: RuntimeReadiness(
            database_reachable=True,
            migrations_current=False,
            migration_current_revisions=("old-revision",),
            migration_expected_heads=("current-head",),
            redis_configured=True,
            redis_required=True,
            redis_reachable=False,
        ),
    )

    response = client.get("/api/v1/system/readiness")

    assert response.status_code == 503
    assert response.json() == {
        "status": "not_ready",
        "service": "YALI Alumni Platform",
        "environment": "local",
        "database_reachable": True,
        "migrations_current": False,
        "migration_current_revisions": ["old-revision"],
        "migration_expected_heads": ["current-head"],
        "redis_required": True,
        "redis_reachable": False,
    }


def test_system_readiness_returns_200_when_runtime_is_ready(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "app.modules.system.router.probe_runtime_readiness",
        lambda db, settings: RuntimeReadiness(
            database_reachable=True,
            migrations_current=True,
            migration_current_revisions=("current-head",),
            migration_expected_heads=("current-head",),
            redis_configured=False,
            redis_required=False,
            redis_reachable=False,
        ),
    )

    response = client.get("/api/v1/system/readiness")

    assert response.status_code == 200
    assert response.json()["status"] == "ready"
    assert response.json()["migration_current_revisions"] == ["current-head"]
    assert response.json()["migration_expected_heads"] == ["current-head"]


def test_system_diagnostics_requires_super_admin(client: TestClient) -> None:
    registered = register_user(client, "system.member@example.com")

    response = client.get(
        "/api/v1/system/diagnostics",
        headers=auth_headers(registered["access_token"]),
    )

    assert response.status_code == 403


def test_storage_probe_requires_super_admin(client: TestClient) -> None:
    registered = register_user(client, "storage.member@example.com")

    response = client.post(
        "/api/v1/system/storage-probe",
        headers=auth_headers(registered["access_token"]),
    )

    assert response.status_code == 403


def test_system_diagnostics_reports_release_and_provider_readiness(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    registered = register_user(client)
    bootstrap_response = client.post(
        "/api/v1/auth/dev/bootstrap-admin",
        headers=auth_headers(registered["access_token"]),
    )
    assert bootstrap_response.status_code == 200

    monkeypatch.setenv("APP_ENV", "staging")
    monkeypatch.setenv("YALUMNI_RELEASE_SHA", "527fa4f")
    monkeypatch.setenv("YALUMNI_RELEASE_VERSION", "v1.5.0-staging")
    monkeypatch.setenv("YALUMNI_DEPLOYED_AT", "2026-07-16T10:00:00Z")
    monkeypatch.setenv("YALUMNI_SOURCE_CONTROL_REF", "refs/heads/Tyrax0/yalumni-v1.5-foundation")
    monkeypatch.setenv("WEBSITE_SITE_NAME", "yalumni-v15-api-954095")
    monkeypatch.setenv("WEBSITE_INSTANCE_ID", "instance-001")
    monkeypatch.setenv("CONTRIBUTION_CHECKOUT_PROVIDER", "stripe")
    monkeypatch.setenv("CONTRIBUTION_REFUND_PROVIDER", "flutterwave")
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_checkout")
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "whsec_test_signature")
    monkeypatch.setenv(
        "STRIPE_CHECKOUT_SUCCESS_URL",
        "https://member.example.com/contributions/success/{payment_intent_id}",
    )
    monkeypatch.setenv(
        "STRIPE_CHECKOUT_CANCEL_URL",
        "https://member.example.com/contributions/cancel/{payment_intent_id}",
    )
    monkeypatch.setenv("FLUTTERWAVE_SECRET_KEY", "flw_secret_checkout")
    monkeypatch.setenv("FLUTTERWAVE_WEBHOOK_SECRET_HASH", "flw_webhook_hash")
    monkeypatch.setenv(
        "FLUTTERWAVE_CHECKOUT_REDIRECT_URL",
        "https://member.example.com/contributions/flutterwave/{payment_intent_id}",
    )
    monkeypatch.setenv("WEB_BASE_URL", "https://member.example.com")
    monkeypatch.setenv("ADMIN_CONSOLE_BASE_URL", "https://admin.example.com")
    monkeypatch.setenv("SUPER_ADMIN_CONSOLE_BASE_URL", "https://superadmin.example.com")
    monkeypatch.setenv("UPLOAD_STORAGE_PROVIDER", "S3")
    monkeypatch.setenv("S3_ENDPOINT_URL", "https://s3.example.com")
    monkeypatch.setenv("S3_ACCESS_KEY_ID", "access-key")
    monkeypatch.setenv("S3_SECRET_ACCESS_KEY", "secret-key")
    monkeypatch.setenv("S3_REGION", "us-east-1")
    monkeypatch.setenv("S3_CONNECT_TIMEOUT_SECONDS", "2.5")
    monkeypatch.setenv("S3_READ_TIMEOUT_SECONDS", "8.5")
    monkeypatch.setenv("S3_MAX_ATTEMPTS", "4")
    monkeypatch.setenv("PLATFORM_OWNER_ALIASES", "tshiva@yalumni.org,patient0@yalumni.org")
    monkeypatch.setenv("PLATFORM_OWNER_PASSWORD", "Admin@123-Yalumni/*9")
    monkeypatch.setenv("SEED_TEST_ACCOUNTS", "true")
    monkeypatch.setenv("TEST_ACCOUNTS_PASSWORD", "YalumniTest@12345!")
    monkeypatch.setenv("EMAIL_PROVIDER", "SMTP")
    monkeypatch.setenv("EMAIL_FROM_ADDRESS", "noreply@yalumni.org")
    monkeypatch.setenv("SMTP_HOST", "smtp.example.com")
    monkeypatch.setenv("SMTP_USER", "smtp-user")
    monkeypatch.setenv("SMTP_PASSWORD", "smtp-password")
    monkeypatch.setenv("SMTP_USE_TLS", "true")
    monkeypatch.setenv("YALUMNI_COOKIE_SAME_SITE", "none")
    monkeypatch.setenv("YALUMNI_COOKIE_SECURE", "true")
    monkeypatch.setenv("YALUMNI_REFRESH_COOKIE_DAYS", "45")
    monkeypatch.setenv(
        "YALUMNI_TRUSTED_ORIGINS",
        "https://member.example.com,https://admin.example.com,https://superadmin.example.com",
    )
    monkeypatch.setenv("CONTRIBUTION_EXPENSE_EVIDENCE_MALWARE_SCANNER_PROVIDER", "HTTP")
    monkeypatch.setenv("CONTRIBUTION_EXPENSE_EVIDENCE_MALWARE_SCANNER_URL", "https://scanner.example.com/scan")
    monkeypatch.setenv("CONTRIBUTION_EXPENSE_EVIDENCE_RETENTION_DAYS", "180")
    monkeypatch.setenv("CONTRIBUTION_EXPENSE_EVIDENCE_RETENTION_WORKER_INTERVAL_SECONDS", "43200")
    monkeypatch.setenv("CONTRIBUTION_EXPENSE_EVIDENCE_RETENTION_WORKER_LIMIT", "250")
    monkeypatch.setenv("CONTRIBUTION_EXPENSE_EVIDENCE_RETENTION_WORKER_LOCK_PROVIDER", "redis")
    monkeypatch.setenv("CONTRIBUTION_EXPENSE_EVIDENCE_RETENTION_WORKER_LOCK_TTL_SECONDS", "1800")
    monkeypatch.setenv("REDIS_URL", "rediss://redis.example.com:6380/0")
    monkeypatch.setenv("MWF_DIRECTORY_CACHE_TTL_HOURS", "36")
    monkeypatch.setenv("MWF_DIRECTORY_SYNC_WORKER_INTERVAL_SECONDS", "7200")
    monkeypatch.setenv(
        "MWF_DIRECTORY_FELLOWS_URL",
        "https://www.mandelawashingtonfellowship.org/wp-json/yali/v1/fellows/",
    )
    monkeypatch.setenv(
        "MWF_DIRECTORY_FILTERS_URL",
        "https://www.mandelawashingtonfellowship.org/wp-json/yali/v1/directory_filters/",
    )
    monkeypatch.setenv("MWF_DIRECTORY_USER_AGENT", "YALUMNI-V1.5/1.0 test")
    monkeypatch.setenv("NOTIFICATION_DIGEST_WORKER_INTERVAL_SECONDS", "5400")
    monkeypatch.setenv("NOTIFICATION_DIGEST_WORKER_FREQUENCIES", "DAILY,WEEKLY,MONTHLY")
    monkeypatch.setenv("NOTIFICATION_DIGEST_WORKER_LIMIT", "150")
    monkeypatch.setenv("NOTIFICATION_DIGEST_WORKER_MAX_ITEMS_PER_EMAIL", "12")
    monkeypatch.setenv("NOTIFICATION_DIGEST_WORKER_INCLUDE_READ", "true")
    monkeypatch.setenv(
        "CONTRIBUTION_EXPENSE_CATEGORY_BUDGET_POLICY",
        "TRAVEL<=2500,TECHNOLOGY<=5000",
    )
    monkeypatch.setenv("CONTRIBUTION_EXPENSE_CATEGORY_ENFORCEMENT_MODE", "STRICT")
    monkeypatch.setenv("CONTRIBUTION_EXPENSE_CATEGORY_POLICY_DEFAULT_CURRENCY", "KES")
    monkeypatch.setenv("LOGIN_RATE_LIMIT_ATTEMPTS", "7")
    monkeypatch.setenv("LOGIN_RATE_LIMIT_WINDOW_SECONDS", "600")
    monkeypatch.setenv("PASSWORD_RESET_RATE_LIMIT_ATTEMPTS", "4")
    monkeypatch.setenv("PASSWORD_RESET_RATE_LIMIT_WINDOW_SECONDS", "1200")
    monkeypatch.setenv("ADMIN_ACTION_RATE_LIMIT_ATTEMPTS", "12")
    monkeypatch.setenv("ADMIN_ACTION_RATE_LIMIT_WINDOW_SECONDS", "480")
    monkeypatch.setenv("SENTRY_DSN", "https://examplePublicKey@example.ingest.sentry.io/123")
    monkeypatch.setenv("S3_BUCKET_NAME", "yalumni-private")
    get_settings.cache_clear()
    monkeypatch.setattr(
        "app.modules.system.router.probe_runtime_readiness",
        lambda db, settings: RuntimeReadiness(
            database_reachable=True,
            migrations_current=True,
            migration_current_revisions=("current-head",),
            migration_expected_heads=("current-head",),
            redis_configured=True,
            redis_required=True,
            redis_reachable=True,
        ),
    )

    try:
        response = client.get(
            "/api/v1/system/diagnostics",
            headers=auth_headers(registered["access_token"]),
        )
    finally:
        get_settings.cache_clear()

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["environment"] == "staging"
    assert payload["release"]["commit_sha"] == "527fa4f"
    assert payload["release"]["release_version"] == "v1.5.0-staging"
    assert payload["release"]["commit_sha_valid"] is True
    assert payload["release"]["release_version_valid"] is True
    assert payload["release"]["deployment_target"] == "yalumni-v15-api-954095"
    assert payload["release"]["instance_id_present"] is True
    assert payload["release"]["source_control_ref"] == "refs/heads/Tyrax0/yalumni-v1.5-foundation"
    assert payload["release"]["metadata_complete"] is True
    assert payload["release"]["source_control_reported"] is True
    assert payload["release"]["azure_app_service_target"] is True
    assert payload["readiness"]["database_reachable"] is True
    assert payload["readiness"]["migrations_current"] is True
    assert payload["readiness"]["ready"] is True
    assert (
        payload["readiness"]["migration_current_revisions"]
        == payload["readiness"]["migration_expected_heads"]
    )
    assert payload["readiness"]["redis_configured"] is True
    assert payload["readiness"]["redis_required"] is True
    assert payload["payments"]["checkout_provider"] == "STRIPE"
    assert payload["payments"]["refund_provider"] == "FLUTTERWAVE"
    assert payload["payments"]["provider_mode"] == "PROVIDER_BACKED"
    assert payload["payments"]["webhook_signing_ready"] is True
    assert payload["payments"]["checkout_return_url_ready"] is True
    assert payload["payments"]["refund_provider_ready"] is True
    assert payload["payments"]["implementation_ready"] is True
    assert payload["payments"]["credential_configuration_ready"] is True
    assert payload["payments"]["live_provider_validation_required"] is False
    assert payload["payments"]["staging_candidate_ready"] is True
    assert payload["payments"]["missing_settings"] == []
    assert payload["payments"]["stripe"]["adapter_ready"] is True
    assert payload["payments"]["stripe"]["checkout_ready"] is True
    assert payload["payments"]["stripe"]["refund_ready"] is True
    assert payload["payments"]["stripe"]["return_urls_ready"] is True
    assert payload["payments"]["stripe"]["missing_settings"] == []
    assert payload["payments"]["flutterwave"]["adapter_ready"] is True
    assert payload["payments"]["flutterwave"]["checkout_ready"] is True
    assert payload["payments"]["flutterwave"]["refund_ready"] is True
    assert payload["payments"]["flutterwave"]["return_url_ready"] is True
    assert payload["payments"]["flutterwave"]["missing_settings"] == []
    assert payload["payments"]["stripe"]["webhook_url"].endswith(
        "/api/v1/contributions/webhooks/stripe"
    )
    assert payload["runtime"]["upload_storage_provider"] == "S3"
    assert payload["runtime"]["sentry_configured"] is True
    assert payload["runtime"]["email_ready"] is True
    assert payload["runtime"]["email_from_address_configured"] is True
    assert payload["runtime"]["smtp_host_configured"] is True
    assert payload["runtime"]["smtp_user_configured"] is True
    assert payload["runtime"]["smtp_password_configured"] is True
    assert payload["runtime"]["smtp_use_tls"] is True
    assert payload["runtime"]["trusted_origin_count"] == 3
    assert payload["runtime"]["csrf_same_origin_enforced"] is True
    assert payload["auth"]["platform_owner_alias_count"] == 2
    assert payload["auth"]["platform_owner_password_configured"] is True
    assert payload["auth"]["seed_test_accounts_enabled"] is True
    assert payload["auth"]["current_user_two_factor_enabled"] is False
    assert payload["auth"]["test_accounts_password_configured"] is True
    assert payload["auth"]["two_factor_recovery_supported"] is True
    assert payload["auth"]["two_factor_recovery_code_count"] == 8
    assert payload["auth"]["two_factor_totp_digits"] == 6
    assert payload["auth"]["two_factor_totp_period_seconds"] == 30
    assert payload["session"]["access_token_minutes"] == 15
    assert payload["session"]["refresh_token_days"] == 30
    assert payload["session"]["refresh_cookie_days"] == 45
    assert payload["session"]["cookie_same_site"] == "none"
    assert payload["session"]["cookie_secure"] is True
    assert payload["session"]["refresh_rotation_enabled"] is True
    assert payload["session"]["trusted_member_origin_configured"] is True
    assert payload["session"]["trusted_admin_origin_configured"] is True
    assert payload["session"]["trusted_super_admin_origin_configured"] is True
    assert payload["rate_limits"]["login_attempts"] == 7
    assert payload["rate_limits"]["login_window_seconds"] == 600
    assert payload["rate_limits"]["password_reset_attempts"] == 4
    assert payload["rate_limits"]["admin_action_attempts"] == 12
    assert payload["storage"]["provider"] == "S3"
    assert payload["storage"]["uses_local_disk"] is False
    assert payload["storage"]["local_upload_paths_configured"] is True
    assert payload["storage"]["storage_target_ready"] is True
    assert payload["storage"]["s3_bucket_configured"] is True
    assert payload["storage"]["s3_endpoint_configured"] is True
    assert payload["storage"]["s3_endpoint_secure"] is True
    assert payload["storage"]["s3_region_configured"] is True
    assert payload["storage"]["s3_access_key_configured"] is True
    assert payload["storage"]["s3_secret_key_configured"] is True
    assert payload["storage"]["s3_credentials_ready"] is True
    assert payload["storage"]["s3_connect_timeout_seconds"] == 2.5
    assert payload["storage"]["s3_read_timeout_seconds"] == 8.5
    assert payload["storage"]["s3_max_attempts"] == 4
    assert payload["storage"]["s3_resilience_policy_ready"] is True
    assert payload["storage"]["malware_scanner_provider"] == "HTTP"
    assert payload["storage"]["malware_scanner_ready"] is True
    assert payload["storage"]["malware_scanner_transport_ready"] is True
    assert payload["storage"]["malware_scanner_url_configured"] is True
    assert payload["storage"]["malware_scanner_timeout_seconds"] == 5.0
    assert payload["storage"]["retention_days"] == 180
    assert payload["storage"]["verification_upload_allowed_type_count"] == 4
    assert payload["storage"]["profile_photo_upload_allowed_type_count"] == 3
    assert payload["storage"]["community_post_media_allowed_type_count"] == 4
    assert payload["storage"]["contribution_expense_evidence_allowed_type_count"] == 4
    assert payload["storage"]["contribution_expense_evidence_blocked_signature_count"] == 1
    assert payload["storage"]["community_post_media_upload_max_bytes"] == 8 * 1024 * 1024
    assert payload["workers"]["mwf_sync_interval_seconds"] == 7200
    assert payload["workers"]["mwf_cache_ttl_hours"] == 36
    assert payload["workers"]["mwf_user_agent_configured"] is True
    assert payload["workers"]["mwf_fellows_source_configured"] is True
    assert payload["workers"]["mwf_filters_source_configured"] is True
    assert payload["workers"]["notification_digest_interval_seconds"] == 5400
    assert payload["workers"]["notification_digest_frequency_count"] == 3
    assert payload["workers"]["notification_digest_frequencies_configured"] is True
    assert payload["workers"]["notification_digest_limit"] == 150
    assert payload["workers"]["notification_digest_max_items_per_email"] == 12
    assert payload["workers"]["notification_digest_include_read"] is True
    assert payload["workers"]["expense_retention_interval_seconds"] == 43200
    assert payload["workers"]["expense_retention_limit"] == 250
    assert payload["workers"]["expense_retention_lock_provider"] == "REDIS"
    assert payload["workers"]["expense_retention_lock_ready"] is True
    assert payload["workers"]["expense_retention_lock_transport_secure"] is True
    assert payload["workers"]["expense_retention_lock_ttl_seconds"] == 1800
    assert payload["workers"]["expense_category_taxonomy_configured"] is True
    assert payload["workers"]["expense_category_budget_policy_configured"] is True
    assert payload["workers"]["expense_category_enforcement_mode"] == "STRICT"
    assert payload["workers"]["expense_category_default_currency"] == "KES"
    assert payload["workers"]["worker_pipeline_ready"] is True
    assert payload["workers"]["mwf_runtime"] == {
        "last_run_at": None,
        "last_run_status": "never",
        "overdue": True,
    }
    assert payload["workers"]["notification_digest_runtime"] == {
        "last_run_at": None,
        "last_run_status": "never",
        "overdue": True,
    }
    assert payload["workers"]["expense_retention_runtime"] == {
        "last_run_at": None,
        "last_run_status": "never",
        "overdue": True,
    }


def test_system_diagnostics_reports_payment_implementation_ready_without_credentials(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    registered = register_user(client)
    bootstrap_response = client.post(
        "/api/v1/auth/dev/bootstrap-admin",
        headers=auth_headers(registered["access_token"]),
    )
    assert bootstrap_response.status_code == 200

    monkeypatch.setenv("APP_ENV", "staging")
    monkeypatch.setenv("CONTRIBUTION_CHECKOUT_PROVIDER", "LOCAL_TEST")
    monkeypatch.setenv("CONTRIBUTION_REFUND_PROVIDER", "LOCAL_TEST")
    monkeypatch.delenv("STRIPE_SECRET_KEY", raising=False)
    monkeypatch.delenv("STRIPE_WEBHOOK_SECRET", raising=False)
    monkeypatch.delenv("STRIPE_CHECKOUT_SUCCESS_URL", raising=False)
    monkeypatch.delenv("STRIPE_CHECKOUT_CANCEL_URL", raising=False)
    monkeypatch.delenv("FLUTTERWAVE_SECRET_KEY", raising=False)
    monkeypatch.delenv("FLUTTERWAVE_WEBHOOK_SECRET_HASH", raising=False)
    monkeypatch.delenv("FLUTTERWAVE_CHECKOUT_REDIRECT_URL", raising=False)
    get_settings.cache_clear()

    try:
        response = client.get(
            "/api/v1/system/diagnostics",
            headers=auth_headers(registered["access_token"]),
        )
    finally:
        get_settings.cache_clear()

    assert response.status_code == 200
    payments = response.json()["payments"]
    assert payments["provider_mode"] == "LOCAL_TEST"
    assert payments["implementation_ready"] is True
    assert payments["credential_configuration_ready"] is False
    assert payments["live_provider_validation_required"] is True
    assert payments["staging_candidate_ready"] is False
    assert payments["stripe"]["adapter_ready"] is True
    assert payments["flutterwave"]["adapter_ready"] is True
    assert set(payments["missing_settings"]) == {
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "STRIPE_CHECKOUT_SUCCESS_URL",
        "STRIPE_CHECKOUT_CANCEL_URL",
        "FLUTTERWAVE_SECRET_KEY",
        "FLUTTERWAVE_WEBHOOK_SECRET_HASH",
        "FLUTTERWAVE_CHECKOUT_REDIRECT_URL",
    }


def test_system_diagnostics_distinguishes_invalid_production_transports(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    registered = register_user(client, "diagnostics.owner@example.com")
    bootstrap_response = client.post(
        "/api/v1/auth/dev/bootstrap-admin",
        headers=auth_headers(registered["access_token"]),
    )
    assert bootstrap_response.status_code == 200

    monkeypatch.setenv("YALUMNI_RELEASE_SHA", "not-a-sha")
    monkeypatch.setenv("YALUMNI_RELEASE_VERSION", "<release-version>")
    monkeypatch.setenv("S3_ENDPOINT_URL", "http://s3.example.com")
    monkeypatch.setenv("REDIS_URL", "redis://redis.example.com:6379/0")
    get_settings.cache_clear()

    try:
        response = client.get(
            "/api/v1/system/diagnostics",
            headers=auth_headers(registered["access_token"]),
        )
    finally:
        get_settings.cache_clear()

    assert response.status_code == 200
    payload = response.json()
    assert payload["release"]["commit_sha_valid"] is False
    assert payload["release"]["release_version_valid"] is False
    assert payload["storage"]["s3_endpoint_secure"] is False
    assert payload["workers"]["expense_retention_lock_transport_secure"] is False


def test_system_diagnostics_reports_worker_execution_recency() -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db_session() -> Generator[Session]:
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db_session] = override_get_db_session
    now = datetime.now(UTC)
    try:
        with TestClient(app) as test_client:
            registered = register_user(test_client, "worker.owner@example.com")
            bootstrap_response = test_client.post(
                "/api/v1/auth/dev/bootstrap-admin",
                headers=auth_headers(registered["access_token"]),
            )
            assert bootstrap_response.status_code == 200

            with testing_session_local() as db:
                db.add_all(
                    [
                        MwfAlumniSyncRun(
                            source_url="https://www.mandelawashingtonfellowship.org/directory/",
                            status="SUCCEEDED",
                            started_at=now - timedelta(minutes=3),
                            finished_at=now - timedelta(minutes=2),
                        ),
                        SecurityEvent(
                            event_type="alumni.mwf_sync_worker_cycle",
                            metadata_json={"status": "skipped"},
                            created_at=now - timedelta(minutes=2),
                            updated_at=now - timedelta(minutes=1),
                        ),
                        SecurityEvent(
                            event_type="notifications.email_digest_worker_cycle",
                            metadata_json={"status": "succeeded"},
                            created_at=now - timedelta(minutes=2),
                            updated_at=now - timedelta(minutes=1),
                        ),
                        SecurityEvent(
                            event_type="contributions.expense_evidence_retention_worker_run",
                            metadata_json={"status": "succeeded"},
                            created_at=now - timedelta(minutes=2),
                            updated_at=now - timedelta(minutes=1),
                        ),
                    ]
                )
                db.commit()

            response = test_client.get(
                "/api/v1/system/diagnostics",
                headers=auth_headers(registered["access_token"]),
            )
            assert response.status_code == 200
            workers = response.json()["workers"]
            assert workers["mwf_runtime"]["last_run_status"] == "skipped"
            assert workers["mwf_runtime"]["overdue"] is False
            assert workers["notification_digest_runtime"]["last_run_status"] == "succeeded"
            assert workers["notification_digest_runtime"]["overdue"] is False
            assert workers["expense_retention_runtime"]["last_run_status"] == "succeeded"
            assert workers["expense_retention_runtime"]["overdue"] is False
    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)


def test_storage_probe_reports_local_connectivity(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path,
) -> None:
    registered = register_user(client, "storage.owner@example.com")
    bootstrap_response = client.post(
        "/api/v1/auth/dev/bootstrap-admin",
        headers=auth_headers(registered["access_token"]),
    )
    assert bootstrap_response.status_code == 200
    monkeypatch.setenv("UPLOAD_STORAGE_PROVIDER", "LOCAL")
    for variable in (
        "VERIFICATION_UPLOAD_DIR",
        "PROFILE_PHOTO_UPLOAD_DIR",
        "COMMUNITY_POST_MEDIA_UPLOAD_DIR",
        "CONTRIBUTION_EXPENSE_EVIDENCE_UPLOAD_DIR",
    ):
        monkeypatch.setenv(variable, str(tmp_path))
    get_settings.cache_clear()
    try:
        response = client.post(
            "/api/v1/system/storage-probe",
            headers=auth_headers(registered["access_token"]),
        )
    finally:
        get_settings.cache_clear()

    assert response.status_code == 200
    assert response.json()["provider"] == "LOCAL"
    assert response.json()["reachable"] is True
