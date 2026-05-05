from app.core.config import get_settings
from app.core.storage import UploadCategory, build_storage_key, delete_upload, put_upload_bytes


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
