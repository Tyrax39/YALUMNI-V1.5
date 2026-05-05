from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, delete, func, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db_session
from app.core.rate_limit import clear_rate_limits
from app.core.security import hash_password
from app.main import app
from app.modules.alumni import models as alumni_models
from app.modules.auth import models as auth_models
from app.modules.auth.platform_owner import PLATFORM_OWNER_ROLES, ensure_platform_owner
from app.modules.auth.test_accounts import TEST_ACCOUNT_SEEDS, ensure_test_accounts

_ = auth_models, alumni_models


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


def auth_headers(access_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {access_token}"}


def session_headers(access_token: str, refresh_token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {access_token}",
        "X-Refresh-Token": refresh_token,
    }


def complete_alumni_profile(client: TestClient, access_token: str) -> dict:
    headers = auth_headers(access_token)
    update_response = client.patch(
        "/api/v1/alumni/me/profile",
        headers=headers,
        json={
            "headline": "Civic technology organizer",
            "bio": "Building transparent tools for local chapters.",
            "country": "Ghana",
            "city": "Accra",
            "sector": "Civic technology",
            "organization": "Open Chapter Lab",
            "job_title": "Program Lead",
            "skills": ["Governance", "Data", "Community"],
        },
    )
    assert update_response.status_code == 200

    affiliation_response = client.post(
        "/api/v1/alumni/me/program-affiliations",
        headers=headers,
        json={
            "program_name": "YALI Regional Leadership Center",
            "cohort_year": 2024,
            "country": "Ghana",
            "city": "Accra",
        },
    )
    assert affiliation_response.status_code == 201
    return affiliation_response.json()


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


def test_platform_owner_seed_restores_god_mode_roles() -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = testing_session_local()
    try:
        legacy_owner = auth_models.User(
            email="tshiva@yalumni.org",
            display_name="Legacy Owner",
            password_hash=hash_password("LegacyOwnerPass123!"),
            status="SUSPENDED",
        )
        db.add(legacy_owner)
        db.commit()

        owner = ensure_platform_owner(db, "OwnerTestPass123!")
        assert owner.id == legacy_owner.id
        assert owner.email == "t.shiva@yalumni.org"
        assert owner.display_name == "Patient0"
        assert owner.email_verified_at is not None
        assert {assignment.role.name for assignment in owner.role_assignments} == set(
            PLATFORM_OWNER_ROLES
        )

        owner_id = owner.id
        owner.status = "SUSPENDED"
        db.execute(
            delete(auth_models.RoleAssignment).where(auth_models.RoleAssignment.user_id == owner.id)
        )
        db.commit()

        restored = ensure_platform_owner(db)
        assert restored.status == "ACTIVE"
        assert {assignment.role.name for assignment in restored.role_assignments} == set(
            PLATFORM_OWNER_ROLES
        )

        db.delete(restored)
        db.commit()

        recreated = ensure_platform_owner(db, "OwnerTestPass123!")
        assert recreated.id != owner_id
        assert recreated.email == "t.shiva@yalumni.org"
        assert {assignment.role.name for assignment in recreated.role_assignments} == set(
            PLATFORM_OWNER_ROLES
        )
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


def test_test_account_seed_creates_role_shaped_local_accounts() -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = testing_session_local()
    try:
        users = ensure_test_accounts(db, "SharedTestPass123!")
        assert [user.email for user in users] == [seed.email for seed in TEST_ACCOUNT_SEEDS]
        assert all(user.password_hash for user in users)

        role_map = {
            user.email: {assignment.role.name for assignment in user.role_assignments}
            for user in users
        }
        assert role_map["test.superadmin@yalumni.local"] == {
            "SUPER_ADMIN",
            "PLATFORM_ADMIN",
            "VERIFICATION_ADMIN",
        }
        assert role_map["test.verifier@yalumni.local"] == {"VERIFICATION_ADMIN"}
        assert role_map["test.alumni@yalumni.local"] == {"ALUMNI_MEMBER"}
        assert role_map["test.applicant@yalumni.local"] == {"UNVERIFIED_USER"}

        profile = db.scalar(
            select(alumni_models.AlumniProfile)
            .join(auth_models.User)
            .where(auth_models.User.email == "test.alumni@yalumni.local")
        )
        assert profile is not None
        assert profile.visibility["email"] is False
        assert profile.program_affiliations[0].program_name == ("YALI Regional Leadership Center")

        ensure_test_accounts(db, "RotatedTestPass123!")
        total_users = db.scalar(select(func.count(auth_models.User.id)))
        assert total_users == len(TEST_ACCOUNT_SEEDS)
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


def test_platform_owner_login_restores_admin_access(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "tshiva@yalumni.org",
            "password": "OwnerLoginPass123!",
            "display_name": "Temporary Name",
        },
    )
    assert response.status_code == 201

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "tshiva@yalumni.org", "password": "OwnerLoginPass123!"},
    )
    assert login_response.status_code == 200
    logged_in = login_response.json()
    assert logged_in["user"]["email"] == "t.shiva@yalumni.org"
    assert logged_in["user"]["display_name"] == "Patient0"
    assert "SUPER_ADMIN" in logged_in["user"]["roles"]
    assert "ALUMNI_MEMBER" in logged_in["user"]["roles"]
    assert logged_in["user"]["email_verified_at"] is not None

    overview_response = client.get(
        "/api/v1/auth/admin/overview",
        headers=auth_headers(logged_in["access_token"]),
    )
    assert overview_response.status_code == 200


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


