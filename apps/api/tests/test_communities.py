from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db_session
from app.core.rate_limit import clear_rate_limits
from app.main import app
from app.modules.alumni import models as alumni_models
from app.modules.auth import models as auth_models
from app.modules.communities import models as community_models

_ = auth_models, alumni_models, community_models


@pytest.fixture
def client() -> Generator[TestClient]:
    clear_rate_limits()
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


def create_admin(client: TestClient, email: str = "admin@example.com") -> dict[str, str]:
    registered = register_user(client, email)
    bootstrap_response = client.post(
        "/api/v1/auth/dev/bootstrap-admin",
        headers=auth_headers(registered["access_token"]),
    )
    assert bootstrap_response.status_code == 200
    return auth_headers(registered["access_token"])


def create_community(
    client: TestClient,
    admin_headers: dict[str, str],
    *,
    name: str,
    community_type: str = "COUNTRY_CHAPTER",
    country: str | None = None,
    sector: str | None = None,
    join_policy: str = "OPEN",
) -> dict:
    response = client.post(
        "/api/v1/communities",
        headers=admin_headers,
        json={
            "name": name,
            "community_type": community_type,
            "description": f"{name} coordination space.",
            "country": country,
            "sector": sector,
            "join_policy": join_policy,
        },
    )
    assert response.status_code == 201
    return response.json()


def test_community_admin_can_create_and_member_can_join_leave(client: TestClient) -> None:
    admin_headers = create_admin(client)
    community = create_community(
        client,
        admin_headers,
        name="Ghana Alumni Chapter",
        country="Ghana",
    )
    assert community["slug"] == "ghana-alumni-chapter"
    assert community["membership_status"] == "ACTIVE"
    assert community["membership_role"] == "OWNER"
    assert community["member_count"] == 1

    member = register_user(client, "member@example.com")
    member_headers = auth_headers(member["access_token"])
    list_response = client.get("/api/v1/communities", headers=member_headers)
    assert list_response.status_code == 200
    listed = list_response.json()
    assert listed["total"] == 1
    assert listed["communities"][0]["membership_status"] is None

    join_response = client.post(
        f"/api/v1/communities/{community['id']}/join",
        headers=member_headers,
    )
    assert join_response.status_code == 200
    joined = join_response.json()
    assert joined["membership_status"] == "ACTIVE"
    assert joined["membership_role"] == "MEMBER"
    assert joined["member_count"] == 2

    members_response = client.get(
        f"/api/v1/communities/{community['id']}/members",
        headers=member_headers,
    )
    assert members_response.status_code == 200
    members = members_response.json()
    assert members["total"] == 2
    assert {member["email"] for member in members["members"]} == {
        "admin@example.com",
        "member@example.com",
    }

    mine_response = client.get("/api/v1/communities?membership=mine", headers=member_headers)
    assert mine_response.status_code == 200
    assert mine_response.json()["total"] == 1

    leave_response = client.post(
        f"/api/v1/communities/{community['id']}/leave",
        headers=member_headers,
    )
    assert leave_response.status_code == 200
    left = leave_response.json()
    assert left["membership_status"] == "LEFT"
    assert left["member_count"] == 1

    members_after_leave = client.get(
        f"/api/v1/communities/{community['id']}/members",
        headers=member_headers,
    )
    assert members_after_leave.status_code == 200
    assert members_after_leave.json()["total"] == 1


def test_community_create_requires_admin_and_request_join_policy(client: TestClient) -> None:
    regular_user = register_user(client, "regular@example.com")
    denied_response = client.post(
        "/api/v1/communities",
        headers=auth_headers(regular_user["access_token"]),
        json={"name": "Unauthorized Chapter"},
    )
    assert denied_response.status_code == 403

    admin_headers = create_admin(client)
    community = create_community(
        client,
        admin_headers,
        name="Private Health Working Group",
        community_type="WORKING_GROUP",
        sector="Health",
        join_policy="REQUEST",
    )
    request_response = client.post(
        f"/api/v1/communities/{community['id']}/join",
        headers=auth_headers(regular_user["access_token"]),
    )
    assert request_response.status_code == 200
    requested = request_response.json()
    assert requested["membership_status"] == "PENDING"
    assert requested["member_count"] == 1

    denied_pending_roster = client.get(
        f"/api/v1/communities/{community['id']}/members?status=PENDING",
        headers=auth_headers(regular_user["access_token"]),
    )
    assert denied_pending_roster.status_code == 403

    pending_roster = client.get(
        f"/api/v1/communities/{community['id']}/members?status=PENDING",
        headers=admin_headers,
    )
    assert pending_roster.status_code == 200
    assert pending_roster.json()["total"] == 1
    pending_member = pending_roster.json()["members"][0]
    assert pending_member["email"] == "regular@example.com"

    denied_approval = client.post(
        f"/api/v1/communities/{community['id']}/members/{pending_member['id']}/approve",
        headers=auth_headers(regular_user["access_token"]),
    )
    assert denied_approval.status_code == 403

    approval_response = client.post(
        f"/api/v1/communities/{community['id']}/members/{pending_member['id']}/approve",
        headers=admin_headers,
    )
    assert approval_response.status_code == 200
    approved_member = approval_response.json()
    assert approved_member["email"] == "regular@example.com"
    assert approved_member["status"] == "ACTIVE"
    assert approved_member["joined_at"] is not None

    active_roster = client.get(
        f"/api/v1/communities/{community['id']}/members",
        headers=auth_headers(regular_user["access_token"]),
    )
    assert active_roster.status_code == 200
    assert active_roster.json()["total"] == 2

    rejected_user = register_user(client, "rejected@example.com")
    rejected_request = client.post(
        f"/api/v1/communities/{community['id']}/join",
        headers=auth_headers(rejected_user["access_token"]),
    )
    assert rejected_request.status_code == 200
    second_pending_roster = client.get(
        f"/api/v1/communities/{community['id']}/members?status=PENDING",
        headers=admin_headers,
    )
    assert second_pending_roster.status_code == 200
    rejected_member = second_pending_roster.json()["members"][0]
    reject_response = client.post(
        f"/api/v1/communities/{community['id']}/members/{rejected_member['id']}/reject",
        headers=admin_headers,
    )
    assert reject_response.status_code == 200
    assert reject_response.json()["status"] == "REJECTED"

    rejected_roster = client.get(
        f"/api/v1/communities/{community['id']}/members?status=REJECTED",
        headers=admin_headers,
    )
    assert rejected_roster.status_code == 200
    assert rejected_roster.json()["total"] == 1
    assert rejected_roster.json()["members"][0]["email"] == "rejected@example.com"

    not_joined_response = client.get(
        "/api/v1/communities?membership=not_joined",
        headers=auth_headers(regular_user["access_token"]),
    )
    assert not_joined_response.status_code == 200
    assert not_joined_response.json()["total"] == 0


