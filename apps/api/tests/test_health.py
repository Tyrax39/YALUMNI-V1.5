from fastapi.testclient import TestClient

from app.main import app, settings

client = TestClient(app)


def test_health_check() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert "x-request-id" in response.headers


def test_release_identity(monkeypatch) -> None:
    monkeypatch.setenv("YALUMNI_RELEASE_SHA", "abc123def456")
    monkeypatch.setenv("YALUMNI_RELEASE_VERSION", "v1.5.0-staging")

    response = client.get("/release")

    assert response.status_code == 200
    assert response.json() == {
        "service": "api",
        "environment": settings.app_env,
        "commit_sha": "abc123def456",
        "release_version": "v1.5.0-staging",
    }


def test_system_status() -> None:
    response = client.get("/api/v1/system/status")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"

