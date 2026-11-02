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


def create_admin(client: TestClient, email: str = "messages.admin@example.com") -> dict[str, str]:
    registered = register_user(client, email, "Messages Admin")
    bootstrap_response = client.post(
        "/api/v1/auth/dev/bootstrap-admin",
        headers=auth_headers(registered["access_token"]),
    )
    assert bootstrap_response.status_code == 200
    return auth_headers(registered["access_token"])


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


def test_direct_message_report_admin_review_remove_restore_flow(client: TestClient) -> None:
    admin_headers = create_admin(client)
    amara = register_user(client, "report.amara@example.com", "Report Amara")
    kojo = register_user(client, "report.kojo@example.com", "Report Kojo")

    create_response = client.post(
        "/api/v1/messages/conversations",
        headers=message_headers(amara),
        json={
            "participant_user_id": kojo["user"]["id"],
            "initial_message": "This message should be reviewed by moderation.",
        },
    )
    assert create_response.status_code == 201
    conversation = create_response.json()
    message = conversation["last_message"]

    report_response = client.post(
        f"/api/v1/messages/conversations/{conversation['id']}/messages/{message['id']}/reports",
        headers=message_headers(kojo),
        json={"reason": "unsafe content", "note": "This needs a moderator."},
    )
    assert report_response.status_code == 201
    report = report_response.json()
    assert report["reason"] == "UNSAFE_CONTENT"
    assert report["status"] == "OPEN"
    assert report["moderator_note"] is None

    duplicate_response = client.post(
        f"/api/v1/messages/conversations/{conversation['id']}/messages/{message['id']}/reports",
        headers=message_headers(kojo),
        json={"reason": "SPAM"},
    )
    assert duplicate_response.status_code == 409

    queue_response = client.get(
        "/api/v1/messages/admin/moderation/reports",
        headers=admin_headers,
    )
    assert queue_response.status_code == 200
    queue = queue_response.json()
    assert queue["total"] == 1
    assert queue["reports"][0]["message_body"] == "This message should be reviewed by moderation."

    review_response = client.patch(
        f"/api/v1/messages/admin/moderation/reports/{report['id']}/review",
        headers=admin_headers,
        json={
            "escalation_status": "ESCALATED",
            "moderator_note": "Escalated for trust review.",
            "severity": "HIGH",
        },
    )
    assert review_response.status_code == 200
    reviewed_report = review_response.json()
    assert reviewed_report["severity"] == "HIGH"
    assert reviewed_report["escalation_status"] == "ESCALATED"
    assert reviewed_report["escalated_by_user_id"] is not None

    remove_response = client.post(
        f"/api/v1/messages/admin/moderation/messages/{message['id']}/remove",
        headers=admin_headers,
        json={
            "escalation_status": "ESCALATED",
            "moderator_note": "Removed after report review.",
            "severity": "HIGH",
        },
    )
    assert remove_response.status_code == 200
    removed_message = remove_response.json()
    assert removed_message["status"] == "DELETED"
    assert removed_message["body"] == "This message should be reviewed by moderation."
    assert removed_message["removed_by_user_id"] is not None
    assert removed_message["removed_at"] is not None
    assert removed_message["moderation_note"] == "Removed after report review."

    participant_messages = client.get(
        f"/api/v1/messages/conversations/{conversation['id']}/messages",
        headers=message_headers(kojo),
    )
    assert participant_messages.status_code == 200
    visible_message = participant_messages.json()["messages"][0]
    assert visible_message["status"] == "DELETED"
    assert visible_message["body"] == "This message was removed by moderation."
    assert visible_message["moderation_note"] is None

    removed_queue_response = client.get(
        "/api/v1/messages/admin/moderation/removed-messages",
        headers=admin_headers,
    )
    assert removed_queue_response.status_code == 200
    removed_queue = removed_queue_response.json()
    assert removed_queue["total"] == 1
    assert removed_queue["messages"][0]["report_count"] == 1

    resolve_response = client.post(
        f"/api/v1/messages/admin/moderation/reports/{report['id']}/resolve",
        headers=admin_headers,
    )
    assert resolve_response.status_code == 200
    assert resolve_response.json()["status"] == "RESOLVED"

    restore_response = client.post(
        f"/api/v1/messages/admin/moderation/messages/{message['id']}/restore",
        headers=admin_headers,
    )
    assert restore_response.status_code == 200
    assert restore_response.json()["status"] == "ACTIVE"

    restored_messages = client.get(
        f"/api/v1/messages/conversations/{conversation['id']}/messages",
        headers=message_headers(amara),
    )
    assert restored_messages.status_code == 200
    restored_message = restored_messages.json()["messages"][0]
    assert restored_message["status"] == "ACTIVE"
    assert restored_message["body"] == "This message should be reviewed by moderation."