def test_login_rate_limit_returns_429_after_repeated_attempts(client: TestClient) -> None:
    for _ in range(5):
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "limited@example.com", "password": "wrong-password"},
        )
        assert response.status_code == 401

    limited_response = client.post(
        "/api/v1/auth/login",
        json={"email": "limited@example.com", "password": "wrong-password"},
    )
    assert limited_response.status_code == 429
    assert limited_response.headers["Retry-After"]


def test_email_verification_marks_user_verified_and_rejects_reuse(client: TestClient) -> None:
    registered = register_user(client, email="verify@example.com")
    verification_token = registered["dev_email_verification_token"]

    verify_response = client.post(
        "/api/v1/auth/email/verify",
        json={"token": verification_token},
    )
    assert verify_response.status_code == 200
    assert verify_response.json()["email_verified_at"] is not None

    reused_response = client.post(
        "/api/v1/auth/email/verify",
        json={"token": verification_token},
    )
    assert reused_response.status_code == 400


def test_password_forgot_reset_and_login_with_new_password(client: TestClient) -> None:
    register_user(client, email="reset@example.com")

    forgot_response = client.post(
        "/api/v1/auth/password/forgot",
        json={"email": "reset@example.com"},
    )
    assert forgot_response.status_code == 200
    reset_token = forgot_response.json()["dev_token"]
    assert reset_token

    reset_response = client.post(
        "/api/v1/auth/password/reset",
        json={"token": reset_token, "new_password": "NewSecurePass123!"},
    )
    assert reset_response.status_code == 200

    old_login = client.post(
        "/api/v1/auth/login",
        json={"email": "reset@example.com", "password": "SecurePass123!"},
    )
    assert old_login.status_code == 401

    new_login = client.post(
        "/api/v1/auth/login",
        json={"email": "reset@example.com", "password": "NewSecurePass123!"},
    )
    assert new_login.status_code == 200

    reused_reset = client.post(
        "/api/v1/auth/password/reset",
        json={"token": reset_token, "new_password": "AnotherSecurePass123!"},
    )
    assert reused_reset.status_code == 400


def test_password_forgot_does_not_disclose_unknown_email(client: TestClient) -> None:
    forgot_response = client.post(
        "/api/v1/auth/password/forgot",
        json={"email": "missing@example.com"},
    )

    assert forgot_response.status_code == 200
    assert forgot_response.json()["dev_token"] is None


def test_password_reset_rate_limit_returns_429_after_repeated_requests(
    client: TestClient,
) -> None:
    for _ in range(5):
        response = client.post(
            "/api/v1/auth/password/forgot",
            json={"email": "limited-reset@example.com"},
        )
        assert response.status_code == 200

    limited_response = client.post(
        "/api/v1/auth/password/forgot",
        json={"email": "limited-reset@example.com"},
    )
    assert limited_response.status_code == 429


