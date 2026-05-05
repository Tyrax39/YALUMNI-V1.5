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
