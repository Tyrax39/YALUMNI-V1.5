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
from app.modules.resources import models as resource_models
from app.modules.success_stories import models as success_story_models

_ = (
    alumni_models,
    auth_models,
    community_models,
    message_models,
    notification_models,
    opportunity_models,
    resource_models,
    success_story_models,
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
    email: str = "stories.admin@example.com",
) -> dict[str, str]:
    registered = register_user(client, email, "Stories Admin")
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


def story_payload(title: str = "Community agritech fellows scale irrigation") -> dict:
    return {
        "beneficiary_count": 2400,
        "body": (
            "Alumni fellows coordinated chapter partners, village cooperatives, and local "
            "government teams to expand low-cost irrigation access while documenting the "
            "operating model for other YALI chapters to reuse."
        ),
        "cohort_year": 2024,
        "country": "Zambia",
        "external_url": "https://example.org/stories/agritech-fellows",
        "impact_metric": "2,400 farmers reached",
        "media_url": "https://example.org/media/agritech.jpg",
        "program": "Mandela Washington Fellowship",
        "sector": "Agriculture",
        "summary": "A chapter-led irrigation initiative reached rural producers across Zambia.",
        "title": title,
    }


def test_member_submission_admin_approval_and_published_listing(client: TestClient) -> None:
    admin_headers = create_admin(client)
    member = register_user(client, "story.member@example.com", "Story Member")
    member_headers = auth_headers(member["access_token"])

    submit_response = client.post(
        "/api/v1/success-stories",
        headers=member_headers,
        json=story_payload(),
    )
    assert submit_response.status_code == 201
    submitted = submit_response.json()
    assert submitted["status"] == "PENDING_REVIEW"
    assert submitted["country"] == "Zambia"
    assert submitted["created_by_display_name"] == "Story Member"

    public_list = client.get("/api/v1/success-stories", headers=member_headers)
    assert public_list.status_code == 200
    assert public_list.json()["total"] == 0

    mine_response = client.get("/api/v1/success-stories?mine=true", headers=member_headers)
    assert mine_response.status_code == 200
    assert mine_response.json()["stories"][0]["id"] == submitted["id"]

    queue_response = client.get(
        "/api/v1/success-stories/admin/review-queue",
        headers=admin_headers,
    )
    assert queue_response.status_code == 200
    queue = queue_response.json()
    assert queue["total"] == 1
    assert queue["stories"][0]["title"] == "Community agritech fellows scale irrigation"

    approve_response = client.post(
        f"/api/v1/success-stories/admin/{submitted['id']}/approve",
        headers=admin_headers,
        json={"reviewer_note": "Approved for the live story publishing slice."},
    )
    assert approve_response.status_code == 200
    approved = approve_response.json()
    assert approved["status"] == "PUBLISHED"
    assert approved["published_at"] is not None
    assert approved["reviewed_by_display_name"] == "Stories Admin"

    published_list = client.get("/api/v1/success-stories?q=irrigation", headers=member_headers)
    assert published_list.status_code == 200
    assert published_list.json()["total"] == 1

    detail_response = client.get(
        f"/api/v1/success-stories/{submitted['id']}",
        headers=member_headers,
    )
    assert detail_response.status_code == 200
    assert detail_response.json()["impact_metric"] == "2,400 farmers reached"


def test_story_review_actions_and_admin_role_required(client: TestClient) -> None:
    admin_headers = create_admin(client, "stories.reviewer@example.com")
    member = register_user(client, "story.submitter@example.com", "Story Submitter")
    member_headers = auth_headers(member["access_token"])

    submit_response = client.post(
        "/api/v1/success-stories",
        headers=member_headers,
        json=story_payload("Open budget fellows improve local reporting"),
    )
    assert submit_response.status_code == 201
    story_id = submit_response.json()["id"]

    denied_queue = client.get(
        "/api/v1/success-stories/admin/review-queue",
        headers=member_headers,
    )
    assert denied_queue.status_code == 403

    changes_response = client.post(
        f"/api/v1/success-stories/admin/{story_id}/request-changes",
        headers=admin_headers,
        json={"reviewer_note": "Add consent and media usage confirmation."},
    )
    assert changes_response.status_code == 200
    changed = changes_response.json()
    assert changed["status"] == "NEEDS_CHANGES"
    assert changed["published_at"] is None

    needs_changes_queue = client.get(
        "/api/v1/success-stories/admin/review-queue?status=NEEDS_CHANGES",
        headers=admin_headers,
    )
    assert needs_changes_queue.status_code == 200
    assert needs_changes_queue.json()["total"] == 1

    reject_response = client.post(
        f"/api/v1/success-stories/admin/{story_id}/reject",
        headers=admin_headers,
        json={"reviewer_note": "Rejected because evidence rights are unclear."},
    )
    assert reject_response.status_code == 200
    assert reject_response.json()["status"] == "REJECTED"

    published_list = client.get("/api/v1/success-stories", headers=member_headers)
    assert published_list.status_code == 200
    assert published_list.json()["total"] == 0