def test_community_owner_and_manager_can_manage_active_members(client: TestClient) -> None:
    admin_headers = create_admin(client)
    community = create_community(
        client,
        admin_headers,
        name="Nigeria Civic Action Chapter",
        country="Nigeria",
    )

    manager_user = register_user(client, "manager.member@example.com")
    member_user = register_user(client, "managed.member@example.com")
    manager_headers = auth_headers(manager_user["access_token"])
    member_headers = auth_headers(member_user["access_token"])
    for headers in (manager_headers, member_headers):
        response = client.post(f"/api/v1/communities/{community['id']}/join", headers=headers)
        assert response.status_code == 200

    roster_response = client.get(
        f"/api/v1/communities/{community['id']}/members",
        headers=admin_headers,
    )
    assert roster_response.status_code == 200
    members_by_email = {member["email"]: member for member in roster_response.json()["members"]}

    denied_promotion = client.patch(
        f"/api/v1/communities/{community['id']}/members/"
        f"{members_by_email['manager.member@example.com']['id']}",
        headers=member_headers,
        json={"role": "MANAGER"},
    )
    assert denied_promotion.status_code == 403

    promotion_response = client.patch(
        f"/api/v1/communities/{community['id']}/members/"
        f"{members_by_email['manager.member@example.com']['id']}",
        headers=admin_headers,
        json={"role": "manager"},
    )
    assert promotion_response.status_code == 200
    assert promotion_response.json()["role"] == "MANAGER"

    owner_change = client.patch(
        f"/api/v1/communities/{community['id']}/members/{members_by_email['admin@example.com']['id']}",
        headers=admin_headers,
        json={"role": "MEMBER"},
    )
    assert owner_change.status_code == 403

    manager_peer_change = client.patch(
        f"/api/v1/communities/{community['id']}/members/"
        f"{members_by_email['manager.member@example.com']['id']}",
        headers=manager_headers,
        json={"role": "MEMBER"},
    )
    assert manager_peer_change.status_code == 403

    removal_response = client.post(
        f"/api/v1/communities/{community['id']}/members/"
        f"{members_by_email['managed.member@example.com']['id']}/remove",
        headers=manager_headers,
    )
    assert removal_response.status_code == 200
    assert removal_response.json()["status"] == "LEFT"

    demotion_response = client.patch(
        f"/api/v1/communities/{community['id']}/members/"
        f"{members_by_email['manager.member@example.com']['id']}",
        headers=admin_headers,
        json={"role": "MEMBER"},
    )
    assert demotion_response.status_code == 200
    assert demotion_response.json()["role"] == "MEMBER"

    active_roster = client.get(
        f"/api/v1/communities/{community['id']}/members",
        headers=admin_headers,
    )
    assert active_roster.status_code == 200
    assert active_roster.json()["total"] == 2
    assert {member["email"] for member in active_roster.json()["members"]} == {
        "admin@example.com",
        "manager.member@example.com",
    }


def test_community_owner_can_transfer_ownership(client: TestClient) -> None:
    admin_headers = create_admin(client)
    community = create_community(
        client,
        admin_headers,
        name="Kenya Ownership Chapter",
        country="Kenya",
    )

    successor_user = register_user(client, "successor.owner@example.com")
    manager_user = register_user(client, "transfer.manager@example.com")
    outsider_user = register_user(client, "transfer.outsider@example.com")
    successor_headers = auth_headers(successor_user["access_token"])
    manager_headers = auth_headers(manager_user["access_token"])
    outsider_headers = auth_headers(outsider_user["access_token"])
    for headers in (successor_headers, manager_headers):
        join_response = client.post(
            f"/api/v1/communities/{community['id']}/join",
            headers=headers,
        )
        assert join_response.status_code == 200

    roster_response = client.get(
        f"/api/v1/communities/{community['id']}/members",
        headers=admin_headers,
    )
    assert roster_response.status_code == 200
    members_by_email = {member["email"]: member for member in roster_response.json()["members"]}
    successor_membership = members_by_email["successor.owner@example.com"]
    manager_membership = members_by_email["transfer.manager@example.com"]
    original_owner_membership = members_by_email["admin@example.com"]

    manager_promotion = client.patch(
        f"/api/v1/communities/{community['id']}/members/{manager_membership['id']}",
        headers=admin_headers,
        json={"role": "MANAGER"},
    )
    assert manager_promotion.status_code == 200

    outsider_denied = client.post(
        f"/api/v1/communities/{community['id']}/ownership-transfer",
        headers=outsider_headers,
        json={"new_owner_membership_id": successor_membership["id"]},
    )
    assert outsider_denied.status_code == 403

    manager_denied = client.post(
        f"/api/v1/communities/{community['id']}/ownership-transfer",
        headers=manager_headers,
        json={"new_owner_membership_id": successor_membership["id"]},
    )
    assert manager_denied.status_code == 403

    already_owner = client.post(
        f"/api/v1/communities/{community['id']}/ownership-transfer",
        headers=admin_headers,
        json={"new_owner_membership_id": original_owner_membership["id"]},
    )
    assert already_owner.status_code == 409

    transfer_response = client.post(
        f"/api/v1/communities/{community['id']}/ownership-transfer",
        headers=admin_headers,
        json={"new_owner_membership_id": successor_membership["id"]},
    )
    assert transfer_response.status_code == 200
    assert transfer_response.json()["membership_role"] == "MANAGER"
    assert transfer_response.json()["member_count"] == 3

    updated_roster = client.get(
        f"/api/v1/communities/{community['id']}/members",
        headers=successor_headers,
    )
    assert updated_roster.status_code == 200
    updated_members = {member["email"]: member for member in updated_roster.json()["members"]}
    assert updated_members["successor.owner@example.com"]["role"] == "OWNER"
    assert updated_members["admin@example.com"]["role"] == "MANAGER"
    assert updated_members["transfer.manager@example.com"]["role"] == "MANAGER"

    new_owner_update = client.patch(
        f"/api/v1/communities/{community['id']}",
        headers=successor_headers,
        json={"name": "Kenya Successor Chapter"},
    )
    assert new_owner_update.status_code == 200
    assert new_owner_update.json()["name"] == "Kenya Successor Chapter"

    owner_removal_denied = client.post(
        f"/api/v1/communities/{community['id']}/members/{successor_membership['id']}/remove",
        headers=admin_headers,
    )
    assert owner_removal_denied.status_code == 403

    former_owner_leave = client.post(
        f"/api/v1/communities/{community['id']}/leave",
        headers=admin_headers,
    )
    assert former_owner_leave.status_code == 200
    assert former_owner_leave.json()["membership_status"] == "LEFT"
    assert former_owner_leave.json()["member_count"] == 2


