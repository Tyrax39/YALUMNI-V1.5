import hashlib
import hmac
import json
import uuid
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings
from app.core.database import Base, get_db_session
from app.core.email import clear_email_outbox
from app.core.rate_limit import clear_rate_limits
from app.main import app
from app.modules.alumni import models as alumni_models
from app.modules.auth import models as auth_models
from app.modules.communities import models as community_models
from app.modules.contributions import models as contribution_models
from app.modules.contributions.models import Contribution
from app.modules.elections import models as election_models
from app.modules.events import models as event_models
from app.modules.initiatives import models as initiative_models
from app.modules.mentorship import models as mentorship_models
from app.modules.messages import models as message_models
from app.modules.notifications import models as notification_models
from app.modules.opportunities import models as opportunity_models
from app.modules.resources import models as resource_models
from app.modules.success_stories import models as success_story_models

_ = (
    alumni_models,
    auth_models,
    community_models,
    contribution_models,
    election_models,
    event_models,
    initiative_models,
    mentorship_models,
    message_models,
    notification_models,
    opportunity_models,
    resource_models,
    success_story_models,
)


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


def auth_headers(access_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {access_token}"}


def webhook_body(payload: dict) -> bytes:
    return json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")


def signed_webhook_headers(raw_body: bytes, secret: str = "test-webhook-secret") -> dict[str, str]:
    signature = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return {
        "content-type": "application/json",
        "x-yalumni-webhook-signature": f"sha256={signature}",
    }


def register_user(client: TestClient, email: str, display_name: str) -> dict:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "display_name": display_name,
            "email": email,
            "password": "SecurePass123!",
        },
    )
    assert response.status_code == 201
    return response.json()


def create_admin(client: TestClient, email: str = "finance.admin@example.com") -> dict[str, str]:
    registered = register_user(client, email, "Finance Admin")
    bootstrap_response = client.post(
        "/api/v1/auth/dev/bootstrap-admin",
        headers=auth_headers(registered["access_token"]),
    )
    assert bootstrap_response.status_code == 200
    return auth_headers(registered["access_token"])


def campaign_payload(title: str = "Alumni scholarship fund") -> dict:
    return {
        "chapter_name": "Platform treasury",
        "country": "Rwanda",
        "currency": "usd",
        "description": (
            "A member contribution campaign to fund alumni-led scholarship support, "
            "transparent receipts, and a basic treasury ledger for local operations."
        ),
        "ends_at": "2026-12-31T23:59:00Z",
        "goal_amount_cents": 2500000,
        "starts_at": "2026-05-01T00:00:00Z",
        "summary": "Fund scholarships for alumni community impact projects across chapters.",
        "title": title,
    }


def create_published_campaign(
    client: TestClient,
    admin_headers: dict[str, str],
    title: str = "Webhook scholarship fund",
) -> dict:
    create_response = client.post(
        "/api/v1/contributions/admin/campaigns",
        headers=admin_headers,
        json=campaign_payload(title),
    )
    assert create_response.status_code == 201
    campaign = create_response.json()
    publish_response = client.post(
        f"/api/v1/contributions/admin/campaigns/{campaign['id']}/publish",
        headers=admin_headers,
        json={"note": "Ready for member contributions."},
    )
    assert publish_response.status_code == 200
    return publish_response.json()


def create_pending_contribution_for_test(
    *,
    amount_cents: int,
    campaign_id: str,
    contributor_user_id: str,
) -> str:
    db_override = app.dependency_overrides[get_db_session]
    db_iterator = db_override()
    db = next(db_iterator)
    try:
        contribution = Contribution(
            amount_cents=amount_cents,
            campaign_id=uuid.UUID(campaign_id),
            contributor_user_id=uuid.UUID(contributor_user_id),
            currency="USD",
            payment_method="BANK_TRANSFER",
            payment_reference="PENDING-QA",
            status="PENDING",
        )
        db.add(contribution)
        db.commit()
        db.refresh(contribution)
        return str(contribution.id)
    finally:
        db_iterator.close()


def test_payment_intent_rejects_unimplemented_checkout_provider(client: TestClient) -> None:
    settings = get_settings()
    previous_provider = settings.contribution_checkout_provider
    settings.contribution_checkout_provider = "stripe"
    try:
        admin_headers = create_admin(client, "provider.boundary.finance@example.com")
        member = register_user(client, "provider.boundary.donor@example.com", "Boundary Donor")
        member_headers = auth_headers(member["access_token"])
        campaign = create_published_campaign(
            client,
            admin_headers,
            "Provider boundary scholarship fund",
        )
        intent_response = client.post(
            f"/api/v1/contributions/{campaign['id']}/payment-intents",
            headers=member_headers,
            json={
                "amount_cents": 7200,
                "currency": "USD",
                "payment_method": "CARD_TEST",
            },
        )
        assert intent_response.status_code == 503
        assert (
            intent_response.json()["detail"]
            == "Contribution checkout provider STRIPE is not implemented"
        )
    finally:
        settings.contribution_checkout_provider = previous_provider


def test_provider_refund_rejects_unimplemented_refund_provider(client: TestClient) -> None:
    settings = get_settings()
    previous_provider = settings.contribution_refund_provider
    settings.contribution_refund_provider = "stripe"
    try:
        admin_headers = create_admin(client, "refund.boundary.finance@example.com")
        member = register_user(client, "refund.boundary.donor@example.com", "Refund Donor")
        member_headers = auth_headers(member["access_token"])
        campaign = create_published_campaign(
            client,
            admin_headers,
            "Refund boundary scholarship fund",
        )
        intent_response = client.post(
            f"/api/v1/contributions/{campaign['id']}/payment-intents",
            headers=member_headers,
            json={
                "amount_cents": 8500,
                "currency": "USD",
                "payment_method": "CARD_TEST",
            },
        )
        assert intent_response.status_code == 201
        intent = intent_response.json()
        confirmed_response = client.post(
            f"/api/v1/contributions/{campaign['id']}/payment-intents/{intent['id']}/confirm",
            headers=member_headers,
        )
        assert confirmed_response.status_code == 201
        confirmed = confirmed_response.json()

        provider_refund_response = client.post(
            f"/api/v1/contributions/admin/contributions/{confirmed['id']}/provider-refund",
            headers=admin_headers,
            json={"note": "Refund should wait for a real provider adapter."},
        )
        assert provider_refund_response.status_code == 503
        assert (
            provider_refund_response.json()["detail"]
            == "Contribution refund provider STRIPE is not implemented"
        )
    finally:
        settings.contribution_refund_provider = previous_provider


def payment_attempt_snapshots_for_intent(payment_intent_id: str) -> list[dict]:
    db_override = app.dependency_overrides[get_db_session]
    db_iterator = db_override()
    db = next(db_iterator)
    try:
        attempts = db.scalars(
            select(contribution_models.ContributionPaymentAttempt)
            .where(
                contribution_models.ContributionPaymentAttempt.payment_intent_id
                == uuid.UUID(payment_intent_id)
            )
            .order_by(contribution_models.ContributionPaymentAttempt.created_at)
        ).all()
        return [
            {
                "client_secret": attempt.client_secret,
                "error_message": attempt.error_message,
                "provider": attempt.provider,
                "provider_intent_id": attempt.provider_intent_id,
                "response_adapter": (attempt.response_payload_json or {}).get("adapter"),
                "status": attempt.status,
            }
            for attempt in attempts
        ]
    finally:
        db_iterator.close()