def test_admin_overview_requires_role_and_local_bootstrap_grants_access(
    client: TestClient,
) -> None:
    registered = register_user(client, email="admin-seed@example.com")
    headers = auth_headers(registered["access_token"])

    rejected_overview = client.get("/api/v1/auth/admin/overview", headers=headers)
    assert rejected_overview.status_code == 403

    bootstrap_response = client.post("/api/v1/auth/dev/bootstrap-admin", headers=headers)
    assert bootstrap_response.status_code == 200
    bootstrapped_user = bootstrap_response.json()
    assert "SUPER_ADMIN" in bootstrapped_user["roles"]

    overview_response = client.get("/api/v1/auth/admin/overview", headers=headers)
    assert overview_response.status_code == 200
    overview = overview_response.json()
    assert overview["total_users"] == 1
    assert overview["admin_users"] == 1
    assert overview["pending_verification_users"] == 1
    assert overview["latest_security_events"][0]["event_type"] == "auth.dev_admin_bootstrapped"


def test_admin_audit_events_requires_role_and_supports_filters(client: TestClient) -> None:
    registered = register_user(client, email="audit-viewer@example.com")
    headers = auth_headers(registered["access_token"])

    rejected_response = client.get("/api/v1/auth/admin/audit-events", headers=headers)
    assert rejected_response.status_code == 403

    bootstrap_response = client.post("/api/v1/auth/dev/bootstrap-admin", headers=headers)
    assert bootstrap_response.status_code == 200

    audit_response = client.get(
        "/api/v1/auth/admin/audit-events?event_type=auth.dev_admin_bootstrapped",
        headers=headers,
    )
    assert audit_response.status_code == 200
    audit_log = audit_response.json()
    assert audit_log["total"] == 1
    assert audit_log["limit"] == 25
    assert audit_log["offset"] == 0
    event = audit_log["events"][0]
    assert event["event_type"] == "auth.dev_admin_bootstrapped"
    assert event["user_id"] == registered["user"]["id"]
    assert event["user_email"] == "audit-viewer@example.com"
    assert event["user_display_name"] == "Amara Diallo"
    assert event["ip_address"] is not None
    assert "testclient" in event["user_agent"].lower()

    user_filtered_response = client.get(
        f"/api/v1/auth/admin/audit-events?user_id={registered['user']['id']}&limit=2",
        headers=headers,
    )
    assert user_filtered_response.status_code == 200
    user_filtered_log = user_filtered_response.json()
    assert user_filtered_log["total"] >= 2
    assert len(user_filtered_log["events"]) == 2
    assert all(
        event["user_id"] == registered["user"]["id"] for event in user_filtered_log["events"]
    )


def test_local_admin_bootstrap_rate_limit_returns_429(client: TestClient) -> None:
    registered = register_user(client, email="admin-limited@example.com")
    headers = auth_headers(registered["access_token"])

    for _ in range(10):
        response = client.post("/api/v1/auth/dev/bootstrap-admin", headers=headers)
        assert response.status_code == 200

    limited_response = client.post("/api/v1/auth/dev/bootstrap-admin", headers=headers)
    assert limited_response.status_code == 429