def test_community_posts_are_private_and_moderated(client: TestClient) -> None:
    admin_headers = create_admin(client)
    community = create_community(
        client,
        admin_headers,
        name="Mali Private Feed Chapter",
        country="Mali",
    )

    outsider_user = register_user(client, "feed.outsider@example.com")
    member_user = register_user(client, "feed.member@example.com")
    manager_user = register_user(client, "feed.manager@example.com")
    outsider_headers = auth_headers(outsider_user["access_token"])
    member_headers = auth_headers(member_user["access_token"])
    manager_headers = auth_headers(manager_user["access_token"])

    outsider_posts = client.get(
        f"/api/v1/communities/{community['id']}/posts",
        headers=outsider_headers,
    )
    assert outsider_posts.status_code == 403
    outsider_create = client.post(
        f"/api/v1/communities/{community['id']}/posts",
        headers=outsider_headers,
        json={"body": "I should not appear."},
    )
    assert outsider_create.status_code == 403

    for headers in (member_headers, manager_headers):
        join_response = client.post(f"/api/v1/communities/{community['id']}/join", headers=headers)
        assert join_response.status_code == 200

    roster_response = client.get(
        f"/api/v1/communities/{community['id']}/members",
        headers=admin_headers,
    )
    assert roster_response.status_code == 200
    members_by_email = {member["email"]: member for member in roster_response.json()["members"]}
    manager_membership = members_by_email["feed.manager@example.com"]
    manager_promotion = client.patch(
        f"/api/v1/communities/{community['id']}/members/{manager_membership['id']}",
        headers=admin_headers,
        json={"role": "MANAGER"},
    )
    assert manager_promotion.status_code == 200

    owner_post_response = client.post(
        f"/api/v1/communities/{community['id']}/posts",
        headers=admin_headers,
        json={"body": "  Welcome to the private chapter feed.  "},
    )
    assert owner_post_response.status_code == 201
    owner_post = owner_post_response.json()
    assert owner_post["body"] == "Welcome to the private chapter feed."
    assert owner_post["status"] == "ACTIVE"
    assert owner_post["author_display_name"] == "Admin"

    member_posts = client.get(
        f"/api/v1/communities/{community['id']}/posts",
        headers=member_headers,
    )
    assert member_posts.status_code == 200
    assert member_posts.json()["total"] == 1
    assert member_posts.json()["posts"][0]["id"] == owner_post["id"]

    member_post_response = client.post(
        f"/api/v1/communities/{community['id']}/posts",
        headers=member_headers,
        json={"body": "Member update for the group."},
    )
    assert member_post_response.status_code == 201
    member_post = member_post_response.json()

    member_remove_owner = client.post(
        f"/api/v1/communities/{community['id']}/posts/{owner_post['id']}/remove",
        headers=member_headers,
    )
    assert member_remove_owner.status_code == 403

    manager_remove_member = client.post(
        f"/api/v1/communities/{community['id']}/posts/{member_post['id']}/remove",
        headers=manager_headers,
    )
    assert manager_remove_member.status_code == 200
    assert manager_remove_member.json()["status"] == "REMOVED"
    assert manager_remove_member.json()["removed_by_user_id"] == manager_user["user"]["id"]

    duplicate_remove = client.post(
        f"/api/v1/communities/{community['id']}/posts/{member_post['id']}/remove",
        headers=manager_headers,
    )
    assert duplicate_remove.status_code == 409

    member_removed_posts = client.get(
        f"/api/v1/communities/{community['id']}/posts?status=REMOVED",
        headers=member_headers,
    )
    assert member_removed_posts.status_code == 403

    manager_removed_posts = client.get(
        f"/api/v1/communities/{community['id']}/posts?status=REMOVED",
        headers=manager_headers,
    )
    assert manager_removed_posts.status_code == 200
    assert manager_removed_posts.json()["total"] == 1
    assert manager_removed_posts.json()["posts"][0]["id"] == member_post["id"]

    member_removed_queue_denied = client.get(
        f"/api/v1/communities/{community['id']}/removed-posts",
        headers=member_headers,
    )
    assert member_removed_queue_denied.status_code == 403

    manager_removed_queue = client.get(
        f"/api/v1/communities/{community['id']}/removed-posts",
        headers=manager_headers,
    )
    assert manager_removed_queue.status_code == 200
    removed_queue_payload = manager_removed_queue.json()
    assert removed_queue_payload["total"] == 1
    assert removed_queue_payload["posts"][0]["id"] == member_post["id"]
    assert removed_queue_payload["posts"][0]["removed_by_display_name"] == "Feed Manager"
    assert removed_queue_payload["posts"][0]["body"] == "Member update for the group."

    active_posts = client.get(
        f"/api/v1/communities/{community['id']}/posts",
        headers=member_headers,
    )
    assert active_posts.status_code == 200
    assert active_posts.json()["total"] == 1
    assert active_posts.json()["posts"][0]["id"] == owner_post["id"]

    member_restore_denied = client.post(
        f"/api/v1/communities/{community['id']}/posts/{member_post['id']}/restore",
        headers=member_headers,
    )
    assert member_restore_denied.status_code == 403

    manager_restore_post = client.post(
        f"/api/v1/communities/{community['id']}/posts/{member_post['id']}/restore",
        headers=manager_headers,
    )
    assert manager_restore_post.status_code == 200
    assert manager_restore_post.json()["status"] == "ACTIVE"
    assert manager_restore_post.json()["removed_by_user_id"] is None
    assert manager_restore_post.json()["removed_at"] is None

    manager_removed_queue_after_restore = client.get(
        f"/api/v1/communities/{community['id']}/removed-posts",
        headers=manager_headers,
    )
    assert manager_removed_queue_after_restore.status_code == 200
    assert manager_removed_queue_after_restore.json()["total"] == 0

    active_posts_after_restore = client.get(
        f"/api/v1/communities/{community['id']}/posts",
        headers=member_headers,
    )
    assert active_posts_after_restore.status_code == 200
    assert active_posts_after_restore.json()["total"] == 2

    duplicate_restore_post = client.post(
        f"/api/v1/communities/{community['id']}/posts/{member_post['id']}/restore",
        headers=manager_headers,
    )
    assert duplicate_restore_post.status_code == 409