def test_direct_message_report_requires_participant_and_admin_role(client: TestClient) -> None:
    amara = register_user(client, "access.amara@example.com", "Access Amara")
    kojo = register_user(client, "access.kojo@example.com", "Access Kojo")
    stranger = register_user(client, "access.stranger@example.com", "Access Stranger")

    create_response = client.post(
        "/api/v1/messages/conversations",
        headers=message_headers(amara),
        json={
            "participant_user_id": kojo["user"]["id"],
            "initial_message": "Private message for participants only.",
        },
    )
    assert create_response.status_code == 201
    conversation = create_response.json()
    message = conversation["last_message"]

    denied_report = client.post(
        f"/api/v1/messages/conversations/{conversation['id']}/messages/{message['id']}/reports",
        headers=message_headers(stranger),
        json={"reason": "SPAM"},
    )
    assert denied_report.status_code == 404

    denied_queue = client.get(
        "/api/v1/messages/admin/moderation/reports",
        headers=message_headers(kojo),
    )
    assert denied_queue.status_code == 403


def test_introduction_request_accept_decline_and_thread_creation(client: TestClient) -> None:
    requester = register_user(client, "intro.requester@example.com", "Intro Requester")
    recipient = register_user(client, "intro.recipient@example.com", "Intro Recipient")
    outsider = register_user(client, "intro.outsider@example.com", "Intro Outsider")

    create_response = client.post(
        "/api/v1/messages/introduction-requests",
        headers=message_headers(requester),
        json={
            "recipient_user_id": recipient["user"]["id"],
            "note": "Would love to compare chapter growth playbooks.",
        },
    )
    assert create_response.status_code == 201
    introduction_request = create_response.json()
    assert introduction_request["status"] == "PENDING"

    duplicate_response = client.post(
        "/api/v1/messages/introduction-requests",
        headers=message_headers(requester),
        json={"recipient_user_id": recipient["user"]["id"]},
    )
    assert duplicate_response.status_code == 409

    recipient_list = client.get(
        "/api/v1/messages/introduction-requests",
        headers=message_headers(recipient),
    )
    assert recipient_list.status_code == 200
    assert recipient_list.json()["actionable_count"] == 1
    assert recipient_list.json()["incoming"][0]["requester_display_name"] == "Intro Requester"

    outsider_accept = client.post(
        f"/api/v1/messages/introduction-requests/{introduction_request['id']}/accept",
        headers=message_headers(outsider),
        json={},
    )
    assert outsider_accept.status_code == 404

    accept_response = client.post(
        f"/api/v1/messages/introduction-requests/{introduction_request['id']}/accept",
        headers=message_headers(recipient),
        json={},
    )
    assert accept_response.status_code == 200
    accepted_request = accept_response.json()
    assert accepted_request["status"] == "ACCEPTED"
    assert accepted_request["conversation_id"] is not None

    requester_conversations = client.get(
        "/api/v1/messages/conversations",
        headers=message_headers(requester),
    )
    assert requester_conversations.status_code == 200
    assert requester_conversations.json()["total"] == 1
    assert (
        requester_conversations.json()["conversations"][0]["last_message"]["body"]
        == "Would love to compare chapter growth playbooks."
    )

    second_recipient = register_user(client, "intro.second@example.com", "Second Recipient")
    decline_request = client.post(
        "/api/v1/messages/introduction-requests",
        headers=message_headers(requester),
        json={
            "recipient_user_id": second_recipient["user"]["id"],
            "note": "Would you be open to a quick introduction?",
        },
    )
    assert decline_request.status_code == 201

    decline_response = client.post(
        f"/api/v1/messages/introduction-requests/{decline_request.json()['id']}/decline",
        headers=message_headers(second_recipient),
        json={"note": "Not available right now."},
    )
    assert decline_response.status_code == 200
    assert decline_response.json()["status"] == "DECLINED"
    assert decline_response.json()["note"] == "Not available right now."


def test_introduction_request_can_be_canceled_by_requester(client: TestClient) -> None:
    requester = register_user(client, "intro.cancel.requester@example.com", "Cancel Requester")
    recipient = register_user(client, "intro.cancel.recipient@example.com", "Cancel Recipient")

    create_response = client.post(
        "/api/v1/messages/introduction-requests",
        headers=message_headers(requester),
        json={
            "recipient_user_id": recipient["user"]["id"],
            "note": "Would love to connect for a chapter handoff.",
        },
    )
    assert create_response.status_code == 201
    introduction_request = create_response.json()
    assert introduction_request["status"] == "PENDING"

    recipient_cannot_cancel = client.post(
        f"/api/v1/messages/introduction-requests/{introduction_request['id']}/cancel",
        headers=message_headers(recipient),
        json={},
    )
    assert recipient_cannot_cancel.status_code == 403

    cancel_response = client.post(
        f"/api/v1/messages/introduction-requests/{introduction_request['id']}/cancel",
        headers=message_headers(requester),
        json={"note": "Timing changed, I will follow up later."},
    )
    assert cancel_response.status_code == 200
    canceled_request = cancel_response.json()
    assert canceled_request["status"] == "CANCELED"
    assert canceled_request["responded_by_user_id"] == requester["user"]["id"]
    assert canceled_request["note"] == "Timing changed, I will follow up later."

    duplicate_pending_response = client.post(
        "/api/v1/messages/introduction-requests",
        headers=message_headers(requester),
        json={"recipient_user_id": recipient["user"]["id"]},
    )
    assert duplicate_pending_response.status_code == 201