def test_contribution_campaign_payment_receipt_and_treasury(client: TestClient) -> None:
    admin_headers = create_admin(client)
    donor = register_user(client, "donor@example.com", "Donor Member")
    donor_headers = auth_headers(donor["access_token"])

    create_response = client.post(
        "/api/v1/contributions/admin/campaigns",
        headers=admin_headers,
        json=campaign_payload(),
    )
    assert create_response.status_code == 201
    campaign = create_response.json()
    assert campaign["status"] == "DRAFT"
    assert campaign["currency"] == "USD"

    hidden_list = client.get("/api/v1/contributions", headers=donor_headers)
    assert hidden_list.status_code == 200
    assert hidden_list.json()["total"] == 0

    publish_response = client.post(
        f"/api/v1/contributions/admin/campaigns/{campaign['id']}/publish",
        headers=admin_headers,
        json={"note": "Ready for member contributions."},
    )
    assert publish_response.status_code == 200
    assert publish_response.json()["status"] == "PUBLISHED"

    visible_list = client.get("/api/v1/contributions?q=scholarship", headers=donor_headers)
    assert visible_list.status_code == 200
    assert visible_list.json()["total"] == 1

    intent_response = client.post(
        f"/api/v1/contributions/{campaign['id']}/payment-intents",
        headers=donor_headers,
        json={
            "amount_cents": 12500,
            "anonymous": False,
            "currency": "USD",
            "note": "Intent before local test contribution.",
            "payment_method": "card_test",
        },
    )
    assert intent_response.status_code == 201
    payment_intent = intent_response.json()
    assert payment_intent["amount_cents"] == 12500
    assert payment_intent["provider"] == "LOCAL_TEST"
    assert payment_intent["provider_intent_id"].startswith("yalumni_pi_")
    assert payment_intent["status"] == "REQUIRES_CONFIRMATION"

    intent_detail = client.get(f"/api/v1/contributions/{campaign['id']}", headers=donor_headers)
    assert intent_detail.status_code == 200
    assert intent_detail.json()["contribution_count"] == 0

    payment_response = client.post(
        f"/api/v1/contributions/{campaign['id']}/pay",
        headers=donor_headers,
        json={
            "amount_cents": 12500,
            "anonymous": False,
            "currency": "USD",
            "note": "Local test contribution.",
            "payment_method": "card_test",
            "payment_reference": "TEST-125",
        },
    )
    assert payment_response.status_code == 201
    contribution = payment_response.json()
    assert contribution["status"] == "RECEIVED"
    assert contribution["amount_cents"] == 12500
    assert contribution["receipt_id"]
    assert contribution["receipt_number"].startswith("YAL-REC-2026-")

    detail_response = client.get(f"/api/v1/contributions/{campaign['id']}", headers=donor_headers)
    assert detail_response.status_code == 200
    detail = detail_response.json()
    assert detail["received_amount_cents"] == 12500
    assert detail["contribution_count"] == 1
    assert detail["is_contributor"] is True

    receipt_response = client.get(
        f"/api/v1/contributions/receipts/{contribution['receipt_id']}",
        headers=donor_headers,
    )
    assert receipt_response.status_code == 200
    receipt = receipt_response.json()
    assert receipt["receipt_number"] == contribution["receipt_number"]
    assert receipt["issued_to_email"] == "donor@example.com"

    receipt_download = client.get(
        f"/api/v1/contributions/receipts/{contribution['receipt_id']}/download",
        headers=donor_headers,
    )
    assert receipt_download.status_code == 200
    assert receipt_download.headers["content-type"].startswith("text/plain")
    assert contribution["receipt_number"] in receipt_download.headers["content-disposition"]
    assert "YALUMNI Contribution Receipt" in receipt_download.text
    assert "TEST-125" in receipt_download.text

    receipt_pdf_download = client.get(
        f"/api/v1/contributions/receipts/{contribution['receipt_id']}/download.pdf",
        headers=donor_headers,
    )
    assert receipt_pdf_download.status_code == 200
    assert receipt_pdf_download.headers["content-type"] == "application/pdf"
    assert contribution["receipt_number"] in receipt_pdf_download.headers["content-disposition"]
    assert receipt_pdf_download.content.startswith(b"%PDF-1.4")

    treasury_response = client.get("/api/v1/contributions/admin/treasury", headers=admin_headers)
    assert treasury_response.status_code == 200
    treasury = treasury_response.json()
    assert treasury["received_amount_cents"] == 12500
    assert treasury["receipt_count"] == 1
    assert treasury["ledger_entries"][0]["entry_type"] == "CONTRIBUTION_CREDIT"

    contributions_export = client.get(
        "/api/v1/contributions/admin/contributions/export",
        headers=admin_headers,
    )
    assert contributions_export.status_code == 200
    assert contributions_export.headers["content-type"].startswith("text/csv")
    assert "yalumni-contributions" in contributions_export.headers["content-disposition"]
    assert contribution["receipt_number"] in contributions_export.text
    assert "donor@example.com" in contributions_export.text

    treasury_export = client.get(
        "/api/v1/contributions/admin/treasury/export",
        headers=admin_headers,
    )
    assert treasury_export.status_code == 200
    assert treasury_export.headers["content-type"].startswith("text/csv")
    assert "yalumni-treasury-ledger" in treasury_export.headers["content-disposition"]
    assert "CONTRIBUTION_CREDIT" in treasury_export.text
    assert contribution["receipt_number"] in treasury_export.text

    audit_package_response = client.get(
        "/api/v1/contributions/admin/treasury/audit-package",
        headers=admin_headers,
    )
    assert audit_package_response.status_code == 200
    assert audit_package_response.headers["content-type"].startswith("application/json")
    assert "yalumni-treasury-audit" in audit_package_response.headers["content-disposition"]
    audit_package = audit_package_response.json()
    canonical_package = json.dumps(
        audit_package["package"],
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")
    assert audit_package["integrity"]["canonical_sha256"] == hashlib.sha256(
        canonical_package
    ).hexdigest()
    assert audit_package["integrity"]["signature"] == hmac.new(
        get_settings().jwt_secret_key.encode("utf-8"),
        canonical_package,
        hashlib.sha256,
    ).hexdigest()
    assert audit_package["package"]["summary"]["received_amount_cents"] == 12500
    assert audit_package["package"]["contributions"][0]["receipt_number"] == contribution[
        "receipt_number"
    ]

    audit_report_response = client.get(
        "/api/v1/contributions/admin/treasury/audit-report",
        headers=admin_headers,
    )
    assert audit_report_response.status_code == 200
    assert audit_report_response.headers["content-type"] == "application/pdf"
    assert "yalumni-treasury-audit" in audit_report_response.headers["content-disposition"]
    assert audit_report_response.content.startswith(b"%PDF-1.4")
    assert b"YALUMNI Treasury Audit Report" in audit_report_response.content

    certification_response = client.post(
        "/api/v1/contributions/admin/treasury/certifications",
        headers=admin_headers,
        json={
            "campaign_id": campaign["id"],
            "limit": 100,
            "note": "Certified after receipt reconciliation.",
            "status": "received",
        },
    )
    assert certification_response.status_code == 201
    certification = certification_response.json()
    assert certification["campaign_id"] == campaign["id"]
    assert certification["campaign_title"] == campaign["title"]
    assert certification["certified_by_email"] == "finance.admin@example.com"
    assert certification["contribution_count"] == 1
    assert certification["ledger_entry_count"] == 1
    assert certification["note"] == "Certified after receipt reconciliation."
    assert certification["received_amount_cents"] == 12500
    assert certification["status_filter"] == "RECEIVED"
    canonical_certified_package = json.dumps(
        certification["package_json"]["package"],
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")
    assert certification["canonical_sha256"] == hashlib.sha256(
        canonical_certified_package
    ).hexdigest()

    certification_list_response = client.get(
        "/api/v1/contributions/admin/treasury/certifications",
        headers=admin_headers,
    )
    assert certification_list_response.status_code == 200
    certification_list = certification_list_response.json()
    assert certification_list["total"] == 1
    assert certification_list["certifications"][0]["id"] == certification["id"]

    certification_detail_response = client.get(
        f"/api/v1/contributions/admin/treasury/certifications/{certification['id']}",
        headers=admin_headers,
    )
    assert certification_detail_response.status_code == 200
    assert certification_detail_response.json()["canonical_sha256"] == certification[
        "canonical_sha256"
    ]

    refund_response = client.post(
        f"/api/v1/contributions/admin/contributions/{contribution['id']}/refund",
        headers=admin_headers,
        json={"note": "Refunded during QA reconciliation."},
    )
    assert refund_response.status_code == 200
    refunded = refund_response.json()
    assert refunded["status"] == "REFUNDED"
    assert refunded["receipt_number"] == contribution["receipt_number"]

    duplicate_refund = client.post(
        f"/api/v1/contributions/admin/contributions/{contribution['id']}/refund",
        headers=admin_headers,
        json={"note": "Second refund should be blocked."},
    )
    assert duplicate_refund.status_code == 409

    refunded_receipt_response = client.get(
        f"/api/v1/contributions/receipts/{contribution['receipt_id']}",
        headers=donor_headers,
    )
    assert refunded_receipt_response.status_code == 200
    assert refunded_receipt_response.json()["status"] == "REFUNDED"

    refunded_treasury_response = client.get(
        "/api/v1/contributions/admin/treasury",
        headers=admin_headers,
    )
    assert refunded_treasury_response.status_code == 200
    refunded_treasury = refunded_treasury_response.json()
    assert refunded_treasury["received_amount_cents"] == 0
    assert refunded_treasury["ledger_entries"][0]["entry_type"] == "CONTRIBUTION_REFUND"
    assert refunded_treasury["ledger_entries"][0]["amount_cents"] == -12500
    certified_snapshot_response = client.get(
        f"/api/v1/contributions/admin/treasury/certifications/{certification['id']}",
        headers=admin_headers,
    )
    assert certified_snapshot_response.status_code == 200
    certified_snapshot = certified_snapshot_response.json()
    assert certified_snapshot["received_amount_cents"] == 12500
    assert (
        certified_snapshot["package_json"]["package"]["summary"]["received_amount_cents"]
        == 12500
    )

    close_response = client.post(
        f"/api/v1/contributions/admin/campaigns/{campaign['id']}/close",
        headers=admin_headers,
        json={"note": "Close campaign after test."},
    )
    assert close_response.status_code == 200
    assert close_response.json()["status"] == "CLOSED"

    closed_payment = client.post(
        f"/api/v1/contributions/{campaign['id']}/pay",
        headers=donor_headers,
        json={"amount_cents": 5000, "currency": "USD", "payment_method": "CARD_TEST"},
    )
    assert closed_payment.status_code == 409

    closed_intent = client.post(
        f"/api/v1/contributions/{campaign['id']}/payment-intents",
        headers=donor_headers,
        json={"amount_cents": 5000, "currency": "USD", "payment_method": "CARD_TEST"},
    )
    assert closed_intent.status_code == 409


def test_treasury_currency_summaries_and_export(client: TestClient) -> None:
    admin_headers = create_admin(client, "currency.finance@example.com")
    donor = register_user(client, "currency.donor@example.com", "Currency Donor")
    donor_headers = auth_headers(donor["access_token"])
    usd_campaign = create_published_campaign(
        client,
        admin_headers,
        "USD scholarship currency fund",
    )
    eur_payload = campaign_payload("EUR chapter equipment fund")
    eur_payload["currency"] = "eur"
    eur_campaign_response = client.post(
        "/api/v1/contributions/admin/campaigns",
        headers=admin_headers,
        json=eur_payload,
    )
    assert eur_campaign_response.status_code == 201
    eur_campaign = eur_campaign_response.json()
    eur_publish_response = client.post(
        f"/api/v1/contributions/admin/campaigns/{eur_campaign['id']}/publish",
        headers=admin_headers,
        json={"note": "Ready for EUR contributions."},
    )
    assert eur_publish_response.status_code == 200

    usd_payment_response = client.post(
        f"/api/v1/contributions/{usd_campaign['id']}/pay",
        headers=donor_headers,
        json={
            "amount_cents": 10000,
            "currency": "USD",
            "payment_method": "CARD_TEST",
            "payment_reference": "USD-CUR-100",
        },
    )
    assert usd_payment_response.status_code == 201
    eur_payment_response = client.post(
        f"/api/v1/contributions/{eur_campaign['id']}/pay",
        headers=donor_headers,
        json={
            "amount_cents": 7000,
            "currency": "EUR",
            "payment_method": "CARD_TEST",
            "payment_reference": "EUR-CUR-070",
        },
    )
    assert eur_payment_response.status_code == 201
    create_pending_contribution_for_test(
        amount_cents=2500,
        campaign_id=usd_campaign["id"],
        contributor_user_id=donor["user"]["id"],
    )

    treasury_response = client.get("/api/v1/contributions/admin/treasury", headers=admin_headers)
    assert treasury_response.status_code == 200
    currency_summaries = {
        summary["currency"]: summary for summary in treasury_response.json()["currency_summaries"]
    }
    assert currency_summaries["USD"] == {
        "contribution_count": 2,
        "currency": "USD",
        "ledger_entry_count": 1,
        "ledger_net_amount_cents": 10000,
        "pending_amount_cents": 2500,
        "receipt_count": 1,
        "received_amount_cents": 10000,
    }
    assert currency_summaries["EUR"] == {
        "contribution_count": 1,
        "currency": "EUR",
        "ledger_entry_count": 1,
        "ledger_net_amount_cents": 7000,
        "pending_amount_cents": 0,
        "receipt_count": 1,
        "received_amount_cents": 7000,
    }

    currency_export_response = client.get(
        "/api/v1/contributions/admin/treasury/currency-summary/export",
        headers=admin_headers,
    )
    assert currency_export_response.status_code == 200
    assert currency_export_response.headers["content-type"].startswith("text/csv")
    assert "yalumni-treasury-currency-summary" in currency_export_response.headers[
        "content-disposition"
    ]
    assert "USD,2,1,1,10000,2500,10000" in currency_export_response.text
    assert "EUR,1,1,1,7000,0,7000" in currency_export_response.text

    audit_package_response = client.get(
        "/api/v1/contributions/admin/treasury/audit-package",
        headers=admin_headers,
    )
    assert audit_package_response.status_code == 200
    audit_summaries = {
        summary["currency"]: summary
        for summary in audit_package_response.json()["package"]["summary"][
            "currency_summaries"
        ]
    }
    assert audit_summaries["USD"]["pending_amount_cents"] == 2500
    assert audit_summaries["EUR"]["ledger_net_amount_cents"] == 7000

    certification_response = client.post(
        "/api/v1/contributions/admin/treasury/certifications",
        headers=admin_headers,
        json={"limit": 100, "note": "Certified multi-currency summary."},
    )
    assert certification_response.status_code == 201
    certification_summaries = {
        summary["currency"]: summary for summary in certification_response.json()[
            "currency_summaries"
        ]
    }
    assert certification_summaries["USD"]["received_amount_cents"] == 10000
    assert certification_summaries["EUR"]["received_amount_cents"] == 7000


def test_contribution_disbursement_request_foundation(client: TestClient) -> None:
    admin_headers = create_admin(client, "disbursement.finance@example.com")
    donor = register_user(client, "disbursement.donor@example.com", "Disbursement Donor")
    donor_headers = auth_headers(donor["access_token"])
    campaign = create_published_campaign(
        client,
        admin_headers,
        "Disbursement scholarship fund",
    )
    contribution_response = client.post(
        f"/api/v1/contributions/{campaign['id']}/pay",
        headers=donor_headers,
        json={
            "amount_cents": 10000,
            "currency": "USD",
            "note": "Fund disbursement request testing.",
            "payment_method": "CARD_TEST",
            "payment_reference": "DISB-100",
        },
    )
    assert contribution_response.status_code == 201

    disbursement_payload = {
        "amount_cents": 6000,
        "currency": "USD",
        "note": "Initial program expense request.",
        "payee_name": "Chapter Project Lead",
        "payee_reference": "BANK-CHAPTER-001",
        "purpose": "Scholarship material purchase for the chapter program.",
    }
    denied_create = client.post(
        f"/api/v1/contributions/admin/campaigns/{campaign['id']}/disbursement-requests",
        headers=donor_headers,
        json=disbursement_payload,
    )
    assert denied_create.status_code == 403

    overdrawn_create = client.post(
        f"/api/v1/contributions/admin/campaigns/{campaign['id']}/disbursement-requests",
        headers=admin_headers,
        json={**disbursement_payload, "amount_cents": 15000},
    )
    assert overdrawn_create.status_code == 409

    create_response = client.post(
        f"/api/v1/contributions/admin/campaigns/{campaign['id']}/disbursement-requests",
        headers=admin_headers,
        json=disbursement_payload,
    )
    assert create_response.status_code == 201
    disbursement = create_response.json()
    assert disbursement["amount_cents"] == 6000
    assert disbursement["campaign_id"] == campaign["id"]
    assert disbursement["campaign_title"] == campaign["title"]
    assert disbursement["requested_by_email"] == "disbursement.finance@example.com"
    assert disbursement["status"] == "REQUESTED"

    requested_list = client.get(
        "/api/v1/contributions/admin/disbursement-requests",
        headers=admin_headers,
        params={"status": "requested"},
    )
    assert requested_list.status_code == 200
    assert requested_list.json()["total"] == 1

    detail_response = client.get(
        f"/api/v1/contributions/admin/disbursement-requests/{disbursement['id']}",
        headers=admin_headers,
    )
    assert detail_response.status_code == 200
    assert detail_response.json()["payee_reference"] == "BANK-CHAPTER-001"

    reserved_overdrawn_create = client.post(
        f"/api/v1/contributions/admin/campaigns/{campaign['id']}/disbursement-requests",
        headers=admin_headers,
        json={**disbursement_payload, "amount_cents": 4500},
    )
    assert reserved_overdrawn_create.status_code == 409

    approve_response = client.post(
        f"/api/v1/contributions/admin/disbursement-requests/{disbursement['id']}/approve",
        headers=admin_headers,
        json={"note": "Approved against received funds."},
    )
    assert approve_response.status_code == 200
    approved = approve_response.json()
    assert approved["decision_note"] == "Approved against received funds."
    assert approved["reviewed_by_email"] == "disbursement.finance@example.com"
    assert approved["status"] == "APPROVED"

    second_create = client.post(
        f"/api/v1/contributions/admin/campaigns/{campaign['id']}/disbursement-requests",
        headers=admin_headers,
        json={**disbursement_payload, "amount_cents": 3000, "payee_reference": "BANK-002"},
    )
    assert second_create.status_code == 201
    second_disbursement = second_create.json()
    reject_response = client.post(
        f"/api/v1/contributions/admin/disbursement-requests/{second_disbursement['id']}/reject",
        headers=admin_headers,
        json={"note": "Need stronger evidence before approval."},
    )
    assert reject_response.status_code == 200
    assert reject_response.json()["status"] == "REJECTED"

    mark_paid_response = client.post(
        f"/api/v1/contributions/admin/disbursement-requests/{disbursement['id']}/mark-paid",
        headers=admin_headers,
        json={"note": "Paid by bank transfer."},
    )
    assert mark_paid_response.status_code == 200
    paid = mark_paid_response.json()
    assert paid["paid_at"] is not None
    assert paid["paid_by_email"] == "disbursement.finance@example.com"
    assert paid["status"] == "PAID"

    duplicate_paid = client.post(
        f"/api/v1/contributions/admin/disbursement-requests/{disbursement['id']}/mark-paid",
        headers=admin_headers,
        json={"note": "Already paid."},
    )
    assert duplicate_paid.status_code == 409

    all_disbursements = client.get(
        "/api/v1/contributions/admin/disbursement-requests",
        headers=admin_headers,
    )
    assert all_disbursements.status_code == 200
    assert all_disbursements.json()["total"] == 2


def test_contribution_expense_report_foundation(client: TestClient) -> None:
    admin_headers = create_admin(client, "expense.finance@example.com")
    donor = register_user(client, "expense.donor@example.com", "Expense Donor")
    donor_headers = auth_headers(donor["access_token"])
    campaign = create_published_campaign(
        client,
        admin_headers,
        "Expense report scholarship fund",
    )
    contribution_response = client.post(
        f"/api/v1/contributions/{campaign['id']}/pay",
        headers=donor_headers,
        json={
            "amount_cents": 10000,
            "currency": "USD",
            "note": "Fund expense report testing.",
            "payment_method": "CARD_TEST",
            "payment_reference": "EXP-100",
        },
    )
    assert contribution_response.status_code == 201

    disbursement_payload = {
        "amount_cents": 6000,
        "currency": "USD",
        "note": "Program expense request.",
        "payee_name": "Chapter Project Lead",
        "payee_reference": "BANK-EXPENSE-001",
        "purpose": "Scholarship material purchase for expense report testing.",
    }
    disbursement_response = client.post(
        f"/api/v1/contributions/admin/campaigns/{campaign['id']}/disbursement-requests",
        headers=admin_headers,
        json=disbursement_payload,
    )
    assert disbursement_response.status_code == 201
    disbursement = disbursement_response.json()

    unpaid_expense = client.post(
        f"/api/v1/contributions/admin/disbursement-requests/{disbursement['id']}/expense-reports",
        headers=admin_headers,
        json={
            "amount_cents": 5000,
            "currency": "USD",
            "summary": "Attempted expense before payment",
            "vendor_name": "Book Supplier Ltd",
        },
    )
    assert unpaid_expense.status_code == 409

    approve_response = client.post(
        f"/api/v1/contributions/admin/disbursement-requests/{disbursement['id']}/approve",
        headers=admin_headers,
        json={"note": "Approved for expense reporting."},
    )
    assert approve_response.status_code == 200
    mark_paid_response = client.post(
        f"/api/v1/contributions/admin/disbursement-requests/{disbursement['id']}/mark-paid",
        headers=admin_headers,
        json={"note": "Paid by bank transfer."},
    )
    assert mark_paid_response.status_code == 200

    expense_payload = {
        "amount_cents": 5500,
        "currency": "USD",
        "description": "Purchased learning materials for scholarship recipients.",
        "evidence_items": [
            {
                "amount_cents": 5500,
                "evidence_type": "receipt",
                "receipt_number": "RCPT-BOOK-001",
                "reference_url": "https://example.com/receipt/book-001",
                "title": "Book supplier receipt",
            }
        ],
        "expense_at": "2026-05-10T10:00:00Z",
        "expense_category": "learning materials",
        "note": "Submitted with supplier receipt.",
        "summary": "Purchased scholarship books",
        "vendor_name": "Book Supplier Ltd",
    }
    denied_create = client.post(
        f"/api/v1/contributions/admin/disbursement-requests/{disbursement['id']}/expense-reports",
        headers=donor_headers,
        json=expense_payload,
    )
    assert denied_create.status_code == 403

    overreported_create = client.post(
        f"/api/v1/contributions/admin/disbursement-requests/{disbursement['id']}/expense-reports",
        headers=admin_headers,
        json={**expense_payload, "amount_cents": 7000},
    )
    assert overreported_create.status_code == 409

    create_response = client.post(
        f"/api/v1/contributions/admin/disbursement-requests/{disbursement['id']}/expense-reports",
        headers=admin_headers,
        json=expense_payload,
    )
    assert create_response.status_code == 201
    expense_report = create_response.json()
    assert expense_report["amount_cents"] == 5500
    assert expense_report["campaign_id"] == campaign["id"]
    assert expense_report["campaign_title"] == campaign["title"]
    assert expense_report["disbursement_request_id"] == disbursement["id"]
    assert expense_report["expense_category"] == "LEARNING_MATERIALS"
    assert expense_report["status"] == "SUBMITTED"
    assert expense_report["submitted_by_email"] == "expense.finance@example.com"
    assert expense_report["evidence_items"][0]["evidence_type"] == "RECEIPT"
    assert expense_report["evidence_items"][0]["download_url"] is None
    assert expense_report["evidence_items"][0]["file_name"] is None
    assert expense_report["evidence_items"][0]["receipt_number"] == "RCPT-BOOK-001"

    submitted_list = client.get(
        "/api/v1/contributions/admin/expense-reports",
        headers=admin_headers,
        params={"status": "submitted"},
    )
    assert submitted_list.status_code == 200
    assert submitted_list.json()["total"] == 1

    category_list = client.get(
        "/api/v1/contributions/admin/expense-reports",
        headers=admin_headers,
        params={"expense_category": "learning-materials"},
    )
    assert category_list.status_code == 200
    assert category_list.json()["total"] == 1
    assert category_list.json()["expense_reports"][0]["id"] == expense_report["id"]

    vendor_search = client.get(
        "/api/v1/contributions/admin/expense-reports",
        headers=admin_headers,
        params={"q": "Book Supplier"},
    )
    assert vendor_search.status_code == 200
    assert vendor_search.json()["total"] == 1
    assert vendor_search.json()["expense_reports"][0]["expense_category"] == "LEARNING_MATERIALS"

    date_filtered = client.get(
        "/api/v1/contributions/admin/expense-reports",
        headers=admin_headers,
        params={
            "expense_from": "2026-05-01T00:00:00Z",
            "expense_to": "2026-05-31T23:59:59Z",
        },
    )
    assert date_filtered.status_code == 200
    assert date_filtered.json()["total"] == 1

    invalid_date_range = client.get(
        "/api/v1/contributions/admin/expense-reports",
        headers=admin_headers,
        params={
            "expense_from": "2026-06-01T00:00:00Z",
            "expense_to": "2026-05-01T00:00:00Z",
        },
    )
    assert invalid_date_range.status_code == 400

    detail_response = client.get(
        f"/api/v1/contributions/admin/expense-reports/{expense_report['id']}",
        headers=admin_headers,
    )
    assert detail_response.status_code == 200
    assert detail_response.json()["evidence_items"][0]["title"] == "Book supplier receipt"

    reserved_overreport = client.post(
        f"/api/v1/contributions/admin/disbursement-requests/{disbursement['id']}/expense-reports",
        headers=admin_headers,
        json={**expense_payload, "amount_cents": 600, "summary": "Extra book purchase"},
    )
    assert reserved_overreport.status_code == 409

    approve_expense = client.post(
        f"/api/v1/contributions/admin/expense-reports/{expense_report['id']}/approve",
        headers=admin_headers,
        json={"note": "Receipt reviewed and approved."},
    )
    assert approve_expense.status_code == 200
    approved_expense = approve_expense.json()
    assert approved_expense["decision_note"] == "Receipt reviewed and approved."
    assert approved_expense["reviewed_by_email"] == "expense.finance@example.com"
    assert approved_expense["status"] == "APPROVED"

    duplicate_approve = client.post(
        f"/api/v1/contributions/admin/expense-reports/{expense_report['id']}/approve",
        headers=admin_headers,
        json={"note": "Already approved."},
    )
    assert duplicate_approve.status_code == 409

    second_expense = client.post(
        f"/api/v1/contributions/admin/disbursement-requests/{disbursement['id']}/expense-reports",
        headers=admin_headers,
        json={**expense_payload, "amount_cents": 500, "summary": "Final book delivery"},
    )
    assert second_expense.status_code == 201
    approve_second_expense = client.post(
        f"/api/v1/contributions/admin/expense-reports/{second_expense.json()['id']}/approve",
        headers=admin_headers,
        json={"note": "Final receipt approved."},
    )
    assert approve_second_expense.status_code == 200
    reject_expense = client.post(
        f"/api/v1/contributions/admin/expense-reports/{second_expense.json()['id']}/reject",
        headers=admin_headers,
        json={"note": "Duplicate receipt reference."},
    )
    assert reject_expense.status_code == 200
    assert reject_expense.json()["status"] == "REJECTED"

    all_expenses = client.get(
        "/api/v1/contributions/admin/expense-reports",
        headers=admin_headers,
    )
    assert all_expenses.status_code == 200
    assert all_expenses.json()["total"] == 2

    treasury_response = client.get("/api/v1/contributions/admin/treasury", headers=admin_headers)
    assert treasury_response.status_code == 200
    ledger_entries = treasury_response.json()["ledger_entries"]
    expense_entries = [
        entry for entry in ledger_entries if entry["entry_type"] == "CONTRIBUTION_EXPENSE"
    ]
    assert len(expense_entries) == 2
    assert {entry["amount_cents"] for entry in expense_entries} == {-5500, -500}
    assert {entry["contribution_id"] for entry in expense_entries} == {None}
    assert expense_report["id"] in {entry["expense_report_id"] for entry in expense_entries}
    reversal_entry = next(
        entry
        for entry in ledger_entries
        if entry["entry_type"] == "CONTRIBUTION_EXPENSE_REVERSAL"
    )
    assert reversal_entry["amount_cents"] == 500
    assert reversal_entry["expense_report_id"] == second_expense.json()["id"]

    treasury_export = client.get(
        "/api/v1/contributions/admin/treasury/export",
        headers=admin_headers,
    )
    assert treasury_export.status_code == 200
    assert "expense_report_id" in treasury_export.text
    assert "CONTRIBUTION_EXPENSE" in treasury_export.text
    assert expense_report["id"] in treasury_export.text

    audit_package_response = client.get(
        "/api/v1/contributions/admin/treasury/audit-package",
        headers=admin_headers,
        params={"campaign_id": campaign["id"]},
    )
    assert audit_package_response.status_code == 200
    audit_ledger_entries = audit_package_response.json()["package"]["ledger_entries"]
    assert any(
        entry["expense_report_id"] == expense_report["id"]
        and entry["entry_type"] == "CONTRIBUTION_EXPENSE"
        for entry in audit_ledger_entries
    )


def test_contribution_expense_evidence_file_upload_download(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path,
) -> None:
    monkeypatch.setenv("UPLOAD_STORAGE_PROVIDER", "LOCAL")
    monkeypatch.setenv("CONTRIBUTION_EXPENSE_EVIDENCE_UPLOAD_DIR", str(tmp_path))
    monkeypatch.setenv("CONTRIBUTION_EXPENSE_EVIDENCE_UPLOAD_MAX_BYTES", "64")
    monkeypatch.setenv(
        "CONTRIBUTION_EXPENSE_EVIDENCE_ALLOWED_TYPES",
        "application/pdf,image/png",
    )
    get_settings.cache_clear()
    try:
        admin_headers = create_admin(client, "expense.files.finance@example.com")
        donor = register_user(client, "expense.files.donor@example.com", "Expense Donor")
        donor_headers = auth_headers(donor["access_token"])
        campaign = create_published_campaign(
            client,
            admin_headers,
            "Expense evidence file scholarship fund",
        )
        contribution_response = client.post(
            f"/api/v1/contributions/{campaign['id']}/pay",
            headers=donor_headers,
            json={
                "amount_cents": 8000,
                "currency": "USD",
                "payment_method": "CARD_TEST",
                "payment_reference": "EXP-FILE-100",
            },
        )
        assert contribution_response.status_code == 201

        disbursement_response = client.post(
            f"/api/v1/contributions/admin/campaigns/{campaign['id']}/disbursement-requests",
            headers=admin_headers,
            json={
                "amount_cents": 4000,
                "currency": "USD",
                "payee_name": "Chapter Program Lead",
                "payee_reference": "BANK-EXP-FILE-001",
                "purpose": "Scholarship material purchase with uploaded evidence.",
            },
        )
        assert disbursement_response.status_code == 201
        disbursement = disbursement_response.json()
        approve_response = client.post(
            f"/api/v1/contributions/admin/disbursement-requests/{disbursement['id']}/approve",
            headers=admin_headers,
            json={"note": "Approved for file evidence test."},
        )
        assert approve_response.status_code == 200
        mark_paid_response = client.post(
            f"/api/v1/contributions/admin/disbursement-requests/{disbursement['id']}/mark-paid",
            headers=admin_headers,
            json={"note": "Paid for file evidence test."},
        )
        assert mark_paid_response.status_code == 200

        expense_response = client.post(
            f"/api/v1/contributions/admin/disbursement-requests/{disbursement['id']}/expense-reports",
            headers=admin_headers,
            json={
                "amount_cents": 3500,
                "currency": "USD",
                "summary": "Purchased workshop books",
                "vendor_name": "Workshop Books Ltd",
            },
        )
        assert expense_response.status_code == 201
        expense_report = expense_response.json()
        assert expense_report["evidence_items"] == []

        denied_upload = client.post(
            f"/api/v1/contributions/admin/expense-reports/{expense_report['id']}/evidence-files",
            files={"file": ("denied.pdf", b"%PDF-denied", "application/pdf")},
            headers=donor_headers,
        )
        assert denied_upload.status_code == 403

        invalid_type_upload = client.post(
            f"/api/v1/contributions/admin/expense-reports/{expense_report['id']}/evidence-files",
            files={"file": ("receipt.txt", b"receipt", "text/plain")},
            headers=admin_headers,
        )
        assert invalid_type_upload.status_code == 415

        oversized_upload = client.post(
            f"/api/v1/contributions/admin/expense-reports/{expense_report['id']}/evidence-files",
            files={"file": ("large.pdf", b"x" * 65, "application/pdf")},
            headers=admin_headers,
        )
        assert oversized_upload.status_code == 413

        receipt_bytes = b"%PDF-yalumni-expense-receipt"
        upload_response = client.post(
            f"/api/v1/contributions/admin/expense-reports/{expense_report['id']}/evidence-files",
            data={
                "amount_cents": "3500",
                "evidence_type": "receipt",
                "receipt_number": "RCPT-FILE-001",
                "title": "Book receipt scan",
            },
            files={"file": ("receipt.pdf", receipt_bytes, "application/pdf")},
            headers=admin_headers,
        )
        assert upload_response.status_code == 201
        evidence = upload_response.json()
        assert evidence["amount_cents"] == 3500
        assert evidence["content_type"] == "application/pdf"
        assert evidence["download_url"].endswith(f"/evidence/{evidence['id']}/download")
        assert evidence["evidence_type"] == "RECEIPT"
        assert evidence["expense_report_id"] == expense_report["id"]
        assert evidence["file_name"] == "receipt.pdf"
        assert evidence["file_size_bytes"] == len(receipt_bytes)
        assert evidence["receipt_number"] == "RCPT-FILE-001"
        assert evidence["storage_provider"] == "LOCAL"
        assert evidence["title"] == "Book receipt scan"
        assert (tmp_path / expense_report["id"] / f"{evidence['id']}.pdf").read_bytes() == (
            receipt_bytes
        )

        detail_response = client.get(
            f"/api/v1/contributions/admin/expense-reports/{expense_report['id']}",
            headers=admin_headers,
        )
        assert detail_response.status_code == 200
        assert detail_response.json()["evidence_items"][0]["download_url"] == (
            evidence["download_url"]
        )

        denied_download = client.get(evidence["download_url"], headers=donor_headers)
        assert denied_download.status_code == 403

        download_response = client.get(evidence["download_url"], headers=admin_headers)
        assert download_response.status_code == 200
        assert download_response.content == receipt_bytes
        assert download_response.headers["content-type"].startswith("application/pdf")

        approve_expense = client.post(
            f"/api/v1/contributions/admin/expense-reports/{expense_report['id']}/approve",
            headers=admin_headers,
            json={"note": "Approved after file evidence review."},
        )
        assert approve_expense.status_code == 200
        late_upload = client.post(
            f"/api/v1/contributions/admin/expense-reports/{expense_report['id']}/evidence-files",
            files={"file": ("late.pdf", b"%PDF-late", "application/pdf")},
            headers=admin_headers,
        )
        assert late_upload.status_code == 409
    finally:
        get_settings.cache_clear()


def test_contribution_campaign_approval_workflow_foundation(client: TestClient) -> None:
    admin_headers = create_admin(client, "approval.finance@example.com")
    member = register_user(client, "approval.member@example.com", "Approval Member")
    member_headers = auth_headers(member["access_token"])

    create_response = client.post(
        "/api/v1/contributions/admin/campaigns",
        headers=admin_headers,
        json=campaign_payload("Approval workflow scholarship fund"),
    )
    assert create_response.status_code == 201
    campaign = create_response.json()
    assert campaign["status"] == "DRAFT"

    denied_request = client.post(
        f"/api/v1/contributions/admin/campaigns/{campaign['id']}/request-approval",
        headers=member_headers,
        json={"note": "Member cannot submit finance campaign approval."},
    )
    assert denied_request.status_code == 403

    request_response = client.post(
        f"/api/v1/contributions/admin/campaigns/{campaign['id']}/request-approval",
        headers=admin_headers,
        json={"note": "Ready for approval review."},
    )
    assert request_response.status_code == 200
    assert request_response.json()["status"] == "PENDING_APPROVAL"

    hidden_pending = client.get("/api/v1/contributions", headers=member_headers)
    assert hidden_pending.status_code == 200
    assert hidden_pending.json()["total"] == 0

    pending_admin_list = client.get(
        "/api/v1/contributions/admin/campaigns",
        headers=admin_headers,
        params={"status": "pending-approval"},
    )
    assert pending_admin_list.status_code == 200
    assert pending_admin_list.json()["total"] == 1

    approve_response = client.post(
        f"/api/v1/contributions/admin/campaigns/{campaign['id']}/approve",
        headers=admin_headers,
        json={"note": "Approved for publication."},
    )
    assert approve_response.status_code == 200
    assert approve_response.json()["status"] == "APPROVED"

    hidden_approved = client.get("/api/v1/contributions", headers=member_headers)
    assert hidden_approved.status_code == 200
    assert hidden_approved.json()["total"] == 0

    duplicate_approval = client.post(
        f"/api/v1/contributions/admin/campaigns/{campaign['id']}/approve",
        headers=admin_headers,
        json={"note": "Already approved."},
    )
    assert duplicate_approval.status_code == 409

    publish_response = client.post(
        f"/api/v1/contributions/admin/campaigns/{campaign['id']}/publish",
        headers=admin_headers,
        json={"note": "Publish approved campaign."},
    )
    assert publish_response.status_code == 200
    assert publish_response.json()["status"] == "PUBLISHED"

    visible_published = client.get("/api/v1/contributions", headers=member_headers)
    assert visible_published.status_code == 200
    assert visible_published.json()["total"] == 1


def test_contribution_finance_role_and_receipt_privacy_are_enforced(client: TestClient) -> None:
    admin_headers = create_admin(client, "finance.owner@example.com")
    member = register_user(client, "member.finance@example.com", "Finance Member")
    other = register_user(client, "other.finance@example.com", "Other Member")
    member_headers = auth_headers(member["access_token"])
    other_headers = auth_headers(other["access_token"])

    denied_create = client.post(
        "/api/v1/contributions/admin/campaigns",
        headers=member_headers,
        json=campaign_payload("Denied campaign"),
    )
    assert denied_create.status_code == 403
    denied_audit_package = client.get(
        "/api/v1/contributions/admin/treasury/audit-package",
        headers=member_headers,
    )
    assert denied_audit_package.status_code == 403
    denied_audit_report = client.get(
        "/api/v1/contributions/admin/treasury/audit-report",
        headers=member_headers,
    )
    assert denied_audit_report.status_code == 403
    denied_certification_create = client.post(
        "/api/v1/contributions/admin/treasury/certifications",
        headers=member_headers,
        json={"note": "Members cannot certify treasury snapshots."},
    )
    assert denied_certification_create.status_code == 403
    denied_certification_list = client.get(
        "/api/v1/contributions/admin/treasury/certifications",
        headers=member_headers,
    )
    assert denied_certification_list.status_code == 403
    denied_webhook_events = client.get(
        "/api/v1/contributions/admin/webhook-events",
        headers=member_headers,
    )
    assert denied_webhook_events.status_code == 403
    denied_payment_attempts = client.get(
        "/api/v1/contributions/admin/payment-attempts",
        headers=member_headers,
    )
    assert denied_payment_attempts.status_code == 403

    create_response = client.post(
        "/api/v1/contributions/admin/campaigns",
        headers=admin_headers,
        json=campaign_payload("Chapter microgrant reserve"),
    )
    assert create_response.status_code == 201
    campaign_id = create_response.json()["id"]
    publish_response = client.post(
        f"/api/v1/contributions/admin/campaigns/{campaign_id}/publish",
        headers=admin_headers,
        json={},
    )
    assert publish_response.status_code == 200

    pending_contribution_id = create_pending_contribution_for_test(
        amount_cents=7000,
        campaign_id=campaign_id,
        contributor_user_id=member["user"]["id"],
    )
    void_response = client.post(
        f"/api/v1/contributions/admin/contributions/{pending_contribution_id}/void",
        headers=admin_headers,
        json={"note": "Pending transfer canceled."},
    )
    assert void_response.status_code == 200
    assert void_response.json()["status"] == "VOIDED"

    duplicate_void = client.post(
        f"/api/v1/contributions/admin/contributions/{pending_contribution_id}/void",
        headers=admin_headers,
        json={"note": "Second void should be blocked."},
    )
    assert duplicate_void.status_code == 409

    voided_treasury_response = client.get(
        "/api/v1/contributions/admin/treasury",
        headers=admin_headers,
    )
    assert voided_treasury_response.status_code == 200
    voided_treasury = voided_treasury_response.json()
    assert voided_treasury["ledger_entries"][0]["entry_type"] == "CONTRIBUTION_VOID"
    assert voided_treasury["ledger_entries"][0]["amount_cents"] == 0

    invalid_method = client.post(
        f"/api/v1/contributions/{campaign_id}/pay",
        headers=member_headers,
        json={"amount_cents": 5000, "currency": "USD", "payment_method": "crypto"},
    )
    assert invalid_method.status_code == 400
    invalid_intent_method = client.post(
        f"/api/v1/contributions/{campaign_id}/payment-intents",
        headers=member_headers,
        json={"amount_cents": 5000, "currency": "USD", "payment_method": "crypto"},
    )
    assert invalid_intent_method.status_code == 400

    intent_response = client.post(
        f"/api/v1/contributions/{campaign_id}/payment-intents",
        headers=member_headers,
        json={
            "amount_cents": 7200,
            "currency": "USD",
            "note": "Confirm this local intent.",
            "payment_method": "CARD_TEST",
        },
    )
    assert intent_response.status_code == 201
    intent = intent_response.json()
    assert intent["checkout_attempt_id"]
    assert intent["checkout_url"] is None
    assert intent["client_secret"].startswith(f"{intent['provider_intent_id']}_secret_")
    admin_attempts = client.get(
        "/api/v1/contributions/admin/payment-attempts"
        "?provider=local-test&status=requires-confirmation",
        headers=admin_headers,
    )
    assert admin_attempts.status_code == 200
    admin_attempt_list = admin_attempts.json()
    assert admin_attempt_list["total"] == 1
    assert admin_attempt_list["has_more"] is False
    assert admin_attempt_list["limit"] == 25
    assert admin_attempt_list["offset"] == 0
    admin_attempt = admin_attempt_list["attempts"][0]
    assert admin_attempt["id"] == intent["checkout_attempt_id"]
    assert admin_attempt["payment_intent_id"] == intent["id"]
    assert admin_attempt["payment_intent_status"] == "REQUIRES_CONFIRMATION"
    assert admin_attempt["campaign_id"] == campaign_id
    assert admin_attempt["contributor_user_id"] == member["user"]["id"]
    assert admin_attempt["provider"] == "LOCAL_TEST"
    assert admin_attempt["provider_intent_id"] == intent["provider_intent_id"]
    assert admin_attempt["has_client_secret"] is True
    assert admin_attempt["has_checkout_url"] is False
    assert admin_attempt["error_message"] is None
    created_attempts = payment_attempt_snapshots_for_intent(intent["id"])
    assert created_attempts == [
        {
            "client_secret": intent["client_secret"],
            "error_message": None,
            "provider": "LOCAL_TEST",
            "provider_intent_id": intent["provider_intent_id"],
            "response_adapter": "LOCAL_TEST",
            "status": "REQUIRES_CONFIRMATION",
        }
    ]

    denied_confirm = client.post(
        f"/api/v1/contributions/{campaign_id}/payment-intents/{intent['id']}/confirm",
        headers=other_headers,
    )
    assert denied_confirm.status_code == 404

    confirmed_intent = client.post(
        f"/api/v1/contributions/{campaign_id}/payment-intents/{intent['id']}/confirm",
        headers=member_headers,
    )
    assert confirmed_intent.status_code == 201
    confirmed = confirmed_intent.json()
    assert confirmed["amount_cents"] == 7200
    assert confirmed["payment_reference"] == intent["provider_intent_id"]
    assert confirmed["receipt_id"]
    assert confirmed["status"] == "RECEIVED"
    confirmed_admin_attempts = client.get(
        f"/api/v1/contributions/admin/payment-attempts"
        f"?payment_intent_id={intent['id']}&status=confirmed",
        headers=admin_headers,
    )
    assert confirmed_admin_attempts.status_code == 200
    confirmed_admin_attempt_list = confirmed_admin_attempts.json()
    assert confirmed_admin_attempt_list["total"] == 1
    assert confirmed_admin_attempt_list["attempts"][0]["status"] == "CONFIRMED"
    assert (
        confirmed_admin_attempt_list["attempts"][0]["payment_intent_status"]
        == "CONFIRMED"
    )
    confirmed_attempts = payment_attempt_snapshots_for_intent(intent["id"])
    assert confirmed_attempts[0]["status"] == "CONFIRMED"
    assert confirmed_attempts[0]["error_message"] is None

    duplicate_confirm = client.post(
        f"/api/v1/contributions/{campaign_id}/payment-intents/{intent['id']}/confirm",
        headers=member_headers,
    )
    assert duplicate_confirm.status_code == 409

    provider_refund = client.post(
        f"/api/v1/contributions/admin/contributions/{confirmed['id']}/provider-refund",
        headers=admin_headers,
        json={"note": "Local provider refund fallback."},
    )
    assert provider_refund.status_code == 200
    provider_refunded = provider_refund.json()
    assert provider_refunded["status"] == "REFUNDED"
    assert provider_refunded["receipt_id"] == confirmed["receipt_id"]

    duplicate_provider_refund = client.post(
        f"/api/v1/contributions/admin/contributions/{confirmed['id']}/provider-refund",
        headers=admin_headers,
        json={"note": "Second provider refund should be blocked."},
    )
    assert duplicate_provider_refund.status_code == 409

    payment_response = client.post(
        f"/api/v1/contributions/{campaign_id}/pay",
        headers=member_headers,
        json={"amount_cents": 5000, "currency": "USD", "payment_method": "MOBILE_MONEY"},
    )
    assert payment_response.status_code == 201
    payment = payment_response.json()
    receipt_id = payment["receipt_id"]

    denied_refund = client.post(
        f"/api/v1/contributions/admin/contributions/{payment['id']}/refund",
        headers=member_headers,
        json={"note": "Member cannot refund."},
    )
    assert denied_refund.status_code == 403

    denied_provider_refund = client.post(
        f"/api/v1/contributions/admin/contributions/{payment['id']}/provider-refund",
        headers=member_headers,
        json={"note": "Member cannot request provider refund."},
    )
    assert denied_provider_refund.status_code == 403

    missing_reference_provider_refund = client.post(
        f"/api/v1/contributions/admin/contributions/{payment['id']}/provider-refund",
        headers=admin_headers,
        json={"note": "Provider refund needs a provider reference."},
    )
    assert missing_reference_provider_refund.status_code == 409
    assert (
        missing_reference_provider_refund.json()["detail"]
        == "Provider refund requires a payment reference"
    )

    other_receipt = client.get(
        f"/api/v1/contributions/receipts/{receipt_id}",
        headers=other_headers,
    )
    assert other_receipt.status_code == 404

    other_receipt_download = client.get(
        f"/api/v1/contributions/receipts/{receipt_id}/download",
        headers=other_headers,
    )
    assert other_receipt_download.status_code == 404
    other_receipt_pdf_download = client.get(
        f"/api/v1/contributions/receipts/{receipt_id}/download.pdf",
        headers=other_headers,
    )
    assert other_receipt_pdf_download.status_code == 404

    admin_receipt = client.get(
        f"/api/v1/contributions/receipts/{receipt_id}",
        headers=admin_headers,
    )
    assert admin_receipt.status_code == 200

    admin_receipt_download = client.get(
        f"/api/v1/contributions/receipts/{receipt_id}/download",
        headers=admin_headers,
    )
    assert admin_receipt_download.status_code == 200
    admin_receipt_pdf_download = client.get(
        f"/api/v1/contributions/receipts/{receipt_id}/download.pdf",
        headers=admin_headers,
    )
    assert admin_receipt_pdf_download.status_code == 200


def test_provider_webhook_confirms_payment_intent_idempotently(
    client: TestClient,
) -> None:
    settings = get_settings()
    previous_secret = settings.contribution_webhook_secret
    settings.contribution_webhook_secret = "test-webhook-secret"
    try:
        admin_headers = create_admin(client, "webhook.finance@example.com")
        member = register_user(client, "webhook.donor@example.com", "Webhook Donor")
        member_headers = auth_headers(member["access_token"])
        campaign = create_published_campaign(
            client,
            admin_headers,
            "Webhook scholarship fund",
        )
        intent_response = client.post(
            f"/api/v1/contributions/{campaign['id']}/payment-intents",
            headers=member_headers,
            json={
                "amount_cents": 7200,
                "currency": "USD",
                "note": "Webhook-confirmed intent.",
                "payment_method": "CARD_TEST",
            },
        )
        assert intent_response.status_code == 201
        intent = intent_response.json()
        payload = {
            "amount_cents": 7200,
            "currency": "usd",
            "event_type": "payment_intent.succeeded",
            "provider_event_id": "evt_webhook_success",
            "provider_intent_id": intent["provider_intent_id"],
        }
        raw_body = webhook_body(payload)

        webhook_response = client.post(
            "/api/v1/contributions/webhooks/local-test",
            content=raw_body,
            headers=signed_webhook_headers(raw_body),
        )
        assert webhook_response.status_code == 200
        webhook_result = webhook_response.json()
        assert webhook_result["reconciled"] is True
        assert webhook_result["event_type"] == "PAYMENT_INTENT_SUCCEEDED"
        assert webhook_result["payment_intent_status"] == "CONFIRMED"
        assert webhook_result["provider"] == "LOCAL_TEST"
        assert webhook_result["contribution_id"]
        assert webhook_result["receipt_id"]

        duplicate_response = client.post(
            "/api/v1/contributions/webhooks/local-test",
            content=raw_body,
            headers=signed_webhook_headers(raw_body),
        )
        assert duplicate_response.status_code == 200
        duplicate_result = duplicate_response.json()
        assert duplicate_result["reconciled"] is False
        assert duplicate_result["contribution_id"] == webhook_result["contribution_id"]

        contribution_list = client.get(
            "/api/v1/contributions/admin/contributions",
            headers=admin_headers,
        )
        assert contribution_list.status_code == 200
        assert contribution_list.json()["total"] == 1

        event_list = client.get(
            "/api/v1/contributions/admin/webhook-events",
            headers=admin_headers,
            params={"provider_intent_id": intent["provider_intent_id"]},
        )
        assert event_list.status_code == 200
        event_log = event_list.json()
        assert event_log["total"] == 1
        assert event_log["events"][0]["delivery_count"] == 2
        assert event_log["events"][0]["status"] == "DUPLICATE"
        assert event_log["events"][0]["contribution_id"] == webhook_result["contribution_id"]

        duplicate_manual_confirm = client.post(
            f"/api/v1/contributions/{campaign['id']}/payment-intents/{intent['id']}/confirm",
            headers=member_headers,
        )
        assert duplicate_manual_confirm.status_code == 409
    finally:
        settings.contribution_webhook_secret = previous_secret


def test_provider_webhook_rejects_bad_signature_and_mismatched_amount(
    client: TestClient,
) -> None:
    settings = get_settings()
    previous_secret = settings.contribution_webhook_secret
    settings.contribution_webhook_secret = "test-webhook-secret"
    try:
        admin_headers = create_admin(client, "webhook.reject.finance@example.com")
        member = register_user(client, "webhook.reject.donor@example.com", "Webhook Reject Donor")
        member_headers = auth_headers(member["access_token"])
        campaign = create_published_campaign(
            client,
            admin_headers,
            "Webhook rejection fund",
        )
        intent_response = client.post(
            f"/api/v1/contributions/{campaign['id']}/payment-intents",
            headers=member_headers,
            json={
                "amount_cents": 9100,
                "currency": "USD",
                "payment_method": "CARD_TEST",
            },
        )
        assert intent_response.status_code == 201
        intent = intent_response.json()
        payload = {
            "amount_cents": 9100,
            "currency": "USD",
            "event_type": "payment_intent.succeeded",
            "provider_event_id": "evt_bad_signature",
            "provider_intent_id": intent["provider_intent_id"],
        }
        raw_body = webhook_body(payload)

        bad_signature_response = client.post(
            "/api/v1/contributions/webhooks/local-test",
            content=raw_body,
            headers={
                "content-type": "application/json",
                "x-yalumni-webhook-signature": "sha256=bad-signature",
            },
        )
        assert bad_signature_response.status_code == 401

        mismatched_payload = {**payload, "amount_cents": 9200}
        mismatched_body = webhook_body(mismatched_payload)
        mismatched_response = client.post(
            "/api/v1/contributions/webhooks/local-test",
            content=mismatched_body,
            headers=signed_webhook_headers(mismatched_body),
        )
        assert mismatched_response.status_code == 409
        rejected_events = client.get(
            "/api/v1/contributions/admin/webhook-events",
            headers=admin_headers,
            params={"status": "REJECTED"},
        )
        assert rejected_events.status_code == 200
        rejected_event_list = rejected_events.json()
        assert rejected_event_list["total"] == 1
        assert rejected_event_list["events"][0]["error_message"] == (
            "Webhook amount does not match payment intent"
        )

        manual_confirm = client.post(
            f"/api/v1/contributions/{campaign['id']}/payment-intents/{intent['id']}/confirm",
            headers=member_headers,
        )
        assert manual_confirm.status_code == 201
    finally:
        settings.contribution_webhook_secret = previous_secret


def test_provider_webhook_marks_failed_payment_intent_idempotently(
    client: TestClient,
) -> None:
    settings = get_settings()
    previous_secret = settings.contribution_webhook_secret
    settings.contribution_webhook_secret = "test-webhook-secret"
    try:
        admin_headers = create_admin(client, "webhook.failed.finance@example.com")
        member = register_user(client, "webhook.failed.donor@example.com", "Webhook Failed Donor")
        other = register_user(client, "webhook.failed.other@example.com", "Other Donor")
        member_headers = auth_headers(member["access_token"])
        other_headers = auth_headers(other["access_token"])
        campaign = create_published_campaign(
            client,
            admin_headers,
            "Webhook failed intent fund",
        )
        intent_response = client.post(
            f"/api/v1/contributions/{campaign['id']}/payment-intents",
            headers=member_headers,
            json={
                "amount_cents": 6400,
                "currency": "USD",
                "payment_method": "CARD_TEST",
            },
        )
        assert intent_response.status_code == 201
        intent = intent_response.json()
        payload = {
            "amount_cents": 6400,
            "currency": "USD",
            "event_type": "payment_intent.failed",
            "failure_reason": "Provider declined the payment.",
            "provider_event_id": "evt_webhook_failed",
            "provider_intent_id": intent["provider_intent_id"],
        }
        raw_body = webhook_body(payload)

        failed_response = client.post(
            "/api/v1/contributions/webhooks/local-test",
            content=raw_body,
            headers=signed_webhook_headers(raw_body),
        )
        assert failed_response.status_code == 200
        failed_result = failed_response.json()
        assert failed_result["reconciled"] is True
        assert failed_result["contribution_id"] is None
        assert failed_result["payment_intent_status"] == "FAILED"
        failed_attempts = payment_attempt_snapshots_for_intent(intent["id"])
        assert failed_attempts[0]["status"] == "FAILED"
        assert failed_attempts[0]["error_message"] == "Provider declined the payment."

        duplicate_failed_response = client.post(
            "/api/v1/contributions/webhooks/local-test",
            content=raw_body,
            headers=signed_webhook_headers(raw_body),
        )
        assert duplicate_failed_response.status_code == 200
        assert duplicate_failed_response.json()["reconciled"] is False
        failed_event_list = client.get(
            "/api/v1/contributions/admin/webhook-events",
            headers=admin_headers,
            params={"status": "FAILED"},
        )
        assert failed_event_list.status_code == 200
        failed_events = failed_event_list.json()
        assert failed_events["total"] == 1
        assert failed_events["events"][0]["delivery_count"] == 2
        assert failed_events["events"][0]["payment_intent_id"] == intent["id"]

        manual_confirm = client.post(
            f"/api/v1/contributions/{campaign['id']}/payment-intents/{intent['id']}/confirm",
            headers=member_headers,
        )
        assert manual_confirm.status_code == 409
        denied_retry = client.post(
            f"/api/v1/contributions/{campaign['id']}/payment-intents/{intent['id']}/retry",
            headers=other_headers,
        )
        assert denied_retry.status_code == 404
        retry_response = client.post(
            f"/api/v1/contributions/{campaign['id']}/payment-intents/{intent['id']}/retry",
            headers=member_headers,
        )
        assert retry_response.status_code == 201
        retried_intent = retry_response.json()
        assert retried_intent["id"] == intent["id"]
        assert retried_intent["status"] == "REQUIRES_CONFIRMATION"
        assert retried_intent["checkout_attempt_id"] != intent["checkout_attempt_id"]
        assert retried_intent["provider_intent_id"] == intent["provider_intent_id"]
        assert retried_intent["client_secret"] != intent["client_secret"]
        retried_attempts = payment_attempt_snapshots_for_intent(intent["id"])
        assert [attempt["status"] for attempt in retried_attempts] == [
            "FAILED",
            "REQUIRES_CONFIRMATION",
        ]

        confirmed_retry = client.post(
            f"/api/v1/contributions/{campaign['id']}/payment-intents/{intent['id']}/confirm",
            headers=member_headers,
        )
        assert confirmed_retry.status_code == 201
        assert confirmed_retry.json()["payment_reference"] == intent["provider_intent_id"]
    finally:
        settings.contribution_webhook_secret = previous_secret
