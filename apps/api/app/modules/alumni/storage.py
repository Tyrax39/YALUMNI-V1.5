import re
import uuid
from dataclasses import dataclass
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings

CONTENT_TYPE_EXTENSIONS = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
PROFILE_PHOTO_CONTENT_TYPE_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


@dataclass(frozen=True)
class StoredVerificationFile:
    file_name: str
    content_type: str
    file_size_bytes: int
    storage_key: str
    storage_provider: str = "LOCAL"


@dataclass(frozen=True)
class StoredProfilePhotoFile:
    file_name: str
    content_type: str
    file_size_bytes: int
    storage_key: str
    storage_provider: str = "LOCAL"


def _allowed_content_types(setting_value: str) -> set[str]:
    return {
        content_type.strip().lower()
        for content_type in setting_value.split(",")
        if content_type.strip()
    }


def _safe_file_name(file_name: str | None, extension: str, default_name: str) -> str:
    cleaned = Path(file_name or default_name).name
    cleaned = re.sub(r"[^A-Za-z0-9._ -]+", "-", cleaned).strip(" .-_")
    if not cleaned:
        return f"{default_name}{extension}"
    if Path(cleaned).suffix.lower() != extension:
        cleaned = f"{Path(cleaned).stem or default_name}{extension}"
    return cleaned[:255]


def _storage_file_path(base_dir: str, storage_key: str, detail: str) -> Path:
    base_path = Path(base_dir).resolve()
    file_path = (base_path / storage_key).resolve()
    if base_path not in file_path.parents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
        )
    return file_path


def evidence_file_path(storage_key: str) -> Path:
    return _storage_file_path(
        get_settings().verification_upload_dir,
        storage_key,
        "Invalid evidence storage key",
    )


def profile_photo_file_path(storage_key: str) -> Path:
    return _storage_file_path(
        get_settings().profile_photo_upload_dir,
        storage_key,
        "Invalid profile photo storage key",
    )


async def store_verification_file(
    *,
    evidence_id: uuid.UUID,
    upload: UploadFile,
    verification_request_id: uuid.UUID,
) -> StoredVerificationFile:
    settings = get_settings()
    content_type = (upload.content_type or "").lower()
    allowed_content_types = _allowed_content_types(settings.verification_upload_allowed_types)
    if content_type not in allowed_content_types or content_type not in CONTENT_TYPE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Upload a PDF, JPEG, PNG, or WebP evidence file",
        )

    content = await upload.read(settings.verification_upload_max_bytes + 1)
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Evidence file is empty",
        )
    if len(content) > settings.verification_upload_max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Evidence file exceeds the configured size limit",
        )

    extension = CONTENT_TYPE_EXTENSIONS[content_type]
    file_name = _safe_file_name(upload.filename, extension, "verification-evidence")
    storage_key = f"{verification_request_id}/{evidence_id}{extension}"
    file_path = evidence_file_path(storage_key)
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_bytes(content)

    return StoredVerificationFile(
        file_name=file_name,
        content_type=content_type,
        file_size_bytes=len(content),
        storage_key=storage_key,
    )


async def store_profile_photo_file(
    *,
    profile_id: uuid.UUID,
    upload: UploadFile,
) -> StoredProfilePhotoFile:
    settings = get_settings()
    content_type = (upload.content_type or "").lower()
    allowed_content_types = _allowed_content_types(settings.profile_photo_upload_allowed_types)
    if (
        content_type not in allowed_content_types
        or content_type not in PROFILE_PHOTO_CONTENT_TYPE_EXTENSIONS
    ):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Upload a JPEG, PNG, or WebP profile photo",
        )

    content = await upload.read(settings.profile_photo_upload_max_bytes + 1)
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile photo file is empty",
        )
    if len(content) > settings.profile_photo_upload_max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Profile photo exceeds the configured size limit",
        )

    extension = PROFILE_PHOTO_CONTENT_TYPE_EXTENSIONS[content_type]
    file_name = _safe_file_name(upload.filename, extension, "profile-photo")
    storage_key = f"{profile_id}/{uuid.uuid4()}{extension}"
    file_path = profile_photo_file_path(storage_key)
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_bytes(content)

    return StoredProfilePhotoFile(
        file_name=file_name,
        content_type=content_type,
        file_size_bytes=len(content),
        storage_key=storage_key,
    )
