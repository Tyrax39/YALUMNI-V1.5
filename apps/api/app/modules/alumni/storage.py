import re
import uuid
from dataclasses import dataclass
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings
from app.core.storage import UploadCategory, build_storage_key, put_upload_bytes

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
    storage_key = build_storage_key(
        UploadCategory.VERIFICATION_EVIDENCE,
        f"{verification_request_id}/{evidence_id}{extension}",
    )
    stored_object = put_upload_bytes(
        category=UploadCategory.VERIFICATION_EVIDENCE,
        content=content,
        content_type=content_type,
        storage_key=storage_key,
    )

    return StoredVerificationFile(
        file_name=file_name,
        content_type=content_type,
        file_size_bytes=len(content),
        storage_key=stored_object.key,
        storage_provider=stored_object.provider,
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
    storage_key = build_storage_key(
        UploadCategory.PROFILE_PHOTO,
        f"{profile_id}/{uuid.uuid4()}{extension}",
    )
    stored_object = put_upload_bytes(
        category=UploadCategory.PROFILE_PHOTO,
        content=content,
        content_type=content_type,
        storage_key=storage_key,
    )

    return StoredProfilePhotoFile(
        file_name=file_name,
        content_type=content_type,
        file_size_bytes=len(content),
        storage_key=stored_object.key,
        storage_provider=stored_object.provider,
    )
