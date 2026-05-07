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


def message_headers(user: dict) -> dict[str, str]:
    return auth_headers(user["access_token"])


def assert_conversation_participants(conversation: dict, emails: set[str]) -> None:
    assert {participant["email"] for participant in conversation["participants"]} == emails


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


def test_direct_message_conversation_send_read_and_notifications(client: TestClient) -> None:
    amara = register_user(client, "amara.messages@example.com", "Amara Diallo")
    kojo = register_user(client, "kojo.messages@example.com", "Kojo Mensah")

    create_response = client.post(
        "/api/v1/messages/conversations",
        headers=message_headers(amara),
        json={
            "participant_user_id": kojo["user"]["id"],
            "initial_message": "Hello Kojo, can we coordinate the chapter review?",
        },
    )
    assert create_response.status_code == 201
    conversation = create_response.json()
    assert conversation["conversation_type"] == "DIRECT"
    assert conversation["unread_count"] == 0
    assert conversation["last_message"]["body"].startswith("Hello Kojo")
    assert_conversation_participants(
        conversation,
        {"amara.messages@example.com", "kojo.messages@example.com"},
    )

    kojo_conversations = client.get(
        "/api/v1/messages/conversations",
        headers=message_headers(kojo),
    )
    assert kojo_conversations.status_code == 200
    kojo_payload = kojo_conversations.json()
    assert kojo_payload["total"] == 1
    assert kojo_payload["conversations"][0]["unread_count"] == 1

    kojo_notifications = client.get("/api/v1/notifications", headers=message_headers(kojo))
    assert kojo_notifications.status_code == 200
    assert kojo_notifications.json()["notifications"][0]["event_type"] == "message.direct_received"

    reply_response = client.post(
        f"/api/v1/messages/conversations/{conversation['id']}/messages",
        headers=message_headers(kojo),
        json={"body": "Yes, I can review the queue this afternoon."},
    )
    assert reply_response.status_code == 200
    assert reply_response.json()["sender_display_name"] == "Kojo Mensah"

    messages_response = client.get(
        f"/api/v1/messages/conversations/{conversation['id']}/messages",
        headers=message_headers(amara),
    )
    assert messages_response.status_code == 200
    messages = messages_response.json()["messages"]
    assert [message["sender_display_name"] for message in messages] == [
        "Amara Diallo",
        "Kojo Mensah",
    ]

    amara_conversations = client.get(
        "/api/v1/messages/conversations",
        headers=message_headers(amara),
    )
    assert amara_conversations.status_code == 200
    assert amara_conversations.json()["conversations"][0]["unread_count"] == 1

    read_response = client.post(
        f"/api/v1/messages/conversations/{conversation['id']}/read",
        headers=message_headers(amara),
    )
    assert read_response.status_code == 200
    assert read_response.json()["unread_count"] == 0


def test_direct_conversation_reuse_and_participant_access_control(client: TestClient) -> None:
    amara = register_user(client, "reuse.amara@example.com", "Reuse Amara")
    kojo = register_user(client, "reuse.kojo@example.com", "Reuse Kojo")
    stranger = register_user(client, "reuse.stranger@example.com", "Reuse Stranger")

    first_response = client.post(
        "/api/v1/messages/conversations",
        headers=message_headers(amara),
        json={"participant_user_id": kojo["user"]["id"]},
    )
    assert first_response.status_code == 201
    conversation_id = first_response.json()["id"]

    second_response = client.post(
        "/api/v1/messages/conversations",
        headers=message_headers(amara),
        json={"participant_user_id": kojo["user"]["id"]},
    )
    assert second_response.status_code == 201
    assert second_response.json()["id"] == conversation_id

    denied_messages = client.get(
        f"/api/v1/messages/conversations/{conversation_id}/messages",
        headers=message_headers(stranger),
    )
    assert denied_messages.status_code == 404

    denied_send = client.post(
        f"/api/v1/messages/conversations/{conversation_id}/messages",
        headers=message_headers(stranger),
        json={"body": "I should not be able to send here."},
    )
    assert denied_send.status_code == 404


def test_user_block_prevents_new_direct_messages(client: TestClient) -> None:
    amara = register_user(client, "block.amara@example.com", "Block Amara")
    kojo = register_user(client, "block.kojo@example.com", "Block Kojo")

    block_response = client.post(
        "/api/v1/messages/blocks",
        headers=message_headers(kojo),
        json={"blocked_user_id": amara["user"]["id"], "reason": "Spam test"},
    )
    assert block_response.status_code == 201
    assert block_response.json()["blocked_display_name"] == "Block Amara"

    denied_create = client.post(
        "/api/v1/messages/conversations",
        headers=message_headers(amara),
        json={
            "participant_user_id": kojo["user"]["id"],
            "initial_message": "This should be blocked.",
        },
    )
    assert denied_create.status_code == 403

    list_blocks = client.get("/api/v1/messages/blocks", headers=message_headers(kojo))
    assert list_blocks.status_code == 200
    assert list_blocks.json()[0]["blocked_user_id"] == amara["user"]["id"]

    unblock_response = client.delete(
        f"/api/v1/messages/blocks/{amara['user']['id']}",
        headers=message_headers(kojo),
    )
    assert unblock_response.status_code == 204

    allowed_create = client.post(
        "/api/v1/messages/conversations",
        headers=message_headers(amara),
        json={
            "participant_user_id": kojo["user"]["id"],
            "initial_message": "Now this can be delivered.",
        },
    )
    assert allowed_create.status_code == 201
    assert allowed_create.json()["last_message"]["body"] == "Now this can be delivered."
