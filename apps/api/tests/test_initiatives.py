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


def initiative_payload(title: str = "Kigali youth climate action lab") -> dict:
    return {
        "city": "Kigali",
        "country": "Rwanda",
        "description": (
            "A member-led initiative coordinating alumni mentors, youth groups, and local "
            "partners around practical climate adaptation projects."
        ),
        "ends_at": "2026-12-15T17:00:00Z",
        "focus_area": "climate",
        "impact_goal": "Train 500 youth leaders and launch 20 neighborhood adaptation projects.",
        "milestones": [
            {
                "description": "Confirm partner organizations and mentor leads.",
                "due_at": "2026-06-01T09:00:00Z",
                "status": "planned",
                "title": "Partner alignment",
            },
            {
                "description": "Run the first training cohort.",
                "due_at": "2026-08-15T09:00:00Z",
                "status": "in_progress",
                "title": "Pilot training",
            },
        ],
        "partner_organization": "YALUMNI Rwanda Chapter",
        "stage": "pilot",
        "starts_at": "2026-05-20T09:00:00Z",
        "summary": "A youth climate action initiative led by verified alumni in Rwanda.",
        "support_needed": "Mentors, venue partners, small grants, and monitoring support.",
        "target_beneficiaries": 500,
        "title": title,
    }


def test_member_initiative_creation_list_detail_and_filters(client: TestClient) -> None:
    creator = register_user(client, "initiative.creator@example.com", "Initiative Creator")
    viewer = register_user(client, "initiative.viewer@example.com", "Initiative Viewer")
    creator_headers = auth_headers(creator["access_token"])
    viewer_headers = auth_headers(viewer["access_token"])

    create_response = client.post(
        "/api/v1/initiatives",
        headers=creator_headers,
        json=initiative_payload(),
    )
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["status"] == "ACTIVE"
    assert created["focus_area"] == "CLIMATE"
    assert created["stage"] == "PILOT"
    assert created["milestone_count"] == 2
    assert created["milestones"][0]["title"] == "Partner alignment"
    initiative_id = created["id"]

    list_response = client.get("/api/v1/initiatives?q=climate", headers=viewer_headers)
    assert list_response.status_code == 200
    listed = list_response.json()
    assert listed["total"] == 1
    assert listed["initiatives"][0]["title"] == "Kigali youth climate action lab"
    assert listed["initiatives"][0]["milestones"] == []
    assert listed["initiatives"][0]["milestone_count"] == 2

    detail_response = client.get(f"/api/v1/initiatives/{initiative_id}", headers=viewer_headers)
    assert detail_response.status_code == 200
    detail = detail_response.json()
    assert detail["created_by_display_name"] == "Initiative Creator"
    assert detail["milestones"][1]["status"] == "IN_PROGRESS"

    country_response = client.get("/api/v1/initiatives?country=Rwanda", headers=viewer_headers)
    assert country_response.status_code == 200
    assert country_response.json()["total"] == 1

    focus_response = client.get(
        "/api/v1/initiatives?focus_area=climate&stage=pilot",
        headers=viewer_headers,
    )
    assert focus_response.status_code == 200
    assert focus_response.json()["total"] == 1

    mine_response = client.get("/api/v1/initiatives?mine=true", headers=creator_headers)
    assert mine_response.status_code == 200
    assert mine_response.json()["initiatives"][0]["id"] == initiative_id


def test_initiative_validation_and_auth_required(client: TestClient) -> None:
    member = register_user(client, "initiative.member@example.com", "Initiative Member")
    headers = auth_headers(member["access_token"])

    denied_response = client.get("/api/v1/initiatives")
    assert denied_response.status_code == 401

    invalid_focus_response = client.post(
        "/api/v1/initiatives",
        headers=headers,
        json={**initiative_payload("Invalid focus"), "focus_area": "unknown planet"},
    )
    assert invalid_focus_response.status_code == 400

    invalid_dates_response = client.post(
        "/api/v1/initiatives",
        headers=headers,
        json={
            **initiative_payload("Invalid date window"),
            "starts_at": "2026-12-15T17:00:00Z",
            "ends_at": "2026-05-20T09:00:00Z",
        },
    )
    assert invalid_dates_response.status_code == 422