def test_session_listing_and_revocation_marks_current_session(client: TestClient) -> None:
    registered = register_user(client, email="sessions@example.com")
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "sessions@example.com", "password": "SecurePass123!"},
    )
    assert login_response.status_code == 200
    logged_in = login_response.json()
    headers = session_headers(logged_in["access_token"], logged_in["refresh_token"])

    sessions_response = client.get("/api/v1/auth/sessions", headers=headers)
    assert sessions_response.status_code == 200
    sessions = sessions_response.json()["sessions"]
    assert len(sessions) == 2

    current_session = next(session for session in sessions if session["is_current"])
    other_session = next(session for session in sessions if not session["is_current"])
    assert current_session["is_active"] is True
    assert other_session["is_active"] is True

    revoke_other = client.delete(
        f"/api/v1/auth/sessions/{other_session['id']}",
        headers=headers,
    )
    assert revoke_other.status_code == 200
    assert revoke_other.json()["revoked_current_session"] is False

    sessions_after_revoke = client.get("/api/v1/auth/sessions", headers=headers)
    revoked_other = next(
        session
        for session in sessions_after_revoke.json()["sessions"]
        if session["id"] == other_session["id"]
    )
    assert revoked_other["is_active"] is False
    assert revoked_other["revoked_at"] is not None

    revoke_current = client.delete(
        f"/api/v1/auth/sessions/{current_session['id']}",
        headers=headers,
    )
    assert revoke_current.status_code == 200
    assert revoke_current.json()["revoked_current_session"] is True

    refresh_after_current_revoke = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": logged_in["refresh_token"]},
    )
    assert refresh_after_current_revoke.status_code == 401

    missing_session = client.delete(
        "/api/v1/auth/sessions/00000000-0000-0000-0000-000000000000",
        headers=auth_headers(registered["access_token"]),
    )
    assert missing_session.status_code == 404


def test_alumni_profile_is_created_and_completed_with_program_affiliation(
    client: TestClient,
) -> None:
    registered = register_user(client, email="profile@example.com")
    headers = auth_headers(registered["access_token"])

    profile_response = client.get("/api/v1/alumni/me/profile", headers=headers)
    assert profile_response.status_code == 200
    profile = profile_response.json()
    assert profile["user_id"] == registered["user"]["id"]
    assert profile["completion_percentage"] == 0
    assert profile["visibility"]["email"] is False
    assert profile["profile_photo_url"] is None
    assert profile["program_affiliations"] == []

    photo_response = client.post(
        "/api/v1/alumni/me/profile-photo",
        headers=headers,
        files={"file": ("headshot.png", b"\x89PNG\r\nYALUMNI profile photo\n", "image/png")},
    )
    assert photo_response.status_code == 200
    photo_profile = photo_response.json()
    assert photo_profile["profile_photo_url"] == (
        f"/api/v1/alumni/{registered['user']['id']}/photo"
    )
    assert photo_profile["profile_photo_file_name"] == "headshot.png"
    assert photo_profile["profile_photo_content_type"] == "image/png"
    assert photo_profile["profile_photo_file_size_bytes"] > 0

    photo_download = client.get(photo_profile["profile_photo_url"], headers=headers)
    assert photo_download.status_code == 200
    assert photo_download.content.startswith(b"\x89PNG")

    rejected_photo = client.post(
        "/api/v1/alumni/me/profile-photo",
        headers=headers,
        files={"file": ("headshot.gif", b"GIF89a", "image/gif")},
    )
    assert rejected_photo.status_code == 415

    delete_photo = client.delete("/api/v1/alumni/me/profile-photo", headers=headers)
    assert delete_photo.status_code == 200
    assert delete_photo.json()["profile_photo_url"] is None
    deleted_photo_download = client.get(photo_profile["profile_photo_url"], headers=headers)
    assert deleted_photo_download.status_code == 404

    update_response = client.patch(
        "/api/v1/alumni/me/profile",
        headers=headers,
        json={
            "headline": "Civic technology organizer",
            "bio": "Building transparent tools for local chapters.",
            "country": "Ghana",
            "city": "Accra",
            "sector": "Civic technology",
            "organization": "Open Chapter Lab",
            "job_title": "Program Lead",
            "skills": ["Governance", "Data", "governance", " Community "],
            "visibility": {"email": True},
        },
    )
    assert update_response.status_code == 200
    updated_profile = update_response.json()
    assert updated_profile["completion_percentage"] == 88
    assert updated_profile["skills"] == ["Governance", "Data", "Community"]
    assert updated_profile["visibility"]["email"] is True

    affiliation_response = client.post(
        "/api/v1/alumni/me/program-affiliations",
        headers=headers,
        json={
            "program_name": "YALI Regional Leadership Center",
            "cohort_year": 2024,
            "country": "Ghana",
            "city": "Accra",
        },
    )
    assert affiliation_response.status_code == 201
    completed_profile = affiliation_response.json()
    assert completed_profile["completion_percentage"] == 100
    assert completed_profile["profile_completed_at"] is not None
    assert completed_profile["program_affiliations"][0]["program_name"] == (
        "YALI Regional Leadership Center"
    )


