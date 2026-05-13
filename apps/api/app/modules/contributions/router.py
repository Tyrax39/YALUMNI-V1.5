import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db_session
from app.core.permissions import ADMIN_ROLE_NAMES, GlobalRole, has_any_role
from app.core.security import utcnow
from app.modules.auth.dependencies import get_current_user, require_roles
from app.modules.auth.models import SecurityEvent, User
from app.modules.contributions.models import (
    Contribution,
    ContributionCampaign,
    ContributionLedgerEntry,
    ContributionReceipt,
)
from app.modules.contributions.schemas import (
    ContributionCampaignCreate,
    ContributionCampaignListResponse,
    ContributionCampaignResponse,
    ContributionCampaignStatusAction,
    ContributionLedgerEntryResponse,
    ContributionListResponse,
    ContributionPaymentCreate,
    ContributionReceiptResponse,
    ContributionResponse,
    TreasurySummaryResponse,
)

router = APIRouter()
finance_admin_dependency = require_roles(
    GlobalRole.SUPER_ADMIN.value,
    GlobalRole.PLATFORM_ADMIN.value,
    GlobalRole.FINANCE_ADMIN.value,
)

CAMPAIGN_STATUSES = {"ARCHIVED", "CLOSED", "DRAFT", "PUBLISHED"}
VISIBLE_CAMPAIGN_STATUSES = {"CLOSED", "PUBLISHED"}
PAYMENT_METHODS = {"BANK_TRANSFER", "CARD_TEST", "MOBILE_MONEY", "OFFLINE_CASH"}
RECEIVED_STATUS = "RECEIVED"
PENDING_STATUS = "PENDING"
LEDGER_CREDIT = "CONTRIBUTION_CREDIT"


def _request_context(request: Request) -> tuple[str | None, str | None]:
    user_agent = request.headers.get("user-agent")
    if user_agent and len(user_agent) > 255:
        user_agent = user_agent[:255]
    return request.client.host if request.client else None, user_agent


def _create_security_event(
    db: Session,
    request: Request,
    user: User,
    event_type: str,
    metadata: dict | None = None,
) -> None:
    ip_address, user_agent = _request_context(request)
    db.add(
        SecurityEvent(
            user_id=user.id,
            event_type=event_type,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata_json=metadata,
        )
    )


