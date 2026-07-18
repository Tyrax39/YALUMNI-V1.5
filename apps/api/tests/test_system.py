from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings
from app.core.database import Base, get_db_session
from app.core.email import clear_email_outbox
from app.core.rate_limit import clear_rate_limits
from app.main import app
from app.modules.auth import models as auth_models

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


def test_system_diagnostics_requires_super_admin(client: TestClient) -> None:
    registered = register_user(client, "system.member@example.com")

    response = client.get(
        "/api/v1/system/diagnostics",
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
    monkeypatch.setenv("UPLOAD_STORAGE_PROVIDER", "S3")
    monkeypatch.setenv("S3_ENDPOINT_URL", "https://s3.example.com")
    monkeypatch.setenv("S3_REGION", "us-east-1")
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
    monkeypatch.setenv("CONTRIBUTION_EXPENSE_EVIDENCE_MALWARE_SCANNER_PROVIDER", "HTTP")
    monkeypatch.setenv("CONTRIBUTION_EXPENSE_EVIDENCE_MALWARE_SCANNER_URL", "https://scanner.example.com/scan")
    monkeypatch.setenv("CONTRIBUTION_EXPENSE_EVIDENCE_RETENTION_DAYS", "180")
    monkeypatch.setenv("CONTRIBUTION_EXPENSE_EVIDENCE_RETENTION_WORKER_INTERVAL_SECONDS", "43200")
    monkeypatch.setenv("CONTRIBUTION_EXPENSE_EVIDENCE_RETENTION_WORKER_LIMIT", "250")
    monkeypatch.setenv("CONTRIBUTION_EXPENSE_EVIDENCE_RETENTION_WORKER_LOCK_PROVIDER", "redis")
    monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/0")
    monkeypatch.setenv("MWF_DIRECTORY_SYNC_WORKER_INTERVAL_SECONDS", "7200")
    monkeypatch.setenv("NOTIFICATION_DIGEST_WORKER_INTERVAL_SECONDS", "5400")
    monkeypatch.setenv("LOGIN_RATE_LIMIT_ATTEMPTS", "7")
    monkeypatch.setenv("LOGIN_RATE_LIMIT_WINDOW_SECONDS", "600")
    monkeypatch.setenv("PASSWORD_RESET_RATE_LIMIT_ATTEMPTS", "4")
    monkeypatch.setenv("PASSWORD_RESET_RATE_LIMIT_WINDOW_SECONDS", "1200")
    monkeypatch.setenv("ADMIN_ACTION_RATE_LIMIT_ATTEMPTS", "12")
    monkeypatch.setenv("ADMIN_ACTION_RATE_LIMIT_WINDOW_SECONDS", "480")
    monkeypatch.setenv("SENTRY_DSN", "https://examplePublicKey@example.ingest.sentry.io/123")
    monkeypatch.setenv("S3_BUCKET_NAME", "yalumni-private")
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
    assert payload["status"] == "ok"
    assert payload["environment"] == "staging"
    assert payload["release"]["commit_sha"] == "527fa4f"
    assert payload["release"]["release_version"] == "v1.5.0-staging"
    assert payload["release"]["deployment_target"] == "yalumni-v15-api-954095"
    assert payload["release"]["instance_id_present"] is True
    assert payload["payments"]["checkout_provider"] == "STRIPE"
    assert payload["payments"]["refund_provider"] == "FLUTTERWAVE"
    assert payload["payments"]["stripe"]["checkout_ready"] is True
    assert payload["payments"]["flutterwave"]["checkout_ready"] is True
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
    assert payload["auth"]["platform_owner_alias_count"] == 2
    assert payload["auth"]["platform_owner_password_configured"] is True
    assert payload["auth"]["seed_test_accounts_enabled"] is True
    assert payload["auth"]["test_accounts_password_configured"] is True
    assert payload["rate_limits"]["login_attempts"] == 7
    assert payload["rate_limits"]["login_window_seconds"] == 600
    assert payload["rate_limits"]["password_reset_attempts"] == 4
    assert payload["rate_limits"]["admin_action_attempts"] == 12
    assert payload["storage"]["provider"] == "S3"
    assert payload["storage"]["s3_bucket_configured"] is True
    assert payload["storage"]["s3_endpoint_configured"] is True
    assert payload["storage"]["s3_region_configured"] is True
    assert payload["storage"]["malware_scanner_provider"] == "HTTP"
    assert payload["storage"]["malware_scanner_ready"] is True
    assert payload["storage"]["retention_days"] == 180
    assert payload["workers"]["mwf_sync_interval_seconds"] == 7200
    assert payload["workers"]["notification_digest_interval_seconds"] == 5400
    assert payload["workers"]["expense_retention_interval_seconds"] == 43200
    assert payload["workers"]["expense_retention_limit"] == 250
    assert payload["workers"]["expense_retention_lock_provider"] == "REDIS"
    assert payload["workers"]["expense_retention_lock_ready"] is True