def test_alumni_profile_requires_authenticated_user(client: TestClient) -> None:
    response = client.get("/api/v1/alumni/me/profile")

    assert response.status_code == 401


def test_verification_request_requires_complete_profile(client: TestClient) -> None:
    registered = register_user(client, email="verification-incomplete@example.com")

    response = client.post(
        "/api/v1/alumni/me/verification-requests",
        headers=auth_headers(registered["access_token"]),
        json={"submitted_note": "Please verify my profile."},
    )

    assert response.status_code == 400


def test_verification_request_admin_approval_grants_alumni_role(
    client: TestClient,
) -> None:
    registered = register_user(client, email="verification-ready@example.com")
    complete_alumni_profile(client, registered["access_token"])
    member_headers = auth_headers(registered["access_token"])
    photo_response = client.post(
        "/api/v1/alumni/me/profile-photo",
        headers=member_headers,
        files={"file": ("verified-headshot.webp", b"RIFFYALUMNIWEBP", "image/webp")},
    )
    assert photo_response.status_code == 200

    submit_response = client.post(
        "/api/v1/alumni/me/verification-requests",
        headers=member_headers,
        json={"submitted_note": "My program and chapter details are ready for review."},
    )
    assert submit_response.status_code == 201
    verification_request = submit_response.json()
    assert verification_request["status"] == "PENDING_REVIEW"
    assert verification_request["profile_snapshot"]["completion_percentage"] == 100
    assert verification_request["evidence"] == []

    evidence_response = client.post(
        f"/api/v1/alumni/me/verification-requests/{verification_request['id']}/evidence",
        headers=member_headers,
        data={"label": "YALI certificate"},
        files={
            "file": (
                "certificate.pdf",
                b"%PDF-1.4\nYALUMNI verification evidence\n",
                "application/pdf",
            )
        },
    )
    assert evidence_response.status_code == 201
    evidence = evidence_response.json()
    assert evidence["label"] == "YALI certificate"
    assert evidence["file_name"] == "certificate.pdf"
    assert evidence["content_type"] == "application/pdf"
    assert evidence["file_size_bytes"] > 0

    evidence_download = client.get(
        (
            f"/api/v1/alumni/verification-requests/{verification_request['id']}"
            f"/evidence/{evidence['id']}/download"
        ),
        headers=member_headers,
    )
    assert evidence_download.status_code == 200
    assert evidence_download.content.startswith(b"%PDF-1.4")

    rejected_evidence = client.post(
        f"/api/v1/alumni/me/verification-requests/{verification_request['id']}/evidence",
        headers=member_headers,
        files={"file": ("notes.txt", b"plain text", "text/plain")},
    )
    assert rejected_evidence.status_code == 415

    duplicate_response = client.post(
        "/api/v1/alumni/me/verification-requests",
        headers=member_headers,
        json={"submitted_note": "Submitting again."},
    )
    assert duplicate_response.status_code == 409

    rejected_admin_queue = client.get(
        "/api/v1/alumni/admin/verification-requests",
        headers=member_headers,
    )
    assert rejected_admin_queue.status_code == 403

    admin = register_user(client, email="verification-admin@example.com")
    admin_headers = auth_headers(admin["access_token"])
    bootstrap_response = client.post("/api/v1/auth/dev/bootstrap-admin", headers=admin_headers)
    assert bootstrap_response.status_code == 200

    queue_response = client.get(
        "/api/v1/alumni/admin/verification-requests",
        headers=admin_headers,
    )
    assert queue_response.status_code == 200
    queue = queue_response.json()["requests"]
    assert queue[0]["id"] == verification_request["id"]
    assert queue[0]["evidence"][0]["label"] == "YALI certificate"

    admin_evidence_download = client.get(
        (
            f"/api/v1/alumni/verification-requests/{verification_request['id']}"
            f"/evidence/{evidence['id']}/download"
        ),
        headers=admin_headers,
    )
    assert admin_evidence_download.status_code == 200

    approve_response = client.post(
        f"/api/v1/alumni/admin/verification-requests/{verification_request['id']}/approve",
        headers=admin_headers,
        json={"reviewer_note": "Program details verified."},
    )
    assert approve_response.status_code == 200
    approved_request = approve_response.json()
    assert approved_request["status"] == "APPROVED"
    assert approved_request["reviewer_note"] == "Program details verified."

    member_response = client.get("/api/v1/auth/me", headers=member_headers)
    assert member_response.status_code == 200
    assert "ALUMNI_MEMBER" in member_response.json()["roles"]

    search_response = client.get(
        "/api/v1/alumni/search?q=Civic",
        headers=member_headers,
    )
    assert search_response.status_code == 200
    search_results = search_response.json()
    assert search_results["total"] == 1
    assert search_results["profiles"][0]["user_id"] == registered["user"]["id"]
    assert search_results["profiles"][0]["email"] is None
    assert search_results["profiles"][0]["profile_photo_url"] == (
        f"/api/v1/alumni/{registered['user']['id']}/photo"
    )
    assert search_results["profiles"][0]["program_affiliations"][0]["program_name"] == (
        "YALI Regional Leadership Center"
    )

    profile_detail_response = client.get(
        f"/api/v1/alumni/{registered['user']['id']}",
        headers=member_headers,
    )
    assert profile_detail_response.status_code == 200
    profile_detail = profile_detail_response.json()
    assert profile_detail["display_name"] == "Amara Diallo"
    assert profile_detail["profile_photo_url"] == f"/api/v1/alumni/{registered['user']['id']}/photo"

    admin_photo_download = client.get(profile_detail["profile_photo_url"], headers=admin_headers)
    assert admin_photo_download.status_code == 200
    assert admin_photo_download.content.startswith(b"RIFF")

    second_approval = client.post(
        f"/api/v1/alumni/admin/verification-requests/{verification_request['id']}/approve",
        headers=admin_headers,
        json={"reviewer_note": "Already reviewed."},
    )
    assert second_approval.status_code == 409