def test_community_post_comments_reactions_and_reports(client: TestClient) -> None:
    admin_headers = create_admin(client)
    community = create_community(
        client,
        admin_headers,
        name="Uganda Feed Engagement Chapter",
        country="Uganda",
    )

    member_user = register_user(client, "engagement.member@example.com")
    manager_user = register_user(client, "engagement.manager@example.com")
    outsider_user = register_user(client, "engagement.outsider@example.com")
    member_headers = auth_headers(member_user["access_token"])
    manager_headers = auth_headers(manager_user["access_token"])
    outsider_headers = auth_headers(outsider_user["access_token"])

    for headers in (member_headers, manager_headers):
        join_response = client.post(f"/api/v1/communities/{community['id']}/join", headers=headers)
        assert join_response.status_code == 200

    roster_response = client.get(
        f"/api/v1/communities/{community['id']}/members",
        headers=admin_headers,
    )
    members_by_email = {member["email"]: member for member in roster_response.json()["members"]}
    manager_promotion = client.patch(
        f"/api/v1/communities/{community['id']}/members/"
        f"{members_by_email['engagement.manager@example.com']['id']}",
        headers=admin_headers,
        json={"role": "MANAGER"},
    )
    assert manager_promotion.status_code == 200

    post_response = client.post(
        f"/api/v1/communities/{community['id']}/posts",
        headers=member_headers,
        json={"body": "Engagement post."},
    )
    assert post_response.status_code == 201
    post = post_response.json()
    assert post["comment_count"] == 0
    assert post["reaction_count"] == 0
    assert post["viewer_reacted"] is False
    assert post["open_report_count"] == 0

    outsider_comment = client.post(
        f"/api/v1/communities/{community['id']}/posts/{post['id']}/comments",
        headers=outsider_headers,
        json={"body": "Not allowed."},
    )
    assert outsider_comment.status_code == 403

    comment_response = client.post(
        f"/api/v1/communities/{community['id']}/posts/{post['id']}/comments",
        headers=member_headers,
        json={"body": "  First comment.  "},
    )
    assert comment_response.status_code == 201
    comment = comment_response.json()
    assert comment["body"] == "First comment."
    assert comment["author_display_name"] == "Engagement Member"

    comments_response = client.get(
        f"/api/v1/communities/{community['id']}/posts/{post['id']}/comments",
        headers=manager_headers,
    )
    assert comments_response.status_code == 200
    assert comments_response.json()["total"] == 1

    like_response = client.post(
        f"/api/v1/communities/{community['id']}/posts/{post['id']}/reaction",
        headers=manager_headers,
        json={"reaction_type": "like"},
    )
    assert like_response.status_code == 200
    assert like_response.json()["reacted"] is True
    assert like_response.json()["reaction_count"] == 1

    invalid_reaction = client.post(
        f"/api/v1/communities/{community['id']}/posts/{post['id']}/reaction",
        headers=manager_headers,
        json={"reaction_type": "WOW"},
    )
    assert invalid_reaction.status_code == 400

    manager_posts = client.get(
        f"/api/v1/communities/{community['id']}/posts",
        headers=manager_headers,
    )
    assert manager_posts.status_code == 200
    manager_post = manager_posts.json()["posts"][0]
    assert manager_post["comment_count"] == 1
    assert manager_post["reaction_count"] == 1
    assert manager_post["viewer_reacted"] is True

    unlike_response = client.post(
        f"/api/v1/communities/{community['id']}/posts/{post['id']}/reaction",
        headers=manager_headers,
        json={"reaction_type": "LIKE"},
    )
    assert unlike_response.status_code == 200
    assert unlike_response.json()["reacted"] is False
    assert unlike_response.json()["reaction_count"] == 0

    report_response = client.post(
        f"/api/v1/communities/{community['id']}/posts/{post['id']}/reports",
        headers=manager_headers,
        json={"reason": "spam", "note": "Looks off."},
    )
    assert report_response.status_code == 201
    report = report_response.json()
    assert report["reason"] == "SPAM"
    assert report["status"] == "OPEN"
    assert report["reporter_display_name"] == "Engagement Manager"

    duplicate_report = client.post(
        f"/api/v1/communities/{community['id']}/posts/{post['id']}/reports",
        headers=manager_headers,
        json={"reason": "SPAM"},
    )
    assert duplicate_report.status_code == 409

    member_reports_denied = client.get(
        f"/api/v1/communities/{community['id']}/posts/{post['id']}/reports",
        headers=member_headers,
    )
    assert member_reports_denied.status_code == 403
    member_report_queue_denied = client.get(
        f"/api/v1/communities/{community['id']}/post-reports",
        headers=member_headers,
    )
    assert member_report_queue_denied.status_code == 403

    manager_reports = client.get(
        f"/api/v1/communities/{community['id']}/posts/{post['id']}/reports",
        headers=manager_headers,
    )
    assert manager_reports.status_code == 200
    assert manager_reports.json()["total"] == 1
    manager_report_queue = client.get(
        f"/api/v1/communities/{community['id']}/post-reports",
        headers=manager_headers,
    )
    assert manager_report_queue.status_code == 200
    report_queue_payload = manager_report_queue.json()
    assert report_queue_payload["total"] == 1
    assert report_queue_payload["reports"][0]["id"] == report["id"]
    assert report_queue_payload["reports"][0]["post_id"] == post["id"]
    assert report_queue_payload["reports"][0]["post_body"] == "Engagement post."
    assert report_queue_payload["reports"][0]["post_author_display_name"] == "Engagement Member"
    assert report_queue_payload["reports"][0]["post_status"] == "ACTIVE"

    manager_post_after_report = client.get(
        f"/api/v1/communities/{community['id']}/posts",
        headers=manager_headers,
    )
    assert manager_post_after_report.json()["posts"][0]["open_report_count"] == 1
    member_post_after_report = client.get(
        f"/api/v1/communities/{community['id']}/posts",
        headers=member_headers,
    )
    assert member_post_after_report.json()["posts"][0]["open_report_count"] == 0

    resolve_response = client.post(
        f"/api/v1/communities/{community['id']}/posts/{post['id']}/reports/{report['id']}/resolve",
        headers=manager_headers,
    )
    assert resolve_response.status_code == 200
    assert resolve_response.json()["status"] == "RESOLVED"
    open_report_queue_after_resolve = client.get(
        f"/api/v1/communities/{community['id']}/post-reports",
        headers=manager_headers,
    )
    assert open_report_queue_after_resolve.status_code == 200
    assert open_report_queue_after_resolve.json()["total"] == 0
    all_report_queue_after_resolve = client.get(
        f"/api/v1/communities/{community['id']}/post-reports?status=ALL",
        headers=manager_headers,
    )
    assert all_report_queue_after_resolve.status_code == 200
    assert all_report_queue_after_resolve.json()["total"] == 1
    assert all_report_queue_after_resolve.json()["reports"][0]["status"] == "RESOLVED"
    duplicate_resolve = client.post(
        f"/api/v1/communities/{community['id']}/posts/{post['id']}/reports/{report['id']}/resolve",
        headers=manager_headers,
    )
    assert duplicate_resolve.status_code == 409

    manager_remove_comment = client.post(
        f"/api/v1/communities/{community['id']}/posts/{post['id']}/comments/{comment['id']}/remove",
        headers=manager_headers,
    )
    assert manager_remove_comment.status_code == 200
    assert manager_remove_comment.json()["status"] == "REMOVED"
    member_removed_comments_denied = client.get(
        f"/api/v1/communities/{community['id']}/posts/{post['id']}/comments?status=REMOVED",
        headers=member_headers,
    )
    assert member_removed_comments_denied.status_code == 403
    manager_removed_comments = client.get(
        f"/api/v1/communities/{community['id']}/posts/{post['id']}/comments?status=REMOVED",
        headers=manager_headers,
    )
    assert manager_removed_comments.status_code == 200
    assert manager_removed_comments.json()["total"] == 1

    member_removed_comment_queue_denied = client.get(
        f"/api/v1/communities/{community['id']}/removed-comments",
        headers=member_headers,
    )
    assert member_removed_comment_queue_denied.status_code == 403

    manager_removed_comment_queue = client.get(
        f"/api/v1/communities/{community['id']}/removed-comments",
        headers=manager_headers,
    )
    assert manager_removed_comment_queue.status_code == 200
    removed_comment_queue_payload = manager_removed_comment_queue.json()
    assert removed_comment_queue_payload["total"] == 1
    assert removed_comment_queue_payload["comments"][0]["id"] == comment["id"]
    assert removed_comment_queue_payload["comments"][0]["body"] == "First comment."
    assert removed_comment_queue_payload["comments"][0]["removed_by_display_name"] == (
        "Engagement Manager"
    )
    assert removed_comment_queue_payload["comments"][0]["post_body"] == "Engagement post."
    assert removed_comment_queue_payload["comments"][0]["post_author_display_name"] == (
        "Engagement Member"
    )

    member_restore_comment_denied = client.post(
        f"/api/v1/communities/{community['id']}/posts/{post['id']}/comments/"
        f"{comment['id']}/restore",
        headers=member_headers,
    )
    assert member_restore_comment_denied.status_code == 403

    manager_restore_comment = client.post(
        f"/api/v1/communities/{community['id']}/posts/{post['id']}/comments/"
        f"{comment['id']}/restore",
        headers=manager_headers,
    )
    assert manager_restore_comment.status_code == 200
    assert manager_restore_comment.json()["status"] == "ACTIVE"
    assert manager_restore_comment.json()["removed_by_user_id"] is None
    assert manager_restore_comment.json()["removed_at"] is None

    active_comments_after_restore = client.get(
        f"/api/v1/communities/{community['id']}/posts/{post['id']}/comments",
        headers=member_headers,
    )
    assert active_comments_after_restore.status_code == 200
    assert active_comments_after_restore.json()["total"] == 1

    manager_removed_comment_queue_after_restore = client.get(
        f"/api/v1/communities/{community['id']}/removed-comments",
        headers=manager_headers,
    )
    assert manager_removed_comment_queue_after_restore.status_code == 200
    assert manager_removed_comment_queue_after_restore.json()["total"] == 0

    duplicate_restore_comment = client.post(
        f"/api/v1/communities/{community['id']}/posts/{post['id']}/comments/"
        f"{comment['id']}/restore",
        headers=manager_headers,
    )
    assert duplicate_restore_comment.status_code == 409


