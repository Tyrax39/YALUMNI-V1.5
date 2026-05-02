from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db_session
from app.main import app
from app.modules.auth import models as auth_models

_ = auth_models


@pytest.fixture
def client() -> Generator[TestClient]:
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


def register_user(client: TestClient, email: str = "amara@example.com") -> dict:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "SecurePass123!",
            "display_name": "Amara Diallo",
            "first_name": "Amara",
            "last_name": "Diallo",
        },
    )

    assert response.status_code == 201
    return response.json()


def test_register_login_me_refresh_and_logout(client: TestClient) -> None:
    registered = register_user(client)

    assert registered["token_type"] == "bearer"
    assert registered["user"]["email"] == "amara@example.com"
    assert registered["user"]["roles"] == ["UNVERIFIED_USER"]

    me_response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {registered['access_token']}"},
    )
    assert me_response.status_code == 200
    assert me_response.json()["display_name"] == "Amara Diallo"

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "AMARA@example.com", "password": "SecurePass123!"},
    )
    assert login_response.status_code == 200
    logged_in = login_response.json()
    assert logged_in["user"]["id"] == registered["user"]["id"]

    refresh_response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": logged_in["refresh_token"]},
    )
    assert refresh_response.status_code == 200
    refreshed = refresh_response.json()
    assert refreshed["refresh_token"] != logged_in["refresh_token"]

    reused_refresh_response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": logged_in["refresh_token"]},
    )
    assert reused_refresh_response.status_code == 401

    logout_response = client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": refreshed["refresh_token"]},
    )
    assert logout_response.status_code == 204

    refresh_after_logout = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refreshed["refresh_token"]},
    )
    assert refresh_after_logout.status_code == 401


def test_duplicate_registration_is_rejected(client: TestClient) -> None:
    register_user(client, email="duplicate@example.com")

    duplicate_response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "duplicate@example.com",
            "password": "SecurePass123!",
            "display_name": "Duplicate User",
        },
    )

    assert duplicate_response.status_code == 409


def test_invalid_login_and_missing_bearer_token_are_rejected(client: TestClient) -> None:
    register_user(client, email="login@example.com")

    bad_login = client.post(
        "/api/v1/auth/login",
        json={"email": "login@example.com", "password": "wrong-password"},
    )
    assert bad_login.status_code == 401

    me_response = client.get("/api/v1/auth/me")
    assert me_response.status_code == 401
