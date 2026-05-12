from __future__ import annotations

from collections.abc import Iterable, Mapping
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.core.security import utcnow
from app.modules.alumni.models import MwfAlumniProfile, MwfAlumniSyncRun

MWF_SITE_BASE_URL = "https://www.mandelawashingtonfellowship.org"
MWF_ALUMNI_USER_TYPE = "alumni"


def fetch_mwf_directory_source() -> tuple[dict[str, Any], dict[str, Any]]:
    settings = get_settings()
    headers = {"user-agent": settings.mwf_directory_user_agent}
    timeout = httpx.Timeout(30.0, connect=10.0)
    with httpx.Client(headers=headers, timeout=timeout, follow_redirects=True) as client:
        filters_response = client.get(settings.mwf_directory_filters_url)
        filters_response.raise_for_status()
        fellows_response = client.get(settings.mwf_directory_fellows_url)
        fellows_response.raise_for_status()
    return fellows_response.json(), filters_response.json()


def sync_mwf_alumni_directory(
    db: Session,
    *,
    fellows_payload: dict[str, Any] | list[dict[str, Any]] | None = None,
    filters_payload: dict[str, Any] | None = None,
) -> MwfAlumniSyncRun:
    settings = get_settings()
    now = utcnow()
    run = MwfAlumniSyncRun(
        source_url=settings.mwf_directory_fellows_url,
        status="STARTED",
        started_at=now,
    )
    db.add(run)
    db.flush()

    try:
        if fellows_payload is None or filters_payload is None:
            fellows_payload, filters_payload = fetch_mwf_directory_source()

        fellows = _extract_fellows(fellows_payload)
        country_labels = _label_map(
            _first_filter_collection(filters_payload or {}, ("african_countries", "countries"))
        )
        expertise_labels = _label_map(
            _first_filter_collection(
                filters_payload or {},
                ("expertise_areas", "expertise", "areas_of_expertise"),
            )
        )

        seen_source_ids: set[int] = set()
        imported_count = 0
        updated_count = 0

        for fellow in fellows:
            if not _is_alumni_profile(fellow):
                continue
            source_id = _source_id(fellow)
            if source_id is None:
                continue

            seen_source_ids.add(source_id)
            existing = db.scalar(
                select(MwfAlumniProfile).where(MwfAlumniProfile.source_id == source_id)
            )
            first_name = _clean_text(fellow.get("first_name"))
            last_name = _clean_text(fellow.get("last_name"))
            display_name = _display_name(first_name, last_name, fellow)
            country_slug = _clean_text(fellow.get("african_country"))
            expertise_slugs = _string_list(fellow.get("expertise"))
            record_values = {
                "first_name": first_name,
                "last_name": last_name,
                "display_name": display_name,
                "country_slug": country_slug,
                "country_label": country_labels.get(
                    country_slug or "",
                    _humanize_slug(country_slug),
                ),
                "bio": _clean_text(fellow.get("bio")),
                "field_of_study": _clean_text(fellow.get("field_of_study")),
                "expertise_slugs": expertise_slugs,
                "expertise_labels": [
                    expertise_labels.get(slug, _humanize_slug(slug)) for slug in expertise_slugs
                ],
                "leadership_institute": _clean_text(fellow.get("leadership_institute")),
                "us_state": _clean_text(fellow.get("us_state")),
                "program_years": _string_list(fellow.get("program_year")),
                "image_url": _absolute_source_url(_clean_text(fellow.get("image"))),
                "source_detail_url": _absolute_source_url(_clean_text(fellow.get("detail_page"))),
                "raw_source_payload": dict(fellow),
                "active": True,
                "last_seen_at": now,
                "deactivated_at": None,
            }

            if existing is None:
                db.add(
                    MwfAlumniProfile(
                        source_id=source_id,
                        imported_at=now,
                        **record_values,
                    )
                )
                imported_count += 1
            else:
                for field_name, value in record_values.items():
                    setattr(existing, field_name, value)
                updated_count += 1

        deactivated_count = _deactivate_missing_profiles(db, seen_source_ids, now)
        run.status = "SUCCEEDED"
        run.finished_at = utcnow()
        run.fetched_count = len(fellows)
        run.imported_count = imported_count
        run.updated_count = updated_count
        run.deactivated_count = deactivated_count
        db.flush()
        return run
    except Exception as exc:  # pragma: no cover - exercised through endpoint tests.
        run.status = "FAILED"
        run.finished_at = utcnow()
        run.error_message = str(exc)[:2000]
        db.flush()
        return run


def run_mwf_sync_background() -> None:
    with SessionLocal() as db:
        sync_mwf_alumni_directory(db)
        db.commit()


def mwf_cache_status(db: Session) -> dict[str, Any]:
    settings = get_settings()
    active_count = (
        db.scalar(
            select(func.count()).select_from(MwfAlumniProfile).where(MwfAlumniProfile.active.is_(True))
        )
        or 0
    )
    latest_run = db.scalar(
        select(MwfAlumniSyncRun).order_by(MwfAlumniSyncRun.started_at.desc()).limit(1)
    )
    latest_success = db.scalar(
        select(MwfAlumniSyncRun)
        .where(MwfAlumniSyncRun.status == "SUCCEEDED")
        .order_by(MwfAlumniSyncRun.finished_at.desc())
        .limit(1)
    )
    last_synced_at = _aware_utc(latest_success.finished_at) if latest_success else None
    stale_after = utcnow() - timedelta(hours=settings.mwf_directory_cache_ttl_hours)
    cache_stale = last_synced_at is None or last_synced_at < stale_after
    sync_in_progress = bool(
        latest_run and latest_run.status == "STARTED" and not latest_run.finished_at
    )
    return {
        "active_profile_count": active_count,
        "cache_stale": cache_stale,
        "cache_empty": active_count == 0,
        "sync_in_progress": sync_in_progress,
        "cache_ttl_hours": settings.mwf_directory_cache_ttl_hours,
        "last_synced_at": last_synced_at,
        "latest_run": latest_run,
    }


