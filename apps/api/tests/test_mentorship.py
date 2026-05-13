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


def mentor_payload(headline: str = "Civic technology mentor") -> dict:
    return {
        "availability_status": "available",
        "bio": (
            "I help emerging alumni leaders structure civic technology programs, "
            "partnership plans, and practical delivery milestones."
        ),
        "countries": ["Rwanda", "Kenya"],
        "expertise_areas": ["Civic technology", "Program design"],
        "headline": headline,
        "is_accepting_requests": True,
        "is_active": True,
        "max_active_mentees": 4,
        "preferred_meeting_format": "virtual",
        "sectors": ["Technology", "Civic leadership"],
        "years_experience": 8,
    }


def request_payload(mentor_profile_id: str) -> dict:
    return {
        "focus_area": "Program design",
        "goals": (
            "I want help turning a youth digital services idea into a realistic "
            "three-month chapter initiative with measurable outcomes."
        ),
        "mentor_profile_id": mentor_profile_id,
        "message": "I can meet twice a month and share a draft concept note.",
    }


def test_mentorship_profile_discovery_request_and_accept(client: TestClient) -> None:
    mentor = register_user(client, "mentor@example.com", "Mentor Leader")
    mentee = register_user(client, "mentee@example.com", "Mentee Member")
    mentor_headers = auth_headers(mentor["access_token"])
    mentee_headers = auth_headers(mentee["access_token"])

    profile_response = client.put(
        "/api/v1/mentorship/mentors/me",
        headers=mentor_headers,
        json=mentor_payload(),
    )
    assert profile_response.status_code == 200
    profile = profile_response.json()
    assert profile["display_name"] == "Mentor Leader"
    assert profile["availability_status"] == "AVAILABLE"
    assert profile["preferred_meeting_format"] == "VIRTUAL"

    list_response = client.get(
        "/api/v1/mentorship/mentors?expertise=civic&country=Rwanda",
        headers=mentee_headers,
    )
    assert list_response.status_code == 200
    listed = list_response.json()
    assert listed["total"] == 1
    assert listed["mentors"][0]["id"] == profile["id"]

    create_response = client.post(
        "/api/v1/mentorship/requests",
        headers=mentee_headers,
        json=request_payload(profile["id"]),
    )
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["status"] == "PENDING"
    assert created["mentor_display_name"] == "Mentor Leader"
    assert created["requester_display_name"] == "Mentee Member"

    duplicate_response = client.post(
        "/api/v1/mentorship/requests",
        headers=mentee_headers,
        json=request_payload(profile["id"]),
    )
    assert duplicate_response.status_code == 409

    incoming_response = client.get(
        "/api/v1/mentorship/requests?direction=incoming",
        headers=mentor_headers,
    )
    assert incoming_response.status_code == 200
    assert incoming_response.json()["total"] == 1

    denied_review = client.post(
        f"/api/v1/mentorship/requests/{created['id']}/accept",
        headers=mentee_headers,
        json={"reviewer_note": "I should not be able to accept this."},
    )
    assert denied_review.status_code == 404

    accepted_response = client.post(
        f"/api/v1/mentorship/requests/{created['id']}/accept",
        headers=mentor_headers,
        json={"reviewer_note": "Happy to help with the initiative plan."},
    )
    assert accepted_response.status_code == 200
    accepted = accepted_response.json()
    assert accepted["status"] == "ACCEPTED"
    assert accepted["reviewer_note"] == "Happy to help with the initiative plan."

    summary_response = client.get("/api/v1/mentorship/summary", headers=mentor_headers)
    assert summary_response.status_code == 200
    summary = summary_response.json()
    assert summary["mentor_profile"]["active_request_count"] == 1
    assert summary["incoming_requests"][0]["status"] == "ACCEPTED"


def test_mentorship_auth_self_request_cancel_and_availability(client: TestClient) -> None:
    mentor = register_user(client, "mentor2@example.com", "Second Mentor")
    mentee = register_user(client, "mentee2@example.com", "Second Mentee")
    mentor_headers = auth_headers(mentor["access_token"])
    mentee_headers = auth_headers(mentee["access_token"])

    assert client.get("/api/v1/mentorship/mentors").status_code == 401

    profile = client.put(
        "/api/v1/mentorship/mentors/me",
        headers=mentor_headers,
        json=mentor_payload("Education mentor"),
    ).json()

    self_request = client.post(
        "/api/v1/mentorship/requests",
        headers=mentor_headers,
        json=request_payload(profile["id"]),
    )
    assert self_request.status_code == 400

    create_response = client.post(
        "/api/v1/mentorship/requests",
        headers=mentee_headers,
        json=request_payload(profile["id"]),
    )
    assert create_response.status_code == 201
    created = create_response.json()

    cancel_response = client.post(
        f"/api/v1/mentorship/requests/{created['id']}/cancel",
        headers=mentee_headers,
    )
    assert cancel_response.status_code == 200
    assert cancel_response.json()["status"] == "CANCELLED"

    paused = {
        **mentor_payload("Paused mentor"),
        "availability_status": "PAUSED",
        "is_accepting_requests": False,
    }
    paused_response = client.put(
        "/api/v1/mentorship/mentors/me",
        headers=mentor_headers,
        json=paused,
    )
    assert paused_response.status_code == 200

    unavailable_request = client.post(
        "/api/v1/mentorship/requests",
        headers=mentee_headers,
        json=request_payload(profile["id"]),
    )
    assert unavailable_request.status_code == 409
