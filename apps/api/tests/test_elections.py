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


def create_admin(client: TestClient, email: str = "elections.admin@example.com") -> dict[str, str]:
    registered = register_user(client, email, "Elections Admin")
    bootstrap_response = client.post(
        "/api/v1/auth/dev/bootstrap-admin",
        headers=auth_headers(registered["access_token"]),
    )
    assert bootstrap_response.status_code == 200
    return auth_headers(registered["access_token"])


def election_payload(title: str = "YALUMNI Council 2026") -> dict:
    return {
        "description": (
            "A verified alumni vote to select the next council representative for the "
            "platform governance pilot and chapter operations roadmap."
        ),
        "ends_at": "2026-06-15T12:00:00Z",
        "quorum_count": 1,
        "results_visibility": "AFTER_CLOSE",
        "scope_label": "Platform pilot",
        "scope_type": "platform",
        "starts_at": "2026-05-01T12:00:00Z",
        "summary": "Select one representative for the YALUMNI council governance pilot.",
        "title": title,
    }


def candidate_payload(name: str = "Amina Leader") -> dict:
    return {
        "display_name": name,
        "headline": "Chapter governance candidate",
        "statement": (
            "I will improve transparent chapter operations, publish clearer council "
            "updates, and coordinate community feedback loops."
        ),
        "sort_order": 0,
    }


def test_election_lifecycle_voter_roll_vote_and_results(client: TestClient) -> None:
    admin_headers = create_admin(client)
    voter = register_user(client, "eligible.voter@example.com", "Eligible Voter")
    voter_headers = auth_headers(voter["access_token"])

    create_response = client.post(
        "/api/v1/elections/admin",
        headers=admin_headers,
        json=election_payload(),
    )
    assert create_response.status_code == 201
    election = create_response.json()
    assert election["status"] == "DRAFT"
    assert election["candidate_count"] == 0

    member_list_before_open = client.get("/api/v1/elections", headers=voter_headers)
    assert member_list_before_open.status_code == 200
    assert member_list_before_open.json()["total"] == 0

    open_without_setup = client.post(
        f"/api/v1/elections/admin/{election['id']}/open",
        headers=admin_headers,
        json={"note": "Try opening before candidate setup."},
    )
    assert open_without_setup.status_code == 409

    candidate_response = client.post(
        f"/api/v1/elections/admin/{election['id']}/candidates",
        headers=admin_headers,
        json=candidate_payload(),
    )
    assert candidate_response.status_code == 201
    candidate = candidate_response.json()
    assert candidate["display_name"] == "Amina Leader"

    roll_response = client.post(
        f"/api/v1/elections/admin/{election['id']}/voter-roll",
        headers=admin_headers,
        json={"emails": ["eligible.voter@example.com", "missing@example.com"]},
    )
    assert roll_response.status_code == 200
    roll = roll_response.json()
    assert roll["added_count"] == 1
    assert roll["not_found"] == ["missing@example.com"]
    assert roll["voters"][0]["email"] == "eligible.voter@example.com"

    open_response = client.post(
        f"/api/v1/elections/admin/{election['id']}/open",
        headers=admin_headers,
        json={"note": "Ready for voting."},
    )
    assert open_response.status_code == 200
    assert open_response.json()["status"] == "OPEN"

    member_list = client.get("/api/v1/elections?status=OPEN", headers=voter_headers)
    assert member_list.status_code == 200
    assert member_list.json()["total"] == 1
    assert member_list.json()["elections"][0]["can_vote"] is True

    hidden_results = client.get(
        f"/api/v1/elections/{election['id']}/results",
        headers=voter_headers,
    )
    assert hidden_results.status_code == 403

    vote_response = client.post(
        f"/api/v1/elections/{election['id']}/vote",
        headers=voter_headers,
        json={"candidate_id": candidate["id"]},
    )
    assert vote_response.status_code == 200
    voted = vote_response.json()
    assert voted["has_voted"] is True
    assert voted["can_vote"] is False
    assert voted["vote_count"] == 1

    duplicate_vote = client.post(
        f"/api/v1/elections/{election['id']}/vote",
        headers=voter_headers,
        json={"candidate_id": candidate["id"]},
    )
    assert duplicate_vote.status_code == 409

    close_response = client.post(
        f"/api/v1/elections/admin/{election['id']}/close",
        headers=admin_headers,
        json={"note": "Close after test vote."},
    )
    assert close_response.status_code == 200
    assert close_response.json()["status"] == "CLOSED"

    results_response = client.get(
        f"/api/v1/elections/{election['id']}/results",
        headers=voter_headers,
    )
    assert results_response.status_code == 200
    results = results_response.json()
    assert results["total_votes"] == 1
    assert results["quorum_met"] is True
    assert results["candidates"][0]["vote_count"] == 1
    assert results["candidates"][0]["percentage"] == 100

    audit_response = client.get(
        f"/api/v1/elections/admin/{election['id']}/audit",
        headers=admin_headers,
    )
    assert audit_response.status_code == 200
    assert {event["event_type"] for event in audit_response.json()["events"]} >= {
        "elections.created",
        "elections.opened",
        "elections.closed",
    }


def test_election_admin_role_and_voter_eligibility_are_enforced(client: TestClient) -> None:
    admin_headers = create_admin(client, "elections.reviewer@example.com")
    member = register_user(client, "non.admin.election@example.com", "Election Member")
    outsider = register_user(client, "outsider.election@example.com", "Election Outsider")
    member_headers = auth_headers(member["access_token"])
    outsider_headers = auth_headers(outsider["access_token"])

    denied_create = client.post(
        "/api/v1/elections/admin",
        headers=member_headers,
        json=election_payload("Denied election"),
    )
    assert denied_create.status_code == 403

    create_response = client.post(
        "/api/v1/elections/admin",
        headers=admin_headers,
        json=election_payload("Treasurer by-election"),
    )
    assert create_response.status_code == 201
    election_id = create_response.json()["id"]

    candidate_response = client.post(
        f"/api/v1/elections/admin/{election_id}/candidates",
        headers=admin_headers,
        json=candidate_payload("David Treasurer"),
    )
    assert candidate_response.status_code == 201
    candidate_id = candidate_response.json()["id"]

    roll_response = client.post(
        f"/api/v1/elections/admin/{election_id}/voter-roll",
        headers=admin_headers,
        json={"emails": ["non.admin.election@example.com"]},
    )
    assert roll_response.status_code == 200

    open_response = client.post(
        f"/api/v1/elections/admin/{election_id}/open",
        headers=admin_headers,
        json={},
    )
    assert open_response.status_code == 200

    ineligible_vote = client.post(
        f"/api/v1/elections/{election_id}/vote",
        headers=outsider_headers,
        json={"candidate_id": candidate_id},
    )
    assert ineligible_vote.status_code == 403

    denied_roll = client.get(
        f"/api/v1/elections/admin/{election_id}/voter-roll",
        headers=member_headers,
    )
    assert denied_roll.status_code == 403
