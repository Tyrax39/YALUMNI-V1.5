import re
import uuid
from dataclasses import dataclass
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings
from app.core.storage import UploadCategory, build_storage_key, put_upload_bytes

CONTRIBUTION_EXPENSE_EVIDENCE_CONTENT_TYPE_EXTENSIONS = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


@dataclass(frozen=True)
class StoredContributionExpenseEvidenceFile:
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


def _blocked_signature_patterns(setting_value: str) -> list[bytes]:
    return [
        pattern.strip().encode("utf-8")
        for pattern in setting_value.split(",")
        if pattern.strip()
    ]


def _safe_file_name(file_name: str | None, extension: str) -> str:
    cleaned = Path(file_name or "contribution-expense-evidence").name
    cleaned = re.sub(r"[^A-Za-z0-9._ -]+", "-", cleaned).strip(" .-_")
    if not cleaned:
        return f"contribution-expense-evidence{extension}"
    if Path(cleaned).suffix.lower() != extension:
        cleaned = f"{Path(cleaned).stem or 'contribution-expense-evidence'}{extension}"
    return cleaned[:255]


async def store_contribution_expense_evidence_file(
    *,
    evidence_id: uuid.UUID,
    expense_report_id: uuid.UUID,
    upload: UploadFile,
) -> StoredContributionExpenseEvidenceFile:
    settings = get_settings()
    content_type = (upload.content_type or "").lower()
    allowed_content_types = _allowed_content_types(
        settings.contribution_expense_evidence_allowed_types
    )
    if (
        content_type not in allowed_content_types
        or content_type not in CONTRIBUTION_EXPENSE_EVIDENCE_CONTENT_TYPE_EXTENSIONS
    ):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Upload a PDF, JPEG, PNG, or WebP expense evidence file",
        )

    content = await upload.read(settings.contribution_expense_evidence_upload_max_bytes + 1)
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expense evidence file is empty",
        )
    if len(content) > settings.contribution_expense_evidence_upload_max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="Expense evidence file exceeds the configured size limit",
        )
    blocked_patterns = _blocked_signature_patterns(
        settings.contribution_expense_evidence_blocked_signatures
    )
    if any(pattern in content for pattern in blocked_patterns):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Expense evidence file failed the configured safety signature check",
        )

    extension = CONTRIBUTION_EXPENSE_EVIDENCE_CONTENT_TYPE_EXTENSIONS[content_type]
    file_name = _safe_file_name(upload.filename, extension)
    storage_key = build_storage_key(
        UploadCategory.CONTRIBUTION_EXPENSE_EVIDENCE,
        f"{expense_report_id}/{evidence_id}{extension}",
    )
    stored_object = put_upload_bytes(
        category=UploadCategory.CONTRIBUTION_EXPENSE_EVIDENCE,
        content=content,
        content_type=content_type,
        storage_key=storage_key,
    )

    return StoredContributionExpenseEvidenceFile(
        file_name=file_name,
        content_type=content_type,
        file_size_bytes=len(content),
        storage_key=stored_object.key,
        storage_provider=stored_object.provider,
    )
