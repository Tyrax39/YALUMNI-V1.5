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


def event_payload(title: str = "Kigali alumni leadership lab") -> dict:
    return {
        "agenda_items": [
            {
                "description": "Opening orientation and chapter goals.",
                "ends_at": "2026-06-20T10:00:00Z",
                "speaker_name": "Chapter Lead",
                "starts_at": "2026-06-20T09:00:00Z",
                "title": "Opening circle",
            },
            {
                "description": "Peer project clinics for alumni initiatives.",
                "ends_at": "2026-06-20T12:00:00Z",
                "speaker_name": "Program Fellows",
                "starts_at": "2026-06-20T10:15:00Z",
                "title": "Project clinic",
            },
        ],
        "capacity": 120,
        "city": "Kigali",
        "country": "Rwanda",
        "description": (
            "A practical member event for alumni teams to coordinate project clinics, "
            "mentor circles, and chapter planning sessions."
        ),
        "ends_at": "2026-06-20T13:00:00Z",
        "event_type": "training",
        "location": "Kigali Innovation Hub",
        "mode": "hybrid",
        "registration_url": "https://example.org/events/kigali-lab",
        "starts_at": "2026-06-20T09:00:00Z",
        "summary": "A chapter leadership lab for alumni initiative teams in Rwanda.",
        "timezone": "Africa/Kigali",
        "title": title,
    }


def test_member_event_creation_agenda_attendees_and_rsvp(client: TestClient) -> None:
    organizer = register_user(client, "event.organizer@example.com", "Event Organizer")
    attendee = register_user(client, "event.attendee@example.com", "Event Attendee")
    organizer_headers = auth_headers(organizer["access_token"])
    attendee_headers = auth_headers(attendee["access_token"])

    create_response = client.post(
        "/api/v1/events",
        headers=organizer_headers,
        json=event_payload(),
    )
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["status"] == "PUBLISHED"
    assert created["event_type"] == "TRAINING"
    assert created["mode"] == "HYBRID"
    assert created["attendee_count"] == 1
    assert created["is_registered"] is True
    event_id = created["id"]

    published_list = client.get("/api/v1/events?q=leadership", headers=attendee_headers)
    assert published_list.status_code == 200
    listed = published_list.json()
    assert listed["total"] == 1
    assert listed["events"][0]["is_registered"] is False

    detail_response = client.get(f"/api/v1/events/{event_id}", headers=attendee_headers)
    assert detail_response.status_code == 200
    assert detail_response.json()["title"] == "Kigali alumni leadership lab"

    agenda_response = client.get(f"/api/v1/events/{event_id}/agenda", headers=attendee_headers)
    assert agenda_response.status_code == 200
    agenda = agenda_response.json()
    assert len(agenda) == 2
    assert agenda[0]["title"] == "Opening circle"

    rsvp_response = client.post(f"/api/v1/events/{event_id}/rsvp", headers=attendee_headers)
    assert rsvp_response.status_code == 200
    rsvp = rsvp_response.json()
    assert rsvp["attendee_count"] == 2
    assert rsvp["is_registered"] is True

    attendees_response = client.get(
        f"/api/v1/events/{event_id}/attendees",
        headers=organizer_headers,
    )
    assert attendees_response.status_code == 200
    attendees = attendees_response.json()
    assert len(attendees) == 2
    assert {item["display_name"] for item in attendees} == {"Event Organizer", "Event Attendee"}


def test_event_filters_validation_and_auth_required(client: TestClient) -> None:
    member = register_user(client, "event.member@example.com", "Event Member")
    headers = auth_headers(member["access_token"])

    denied_response = client.get("/api/v1/events")
    assert denied_response.status_code == 401

    invalid_response = client.post(
        "/api/v1/events",
        headers=headers,
        json={**event_payload("Invalid event mode"), "mode": "spaceship"},
    )
    assert invalid_response.status_code == 400

    create_response = client.post(
        "/api/v1/events",
        headers=headers,
        json=event_payload("Accra chapter forum"),
    )
    assert create_response.status_code == 201

    country_response = client.get("/api/v1/events?country=Rwanda", headers=headers)
    assert country_response.status_code == 200
    assert country_response.json()["total"] == 1

    type_response = client.get("/api/v1/events?event_type=training&mode=hybrid", headers=headers)
    assert type_response.status_code == 200
    assert type_response.json()["total"] == 1

    mine_response = client.get("/api/v1/events?mine=true", headers=headers)
    assert mine_response.status_code == 200
    assert mine_response.json()["events"][0]["title"] == "Accra chapter forum"
