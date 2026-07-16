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
    monkeypatch.setenv("SENTRY_DSN", "https://examplePublicKey@example.ingest.sentry.io/123")
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
