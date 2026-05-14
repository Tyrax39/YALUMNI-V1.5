import hashlib
import hmac
import json
import uuid
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