def build_mwf_search_query(
    *,
    q: str | None = None,
    country: str | None = None,
    year: str | None = None,
    field_of_study: str | None = None,
    expertise: str | None = None,
    leadership_institute: str | None = None,
):
    query = select(MwfAlumniProfile).where(MwfAlumniProfile.active.is_(True))
    if q:
        search = f"%{q.strip()}%"
        query = query.where(
            or_(
                MwfAlumniProfile.display_name.ilike(search),
                MwfAlumniProfile.bio.ilike(search),
                MwfAlumniProfile.country_label.ilike(search),
                MwfAlumniProfile.field_of_study.ilike(search),
                MwfAlumniProfile.leadership_institute.ilike(search),
                cast(MwfAlumniProfile.expertise_labels, String).ilike(search),
            )
        )
    if country:
        query = query.where(MwfAlumniProfile.country_label.ilike(f"%{country.strip()}%"))
    if year:
        query = query.where(cast(MwfAlumniProfile.program_years, String).ilike(f"%{year.strip()}%"))
    if field_of_study:
        query = query.where(MwfAlumniProfile.field_of_study.ilike(f"%{field_of_study.strip()}%"))
    if expertise:
        term = f"%{expertise.strip()}%"
        query = query.where(
            or_(
                cast(MwfAlumniProfile.expertise_labels, String).ilike(term),
                cast(MwfAlumniProfile.expertise_slugs, String).ilike(term),
            )
        )
    if leadership_institute:
        query = query.where(
            MwfAlumniProfile.leadership_institute.ilike(f"%{leadership_institute.strip()}%")
        )
    return query


def _extract_fellows(payload: dict[str, Any] | list[dict[str, Any]]) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    fellows = payload.get("fellows") or payload.get("data") or payload.get("items") or []
    if not isinstance(fellows, list):
        return []
    return [item for item in fellows if isinstance(item, dict)]


def _first_filter_collection(filters: Mapping[str, Any], keys: Iterable[str]) -> Any:
    for key in keys:
        value = filters.get(key)
        if value:
            return value
    return []


def _label_map(items: Any) -> dict[str, str]:
    labels: dict[str, str] = {}
    if isinstance(items, Mapping):
        iterable: Iterable[Any] = items.values()
    elif isinstance(items, list):
        iterable = items
    else:
        iterable = []

    for item in iterable:
        if isinstance(item, Mapping):
            value = _clean_text(item.get("value") or item.get("slug") or item.get("key"))
            label = _clean_text(item.get("label") or item.get("name") or item.get("title"))
            if value and label:
                labels[value] = label
        elif isinstance(item, str):
            labels[item] = _humanize_slug(item) or item
    return labels


def _is_alumni_profile(fellow: Mapping[str, Any]) -> bool:
    return str(fellow.get("user_type") or "").strip().lower() == MWF_ALUMNI_USER_TYPE


def _source_id(fellow: Mapping[str, Any]) -> int | None:
    try:
        return int(str(fellow.get("ID") or fellow.get("id") or "").strip())
    except ValueError:
        return None


def _display_name(
    first_name: str | None,
    last_name: str | None,
    fellow: Mapping[str, Any],
) -> str:
    fallback = _clean_text(fellow.get("display_name") or fellow.get("name"))
    return " ".join(part for part in (first_name, last_name) if part) or fallback or "MWF Alum"


def _string_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        parts = value.split(",")
    elif isinstance(value, Iterable):
        parts = list(value)
    else:
        parts = [value]

    normalized: list[str] = []
    seen: set[str] = set()
    for part in parts:
        cleaned = _clean_text(part)
        if cleaned and cleaned.lower() not in seen:
            normalized.append(cleaned)
            seen.add(cleaned.lower())
    return normalized


def _clean_text(value: Any) -> str | None:
    if value is None:
        return None
    cleaned = str(value).strip()
    return cleaned or None


def _humanize_slug(value: str | None) -> str | None:
    if not value:
        return None
    return value.replace("_", " ").replace("-", " ").title()


def _absolute_source_url(value: str | None) -> str | None:
    if not value:
        return None
    if value.startswith("http://") or value.startswith("https://"):
        return value
    if value.startswith("//"):
        return f"https:{value}"
    if value.startswith("/"):
        return f"{MWF_SITE_BASE_URL}{value}"
    return f"{MWF_SITE_BASE_URL}/{value.lstrip('/')}"


def _deactivate_missing_profiles(db: Session, seen_source_ids: set[int], now) -> int:
    if not seen_source_ids:
        return 0
    missing_profiles = db.scalars(
        select(MwfAlumniProfile).where(
            MwfAlumniProfile.active.is_(True),
            MwfAlumniProfile.source_id.not_in(seen_source_ids),
        )
    ).all()
    for profile in missing_profiles:
        profile.active = False
        profile.deactivated_at = now
    return len(missing_profiles)


def _aware_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)