def test_admin_can_review_cross_community_moderation_queues(client: TestClient) -> None:
    admin_headers = create_admin(client, "global.moderator@example.com")
    member_user = register_user(client, "global.member@example.com")
    member_headers = auth_headers(member_user["access_token"])

    report_community = create_community(
        client,
        admin_headers,
        name="Rwanda Report Review Chapter",
        country="Rwanda",
    )
    removed_community = create_community(
        client,
        admin_headers,
        name="Senegal Removed Content Chapter",
        country="Senegal",
    )

    for community in (report_community, removed_community):
        join_response = client.post(
            f"/api/v1/communities/{community['id']}/join",
            headers=member_headers,
        )
        assert join_response.status_code == 200

    reported_post_response = client.post(
        f"/api/v1/communities/{report_community['id']}/posts",
        headers=admin_headers,
        json={"body": "Global report queue seed post."},
    )
    assert reported_post_response.status_code == 201
    reported_post = reported_post_response.json()
    report_response = client.post(
        f"/api/v1/communities/{report_community['id']}/posts/{reported_post['id']}/reports",
        headers=member_headers,
        json={"reason": "spam", "note": "Needs platform review."},
    )
    assert report_response.status_code == 201
    report = report_response.json()

    removed_post_response = client.post(
        f"/api/v1/communities/{removed_community['id']}/posts",
        headers=member_headers,
        json={"body": "Global removed post queue seed."},
    )
    assert removed_post_response.status_code == 201
    removed_post = removed_post_response.json()
    remove_post_response = client.post(
        f"/api/v1/communities/{removed_community['id']}/posts/{removed_post['id']}/remove",
        headers=admin_headers,
    )
    assert remove_post_response.status_code == 200

    comment_post_response = client.post(
        f"/api/v1/communities/{removed_community['id']}/posts",
        headers=admin_headers,
        json={"body": "Global removed comment parent post."},
    )
    assert comment_post_response.status_code == 201
    comment_post = comment_post_response.json()
    comment_response = client.post(
        f"/api/v1/communities/{removed_community['id']}/posts/{comment_post['id']}/comments",
        headers=member_headers,
        json={"body": "Global removed comment queue seed."},
    )
    assert comment_response.status_code == 201
    removed_comment = comment_response.json()
    remove_comment_response = client.post(
        f"/api/v1/communities/{removed_community['id']}/posts/{comment_post['id']}/comments/"
        f"{removed_comment['id']}/remove",
        headers=admin_headers,
    )
    assert remove_comment_response.status_code == 200

    member_global_queue_denied = client.get(
        "/api/v1/communities/admin/moderation/post-reports",
        headers=member_headers,
    )
    assert member_global_queue_denied.status_code == 403

    report_queue = client.get(
        "/api/v1/communities/admin/moderation/post-reports?reason=SPAM",
        headers=admin_headers,
    )
    assert report_queue.status_code == 200
    report_payload = report_queue.json()
    assert report_payload["total"] == 1
    assert report_payload["reports"][0]["id"] == report["id"]
    assert report_payload["reports"][0]["community_id"] == report_community["id"]
    assert report_payload["reports"][0]["community_name"] == "Rwanda Report Review Chapter"
    assert report_payload["reports"][0]["post_body"] == "Global report queue seed post."

    filtered_report_queue = client.get(
        f"/api/v1/communities/admin/moderation/post-reports?community_id={removed_community['id']}",
        headers=admin_headers,
    )
    assert filtered_report_queue.status_code == 200
    assert filtered_report_queue.json()["total"] == 0

    removed_post_queue = client.get(
        "/api/v1/communities/admin/moderation/removed-posts?q=Senegal",
        headers=admin_headers,
    )
    assert removed_post_queue.status_code == 200
    removed_post_payload = removed_post_queue.json()
    assert removed_post_payload["total"] == 1
    assert removed_post_payload["posts"][0]["id"] == removed_post["id"]
    assert removed_post_payload["posts"][0]["community_id"] == removed_community["id"]
    assert removed_post_payload["posts"][0]["community_name"] == "Senegal Removed Content Chapter"
    assert removed_post_payload["posts"][0]["removed_by_display_name"] == "Global Moderator"

    removed_comment_queue = client.get(
        "/api/v1/communities/admin/moderation/removed-comments?q=comment",
        headers=admin_headers,
    )
    assert removed_comment_queue.status_code == 200
    removed_comment_payload = removed_comment_queue.json()
    assert removed_comment_payload["total"] == 1
    assert removed_comment_payload["comments"][0]["id"] == removed_comment["id"]
    assert removed_comment_payload["comments"][0]["community_id"] == removed_community["id"]
    assert removed_comment_payload["comments"][0]["community_name"] == (
        "Senegal Removed Content Chapter"
    )
    assert removed_comment_payload["comments"][0]["post_body"] == (
        "Global removed comment parent post."
    )

    member_report_review_denied = client.patch(
        f"/api/v1/communities/{report_community['id']}/posts/{reported_post['id']}/reports/"
        f"{report['id']}/review",
        headers=member_headers,
        json={
            "moderator_note": "Member should not update moderation review.",
            "severity": "HIGH",
            "escalation_status": "ESCALATED",
        },
    )
    assert member_report_review_denied.status_code == 403

    report_review = client.patch(
        f"/api/v1/communities/{report_community['id']}/posts/{reported_post['id']}/reports/"
        f"{report['id']}/review",
        headers=admin_headers,
        json={
            "moderator_note": "Escalate to platform safety review.",
            "severity": "critical",
            "escalation_status": "escalated",
        },
    )
    assert report_review.status_code == 200
    report_review_payload = report_review.json()
    assert report_review_payload["moderator_note"] == "Escalate to platform safety review."
    assert report_review_payload["severity"] == "CRITICAL"
    assert report_review_payload["escalation_status"] == "ESCALATED"
    assert report_review_payload["escalated_by_user_id"] is not None
    assert report_review_payload["escalated_at"] is not None

    escalated_report_queue = client.get(
        "/api/v1/communities/admin/moderation/post-reports"
        "?severity=CRITICAL&escalation_status=ESCALATED",
        headers=admin_headers,
    )
    assert escalated_report_queue.status_code == 200
    assert escalated_report_queue.json()["total"] == 1
    assert escalated_report_queue.json()["reports"][0]["moderator_note"] == (
        "Escalate to platform safety review."
    )

    removed_post_review = client.patch(
        f"/api/v1/communities/{removed_community['id']}/posts/{removed_post['id']}/moderation-review",
        headers=admin_headers,
        json={
            "moderator_note": "Restore only after chapter owner confirms context.",
            "severity": "high",
            "escalation_status": "ESCALATED",
        },
    )
    assert removed_post_review.status_code == 200
    removed_post_review_payload = removed_post_review.json()
    assert removed_post_review_payload["moderation_note"] == (
        "Restore only after chapter owner confirms context."
    )
    assert removed_post_review_payload["moderation_severity"] == "HIGH"
    assert removed_post_review_payload["escalation_status"] == "ESCALATED"

    escalated_post_queue = client.get(
        "/api/v1/communities/admin/moderation/removed-posts"
        "?severity=HIGH&escalation_status=ESCALATED",
        headers=admin_headers,
    )
    assert escalated_post_queue.status_code == 200
    assert escalated_post_queue.json()["total"] == 1
    assert escalated_post_queue.json()["posts"][0]["moderation_note"] == (
        "Restore only after chapter owner confirms context."
    )

    removed_comment_review = client.patch(
        f"/api/v1/communities/{removed_community['id']}/posts/{comment_post['id']}/comments/"
        f"{removed_comment['id']}/moderation-review",
        headers=admin_headers,
        json={
            "moderator_note": "Track repeat behavior before restoration.",
            "severity": "medium",
            "escalation_status": "NONE",
        },
    )
    assert removed_comment_review.status_code == 200
    removed_comment_review_payload = removed_comment_review.json()
    assert removed_comment_review_payload["moderation_note"] == (
        "Track repeat behavior before restoration."
    )
    assert removed_comment_review_payload["moderation_severity"] == "MEDIUM"
    assert removed_comment_review_payload["escalation_status"] == "NONE"

    reviewed_comment_queue = client.get(
        "/api/v1/communities/admin/moderation/removed-comments?severity=MEDIUM",
        headers=admin_headers,
    )
    assert reviewed_comment_queue.status_code == 200
    assert reviewed_comment_queue.json()["total"] == 1
    assert reviewed_comment_queue.json()["comments"][0]["moderation_note"] == (
        "Track repeat behavior before restoration."
    )

    resolve_report = client.post(
        f"/api/v1/communities/{report_community['id']}/posts/{reported_post['id']}/reports/"
        f"{report['id']}/resolve",
        headers=admin_headers,
    )
    assert resolve_report.status_code == 200
    restore_removed_post = client.post(
        f"/api/v1/communities/{removed_community['id']}/posts/{removed_post['id']}/restore",
        headers=admin_headers,
    )
    assert restore_removed_post.status_code == 200
    restore_removed_comment = client.post(
        f"/api/v1/communities/{removed_community['id']}/posts/{comment_post['id']}/comments/"
        f"{removed_comment['id']}/restore",
        headers=admin_headers,
    )
    assert restore_removed_comment.status_code == 200

    assert (
        client.get(
            "/api/v1/communities/admin/moderation/post-reports",
            headers=admin_headers,
        ).json()["total"]
        == 0
    )
    assert (
        client.get(
            "/api/v1/communities/admin/moderation/removed-posts",
            headers=admin_headers,
        ).json()["total"]
        == 0
    )
    assert (
        client.get(
            "/api/v1/communities/admin/moderation/removed-comments",
            headers=admin_headers,
        ).json()["total"]
        == 0
    )