def test_verification_admin_can_request_more_information(client: TestClient) -> None:
    registered = register_user(client, email="verification-more-info@example.com")
    complete_alumni_profile(client, registered["access_token"])

    submit_response = client.post(
        "/api/v1/alumni/me/verification-requests",
        headers=auth_headers(registered["access_token"]),
        json={"submitted_note": "Ready for verification."},
    )
    assert submit_response.status_code == 201
    verification_request = submit_response.json()

    admin = register_user(client, email="verification-info-admin@example.com")
    admin_headers = auth_headers(admin["access_token"])
    bootstrap_response = client.post("/api/v1/auth/dev/bootstrap-admin", headers=admin_headers)
    assert bootstrap_response.status_code == 200

    info_response = client.post(
        f"/api/v1/alumni/admin/verification-requests/{verification_request['id']}/request-info",
        headers=admin_headers,
        json={"reviewer_note": "Please add clearer cohort details."},
    )

    assert info_response.status_code == 200
    assert info_response.json()["status"] == "MORE_INFO_REQUESTED"

    evidence_response = client.post(
        f"/api/v1/alumni/me/verification-requests/{verification_request['id']}/evidence",
        headers=auth_headers(registered["access_token"]),
        data={"label": "Updated cohort proof"},
        files={
            "file": (
                "updated-cohort.pdf",
                b"%PDF-1.4\nUpdated verification evidence\n",
                "application/pdf",
            )
        },
    )
    assert evidence_response.status_code == 201

    queue_response = client.get(
        "/api/v1/alumni/admin/verification-requests",
        headers=admin_headers,
    )
    assert queue_response.status_code == 200
    queued_request = queue_response.json()["requests"][0]
    assert queued_request["id"] == verification_request["id"]
    assert queued_request["status"] == "PENDING_REVIEW"
    assert queued_request["evidence"][0]["label"] == "Updated cohort proof"

    approve_response = client.post(
        f"/api/v1/alumni/admin/verification-requests/{verification_request['id']}/approve",
        headers=admin_headers,
        json={"reviewer_note": "Updated evidence is clear."},
    )
    assert approve_response.status_code == 200
    assert approve_response.json()["status"] == "APPROVED"
