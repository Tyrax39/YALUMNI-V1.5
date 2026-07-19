import sys
from types import SimpleNamespace

from app.core.config import get_settings
from app.core.storage import (
    UploadCategory,
    build_storage_key,
    delete_upload,
    probe_storage_backend,
    put_upload_bytes,
)


def test_storage_key_keeps_local_keys_relative(monkeypatch) -> None:
    monkeypatch.setenv("UPLOAD_STORAGE_PROVIDER", "LOCAL")
    get_settings.cache_clear()
    try:
        storage_key = build_storage_key(
            UploadCategory.PROFILE_PHOTO,
            "profile-id/photo.png",
        )
        assert storage_key == "profile-id/photo.png"
    finally:
        get_settings.cache_clear()


def test_storage_key_prefixes_s3_keys(monkeypatch) -> None:
    monkeypatch.setenv("UPLOAD_STORAGE_PROVIDER", "S3")
    monkeypatch.setenv("UPLOAD_STORAGE_PREFIX", "yalumni/private")
    get_settings.cache_clear()
    try:
        storage_key = build_storage_key(
            UploadCategory.VERIFICATION_EVIDENCE,
            "request-id/evidence.pdf",
        )
        assert storage_key == "yalumni/private/verification-evidence/request-id/evidence.pdf"
        media_storage_key = build_storage_key(
            UploadCategory.COMMUNITY_POST_MEDIA,
            "post-id/media-id.png",
        )
        assert media_storage_key == "yalumni/private/community-post-media/post-id/media-id.png"
        expense_evidence_key = build_storage_key(
            UploadCategory.CONTRIBUTION_EXPENSE_EVIDENCE,
            "expense-report-id/evidence-id.pdf",
        )
        assert expense_evidence_key == (
            "yalumni/private/contribution-expense-evidence/"
            "expense-report-id/evidence-id.pdf"
        )
    finally:
        get_settings.cache_clear()


def test_local_storage_backend_puts_and_deletes_files(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("UPLOAD_STORAGE_PROVIDER", "LOCAL")
    monkeypatch.setenv("PROFILE_PHOTO_UPLOAD_DIR", str(tmp_path))
    get_settings.cache_clear()
    try:
        stored_object = put_upload_bytes(
            category=UploadCategory.PROFILE_PHOTO,
            content=b"photo-bytes",
            content_type="image/png",
            storage_key="profile-id/photo.png",
        )
        assert stored_object.provider == "LOCAL"
        assert stored_object.key == "profile-id/photo.png"
        assert (tmp_path / "profile-id" / "photo.png").read_bytes() == b"photo-bytes"

        delete_upload(
            category=UploadCategory.PROFILE_PHOTO,
            storage_key=stored_object.key,
            storage_provider=stored_object.provider,
        )
        assert not (tmp_path / "profile-id" / "photo.png").exists()
    finally:
        get_settings.cache_clear()


def test_local_storage_probe_checks_all_upload_paths(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("UPLOAD_STORAGE_PROVIDER", "LOCAL")
    for variable in (
        "VERIFICATION_UPLOAD_DIR",
        "PROFILE_PHOTO_UPLOAD_DIR",
        "COMMUNITY_POST_MEDIA_UPLOAD_DIR",
        "CONTRIBUTION_EXPENSE_EVIDENCE_UPLOAD_DIR",
    ):
        monkeypatch.setenv(variable, str(tmp_path))
    get_settings.cache_clear()
    try:
        result = probe_storage_backend()
        assert result.provider == "LOCAL"
        assert result.reachable is True
        assert result.detail == "All configured local upload paths are readable and writable"
    finally:
        get_settings.cache_clear()


def test_s3_storage_probe_checks_configured_bucket(monkeypatch) -> None:
    calls: list[str] = []

    class FakeS3Client:
        def head_bucket(self, *, Bucket: str) -> None:
            calls.append(Bucket)

    monkeypatch.setenv("UPLOAD_STORAGE_PROVIDER", "S3")
    monkeypatch.setenv("S3_BUCKET_NAME", "yalumni-private")
    monkeypatch.setenv("S3_REGION", "us-east-1")
    monkeypatch.setenv("S3_ACCESS_KEY_ID", "access-key")
    monkeypatch.setenv("S3_SECRET_ACCESS_KEY", "secret-key")
    monkeypatch.setitem(
        sys.modules,
        "boto3",
        SimpleNamespace(client=lambda *args, **kwargs: FakeS3Client()),
    )
    get_settings.cache_clear()
    try:
        result = probe_storage_backend()
        assert result.provider == "S3"
        assert result.reachable is True
        assert result.detail == "Configured S3 bucket is reachable"
        assert calls == ["yalumni-private"]
    finally:
        get_settings.cache_clear()
