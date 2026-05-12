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
from app.modules.alumni import mwf_directory
from app.modules.auth import models as auth_models

_ = auth_models, alumni_models


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


def register_user(client: TestClient, email: str) -> dict:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "SecurePass123!",
            "display_name": email.split("@")[0].replace(".", " ").title(),
        },
    )
    assert response.status_code == 201
    return response.json()


def create_super_admin(client: TestClient, email: str = "mwf-admin@example.com") -> dict[str, str]:
    registered = register_user(client, email)
    headers = auth_headers(registered["access_token"])
    bootstrap_response = client.post("/api/v1/auth/dev/bootstrap-admin", headers=headers)
    assert bootstrap_response.status_code == 200
    return headers


def mock_filters() -> dict:
    return {
        "african_countries": [
            {"value": "rwanda", "label": "Rwanda"},
            {"value": "ghana", "label": "Ghana"},
            {"value": "kenya", "label": "Kenya"},
        ],
        "expertise_areas": [
            {"value": "education", "label": "Education"},
            {"value": "public-health", "label": "Public Health"},
            {"value": "civic-technology", "label": "Civic Technology"},
        ],
    }


def fellow_payload(fellows: list[dict]) -> dict:
    return {"fellows": fellows}


def alumni_record(
    source_id: int,
    *,
    country: str = "rwanda",
    expertise: list[str] | None = None,
    first_name: str = "Aline",
    year: str = "2019",
) -> dict:
    return {
        "ID": source_id,
        "user_type": "alumni",
        "first_name": first_name,
        "last_name": "Mutesi",
        "african_country": country,
        "bio": "Education and civic technology leader.",
        "field_of_study": "Education",
        "expertise": expertise or ["education", "civic-technology"],
        "leadership_institute": "University of Notre Dame",
        "program_year": [year],
        "us_state": "Indiana",
        "image": "/wp-content/uploads/profile.jpg",
        "detail_page": "/fellow/aline-mutesi",
    }


def test_mwf_sync_imports_alumni_only_and_normalizes_labels(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    admin_headers = create_super_admin(client)
    payload = fellow_payload(
        [
            alumni_record(101),
            {**alumni_record(102, first_name="Current"), "user_type": "current_fellow"},
            {**alumni_record(103, first_name="Exchange"), "user_type": "reciprocal_exchange"},
        ]
    )
    monkeypatch.setattr(
        mwf_directory,
        "fetch_mwf_directory_source",
        lambda: (payload, mock_filters()),
    )

    sync_response = client.post("/api/v1/alumni/admin/mwf-sync", headers=admin_headers)
    assert sync_response.status_code == 200
    sync = sync_response.json()
    assert sync["active_profile_count"] == 1
    assert sync["latest_run"]["fetched_count"] == 3
    assert sync["latest_run"]["imported_count"] == 1

    search_response = client.get("/api/v1/alumni/mwf/search?q=Aline", headers=admin_headers)
    assert search_response.status_code == 200
    body = search_response.json()
    assert body["total"] == 1
    profile = body["profiles"][0]
    assert profile["country_label"] == "Rwanda"
    assert profile["expertise_labels"] == ["Education", "Civic Technology"]
    assert profile["source_detail_url"].endswith("/fellow/aline-mutesi")

    detail_response = client.get("/api/v1/alumni/mwf/101", headers=admin_headers)
    assert detail_response.status_code == 200
    assert detail_response.json()["display_name"] == "Aline Mutesi"


def test_mwf_sync_is_idempotent_and_deactivates_missing_records(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    admin_headers = create_super_admin(client, "mwf-idempotent-admin@example.com")
    first_payload = fellow_payload([alumni_record(201), alumni_record(202, country="ghana")])
    second_payload = fellow_payload(
        [
            {
                **alumni_record(201, first_name="Aline Updated", year="2020"),
                "bio": "Updated leadership biography.",
            }
        ]
    )
    current_payload = {"payload": first_payload}
    monkeypatch.setattr(
        mwf_directory,
        "fetch_mwf_directory_source",
        lambda: (current_payload["payload"], mock_filters()),
    )

    first_response = client.post("/api/v1/alumni/admin/mwf-sync", headers=admin_headers)
    assert first_response.status_code == 200
    assert first_response.json()["active_profile_count"] == 2

    current_payload["payload"] = second_payload
    second_response = client.post("/api/v1/alumni/admin/mwf-sync", headers=admin_headers)
    assert second_response.status_code == 200
    second_body = second_response.json()
    assert second_body["active_profile_count"] == 1
    assert second_body["latest_run"]["updated_count"] == 1
    assert second_body["latest_run"]["deactivated_count"] == 1

    missing_response = client.get("/api/v1/alumni/mwf/202", headers=admin_headers)
    assert missing_response.status_code == 404
    updated_response = client.get("/api/v1/alumni/mwf/201", headers=admin_headers)
    assert updated_response.status_code == 200
    assert updated_response.json()["bio"] == "Updated leadership biography."


def test_mwf_search_filters_pagination_and_member_auth(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    admin_headers = create_super_admin(client, "mwf-search-admin@example.com")
    payload = fellow_payload(
        [
            alumni_record(301, country="rwanda", expertise=["education"], first_name="Aline"),
            alumni_record(
                302,
                country="ghana",
                expertise=["public-health"],
                first_name="Kwame",
                year="2021",
            ),
            alumni_record(
                303,
                country="kenya",
                expertise=["civic-technology"],
                first_name="Nia",
                year="2021",
            ),
        ]
    )
    monkeypatch.setattr(
        mwf_directory,
        "fetch_mwf_directory_source",
        lambda: (payload, mock_filters()),
    )
    assert client.post("/api/v1/alumni/admin/mwf-sync", headers=admin_headers).status_code == 200

    country_response = client.get("/api/v1/alumni/mwf/search?country=Ghana", headers=admin_headers)
    assert country_response.status_code == 200
    assert country_response.json()["profiles"][0]["display_name"] == "Kwame Mutesi"

    year_response = client.get("/api/v1/alumni/mwf/search?year=2021", headers=admin_headers)
    assert year_response.status_code == 200
    assert year_response.json()["total"] == 2

    expertise_response = client.get(
        "/api/v1/alumni/mwf/search?expertise=Public%20Health&limit=1&offset=0",
        headers=admin_headers,
    )
    assert expertise_response.status_code == 200
    assert expertise_response.json()["total"] == 1
    assert expertise_response.json()["has_more"] is False

    anonymous_response = client.get("/api/v1/alumni/mwf/search")
    assert anonymous_response.status_code == 401

    unverified = register_user(client, "mwf-unverified@example.com")
    denied_response = client.get(
        "/api/v1/alumni/mwf/search",
        headers=auth_headers(unverified["access_token"]),
    )
    assert denied_response.status_code == 403


def test_mwf_sync_requires_super_admin(client: TestClient) -> None:
    unverified = register_user(client, "mwf-sync-denied@example.com")
    headers = auth_headers(unverified["access_token"])

    assert client.get("/api/v1/alumni/admin/mwf-sync").status_code == 401
    assert client.post("/api/v1/alumni/admin/mwf-sync").status_code == 401
    assert client.get("/api/v1/alumni/admin/mwf-sync", headers=headers).status_code == 403
    assert client.post("/api/v1/alumni/admin/mwf-sync", headers=headers).status_code == 403
