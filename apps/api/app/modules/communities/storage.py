import re
import uuid
from dataclasses import dataclass
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings
from app.core.storage import UploadCategory, build_storage_key, put_upload_bytes

COMMUNITY_POST_MEDIA_CONTENT_TYPE_EXTENSIONS = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


@dataclass(frozen=True)
class StoredCommunityPostMediaFile:
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


async def store_community_post_media_file(
    *,
    media_id: uuid.UUID,
    post_id: uuid.UUID,
    upload: UploadFile,
) -> StoredCommunityPostMediaFile:
    settings = get_settings()
    content_type = (upload.content_type or "").lower()
    allowed_content_types = _allowed_content_types(settings.community_post_media_allowed_types)
    if (
        content_type not in allowed_content_types
        or content_type not in COMMUNITY_POST_MEDIA_CONTENT_TYPE_EXTENSIONS
    ):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Upload a JPEG, PNG, WebP, or PDF community post attachment",
        )

    content = await upload.read(settings.community_post_media_upload_max_bytes + 1)
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Community post attachment is empty",
        )
    if len(content) > settings.community_post_media_upload_max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="Community post attachment exceeds the configured size limit",
        )

    extension = COMMUNITY_POST_MEDIA_CONTENT_TYPE_EXTENSIONS[content_type]
    file_name = _safe_file_name(upload.filename, extension, "community-post-media")
    storage_key = build_storage_key(
        UploadCategory.COMMUNITY_POST_MEDIA,
        f"{post_id}/{media_id}{extension}",
    )
    stored_object = put_upload_bytes(
        category=UploadCategory.COMMUNITY_POST_MEDIA,
        content=content,
        content_type=content_type,
        storage_key=storage_key,
    )

    return StoredCommunityPostMediaFile(
        file_name=file_name,
        content_type=content_type,
        file_size_bytes=len(content),
        storage_key=stored_object.key,
        storage_provider=stored_object.provider,
    )