def _normalize_enum(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().upper().replace(" ", "_").replace("-", "_")
    return normalized or None


def _user_role_names(user: User) -> set[str]:
    return {assignment.role.name for assignment in user.role_assignments}


def _is_finance_admin(user: User) -> bool:
    return has_any_role(
        _user_role_names(user),
        {
            GlobalRole.SUPER_ADMIN.value,
            GlobalRole.PLATFORM_ADMIN.value,
            GlobalRole.FINANCE_ADMIN.value,
        },
    )


def _has_admin_role(user: User) -> bool:
    return has_any_role(_user_role_names(user), ADMIN_ROLE_NAMES)


def _aware_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def _campaign_options():
    return [joinedload(ContributionCampaign.creator)]


def _query_campaigns():
    return select(ContributionCampaign).options(*_campaign_options())


def _get_campaign_or_404(db: Session, campaign_id: uuid.UUID) -> ContributionCampaign:
    campaign = db.scalar(_query_campaigns().where(ContributionCampaign.id == campaign_id))
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    return campaign


def _get_contribution_or_404(db: Session, contribution_id: uuid.UUID) -> Contribution:
    contribution = db.scalar(
        select(Contribution)
        .options(
            joinedload(Contribution.campaign),
            joinedload(Contribution.contributor),
            joinedload(Contribution.receipt),
        )
        .where(Contribution.id == contribution_id)
    )
    if contribution is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contribution not found")
    return contribution


def _get_receipt_or_404(db: Session, receipt_id: uuid.UUID) -> ContributionReceipt:
    receipt = db.scalar(
        select(ContributionReceipt)
        .options(
            joinedload(ContributionReceipt.contribution).joinedload(Contribution.campaign),
            joinedload(ContributionReceipt.contribution).joinedload(Contribution.contributor),
        )
        .where(ContributionReceipt.id == receipt_id)
    )
    if receipt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found")
    return receipt


def _ensure_campaign_visible(campaign: ContributionCampaign, current_user: User) -> None:
    is_creator = campaign.created_by_user_id == current_user.id
    if (
        campaign.status not in VISIBLE_CAMPAIGN_STATUSES
        and not is_creator
        and not _has_admin_role(current_user)
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")


def _campaign_amounts(db: Session, campaign_id: uuid.UUID) -> tuple[int, int, int]:
    received = (
        db.scalar(
            select(func.coalesce(func.sum(Contribution.amount_cents), 0)).where(
                Contribution.campaign_id == campaign_id,
                Contribution.status == RECEIVED_STATUS,
            )
        )
        or 0
    )
    pending = (
        db.scalar(
            select(func.coalesce(func.sum(Contribution.amount_cents), 0)).where(
                Contribution.campaign_id == campaign_id,
                Contribution.status == PENDING_STATUS,
            )
        )
        or 0
    )
    count = (
        db.scalar(
            select(func.count()).where(
                Contribution.campaign_id == campaign_id,
                Contribution.status.in_((RECEIVED_STATUS, PENDING_STATUS)),
            )
        )
        or 0
    )
    return int(received), int(pending), int(count)


def _is_contributor(db: Session, campaign_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    return (
        db.scalar(
            select(Contribution.id).where(
                Contribution.campaign_id == campaign_id,
                Contribution.contributor_user_id == user_id,
            )
        )
        is not None
    )


def _serialize_campaign(
    db: Session,
    campaign: ContributionCampaign,
    current_user: User,
) -> ContributionCampaignResponse:
    received, pending, count = _campaign_amounts(db, campaign.id)
    return ContributionCampaignResponse(
        chapter_name=campaign.chapter_name,
        closed_at=campaign.closed_at,
        contribution_count=count,
        country=campaign.country,
        cover_image_url=campaign.cover_image_url,
        created_at=campaign.created_at,
        created_by_display_name=campaign.creator.display_name if campaign.creator else None,
        created_by_user_id=campaign.created_by_user_id,
        currency=campaign.currency,
        description=campaign.description,
        ends_at=campaign.ends_at,
        goal_amount_cents=campaign.goal_amount_cents,
        id=campaign.id,
        is_contributor=_is_contributor(db, campaign.id, current_user.id),
        pending_amount_cents=pending,
        published_at=campaign.published_at,
        received_amount_cents=received,
        starts_at=campaign.starts_at,
        status=campaign.status,
        summary=campaign.summary,
        title=campaign.title,
        updated_at=campaign.updated_at,
    )


def _serialize_contribution(contribution: Contribution) -> ContributionResponse:
    receipt = contribution.receipt
    return ContributionResponse(
        amount_cents=contribution.amount_cents,
        anonymous=contribution.anonymous,
        campaign_id=contribution.campaign_id,
        campaign_title=contribution.campaign.title if contribution.campaign else None,
        contributor_display_name=(
            None
            if contribution.anonymous
            else contribution.contributor.display_name if contribution.contributor else None
        ),
        contributor_user_id=contribution.contributor_user_id,
        created_at=contribution.created_at,
        currency=contribution.currency,
        id=contribution.id,
        note=contribution.note,
        paid_at=contribution.paid_at,
        payment_method=contribution.payment_method,
        payment_reference=contribution.payment_reference,
        receipt_id=receipt.id if receipt else None,
        receipt_number=receipt.receipt_number if receipt else None,
        status=contribution.status,
        updated_at=contribution.updated_at,
    )


def _serialize_receipt(receipt: ContributionReceipt) -> ContributionReceiptResponse:
    contribution = receipt.contribution
    campaign = contribution.campaign
    return ContributionReceiptResponse(
        amount_cents=receipt.amount_cents,
        campaign_id=campaign.id,
        campaign_title=campaign.title,
        contribution_id=receipt.contribution_id,
        contributor_display_name=(
            None
            if contribution.anonymous
            else contribution.contributor.display_name if contribution.contributor else None
        ),
        currency=receipt.currency,
        id=receipt.id,
        issued_at=receipt.issued_at,
        issued_to_email=receipt.issued_to_email,
        issued_to_name=receipt.issued_to_name,
        receipt_number=receipt.receipt_number,
        status=receipt.status,
        tax_note=receipt.tax_note,
    )


def _serialize_ledger_entry(entry: ContributionLedgerEntry) -> ContributionLedgerEntryResponse:
    return ContributionLedgerEntryResponse(
        amount_cents=entry.amount_cents,
        contribution_id=entry.contribution_id,
        created_at=entry.created_at,
        currency=entry.currency,
        entry_type=entry.entry_type,
        id=entry.id,
        memo=entry.memo,
    )


def _list_campaign_response(
    db: Session,
    query,
    *,
    current_user: User,
    limit: int,
    offset: int,
) -> ContributionCampaignListResponse:
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    campaigns = db.scalars(
        query.order_by(ContributionCampaign.created_at.desc()).offset(offset).limit(limit)
    ).all()
    return ContributionCampaignListResponse(
        campaigns=[_serialize_campaign(db, item, current_user) for item in campaigns],
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(campaigns) < total,
    )


def _list_contribution_response(
    db: Session,
    query,
    *,
    limit: int,
    offset: int,
) -> ContributionListResponse:
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    contributions = db.scalars(
        query.order_by(Contribution.created_at.desc()).offset(offset).limit(limit)
    ).all()
    return ContributionListResponse(
        contributions=[_serialize_contribution(item) for item in contributions],
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(contributions) < total,
    )


def _apply_campaign_filters(
    query,
    *,
    country: str | None = None,
    q: str | None = None,
    status_filter: str | None = None,
):
    if q:
        search_term = f"%{q.strip()}%"
        query = query.where(
            or_(
                ContributionCampaign.title.ilike(search_term),
                ContributionCampaign.summary.ilike(search_term),
                ContributionCampaign.description.ilike(search_term),
                ContributionCampaign.country.ilike(search_term),
                ContributionCampaign.chapter_name.ilike(search_term),
            )
        )
    if country:
        query = query.where(ContributionCampaign.country.ilike(f"%{country.strip()}%"))
    normalized_status = _normalize_enum(status_filter)
    if normalized_status and normalized_status != "ALL":
        if normalized_status not in CAMPAIGN_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid campaign status",
            )
        query = query.where(ContributionCampaign.status == normalized_status)
    return query


def _validate_campaign_payload(payload: ContributionCampaignCreate) -> None:
    if len(payload.currency) != 3:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid currency")


def _validate_payment_payload(
    payload: ContributionPaymentCreate,
    campaign: ContributionCampaign,
) -> None:
    if payload.payment_method not in PAYMENT_METHODS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payment method",
        )
    if payload.currency != campaign.currency:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Currency must match campaign",
        )


