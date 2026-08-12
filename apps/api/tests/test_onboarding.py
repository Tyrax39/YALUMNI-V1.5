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

_ = auth_models, alumni_models, community_models, message_models, notification_models


def auth_headers(access_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {access_token}"}


def register_user(client: TestClient, email: str, display_name: str) -> dict:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "SecurePass123!",
            "display_name": display_name,
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


def test_onboarding_workflow_state_is_created_and_persisted(client: TestClient) -> None:
    member = register_user(client, "onboarding.member@example.com", "Onboarding Member")
    headers = auth_headers(member["access_token"])

    get_response = client.get("/api/v1/alumni/me/onboarding-state", headers=headers)
    assert get_response.status_code == 200
    initial_state = get_response.json()
    assert initial_state["current_step_key"] is None
    assert initial_state["completed_step_keys"] == []
    assert initial_state["last_viewed_at"] is None

    update_response = client.patch(
        "/api/v1/alumni/me/onboarding-state",
        headers=headers,
        json={
            "current_step_key": "verification",
            "completed_step_keys": ["profile", "program"],
            "mark_complete": False,
        },
    )
    assert update_response.status_code == 200
    updated_state = update_response.json()
    assert updated_state["current_step_key"] == "verification"
    assert updated_state["completed_step_keys"] == ["profile", "program"]
    assert updated_state["last_viewed_at"] is not None
    assert updated_state["completed_at"] is None

    persisted_response = client.get("/api/v1/alumni/me/onboarding-state", headers=headers)
    assert persisted_response.status_code == 200
    persisted_state = persisted_response.json()
    assert persisted_state["id"] == initial_state["id"]
    assert persisted_state["current_step_key"] == "verification"
    assert persisted_state["completed_step_keys"] == ["profile", "program"]
