from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db_session
from app.core.email import clear_email_outbox
from app.core.rate_limit import clear_rate_limits
from app.main import app
from app.modules.alumni import models as alumni_models
from app.modules.auth import models as auth_models
from app.modules.communities import models as community_models
from app.modules.messages import models as message_models
from app.modules.notifications import models as notification_models
from app.modules.opportunities import models as opportunity_models

_ = (
    alumni_models,
    auth_models,
    community_models,
    message_models,
    notification_models,
    opportunity_models,
)


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


def create_admin(
    client: TestClient,
    email: str = "opportunities.admin@example.com",
) -> dict[str, str]:
    registered = register_user(client, email, "Opportunities Admin")
    bootstrap_response = client.post(
        "/api/v1/auth/dev/bootstrap-admin",
        headers=auth_headers(registered["access_token"]),
    )
    assert bootstrap_response.status_code == 200
    return auth_headers(registered["access_token"])


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


def opportunity_payload(title: str = "Civic innovation fellowship") -> dict:
    return {
        "application_url": "https://example.org/apply",
        "country": "Rwanda",
        "deadline_at": "2026-06-15T12:00:00Z",
        "description": "A leadership fellowship for alumni building transparent civic technology.",
        "location": "Kigali",
        "opportunity_type": "fellowship",
        "organization": "YALUMNI Partner Network",
        "remote_policy": "hybrid",
        "title": title,
    }


def test_member_submission_admin_approval_and_published_listing(client: TestClient) -> None:
    admin_headers = create_admin(client)
    member = register_user(client, "opportunity.member@example.com", "Opportunity Member")
    member_headers = auth_headers(member["access_token"])

    submit_response = client.post(
        "/api/v1/opportunities",
        headers=member_headers,
        json=opportunity_payload(),
    )
    assert submit_response.status_code == 201
    submitted = submit_response.json()
    assert submitted["status"] == "PENDING_REVIEW"
    assert submitted["opportunity_type"] == "FELLOWSHIP"
    assert submitted["remote_policy"] == "HYBRID"
    assert submitted["created_by_display_name"] == "Opportunity Member"

    public_list = client.get("/api/v1/opportunities", headers=member_headers)
    assert public_list.status_code == 200
    assert public_list.json()["total"] == 0

    mine_response = client.get("/api/v1/opportunities?mine=true", headers=member_headers)
    assert mine_response.status_code == 200
    assert mine_response.json()["opportunities"][0]["id"] == submitted["id"]

    queue_response = client.get(
        "/api/v1/opportunities/admin/review-queue",
        headers=admin_headers,
    )
    assert queue_response.status_code == 200
    queue = queue_response.json()
    assert queue["total"] == 1
    assert queue["opportunities"][0]["title"] == "Civic innovation fellowship"

    approve_response = client.post(
        f"/api/v1/opportunities/admin/{submitted['id']}/approve",
        headers=admin_headers,
        json={"reviewer_note": "Approved for the first live opportunities slice."},
    )
    assert approve_response.status_code == 200
    approved = approve_response.json()
    assert approved["status"] == "PUBLISHED"
    assert approved["published_at"] is not None
    assert approved["reviewed_by_display_name"] == "Opportunities Admin"

    published_list = client.get("/api/v1/opportunities?q=civic", headers=member_headers)
    assert published_list.status_code == 200
    assert published_list.json()["total"] == 1

    detail_response = client.get(f"/api/v1/opportunities/{submitted['id']}", headers=member_headers)
    assert detail_response.status_code == 200
    assert detail_response.json()["application_url"] == "https://example.org/apply"


def test_opportunity_review_actions_and_admin_role_required(client: TestClient) -> None:
    admin_headers = create_admin(client, "opportunities.reviewer@example.com")
    member = register_user(client, "opportunity.submitter@example.com", "Opportunity Submitter")
    member_headers = auth_headers(member["access_token"])

    submit_response = client.post(
        "/api/v1/opportunities",
        headers=member_headers,
        json=opportunity_payload("Climate chapter grant"),
    )
    assert submit_response.status_code == 201
    opportunity_id = submit_response.json()["id"]

    denied_queue = client.get(
        "/api/v1/opportunities/admin/review-queue",
        headers=member_headers,
    )
    assert denied_queue.status_code == 403

    changes_response = client.post(
        f"/api/v1/opportunities/admin/{opportunity_id}/request-changes",
        headers=admin_headers,
        json={"reviewer_note": "Add a clearer application deadline."},
    )
    assert changes_response.status_code == 200
    changed = changes_response.json()
    assert changed["status"] == "NEEDS_CHANGES"
    assert changed["published_at"] is None

    needs_changes_queue = client.get(
        "/api/v1/opportunities/admin/review-queue?status=NEEDS_CHANGES",
        headers=admin_headers,
    )
    assert needs_changes_queue.status_code == 200
    assert needs_changes_queue.json()["total"] == 1

    reject_response = client.post(
        f"/api/v1/opportunities/admin/{opportunity_id}/reject",
        headers=admin_headers,
        json={"reviewer_note": "Rejected because eligibility is not alumni-focused."},
    )
    assert reject_response.status_code == 200
    assert reject_response.json()["status"] == "REJECTED"

    published_list = client.get("/api/v1/opportunities", headers=member_headers)
    assert published_list.status_code == 200
    assert published_list.json()["total"] == 0