def _ensure_campaign_accepts_payment(campaign: ContributionCampaign) -> None:
    if campaign.status != "PUBLISHED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Campaign is not accepting contributions",
        )
    now = utcnow()
    if campaign.starts_at and _aware_datetime(campaign.starts_at) > now:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Campaign has not started")
    if campaign.ends_at and _aware_datetime(campaign.ends_at) < now:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Campaign has ended")


def _next_receipt_number(db: Session) -> str:
    year = utcnow().year
    count = db.scalar(select(func.count(ContributionReceipt.id))) or 0
    return f"YAL-REC-{year}-{count + 1:06d}"


@router.get("", response_model=ContributionCampaignListResponse)
@router.get("/", response_model=ContributionCampaignListResponse)
def list_campaigns(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
    country: Annotated[str | None, Query(max_length=80)] = None,
    q: Annotated[str | None, Query(max_length=120)] = None,
    status_filter: Annotated[str | None, Query(alias="status", max_length=40)] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 12,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ContributionCampaignListResponse:
    query = _query_campaigns().where(ContributionCampaign.status.in_(VISIBLE_CAMPAIGN_STATUSES))
    query = _apply_campaign_filters(query, country=country, q=q, status_filter=status_filter)
    return _list_campaign_response(db, query, current_user=current_user, limit=limit, offset=offset)


@router.get("/admin/campaigns", response_model=ContributionCampaignListResponse)
@router.get("/admin/campaigns/", response_model=ContributionCampaignListResponse)
def list_admin_campaigns(
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
    country: Annotated[str | None, Query(max_length=80)] = None,
    q: Annotated[str | None, Query(max_length=120)] = None,
    status_filter: Annotated[str | None, Query(alias="status", max_length=40)] = "ALL",
    limit: Annotated[int, Query(ge=1, le=50)] = 12,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ContributionCampaignListResponse:
    query = _query_campaigns()
    query = _apply_campaign_filters(query, country=country, q=q, status_filter=status_filter)
    return _list_campaign_response(db, query, current_user=current_user, limit=limit, offset=offset)


@router.post(
    "/admin/campaigns",
    response_model=ContributionCampaignResponse,
    status_code=status.HTTP_201_CREATED,
)
@router.post(
    "/admin/campaigns/",
    response_model=ContributionCampaignResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_campaign(
    payload: ContributionCampaignCreate,
    request: Request,
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ContributionCampaignResponse:
    _validate_campaign_payload(payload)
    campaign = ContributionCampaign(
        chapter_name=payload.chapter_name,
        country=payload.country,
        cover_image_url=payload.cover_image_url,
        created_by_user_id=current_user.id,
        currency=payload.currency,
        description=payload.description,
        ends_at=payload.ends_at,
        goal_amount_cents=payload.goal_amount_cents,
        starts_at=payload.starts_at,
        status="DRAFT",
        summary=payload.summary,
        title=payload.title,
    )
    db.add(campaign)
    db.flush()
    _create_security_event(
        db,
        request,
        current_user,
        "contributions.campaign_created",
        {"campaign_id": str(campaign.id), "status": campaign.status},
    )
    db.commit()
    campaign = _get_campaign_or_404(db, campaign.id)
    return _serialize_campaign(db, campaign, current_user)


@router.get("/admin/contributions", response_model=ContributionListResponse)
@router.get("/admin/contributions/", response_model=ContributionListResponse)
def list_admin_contributions(
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
    status_filter: Annotated[str | None, Query(alias="status", max_length=40)] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 12,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ContributionListResponse:
    _ = current_user
    query = select(Contribution).options(
        joinedload(Contribution.campaign),
        joinedload(Contribution.contributor),
        joinedload(Contribution.receipt),
    )
    normalized_status = _normalize_enum(status_filter)
    if normalized_status:
        query = query.where(Contribution.status == normalized_status)
    return _list_contribution_response(db, query, limit=limit, offset=offset)


@router.get("/admin/treasury", response_model=TreasurySummaryResponse)
@router.get("/admin/treasury/", response_model=TreasurySummaryResponse)
def get_treasury_summary(
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> TreasurySummaryResponse:
    received = (
        db.scalar(
            select(func.coalesce(func.sum(Contribution.amount_cents), 0)).where(
                Contribution.status == RECEIVED_STATUS
            )
        )
        or 0
    )
    pending = (
        db.scalar(
            select(func.coalesce(func.sum(Contribution.amount_cents), 0)).where(
                Contribution.status == PENDING_STATUS
            )
        )
        or 0
    )
    campaign_count = db.scalar(select(func.count(ContributionCampaign.id))) or 0
    published_campaign_count = (
        db.scalar(
            select(func.count(ContributionCampaign.id)).where(
                ContributionCampaign.status == "PUBLISHED"
            )
        )
        or 0
    )
    receipt_count = db.scalar(select(func.count(ContributionReceipt.id))) or 0
    campaigns = db.scalars(
        _query_campaigns().order_by(ContributionCampaign.created_at.desc()).limit(8)
    ).all()
    recent_contributions = db.scalars(
        select(Contribution)
        .options(
            joinedload(Contribution.campaign),
            joinedload(Contribution.contributor),
            joinedload(Contribution.receipt),
        )
        .order_by(Contribution.created_at.desc())
        .limit(8)
    ).all()
    ledger_entries = db.scalars(
        select(ContributionLedgerEntry)
        .order_by(ContributionLedgerEntry.created_at.desc())
        .limit(8)
    ).all()
    return TreasurySummaryResponse(
        campaign_count=campaign_count,
        campaigns=[_serialize_campaign(db, campaign, current_user) for campaign in campaigns],
        ledger_entries=[_serialize_ledger_entry(entry) for entry in ledger_entries],
        pending_amount_cents=int(pending),
        published_campaign_count=published_campaign_count,
        receipt_count=receipt_count,
        received_amount_cents=int(received),
        recent_contributions=[_serialize_contribution(item) for item in recent_contributions],
    )


@router.post("/admin/campaigns/{campaign_id}/publish", response_model=ContributionCampaignResponse)
def publish_campaign(
    campaign_id: uuid.UUID,
    payload: ContributionCampaignStatusAction,
    request: Request,
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ContributionCampaignResponse:
    campaign = _get_campaign_or_404(db, campaign_id)
    if campaign.status not in {"CLOSED", "DRAFT"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only draft or closed campaigns can be published",
        )
    campaign.status = "PUBLISHED"
    campaign.published_at = campaign.published_at or utcnow()
    campaign.closed_at = None
    _create_security_event(
        db,
        request,
        current_user,
        "contributions.campaign_published",
        {"campaign_id": str(campaign.id), "note": payload.note},
    )
    db.commit()
    campaign = _get_campaign_or_404(db, campaign.id)
    return _serialize_campaign(db, campaign, current_user)


@router.post("/admin/campaigns/{campaign_id}/close", response_model=ContributionCampaignResponse)
def close_campaign(
    campaign_id: uuid.UUID,
    payload: ContributionCampaignStatusAction,
    request: Request,
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ContributionCampaignResponse:
    campaign = _get_campaign_or_404(db, campaign_id)
    if campaign.status != "PUBLISHED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only published campaigns can be closed",
        )
    campaign.status = "CLOSED"
    campaign.closed_at = utcnow()
    _create_security_event(
        db,
        request,
        current_user,
        "contributions.campaign_closed",
        {"campaign_id": str(campaign.id), "note": payload.note},
    )
    db.commit()
    campaign = _get_campaign_or_404(db, campaign.id)
    return _serialize_campaign(db, campaign, current_user)


@router.get("/receipts/{receipt_id}", response_model=ContributionReceiptResponse)
def get_receipt(
    receipt_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ContributionReceiptResponse:
    receipt = _get_receipt_or_404(db, receipt_id)
    if (
        receipt.contribution.contributor_user_id != current_user.id
        and not _is_finance_admin(current_user)
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found")
    return _serialize_receipt(receipt)


@router.get("/{campaign_id}", response_model=ContributionCampaignResponse)
def get_campaign(
    campaign_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ContributionCampaignResponse:
    campaign = _get_campaign_or_404(db, campaign_id)
    _ensure_campaign_visible(campaign, current_user)
    return _serialize_campaign(db, campaign, current_user)


@router.post(
    "/{campaign_id}/pay",
    response_model=ContributionResponse,
    status_code=status.HTTP_201_CREATED,
)
def pay_campaign(
    campaign_id: uuid.UUID,
    payload: ContributionPaymentCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ContributionResponse:
    campaign = _get_campaign_or_404(db, campaign_id)
    _ensure_campaign_visible(campaign, current_user)
    _ensure_campaign_accepts_payment(campaign)
    _validate_payment_payload(payload, campaign)

    now = utcnow()
    contribution = Contribution(
        amount_cents=payload.amount_cents,
        anonymous=payload.anonymous,
        campaign_id=campaign.id,
        contributor_user_id=current_user.id,
        currency=payload.currency,
        note=payload.note,
        paid_at=now,
        payment_method=payload.payment_method,
        payment_reference=payload.payment_reference,
        status=RECEIVED_STATUS,
    )
    db.add(contribution)
    db.flush()

    receipt = ContributionReceipt(
        amount_cents=contribution.amount_cents,
        contribution_id=contribution.id,
        currency=contribution.currency,
        issued_at=now,
        issued_to_email=current_user.email,
        issued_to_name=current_user.display_name,
        receipt_number=_next_receipt_number(db),
        status="ISSUED",
        tax_note=(
            "This local development receipt confirms a recorded YALUMNI contribution. "
            "Tax deductibility depends on the operating entity and jurisdiction."
        ),
    )
    db.add(receipt)
    db.add(
        ContributionLedgerEntry(
            amount_cents=contribution.amount_cents,
            contribution_id=contribution.id,
            created_by_user_id=current_user.id,
            currency=contribution.currency,
            entry_type=LEDGER_CREDIT,
            memo=f"Receipt {receipt.receipt_number} issued for {campaign.title}",
        )
    )
    _create_security_event(
        db,
        request,
        current_user,
        "contributions.payment_recorded",
        {
            "amount_cents": contribution.amount_cents,
            "campaign_id": str(campaign.id),
            "contribution_id": str(contribution.id),
            "receipt_number": receipt.receipt_number,
        },
    )
    db.commit()
    contribution = _get_contribution_or_404(db, contribution.id)
    return _serialize_contribution(contribution)