def test_community_manager_can_review_pending_join_requests(client: TestClient) -> None:
    admin_headers = create_admin(client)
    community = create_community(
        client,
        admin_headers,
        name="Health Leaders Working Group",
        community_type="WORKING_GROUP",
        sector="Health",
        join_policy="REQUEST",
    )

    manager_user = register_user(client, "review.manager@example.com")
    applicant_user = register_user(client, "chapter.applicant@example.com")
    manager_headers = auth_headers(manager_user["access_token"])
    applicant_headers = auth_headers(applicant_user["access_token"])

    manager_request = client.post(
        f"/api/v1/communities/{community['id']}/join",
        headers=manager_headers,
    )
    assert manager_request.status_code == 200
    pending_roster = client.get(
        f"/api/v1/communities/{community['id']}/members?status=PENDING",
        headers=admin_headers,
    )
    assert pending_roster.status_code == 200
    manager_membership = pending_roster.json()["members"][0]
    approval_response = client.post(
        f"/api/v1/communities/{community['id']}/members/{manager_membership['id']}/approve",
        headers=admin_headers,
    )
    assert approval_response.status_code == 200
    promotion_response = client.patch(
        f"/api/v1/communities/{community['id']}/members/{manager_membership['id']}",
        headers=admin_headers,
        json={"role": "MANAGER"},
    )
    assert promotion_response.status_code == 200

    applicant_request = client.post(
        f"/api/v1/communities/{community['id']}/join",
        headers=applicant_headers,
    )
    assert applicant_request.status_code == 200
    manager_pending_roster = client.get(
        f"/api/v1/communities/{community['id']}/members?status=PENDING",
        headers=manager_headers,
    )
    assert manager_pending_roster.status_code == 200
    applicant_membership = manager_pending_roster.json()["members"][0]
    assert applicant_membership["email"] == "chapter.applicant@example.com"

    manager_approval = client.post(
        f"/api/v1/communities/{community['id']}/members/{applicant_membership['id']}/approve",
        headers=manager_headers,
    )
    assert manager_approval.status_code == 200
    assert manager_approval.json()["status"] == "ACTIVE"


