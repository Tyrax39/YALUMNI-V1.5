from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path
from typing import Protocol

from fastapi import HTTPException, status
from fastapi.responses import FileResponse, StreamingResponse

from app.core.config import get_settings


class UploadCategory(StrEnum):
    VERIFICATION_EVIDENCE = "verification-evidence"
    PROFILE_PHOTO = "profile-photos"
    COMMUNITY_POST_MEDIA = "community-post-media"


@dataclass(frozen=True)
class StorageObject:
    provider: str
    key: str


class StorageBackend(Protocol):
    provider: str

    def put_bytes(
        self,
        *,
        category: UploadCategory,
        content: bytes,
        content_type: str,
        storage_key: str,
    ) -> StorageObject: ...

    def delete(
        self,
        *,
        category: UploadCategory,
        storage_key: str | None,
    ) -> None: ...

    def response(
        self,
        *,
        category: UploadCategory,
        content_type: str,
        file_name: str | None,
        storage_key: str,
    ) -> FileResponse | StreamingResponse: ...


def normalized_storage_provider(provider: str | None = None) -> str:
    return (provider or get_settings().upload_storage_provider or "LOCAL").strip().upper()


def _local_base_dir(category: UploadCategory) -> str:
    settings = get_settings()
    if category == UploadCategory.VERIFICATION_EVIDENCE:
        return settings.verification_upload_dir
    if category == UploadCategory.PROFILE_PHOTO:
        return settings.profile_photo_upload_dir
    if category == UploadCategory.COMMUNITY_POST_MEDIA:
        return settings.community_post_media_upload_dir
    raise ValueError(f"Unsupported upload category: {category}")


def _safe_local_path(category: UploadCategory, storage_key: str) -> Path:
    base_path = Path(_local_base_dir(category)).resolve()
    file_path = (base_path / storage_key).resolve()
    if base_path not in file_path.parents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid upload storage key",
        )
    return file_path


def build_storage_key(category: UploadCategory, relative_key: str) -> str:
    provider = normalized_storage_provider()
    if provider == "LOCAL":
        return relative_key

    settings = get_settings()
    prefix_parts = [
        settings.upload_storage_prefix.strip("/"),
        category.value,
        relative_key.strip("/"),
    ]
    return "/".join(part for part in prefix_parts if part)


class LocalStorageBackend:
    provider = "LOCAL"

    def put_bytes(
        self,
        *,
        category: UploadCategory,
        content: bytes,
        content_type: str,
        storage_key: str,
    ) -> StorageObject:
        _ = content_type
        file_path = _safe_local_path(category, storage_key)
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_bytes(content)
        return StorageObject(provider=self.provider, key=storage_key)

    def delete(
        self,
        *,
        category: UploadCategory,
        storage_key: str | None,
    ) -> None:
        if not storage_key:
            return
        file_path = _safe_local_path(category, storage_key)
        try:
            file_path.unlink(missing_ok=True)
        except OSError:
            return

    def response(
        self,
        *,
        category: UploadCategory,
        content_type: str,
        file_name: str | None,
        storage_key: str,
    ) -> FileResponse:
        file_path = _safe_local_path(category, storage_key)
        if not file_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Uploaded file not found",
            )

        return FileResponse(file_path, filename=file_name, media_type=content_type)


class S3StorageBackend:
    provider = "S3"

    def _client_and_bucket(self):
        settings = get_settings()
        if not settings.s3_bucket_name:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="S3_BUCKET_NAME is required when UPLOAD_STORAGE_PROVIDER=S3",
            )

        import boto3

        client = boto3.client(
            "s3",
            aws_access_key_id=settings.s3_access_key_id or None,
            aws_secret_access_key=settings.s3_secret_access_key or None,
            endpoint_url=settings.s3_endpoint_url or None,
            region_name=settings.s3_region or None,
        )
        return client, settings.s3_bucket_name

    def put_bytes(
        self,
        *,
        category: UploadCategory,
        content: bytes,
        content_type: str,
        storage_key: str,
    ) -> StorageObject:
        _ = category
        client, bucket_name = self._client_and_bucket()
        client.put_object(
            Bucket=bucket_name,
            Key=storage_key,
            Body=content,
            ContentType=content_type,
        )
        return StorageObject(provider=self.provider, key=storage_key)

    def delete(
        self,
        *,
        category: UploadCategory,
        storage_key: str | None,
    ) -> None:
        _ = category
        if not storage_key:
            return
        client, bucket_name = self._client_and_bucket()
        client.delete_object(Bucket=bucket_name, Key=storage_key)

    def response(
        self,
        *,
        category: UploadCategory,
        content_type: str,
        file_name: str | None,
        storage_key: str,
    ) -> StreamingResponse:
        _ = category
        client, bucket_name = self._client_and_bucket()
        try:
            stored_object = client.get_object(Bucket=bucket_name, Key=storage_key)
        except Exception as exc:
            if _is_missing_s3_object(exc):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Uploaded file not found",
                ) from exc
            raise

        body = stored_object["Body"]

        def chunks():
            try:
                for chunk in body.iter_chunks(chunk_size=1024 * 1024):
                    if chunk:
                        yield chunk
            finally:
                body.close()

        headers = {
            "Content-Disposition": f'attachment; filename="{_header_safe_file_name(file_name)}"',
        }
        content_length = stored_object.get("ContentLength")
        if content_length is not None:
            headers["Content-Length"] = str(content_length)

        return StreamingResponse(chunks(), media_type=content_type, headers=headers)


def _is_missing_s3_object(exc: Exception) -> bool:
    response = getattr(exc, "response", None)
    if not isinstance(response, dict):
        return False
    error = response.get("Error", {})
    code = str(error.get("Code", "")).lower()
    return code in {"404", "nosuchkey", "notfound"}


def _header_safe_file_name(file_name: str | None) -> str:
    return (file_name or "download").replace('"', "").replace("\\", "-")[:255]


def storage_backend(provider: str | None = None) -> StorageBackend:
    normalized_provider = normalized_storage_provider(provider)
    if normalized_provider == "LOCAL":
        return LocalStorageBackend()
    if normalized_provider == "S3":
        return S3StorageBackend()
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"Unsupported upload storage provider: {normalized_provider}",
    )


def put_upload_bytes(
    *,
    category: UploadCategory,
    content: bytes,
    content_type: str,
    storage_key: str,
) -> StorageObject:
    return storage_backend().put_bytes(
        category=category,
        content=content,
        content_type=content_type,
        storage_key=storage_key,
    )


def delete_upload(
    *,
    category: UploadCategory,
    storage_key: str | None,
    storage_provider: str | None = None,
) -> None:
    storage_backend(storage_provider).delete(category=category, storage_key=storage_key)


def upload_response(
    *,
    category: UploadCategory,
    content_type: str,
    file_name: str | None,
    storage_key: str,
    storage_provider: str | None = None,
) -> FileResponse | StreamingResponse:
    return storage_backend(storage_provider).response(
        category=category,
        content_type=content_type,
        file_name=file_name,
        storage_key=storage_key,
    )