def test_community_owner_can_update_settings_and_manager_cannot(client: TestClient) -> None:
    admin_headers = create_admin(client)
    community = create_community(
        client,
        admin_headers,
        name="Senegal Alumni Chapter",
        country="Senegal",
        sector="Public management",
    )

    manager_user = register_user(client, "settings.manager@example.com")
    manager_headers = auth_headers(manager_user["access_token"])
    join_response = client.post(
        f"/api/v1/communities/{community['id']}/join",
        headers=manager_headers,
    )
    assert join_response.status_code == 200
    roster_response = client.get(
        f"/api/v1/communities/{community['id']}/members",
        headers=admin_headers,
    )
    manager_membership = next(
        member
        for member in roster_response.json()["members"]
        if member["email"] == "settings.manager@example.com"
    )
    promotion_response = client.patch(
        f"/api/v1/communities/{community['id']}/members/{manager_membership['id']}",
        headers=admin_headers,
        json={"role": "MANAGER"},
    )
    assert promotion_response.status_code == 200

    manager_denied = client.patch(
        f"/api/v1/communities/{community['id']}",
        headers=manager_headers,
        json={"name": "Manager Renamed Chapter"},
    )
    assert manager_denied.status_code == 403

    update_response = client.patch(
        f"/api/v1/communities/{community['id']}",
        headers=admin_headers,
        json={
            "name": "Senegal Civic Leadership Chapter",
            "community_type": "CITY_CHAPTER",
            "description": "Updated chapter remit.",
            "country": "Senegal",
            "city": "Dakar",
            "sector": "Civic technology",
            "program_name": "Regional Leadership Center",
            "cohort_year": 2024,
            "visibility": "PRIVATE",
            "join_policy": "REQUEST",
        },
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["name"] == "Senegal Civic Leadership Chapter"
    assert updated["slug"] == "senegal-alumni-chapter"
    assert updated["community_type"] == "CITY_CHAPTER"
    assert updated["city"] == "Dakar"
    assert updated["visibility"] == "PRIVATE"
    assert updated["join_policy"] == "REQUEST"

    filtered_response = client.get(
        "/api/v1/communities?community_type=CITY_CHAPTER&country=Senegal&sector=technology",
        headers=admin_headers,
    )
    assert filtered_response.status_code == 200
    assert filtered_response.json()["total"] == 1

    invalid_response = client.patch(
        f"/api/v1/communities/{community['id']}",
        headers=admin_headers,
        json={"join_policy": "INVITE_ONLY"},
    )
    assert invalid_response.status_code == 400


def test_community_manager_can_invite_member_and_invited_user_can_accept(
    client: TestClient,
) -> None:
    admin_headers = create_admin(client)
    community = create_community(
        client,
        admin_headers,
        name="Togo Youth Leadership Chapter",
        country="Togo",
    )

    manager_user = register_user(client, "invite.manager@example.com")
    manager_headers = auth_headers(manager_user["access_token"])
    join_response = client.post(
        f"/api/v1/communities/{community['id']}/join",
        headers=manager_headers,
    )
    assert join_response.status_code == 200
    roster_response = client.get(
        f"/api/v1/communities/{community['id']}/members",
        headers=admin_headers,
    )
    manager_membership = next(
        member
        for member in roster_response.json()["members"]
        if member["email"] == "invite.manager@example.com"
    )
    promotion_response = client.patch(
        f"/api/v1/communities/{community['id']}/members/{manager_membership['id']}",
        headers=admin_headers,
        json={"role": "MANAGER"},
    )
    assert promotion_response.status_code == 200

    invite_response = client.post(
        f"/api/v1/communities/{community['id']}/invitations",
        headers=manager_headers,
        json={"email": "Invited.Member@example.com"},
    )
    assert invite_response.status_code == 201
    invitation = invite_response.json()
    assert invitation["invited_email"] == "invited.member@example.com"
    assert invitation["invited_role"] == "MEMBER"
    assert invitation["status"] == "PENDING"
    assert invitation["dev_invitation_token"]

    duplicate_invite = client.post(
        f"/api/v1/communities/{community['id']}/invitations",
        headers=manager_headers,
        json={"email": "invited.member@example.com"},
    )
    assert duplicate_invite.status_code == 409

    pending_invitations = client.get(
        f"/api/v1/communities/{community['id']}/invitations?status=PENDING",
        headers=manager_headers,
    )
    assert pending_invitations.status_code == 200
    assert pending_invitations.json()["total"] == 1
    assert pending_invitations.json()["invitations"][0]["dev_invitation_token"] is None

    wrong_user = register_user(client, "wrong.invited@example.com")
    wrong_accept = client.post(
        "/api/v1/communities/invitations/accept",
        headers=auth_headers(wrong_user["access_token"]),
        json={"token": invitation["dev_invitation_token"]},
    )
    assert wrong_accept.status_code == 403

    invited_user = register_user(client, "invited.member@example.com")
    accept_response = client.post(
        "/api/v1/communities/invitations/accept",
        headers=auth_headers(invited_user["access_token"]),
        json={"token": invitation["dev_invitation_token"]},
    )
    assert accept_response.status_code == 200
    accepted_community = accept_response.json()
    assert accepted_community["membership_status"] == "ACTIVE"
    assert accepted_community["membership_role"] == "MEMBER"
    assert accepted_community["member_count"] == 3

    accepted_invitations = client.get(
        f"/api/v1/communities/{community['id']}/invitations?status=ACCEPTED",
        headers=manager_headers,
    )
    assert accepted_invitations.status_code == 200
    assert accepted_invitations.json()["total"] == 1

    active_member_invite = client.post(
        f"/api/v1/communities/{community['id']}/invitations",
        headers=manager_headers,
        json={"email": "invited.member@example.com"},
    )
    assert active_member_invite.status_code == 409


def test_community_owner_can_invite_manager_and_cancel_invitation(
    client: TestClient,
) -> None:
    admin_headers = create_admin(client)
    community = create_community(
        client,
        admin_headers,
        name="Benin Alumni Chapter",
        country="Benin",
    )

    manager_user = register_user(client, "invite.only.member@example.com")
    manager_headers = auth_headers(manager_user["access_token"])
    join_response = client.post(
        f"/api/v1/communities/{community['id']}/join",
        headers=manager_headers,
    )
    assert join_response.status_code == 200
    roster_response = client.get(
        f"/api/v1/communities/{community['id']}/members",
        headers=admin_headers,
    )
    manager_membership = next(
        member
        for member in roster_response.json()["members"]
        if member["email"] == "invite.only.member@example.com"
    )
    promotion_response = client.patch(
        f"/api/v1/communities/{community['id']}/members/{manager_membership['id']}",
        headers=admin_headers,
        json={"role": "MANAGER"},
    )
    assert promotion_response.status_code == 200

    denied_manager_invite = client.post(
        f"/api/v1/communities/{community['id']}/invitations",
        headers=manager_headers,
        json={"email": "manager.invitee@example.com", "role": "MANAGER"},
    )
    assert denied_manager_invite.status_code == 403

    manager_invite = client.post(
        f"/api/v1/communities/{community['id']}/invitations",
        headers=admin_headers,
        json={"email": "manager.invitee@example.com", "role": "MANAGER"},
    )
    assert manager_invite.status_code == 201
    invitation_id = manager_invite.json()["id"]

    cancel_response = client.post(
        f"/api/v1/communities/{community['id']}/invitations/{invitation_id}/cancel",
        headers=admin_headers,
    )
    assert cancel_response.status_code == 200
    assert cancel_response.json()["status"] == "CANCELED"

    canceled_accept_user = register_user(client, "manager.invitee@example.com")
    canceled_accept = client.post(
        "/api/v1/communities/invitations/accept",
        headers=auth_headers(canceled_accept_user["access_token"]),
        json={"token": manager_invite.json()["dev_invitation_token"]},
    )
    assert canceled_accept.status_code == 409


def test_community_filters_and_pagination(client: TestClient) -> None:
    admin_headers = create_admin(client)
    create_community(
        client,
        admin_headers,
        name="Ghana Civic Technology Group",
        community_type="SECTOR_GROUP",
        country="Ghana",
        sector="Civic technology",
    )
    create_community(
        client,
        admin_headers,
        name="Ghana Public Management Group",
        community_type="SECTOR_GROUP",
        country="Ghana",
        sector="Public management",
    )
    create_community(
        client,
        admin_headers,
        name="Kenya Education Chapter",
        community_type="COUNTRY_CHAPTER",
        country="Kenya",
        sector="Education",
    )

    response = client.get(
        "/api/v1/communities?country=Ghana&limit=1&offset=0",
        headers=admin_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    assert body["limit"] == 1
    assert body["has_more"] is True

    q_response = client.get("/api/v1/communities?q=Education", headers=admin_headers)
    assert q_response.status_code == 200
    assert q_response.json()["total"] == 1
    assert q_response.json()["communities"][0]["country"] == "Kenya"

    sector_response = client.get(
        "/api/v1/communities?community_type=SECTOR_GROUP&sector=management",
        headers=admin_headers,
    )
    assert sector_response.status_code == 200
    assert sector_response.json()["total"] == 1
