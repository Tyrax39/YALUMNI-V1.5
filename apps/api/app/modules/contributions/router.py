import csv
import hashlib
import hmac
import io
import json
import secrets
import textwrap
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    Response,
    UploadFile,
    status,
)
from pydantic import ValidationError
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_settings
from app.core.database import get_db_session
from app.core.permissions import ADMIN_ROLE_NAMES, GlobalRole, has_any_role
from app.core.security import utcnow
from app.core.storage import UploadCategory, delete_upload, upload_response
from app.modules.auth.dependencies import get_current_user, require_roles
from app.modules.auth.models import SecurityEvent, User
from app.modules.contributions.models import (
    Contribution,
    ContributionCampaign,
    ContributionDisbursementRequest,
    ContributionExpenseEvidence,
    ContributionExpenseReport,
    ContributionLedgerEntry,
    ContributionPaymentAttempt,
    ContributionPaymentIntent,
    ContributionReceipt,
    ContributionTreasuryCertification,
    ContributionWebhookEvent,
)
from app.modules.contributions.schemas import (
    ContributionCampaignCreate,
    ContributionCampaignListResponse,
    ContributionCampaignResponse,
    ContributionCampaignStatusAction,
    ContributionDisbursementRequestCreate,
    ContributionDisbursementRequestListResponse,
    ContributionDisbursementRequestResponse,
    ContributionDisbursementStatusAction,
    ContributionExpenseCategoryPolicyItemResponse,
    ContributionExpenseCategoryPolicyResponse,
    ContributionExpenseEvidenceCreate,
    ContributionExpenseEvidencePolicyResponse,
    ContributionExpenseEvidenceResponse,
    ContributionExpenseEvidenceRetentionCandidateResponse,
    ContributionExpenseEvidenceRetentionResponse,
    ContributionExpenseReportCreate,
    ContributionExpenseReportListResponse,
    ContributionExpenseReportResponse,
    ContributionLedgerEntryResponse,
    ContributionListResponse,
    ContributionPaymentAttemptListResponse,
    ContributionPaymentAttemptResponse,
    ContributionPaymentCreate,
    ContributionPaymentIntentCreate,
    ContributionPaymentIntentResponse,
    ContributionReceiptResponse,
    ContributionResponse,
    ContributionWebhookEventListResponse,
    ContributionWebhookEventResponse,
    ContributionWebhookPayload,
    ContributionWebhookResponse,
    TreasuryCertificationCreate,
    TreasuryCertificationListResponse,
    TreasuryCertificationResponse,
    TreasuryCurrencySummaryResponse,
    TreasuryExpenseCategorySummaryResponse,
    TreasurySummaryResponse,
)
from app.modules.contributions.storage import store_contribution_expense_evidence_file

router = APIRouter()
finance_admin_dependency = require_roles(
    GlobalRole.SUPER_ADMIN.value,
    GlobalRole.PLATFORM_ADMIN.value,
    GlobalRole.FINANCE_ADMIN.value,
)

CAMPAIGN_STATUSES = {"APPROVED", "ARCHIVED", "CLOSED", "DRAFT", "PENDING_APPROVAL", "PUBLISHED"}
VISIBLE_CAMPAIGN_STATUSES = {"CLOSED", "PUBLISHED"}
PAYMENT_METHODS = {"BANK_TRANSFER", "CARD_TEST", "MOBILE_MONEY", "OFFLINE_CASH"}
RECEIVED_STATUS = "RECEIVED"
PENDING_STATUS = "PENDING"
REFUNDED_STATUS = "REFUNDED"
VOIDED_STATUS = "VOIDED"
LEDGER_CREDIT = "CONTRIBUTION_CREDIT"
LEDGER_EXPENSE = "CONTRIBUTION_EXPENSE"
LEDGER_EXPENSE_REVERSAL = "CONTRIBUTION_EXPENSE_REVERSAL"
LEDGER_REFUND = "CONTRIBUTION_REFUND"
LEDGER_VOID = "CONTRIBUTION_VOID"
PAYMENT_INTENT_REQUIRES_CONFIRMATION = "REQUIRES_CONFIRMATION"
PAYMENT_INTENT_CONFIRMED = "CONFIRMED"
PAYMENT_INTENT_FAILED = "FAILED"
PAYMENT_INTENT_CANCELED = "CANCELED"
DISBURSEMENT_REQUESTED = "REQUESTED"
DISBURSEMENT_APPROVED = "APPROVED"
DISBURSEMENT_REJECTED = "REJECTED"
DISBURSEMENT_PAID = "PAID"
DISBURSEMENT_CANCELED = "CANCELED"
DISBURSEMENT_STATUSES = {
    DISBURSEMENT_APPROVED,
    DISBURSEMENT_CANCELED,
    DISBURSEMENT_PAID,
    DISBURSEMENT_REJECTED,
    DISBURSEMENT_REQUESTED,
}
DISBURSEMENT_COMMITTED_STATUSES = {
    DISBURSEMENT_APPROVED,
    DISBURSEMENT_PAID,
    DISBURSEMENT_REQUESTED,
}
EXPENSE_SUBMITTED = "SUBMITTED"
EXPENSE_APPROVED = "APPROVED"
EXPENSE_REJECTED = "REJECTED"
EXPENSE_STATUSES = {
    EXPENSE_APPROVED,
    EXPENSE_REJECTED,
    EXPENSE_SUBMITTED,
}
EXPENSE_COMMITTED_STATUSES = {
    EXPENSE_APPROVED,
    EXPENSE_SUBMITTED,
}
WEBHOOK_EVENT_RECEIVED = "RECEIVED"
WEBHOOK_EVENT_RECONCILED = "RECONCILED"
WEBHOOK_EVENT_DUPLICATE = "DUPLICATE"
WEBHOOK_EVENT_FAILED = "FAILED"
WEBHOOK_EVENT_CANCELED = "CANCELED"
WEBHOOK_EVENT_UNMATCHED = "UNMATCHED"
WEBHOOK_EVENT_REJECTED = "REJECTED"
WEBHOOK_SUCCESS_EVENTS = {
    "CHECKOUT_SESSION_COMPLETED",
    "CHARGE_SUCCEEDED",
    "PAYMENT_INTENT_CONFIRMED",
    "PAYMENT_INTENT_SUCCEEDED",
    "PAYMENT_SUCCEEDED",
}
WEBHOOK_FAILED_EVENTS = {"CHARGE_FAILED", "PAYMENT_FAILED", "PAYMENT_INTENT_FAILED"}
WEBHOOK_CANCELED_EVENTS = {
    "CHECKOUT_SESSION_EXPIRED",
    "PAYMENT_CANCELED",
    "PAYMENT_INTENT_CANCELED",
}


@dataclass(frozen=True)
class CheckoutSessionDraft:
    checkout_url: str | None
    client_secret: str | None
    provider: str
    provider_intent_id: str
    request_payload_json: dict
    response_payload_json: dict


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


def _create_system_security_event(
    db: Session,
    request: Request,
    event_type: str,
    metadata: dict | None = None,
) -> None:
    ip_address, user_agent = _request_context(request)
    db.add(
        SecurityEvent(
            user_id=None,
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


def _split_config_csv(value: str) -> list[str]:
    return sorted({item.strip() for item in value.split(",") if item.strip()})


def _parse_expense_category_taxonomy(value: str) -> dict[str, str]:
    taxonomy: dict[str, str] = {}
    for entry in _split_config_csv(value):
        raw_key, separator, raw_label = entry.partition(":")
        category = _normalize_enum(raw_key)
        if category is None:
            continue
        label = raw_label.strip() if separator else category.replace("_", " ").title()
        taxonomy[category] = label or category.replace("_", " ").title()
    return taxonomy


def _parse_expense_category_budget_policy(value: str) -> dict[tuple[str, str], int]:
    budgets: dict[tuple[str, str], int] = {}
    for entry in _split_config_csv(value):
        raw_category, raw_currency, raw_amount = entry.split(":", 2) if entry.count(":") >= 2 else (
            "",
            "",
            "",
        )
        category = _normalize_enum(raw_category)
        currency = raw_currency.strip().upper()
        if category is None or len(currency) != 3:
            continue
        try:
            amount_cents = int(raw_amount)
        except ValueError:
            continue
        if amount_cents >= 0:
            budgets[(category, currency)] = amount_cents
    return budgets


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


def _get_disbursement_or_404(
    db: Session,
    disbursement_request_id: uuid.UUID,
) -> ContributionDisbursementRequest:
    disbursement_request = db.scalar(
        select(ContributionDisbursementRequest)
        .options(
            joinedload(ContributionDisbursementRequest.campaign),
            joinedload(ContributionDisbursementRequest.requested_by),
            joinedload(ContributionDisbursementRequest.reviewed_by),
            joinedload(ContributionDisbursementRequest.paid_by),
        )
        .where(ContributionDisbursementRequest.id == disbursement_request_id)
    )
    if disbursement_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Disbursement request not found",
        )
    return disbursement_request


def _get_expense_report_or_404(
    db: Session,
    expense_report_id: uuid.UUID,
) -> ContributionExpenseReport:
    expense_report = db.scalar(
        select(ContributionExpenseReport)
        .options(
            joinedload(ContributionExpenseReport.campaign),
            joinedload(ContributionExpenseReport.disbursement_request),
            joinedload(ContributionExpenseReport.submitted_by),
            joinedload(ContributionExpenseReport.reviewed_by),
        )
        .where(ContributionExpenseReport.id == expense_report_id)
    )
    if expense_report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense report not found",
        )
    return expense_report


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


def _get_payment_intent_or_404(
    db: Session,
    *,
    campaign_id: uuid.UUID,
    payment_intent_id: uuid.UUID,
) -> ContributionPaymentIntent:
    payment_intent = db.scalar(
        select(ContributionPaymentIntent)
        .options(
            joinedload(ContributionPaymentIntent.campaign),
            joinedload(ContributionPaymentIntent.contributor),
        )
        .where(
            ContributionPaymentIntent.campaign_id == campaign_id,
            ContributionPaymentIntent.id == payment_intent_id,
        )
    )
    if payment_intent is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment intent not found",
        )
    return payment_intent


def _get_payment_intent_by_provider_reference(
    db: Session,
    *,
    provider: str,
    provider_intent_id: str,
) -> ContributionPaymentIntent | None:
    return db.scalar(
        select(ContributionPaymentIntent)
        .options(
            joinedload(ContributionPaymentIntent.campaign),
            joinedload(ContributionPaymentIntent.contributor),
        )
        .where(
            ContributionPaymentIntent.provider == provider,
            ContributionPaymentIntent.provider_intent_id == provider_intent_id,
        )
    )


def _get_latest_payment_attempt(
    db: Session,
    payment_intent_id: uuid.UUID,
) -> ContributionPaymentAttempt | None:
    return db.scalar(
        select(ContributionPaymentAttempt)
        .where(ContributionPaymentAttempt.payment_intent_id == payment_intent_id)
        .order_by(ContributionPaymentAttempt.created_at.desc())
    )


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


def _serialize_payment_intent(
    payment_intent: ContributionPaymentIntent,
) -> ContributionPaymentIntentResponse:
    checkout_attempt = (
        payment_intent.payment_attempts[-1] if payment_intent.payment_attempts else None
    )
    return ContributionPaymentIntentResponse(
        amount_cents=payment_intent.amount_cents,
        anonymous=payment_intent.anonymous,
        campaign_id=payment_intent.campaign_id,
        checkout_attempt_id=checkout_attempt.id if checkout_attempt else None,
        checkout_url=checkout_attempt.checkout_url if checkout_attempt else None,
        client_secret=checkout_attempt.client_secret if checkout_attempt else None,
        contributor_user_id=payment_intent.contributor_user_id,
        created_at=payment_intent.created_at,
        currency=payment_intent.currency,
        id=payment_intent.id,
        note=payment_intent.note,
        payment_method=payment_intent.payment_method,
        provider=payment_intent.provider,
        provider_intent_id=payment_intent.provider_intent_id,
        status=payment_intent.status,
        updated_at=payment_intent.updated_at,
    )


def _serialize_payment_attempt(
    payment_attempt: ContributionPaymentAttempt,
) -> ContributionPaymentAttemptResponse:
    payment_intent = payment_attempt.payment_intent
    return ContributionPaymentAttemptResponse(
        amount_cents=payment_attempt.amount_cents,
        campaign_id=payment_intent.campaign_id if payment_intent else None,
        contributor_user_id=payment_intent.contributor_user_id if payment_intent else None,
        created_at=payment_attempt.created_at,
        currency=payment_attempt.currency,
        error_message=payment_attempt.error_message,
        has_checkout_url=bool(payment_attempt.checkout_url),
        has_client_secret=bool(payment_attempt.client_secret),
        id=payment_attempt.id,
        payment_intent_id=payment_attempt.payment_intent_id,
        payment_intent_status=payment_intent.status if payment_intent else None,
        payment_method=payment_attempt.payment_method,
        provider=payment_attempt.provider,
        provider_intent_id=payment_attempt.provider_intent_id,
        status=payment_attempt.status,
        updated_at=payment_attempt.updated_at,
    )


def _serialize_webhook_response(
    *,
    contribution: Contribution | None,
    event_type: str,
    message: str,
    payment_intent: ContributionPaymentIntent,
    provider_event_id: str | None,
    reconciled: bool,
) -> ContributionWebhookResponse:
    return ContributionWebhookResponse(
        contribution_id=contribution.id if contribution else None,
        event_type=event_type,
        message=message,
        payment_intent_id=payment_intent.id,
        payment_intent_status=payment_intent.status,
        provider=payment_intent.provider,
        provider_event_id=provider_event_id,
        provider_intent_id=payment_intent.provider_intent_id,
        receipt_id=contribution.receipt.id if contribution and contribution.receipt else None,
        reconciled=reconciled,
    )


def _serialize_webhook_event(
    event: ContributionWebhookEvent,
) -> ContributionWebhookEventResponse:
    return ContributionWebhookEventResponse(
        amount_cents=event.amount_cents,
        contribution_id=event.contribution_id,
        created_at=event.created_at,
        currency=event.currency,
        delivery_count=event.delivery_count,
        error_message=event.error_message,
        event_type=event.event_type,
        failure_reason=event.failure_reason,
        id=event.id,
        payment_intent_id=event.payment_intent_id,
        processed_at=event.processed_at,
        provider=event.provider,
        provider_event_id=event.provider_event_id,
        provider_intent_id=event.provider_intent_id,
        status=event.status,
        updated_at=event.updated_at,
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


def _ensure_receipt_access(receipt: ContributionReceipt, current_user: User) -> None:
    if (
        receipt.contribution.contributor_user_id != current_user.id
        and not _is_finance_admin(current_user)
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found")


def _ensure_payment_intent_access(
    payment_intent: ContributionPaymentIntent,
    current_user: User,
) -> None:
    if payment_intent.contributor_user_id != current_user.id and not _is_finance_admin(
        current_user
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment intent not found",
        )


def _serialize_ledger_entry(entry: ContributionLedgerEntry) -> ContributionLedgerEntryResponse:
    return ContributionLedgerEntryResponse(
        amount_cents=entry.amount_cents,
        contribution_id=entry.contribution_id,
        created_at=entry.created_at,
        currency=entry.currency,
        entry_type=entry.entry_type,
        expense_category=entry.expense_report.expense_category if entry.expense_report else None,
        expense_report_id=entry.expense_report_id,
        id=entry.id,
        memo=entry.memo,
    )


def _ledger_entry_campaign(entry: ContributionLedgerEntry) -> ContributionCampaign | None:
    if entry.contribution:
        return entry.contribution.campaign
    if entry.expense_report:
        return entry.expense_report.campaign
    return None


def _ledger_entry_campaign_id(entry: ContributionLedgerEntry) -> uuid.UUID | None:
    if entry.contribution:
        return entry.contribution.campaign_id
    if entry.expense_report:
        return entry.expense_report.campaign_id
    return None


def _ledger_entry_receipt_number(entry: ContributionLedgerEntry) -> str | None:
    if entry.contribution and entry.contribution.receipt:
        return entry.contribution.receipt.receipt_number
    return None


def _empty_currency_summary(currency: str) -> dict[str, int | str]:
    return {
        "contribution_count": 0,
        "currency": currency,
        "ledger_entry_count": 0,
        "ledger_net_amount_cents": 0,
        "pending_amount_cents": 0,
        "receipt_count": 0,
        "received_amount_cents": 0,
    }


def _currency_summaries_from_items(
    *,
    contributions: list[Contribution],
    ledger_entries: list[ContributionLedgerEntry],
) -> list[dict[str, int | str]]:
    summaries: dict[str, dict[str, int | str]] = {}
    for contribution in contributions:
        summary = summaries.setdefault(
            contribution.currency,
            _empty_currency_summary(contribution.currency),
        )
        summary["contribution_count"] = int(summary["contribution_count"]) + 1
        if contribution.receipt:
            summary["receipt_count"] = int(summary["receipt_count"]) + 1
        if contribution.status == RECEIVED_STATUS:
            summary["received_amount_cents"] = (
                int(summary["received_amount_cents"]) + contribution.amount_cents
            )
        if contribution.status == PENDING_STATUS:
            summary["pending_amount_cents"] = (
                int(summary["pending_amount_cents"]) + contribution.amount_cents
            )
    for entry in ledger_entries:
        summary = summaries.setdefault(
            entry.currency,
            _empty_currency_summary(entry.currency),
        )
        summary["ledger_entry_count"] = int(summary["ledger_entry_count"]) + 1
        summary["ledger_net_amount_cents"] = (
            int(summary["ledger_net_amount_cents"]) + entry.amount_cents
        )
    return [summaries[currency] for currency in sorted(summaries)]


def _treasury_currency_summaries(db: Session) -> list[TreasuryCurrencySummaryResponse]:
    summaries: dict[str, dict[str, int | str]] = {}
    contribution_rows = db.execute(
        select(
            Contribution.currency,
            Contribution.status,
            func.count(Contribution.id),
            func.coalesce(func.sum(Contribution.amount_cents), 0),
        ).group_by(Contribution.currency, Contribution.status)
    ).all()
    for currency, status_value, count, amount_cents in contribution_rows:
        summary = summaries.setdefault(currency, _empty_currency_summary(currency))
        summary["contribution_count"] = int(summary["contribution_count"]) + int(count)
        if status_value == RECEIVED_STATUS:
            summary["received_amount_cents"] = int(amount_cents)
        if status_value == PENDING_STATUS:
            summary["pending_amount_cents"] = int(amount_cents)

    receipt_rows = db.execute(
        select(
            ContributionReceipt.currency,
            func.count(ContributionReceipt.id),
        ).group_by(ContributionReceipt.currency)
    ).all()
    for currency, count in receipt_rows:
        summary = summaries.setdefault(currency, _empty_currency_summary(currency))
        summary["receipt_count"] = int(count)

    ledger_rows = db.execute(
        select(
            ContributionLedgerEntry.currency,
            func.count(ContributionLedgerEntry.id),
            func.coalesce(func.sum(ContributionLedgerEntry.amount_cents), 0),
        ).group_by(ContributionLedgerEntry.currency)
    ).all()
    for currency, count, amount_cents in ledger_rows:
        summary = summaries.setdefault(currency, _empty_currency_summary(currency))
        summary["ledger_entry_count"] = int(count)
        summary["ledger_net_amount_cents"] = int(amount_cents)

    return [
        TreasuryCurrencySummaryResponse(**summaries[currency])
        for currency in sorted(summaries)
    ]


def _empty_expense_category_summary(
    *,
    currency: str,
    expense_category: str,
) -> dict[str, int | str]:
    return {
        "approved_amount_cents": 0,
        "approved_report_count": 0,
        "currency": currency,
        "expense_category": expense_category,
        "rejected_amount_cents": 0,
        "rejected_report_count": 0,
        "report_count": 0,
        "submitted_amount_cents": 0,
        "submitted_report_count": 0,
        "total_amount_cents": 0,
    }


def _treasury_expense_category_summaries(
    db: Session,
) -> list[TreasuryExpenseCategorySummaryResponse]:
    summaries: dict[tuple[str, str], dict[str, int | str]] = {}
    rows = db.execute(
        select(
            ContributionExpenseReport.expense_category,
            ContributionExpenseReport.currency,
            ContributionExpenseReport.status,
            func.count(ContributionExpenseReport.id),
            func.coalesce(func.sum(ContributionExpenseReport.amount_cents), 0),
        ).group_by(
            ContributionExpenseReport.expense_category,
            ContributionExpenseReport.currency,
            ContributionExpenseReport.status,
        )
    ).all()
    for expense_category, currency, status_value, count, amount_cents in rows:
        summary = summaries.setdefault(
            (expense_category, currency),
            _empty_expense_category_summary(
                currency=currency,
                expense_category=expense_category,
            ),
        )
        summary["report_count"] = int(summary["report_count"]) + int(count)
        summary["total_amount_cents"] = int(summary["total_amount_cents"]) + int(amount_cents)
        if status_value == EXPENSE_APPROVED:
            summary["approved_report_count"] = int(summary["approved_report_count"]) + int(count)
            summary["approved_amount_cents"] = (
                int(summary["approved_amount_cents"]) + int(amount_cents)
            )
        if status_value == EXPENSE_REJECTED:
            summary["rejected_report_count"] = int(summary["rejected_report_count"]) + int(count)
            summary["rejected_amount_cents"] = (
                int(summary["rejected_amount_cents"]) + int(amount_cents)
            )
        if status_value == EXPENSE_SUBMITTED:
            summary["submitted_report_count"] = int(summary["submitted_report_count"]) + int(count)
            summary["submitted_amount_cents"] = (
                int(summary["submitted_amount_cents"]) + int(amount_cents)
            )
    return [
        TreasuryExpenseCategorySummaryResponse(**summaries[key])
        for key in sorted(summaries)
    ]


def _empty_expense_category_policy_item(
    *,
    budget_amount_cents: int | None,
    currency: str,
    expense_category: str,
    label: str,
    managed: bool,
) -> dict[str, int | str | bool | None]:
    return {
        "approved_amount_cents": 0,
        "approved_report_count": 0,
        "budget_amount_cents": budget_amount_cents,
        "currency": currency,
        "expense_category": expense_category,
        "label": label,
        "managed": managed,
        "rejected_amount_cents": 0,
        "rejected_report_count": 0,
        "remaining_budget_cents": budget_amount_cents,
        "report_count": 0,
        "submitted_amount_cents": 0,
        "submitted_report_count": 0,
        "total_amount_cents": 0,
    }


def _expense_category_policy(
    db: Session,
) -> ContributionExpenseCategoryPolicyResponse:
    settings = get_settings()
    default_currency = settings.contribution_expense_category_policy_default_currency.upper()
    taxonomy = _parse_expense_category_taxonomy(settings.contribution_expense_category_taxonomy)
    budgets = _parse_expense_category_budget_policy(
        settings.contribution_expense_category_budget_policy
    )
    rows: dict[tuple[str, str], dict[str, int | str | bool | None]] = {}

    def ensure_row(
        expense_category: str,
        currency: str,
        *,
        budget_amount_cents: int | None = None,
        managed: bool | None = None,
    ) -> dict[str, int | str | bool | None]:
        key = (expense_category, currency)
        label = taxonomy.get(expense_category, expense_category.replace("_", " ").title())
        row = rows.setdefault(
            key,
            _empty_expense_category_policy_item(
                budget_amount_cents=budget_amount_cents,
                currency=currency,
                expense_category=expense_category,
                label=label,
                managed=expense_category in taxonomy,
            ),
        )
        if budget_amount_cents is not None:
            row["budget_amount_cents"] = budget_amount_cents
            row["remaining_budget_cents"] = budget_amount_cents - int(
                row["approved_amount_cents"]
            )
        if managed is not None:
            row["managed"] = managed
        row["label"] = label
        return row

    for expense_category in taxonomy:
        ensure_row(expense_category, default_currency, managed=True)
    for (expense_category, currency), budget_amount_cents in budgets.items():
        ensure_row(
            expense_category,
            currency,
            budget_amount_cents=budget_amount_cents,
            managed=expense_category in taxonomy,
        )
    for summary in _treasury_expense_category_summaries(db):
        row = ensure_row(
            summary.expense_category,
            summary.currency,
            managed=summary.expense_category in taxonomy,
        )
        row["approved_amount_cents"] = summary.approved_amount_cents
        row["approved_report_count"] = summary.approved_report_count
        row["rejected_amount_cents"] = summary.rejected_amount_cents
        row["rejected_report_count"] = summary.rejected_report_count
        row["report_count"] = summary.report_count
        row["submitted_amount_cents"] = summary.submitted_amount_cents
        row["submitted_report_count"] = summary.submitted_report_count
        row["total_amount_cents"] = summary.total_amount_cents
        if row["budget_amount_cents"] is not None:
            row["remaining_budget_cents"] = int(row["budget_amount_cents"]) - int(
                row["approved_amount_cents"]
            )

    return ContributionExpenseCategoryPolicyResponse(
        categories=[
            ContributionExpenseCategoryPolicyItemResponse(**rows[key])
            for key in sorted(rows)
        ],
        default_currency=default_currency,
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


def _admin_contributions_query(
    *,
    campaign_id: uuid.UUID | None = None,
    status_filter: str | None = None,
):
    query = select(Contribution).options(
        joinedload(Contribution.campaign),
        joinedload(Contribution.contributor),
        joinedload(Contribution.receipt),
    )
    normalized_status = _normalize_enum(status_filter)
    if normalized_status:
        query = query.where(Contribution.status == normalized_status)
    if campaign_id:
        query = query.where(Contribution.campaign_id == campaign_id)
    return query


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


def _csv_response(filename: str, rows: list[list[object | None]]) -> Response:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    for row in rows:
        writer.writerow(["" if value is None else value for value in row])
    return Response(
        content=buffer.getvalue(),
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        media_type="text/csv; charset=utf-8",
    )


def _json_download_response(filename: str, payload: dict) -> Response:
    return Response(
        content=json.dumps(payload, indent=2, sort_keys=True),
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        media_type="application/json; charset=utf-8",
    )


def _canonical_json_bytes(payload: dict) -> bytes:
    return json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")


def _expected_webhook_signature(raw_body: bytes, secret: str) -> str:
    return hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()


def _verify_contribution_webhook_signature(request: Request, raw_body: bytes) -> None:
    secret = get_settings().contribution_webhook_secret
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Contribution webhook secret is not configured",
        )
    supplied_signature = request.headers.get("x-yalumni-webhook-signature")
    if not supplied_signature:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing webhook signature",
        )
    normalized_signature = supplied_signature.strip()
    if normalized_signature.startswith("sha256="):
        normalized_signature = normalized_signature.removeprefix("sha256=")
    expected_signature = _expected_webhook_signature(raw_body, secret)
    if not hmac.compare_digest(normalized_signature, expected_signature):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook signature",
        )


def _parse_contribution_webhook_payload(raw_body: bytes) -> ContributionWebhookPayload:
    try:
        return ContributionWebhookPayload.model_validate_json(raw_body)
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid webhook payload",
        ) from exc


def _receipt_download_lines(receipt: ContributionReceipt) -> list[str]:
    contribution = receipt.contribution
    return [
        "YALUMNI Contribution Receipt",
        f"Receipt number: {receipt.receipt_number}",
        f"Status: {receipt.status}",
        f"Issued: {receipt.issued_at.isoformat()}",
        "",
        f"Campaign: {contribution.campaign.title}",
        f"Contribution ID: {receipt.contribution_id}",
        f"Amount: {receipt.amount_cents / 100:.2f} {receipt.currency}",
        f"Payment method: {contribution.payment_method}",
        f"Payment reference: {contribution.payment_reference or 'n/a'}",
        "",
        f"Issued to: {receipt.issued_to_name}",
        f"Email: {receipt.issued_to_email}",
        "",
        receipt.tax_note or "",
    ]


def _receipt_download_response(receipt: ContributionReceipt) -> Response:
    lines = _receipt_download_lines(receipt)
    return Response(
        content="\n".join(lines),
        headers={"Content-Disposition": f'attachment; filename="{receipt.receipt_number}.txt"'},
        media_type="text/plain; charset=utf-8",
    )


def _pdf_escape(value: str) -> str:
    return (
        value.encode("latin-1", "replace")
        .decode("latin-1")
        .replace("\\", "\\\\")
        .replace("(", "\\(")
        .replace(")", "\\)")
    )


def _simple_pdf_bytes(lines: list[str]) -> bytes:
    wrapped_lines: list[str] = []
    for line in lines:
        if not line:
            wrapped_lines.append("")
            continue
        wrapped_lines.extend(textwrap.wrap(line, width=88) or [""])

    content_lines = [
        "BT",
        "/F1 18 Tf",
        "72 752 Td",
        f"({_pdf_escape(wrapped_lines[0])}) Tj",
        "/F1 11 Tf",
    ]
    for line in wrapped_lines[1:]:
        content_lines.append("0 -18 Td")
        content_lines.append(f"({_pdf_escape(line)}) Tj")
    content_lines.append("ET")
    content = "\n".join(content_lines).encode("latin-1", "replace")

    objects = [
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
        (
            b"3 0 obj\n"
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            b"/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\n"
            b"endobj\n"
        ),
        b"4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
        (
            f"5 0 obj\n<< /Length {len(content)} >>\nstream\n".encode("ascii")
            + content
            + b"\nendstream\nendobj\n"
        ),
    ]

    pdf = b"%PDF-1.4\n"
    offsets = [0]
    for obj in objects:
        offsets.append(len(pdf))
        pdf += obj
    xref_offset = len(pdf)
    pdf += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode("ascii")
    for offset in offsets[1:]:
        pdf += f"{offset:010d} 00000 n \n".encode("ascii")
    pdf += (
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
        f"startxref\n{xref_offset}\n%%EOF\n"
    ).encode("ascii")
    return pdf


def _receipt_pdf_download_response(receipt: ContributionReceipt) -> Response:
    return Response(
        content=_simple_pdf_bytes(_receipt_download_lines(receipt)),
        headers={"Content-Disposition": f'attachment; filename="{receipt.receipt_number}.pdf"'},
        media_type="application/pdf",
    )


def _treasury_audit_report_pdf_response(package: dict, generated_at: datetime) -> Response:
    audit_package = package["package"]
    integrity = package["integrity"]
    summary = audit_package["summary"]
    scope = audit_package["scope"]
    currencies = ", ".join(summary["currencies"]) if summary["currencies"] else "n/a"
    filename = f"yalumni-treasury-audit-{generated_at.date().isoformat()}.pdf"
    lines = [
        "YALUMNI Treasury Audit Report",
        f"Generated: {audit_package['generated_at']}",
        f"Generated by: {audit_package['generated_by_email']}",
        f"Scope campaign: {scope['campaign_id'] or 'all campaigns'}",
        f"Scope status: {scope['status'] or 'all statuses'}",
        f"Scope limit: {scope['limit']}",
        "",
        "Certified integrity",
        f"Canonical SHA-256: {integrity['canonical_sha256']}",
        f"Signature algorithm: {integrity['signature_algorithm']}",
        f"Signature: {integrity['signature']}",
        "",
        "Summary",
        f"Contribution count: {summary['contribution_count']}",
        f"Receipt count: {summary['receipt_count']}",
        f"Ledger entry count: {summary['ledger_entry_count']}",
        f"Received amount cents: {summary['received_amount_cents']}",
        f"Pending amount cents: {summary['pending_amount_cents']}",
        f"Currencies: {currencies}",
        "Currency summaries:",
    ]
    for currency_summary in summary.get("currency_summaries", []):
        lines.append(
            f"- {currency_summary['currency']}: "
            f"received {currency_summary['received_amount_cents']}, "
            f"pending {currency_summary['pending_amount_cents']}, "
            f"ledger net {currency_summary['ledger_net_amount_cents']}"
        )
    if not summary.get("currency_summaries"):
        lines.append("- none")
    lines.extend(
        [
            "",
            "Recent contributions",
        ]
    )
    for contribution in audit_package["contributions"][:8]:
        lines.append(
            f"- {contribution['receipt_number'] or 'no receipt'} | "
            f"{contribution['campaign_title'] or 'unknown campaign'} | "
            f"{contribution['amount_cents']} {contribution['currency']} | "
            f"{contribution['status']}"
        )
    if not audit_package["contributions"]:
        lines.append("- none")
    lines.extend(["", "Recent ledger entries"])
    for entry in audit_package["ledger_entries"][:8]:
        lines.append(
            f"- {entry['entry_type']} | {entry['amount_cents']} {entry['currency']} | "
            f"{entry['receipt_number'] or 'no receipt'} | {entry['memo'] or 'no memo'}"
        )
    if not audit_package["ledger_entries"]:
        lines.append("- none")
    return Response(
        content=_simple_pdf_bytes(lines),
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        media_type="application/pdf",
    )


def _adjustment_memo(action: str, contribution: Contribution, note: str | None) -> str:
    receipt_number = contribution.receipt.receipt_number if contribution.receipt else "no receipt"
    memo = f"{action} for {receipt_number} on {contribution.campaign.title}"
    if note:
        memo = f"{memo}. Note: {note}"
    return memo[:500]


def _apply_contribution_adjustment(
    *,
    action: str,
    contribution: Contribution,
    current_user: User,
    db: Session,
    event_type: str,
    ledger_amount_cents: int,
    ledger_type: str,
    next_status: str,
    note: str | None,
    receipt_status: str | None,
    request: Request,
) -> ContributionResponse:
    contribution.status = next_status
    if contribution.receipt and receipt_status:
        contribution.receipt.status = receipt_status
    db.add(
        ContributionLedgerEntry(
            amount_cents=ledger_amount_cents,
            contribution_id=contribution.id,
            created_by_user_id=current_user.id,
            currency=contribution.currency,
            entry_type=ledger_type,
            memo=_adjustment_memo(action, contribution, note),
        )
    )
    _create_security_event(
        db,
        request,
        current_user,
        event_type,
        {
            "amount_cents": contribution.amount_cents,
            "campaign_id": str(contribution.campaign_id),
            "contribution_id": str(contribution.id),
            "ledger_amount_cents": ledger_amount_cents,
            "note": note,
            "receipt_number": contribution.receipt.receipt_number
            if contribution.receipt
            else None,
            "status": next_status,
        },
    )
    db.commit()
    contribution = _get_contribution_or_404(db, contribution.id)
    return _serialize_contribution(contribution)


def _find_contribution_for_payment_intent(
    db: Session,
    payment_intent: ContributionPaymentIntent,
) -> Contribution | None:
    return db.scalar(
        select(Contribution)
        .options(
            joinedload(Contribution.campaign),
            joinedload(Contribution.contributor),
            joinedload(Contribution.receipt),
        )
        .where(
            Contribution.campaign_id == payment_intent.campaign_id,
            Contribution.payment_reference == payment_intent.provider_intent_id,
        )
    )


def _configured_checkout_provider() -> str:
    return _normalize_enum(get_settings().contribution_checkout_provider) or "LOCAL_TEST"


def _local_checkout_client_secret(provider_intent_id: str) -> str:
    return f"{provider_intent_id}_secret_{secrets.token_urlsafe(24)}"


def _create_local_test_checkout_session(
    *,
    campaign: ContributionCampaign,
    intent_id: uuid.UUID,
    payload: ContributionPaymentIntentCreate,
) -> CheckoutSessionDraft:
    provider_intent_id = f"yalumni_pi_{intent_id.hex}"
    return CheckoutSessionDraft(
        checkout_url=None,
        client_secret=_local_checkout_client_secret(provider_intent_id),
        provider="LOCAL_TEST",
        provider_intent_id=provider_intent_id,
        request_payload_json={
            "amount_cents": payload.amount_cents,
            "campaign_id": str(campaign.id),
            "currency": payload.currency,
            "payment_method": payload.payment_method,
            "provider": "LOCAL_TEST",
        },
        response_payload_json={
            "adapter": "LOCAL_TEST",
            "client_secret_available": True,
            "provider_intent_id": provider_intent_id,
        },
    )


def _create_checkout_session(
    *,
    campaign: ContributionCampaign,
    intent_id: uuid.UUID,
    payload: ContributionPaymentIntentCreate,
    provider: str,
) -> CheckoutSessionDraft:
    if provider == "LOCAL_TEST":
        return _create_local_test_checkout_session(
            campaign=campaign,
            intent_id=intent_id,
            payload=payload,
        )
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=f"Contribution checkout provider {provider} is not implemented",
    )


def _create_provider_refund_request(*, contribution: Contribution, provider: str) -> None:
    if provider == "LOCAL_TEST":
        return
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=f"Contribution refund provider {provider} is not implemented",
    )


def _create_payment_attempt(
    *,
    checkout_session: CheckoutSessionDraft,
    payment_intent: ContributionPaymentIntent,
) -> ContributionPaymentAttempt:
    return ContributionPaymentAttempt(
        id=uuid.uuid4(),
        amount_cents=payment_intent.amount_cents,
        checkout_url=checkout_session.checkout_url,
        client_secret=checkout_session.client_secret,
        currency=payment_intent.currency,
        error_message=None,
        payment_intent_id=payment_intent.id,
        payment_method=payment_intent.payment_method,
        provider=payment_intent.provider,
        provider_intent_id=payment_intent.provider_intent_id,
        request_payload_json=checkout_session.request_payload_json,
        response_payload_json=checkout_session.response_payload_json,
        status=payment_intent.status,
    )


def _payment_intent_retry_payload(
    payment_intent: ContributionPaymentIntent,
) -> ContributionPaymentIntentCreate:
    return ContributionPaymentIntentCreate(
        amount_cents=payment_intent.amount_cents,
        anonymous=payment_intent.anonymous,
        currency=payment_intent.currency,
        note=payment_intent.note,
        payment_method=payment_intent.payment_method,
    )


def _update_latest_payment_attempt_status(
    db: Session,
    payment_intent: ContributionPaymentIntent,
    status_value: str,
    *,
    error_message: str | None = None,
) -> None:
    payment_attempt = _get_latest_payment_attempt(db, payment_intent.id)
    if payment_attempt is None:
        return
    payment_attempt.status = status_value
    payment_attempt.error_message = error_message


def _record_payment_intent_contribution(
    *,
    actor_user: User | None,
    db: Session,
    event_metadata: dict | None,
    event_type: str,
    ledger_memo: str,
    payment_intent: ContributionPaymentIntent,
    request: Request,
    webhook_event: ContributionWebhookEvent | None = None,
) -> Contribution:
    receipt_user = payment_intent.contributor or actor_user
    if receipt_user is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Payment intent contributor is missing",
        )
    now = utcnow()
    contribution = Contribution(
        amount_cents=payment_intent.amount_cents,
        anonymous=payment_intent.anonymous,
        campaign_id=payment_intent.campaign_id,
        contributor_user_id=payment_intent.contributor_user_id,
        currency=payment_intent.currency,
        note=payment_intent.note,
        paid_at=now,
        payment_method=payment_intent.payment_method,
        payment_reference=payment_intent.provider_intent_id,
        status=RECEIVED_STATUS,
    )
    payment_intent.status = PAYMENT_INTENT_CONFIRMED
    _update_latest_payment_attempt_status(db, payment_intent, PAYMENT_INTENT_CONFIRMED)
    db.add(contribution)
    db.flush()
    receipt = ContributionReceipt(
        amount_cents=contribution.amount_cents,
        contribution_id=contribution.id,
        currency=contribution.currency,
        issued_at=now,
        issued_to_email=receipt_user.email,
        issued_to_name=receipt_user.display_name,
        receipt_number=_next_receipt_number(db),
        status="ISSUED",
        tax_note="This is a contribution receipt generated by YALUMNI.",
    )
    db.add(receipt)
    db.add(
        ContributionLedgerEntry(
            amount_cents=contribution.amount_cents,
            contribution_id=contribution.id,
            created_by_user_id=actor_user.id if actor_user else None,
            currency=contribution.currency,
            entry_type=LEDGER_CREDIT,
            memo=ledger_memo,
        )
    )
    metadata = {
        "amount_cents": contribution.amount_cents,
        "campaign_id": str(payment_intent.campaign_id),
        "contribution_id": str(contribution.id),
        "currency": contribution.currency,
        "payment_intent_id": str(payment_intent.id),
        "provider_intent_id": payment_intent.provider_intent_id,
    }
    if event_metadata:
        metadata.update(event_metadata)
    if webhook_event:
        _finalize_webhook_event(
            webhook_event,
            contribution=contribution,
            payment_intent=payment_intent,
            status_value=WEBHOOK_EVENT_RECONCILED,
        )
    if actor_user:
        _create_security_event(db, request, actor_user, event_type, metadata)
    else:
        _create_system_security_event(db, request, event_type, metadata)
    db.commit()
    return _get_contribution_or_404(db, contribution.id)


def _validate_webhook_amount(
    payload: ContributionWebhookPayload,
    payment_intent: ContributionPaymentIntent,
) -> None:
    if payload.amount_cents is not None and payload.amount_cents != payment_intent.amount_cents:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Webhook amount does not match payment intent",
        )
    if payload.currency is not None and payload.currency != payment_intent.currency:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Webhook currency does not match payment intent",
        )


def _webhook_payload_snapshot(payload: ContributionWebhookPayload) -> dict:
    return {
        "amount_cents": payload.amount_cents,
        "currency": payload.currency,
        "event_type": payload.event_type,
        "failure_reason": payload.failure_reason,
        "provider_event_id": payload.provider_event_id,
        "provider_intent_id": payload.provider_intent_id,
    }


def _start_webhook_event(
    db: Session,
    *,
    payload: ContributionWebhookPayload,
    provider: str,
) -> ContributionWebhookEvent:
    existing_event = None
    if payload.provider_event_id:
        existing_event = db.scalar(
            select(ContributionWebhookEvent).where(
                ContributionWebhookEvent.provider == provider,
                ContributionWebhookEvent.provider_event_id == payload.provider_event_id,
            )
        )
    if existing_event:
        existing_event.amount_cents = payload.amount_cents
        existing_event.currency = payload.currency
        existing_event.delivery_count += 1
        existing_event.event_type = payload.event_type
        existing_event.failure_reason = payload.failure_reason
        existing_event.payload_json = _webhook_payload_snapshot(payload)
        existing_event.provider_intent_id = payload.provider_intent_id
        existing_event.status = WEBHOOK_EVENT_RECEIVED
        existing_event.error_message = None
        return existing_event

    event = ContributionWebhookEvent(
        amount_cents=payload.amount_cents,
        currency=payload.currency,
        event_type=payload.event_type,
        failure_reason=payload.failure_reason,
        payload_json=_webhook_payload_snapshot(payload),
        provider=provider,
        provider_event_id=payload.provider_event_id,
        provider_intent_id=payload.provider_intent_id,
        status=WEBHOOK_EVENT_RECEIVED,
    )
    db.add(event)
    return event


def _finalize_webhook_event(
    event: ContributionWebhookEvent,
    *,
    contribution: Contribution | None = None,
    error_message: str | None = None,
    payment_intent: ContributionPaymentIntent | None = None,
    status_value: str,
) -> None:
    event.contribution_id = contribution.id if contribution else event.contribution_id
    event.error_message = error_message
    event.payment_intent_id = payment_intent.id if payment_intent else event.payment_intent_id
    event.processed_at = utcnow()
    event.status = status_value


def _ledger_entries_query(
    *,
    campaign_id: uuid.UUID | None = None,
    status_filter: str | None = None,
):
    query = select(ContributionLedgerEntry).options(
        joinedload(ContributionLedgerEntry.contribution).joinedload(Contribution.campaign),
        joinedload(ContributionLedgerEntry.contribution).joinedload(Contribution.contributor),
        joinedload(ContributionLedgerEntry.contribution).joinedload(Contribution.receipt),
        joinedload(ContributionLedgerEntry.expense_report).joinedload(
            ContributionExpenseReport.campaign
        ),
    )
    normalized_status = _normalize_enum(status_filter)
    if campaign_id or normalized_status:
        query = query.outerjoin(
            Contribution,
            ContributionLedgerEntry.contribution_id == Contribution.id,
        ).outerjoin(
            ContributionExpenseReport,
            ContributionLedgerEntry.expense_report_id == ContributionExpenseReport.id,
        )
    if campaign_id:
        query = query.where(
            or_(
                Contribution.campaign_id == campaign_id,
                ContributionExpenseReport.campaign_id == campaign_id,
            )
        )
    if normalized_status:
        if normalized_status in EXPENSE_STATUSES:
            query = query.where(ContributionExpenseReport.status == normalized_status)
        else:
            query = query.where(Contribution.status == normalized_status)
    return query


def _build_treasury_audit_package(
    *,
    campaign_id: uuid.UUID | None,
    contributions: list[Contribution],
    generated_at: datetime,
    generated_by: User,
    ledger_entries: list[ContributionLedgerEntry],
    limit: int,
    status_filter: str | None,
) -> dict:
    normalized_status = _normalize_enum(status_filter)
    included_currencies = sorted(
        {item.currency for item in contributions} | {item.currency for item in ledger_entries}
    )
    received_amount_cents = sum(
        item.amount_cents for item in contributions if item.status == RECEIVED_STATUS
    )
    pending_amount_cents = sum(
        item.amount_cents for item in contributions if item.status == PENDING_STATUS
    )
    currency_summaries = _currency_summaries_from_items(
        contributions=contributions,
        ledger_entries=ledger_entries,
    )
    package = {
        "generated_at": generated_at.isoformat(),
        "generated_by_email": generated_by.email,
        "generated_by_user_id": str(generated_by.id),
        "scope": {
            "campaign_id": str(campaign_id) if campaign_id else None,
            "limit": limit,
            "status": normalized_status,
        },
        "summary": {
            "contribution_count": len(contributions),
            "currencies": included_currencies,
            "currency_summaries": currency_summaries,
            "ledger_entry_count": len(ledger_entries),
            "pending_amount_cents": pending_amount_cents,
            "receipt_count": sum(1 for item in contributions if item.receipt),
            "received_amount_cents": received_amount_cents,
        },
        "contributions": [
            {
                "amount_cents": contribution.amount_cents,
                "anonymous_publicly": contribution.anonymous,
                "campaign_id": str(contribution.campaign_id),
                "campaign_title": contribution.campaign.title if contribution.campaign else None,
                "contribution_id": str(contribution.id),
                "contributor_email": contribution.contributor.email
                if contribution.contributor
                else None,
                "created_at": contribution.created_at.isoformat(),
                "currency": contribution.currency,
                "paid_at": contribution.paid_at.isoformat() if contribution.paid_at else None,
                "payment_method": contribution.payment_method,
                "payment_reference": contribution.payment_reference,
                "receipt_number": contribution.receipt.receipt_number
                if contribution.receipt
                else None,
                "status": contribution.status,
            }
            for contribution in contributions
        ],
        "ledger_entries": [
            {
                "amount_cents": entry.amount_cents,
                "campaign_id": str(_ledger_entry_campaign_id(entry))
                if _ledger_entry_campaign_id(entry)
                else None,
                "campaign_title": _ledger_entry_campaign(entry).title
                if _ledger_entry_campaign(entry)
                else None,
                "contribution_id": str(entry.contribution_id) if entry.contribution_id else None,
                "created_at": entry.created_at.isoformat(),
                "currency": entry.currency,
                "entry_type": entry.entry_type,
                "expense_report_id": str(entry.expense_report_id)
                if entry.expense_report_id
                else None,
                "expense_category": entry.expense_report.expense_category
                if entry.expense_report
                else None,
                "expense_summary": entry.expense_report.summary
                if entry.expense_report
                else None,
                "expense_vendor_name": entry.expense_report.vendor_name
                if entry.expense_report
                else None,
                "ledger_entry_id": str(entry.id),
                "memo": entry.memo,
                "receipt_number": _ledger_entry_receipt_number(entry),
            }
            for entry in ledger_entries
        ],
    }
    canonical_package = _canonical_json_bytes(package)
    digest = hashlib.sha256(canonical_package).hexdigest()
    signature = hmac.new(
        get_settings().jwt_secret_key.encode("utf-8"),
        canonical_package,
        hashlib.sha256,
    ).hexdigest()
    return {
        "integrity": {
            "canonical_sha256": digest,
            "signature": signature,
            "signature_algorithm": "HMAC-SHA256",
        },
        "package": package,
    }


def _treasury_audit_inputs(
    db: Session,
    *,
    campaign_id: uuid.UUID | None,
    limit: int,
    status_filter: str | None,
) -> tuple[list[Contribution], list[ContributionLedgerEntry]]:
    contribution_query = _admin_contributions_query(
        campaign_id=campaign_id,
        status_filter=status_filter,
    )
    contributions = db.scalars(
        contribution_query.order_by(Contribution.created_at.desc()).limit(limit)
    ).all()
    ledger_entries = db.scalars(
        _ledger_entries_query(campaign_id=campaign_id, status_filter=status_filter)
        .order_by(ContributionLedgerEntry.created_at.desc())
        .limit(limit)
    )
    return contributions, ledger_entries.all()


def _serialize_treasury_certification(
    certification: ContributionTreasuryCertification,
) -> TreasuryCertificationResponse:
    package_summary = (
        certification.package_json.get("package", {}).get("summary", {})
        if certification.package_json
        else {}
    )
    return TreasuryCertificationResponse(
        campaign_id=certification.campaign_id,
        campaign_title=certification.campaign.title if certification.campaign else None,
        canonical_sha256=certification.canonical_sha256,
        certified_at=certification.certified_at,
        certified_by_display_name=certification.certified_by.display_name
        if certification.certified_by
        else None,
        certified_by_email=certification.certified_by.email
        if certification.certified_by
        else None,
        certified_by_user_id=certification.certified_by_user_id,
        contribution_count=certification.contribution_count,
        currencies=certification.currencies_json or [],
        currency_summaries=package_summary.get("currency_summaries", []),
        id=certification.id,
        ledger_entry_count=certification.ledger_entry_count,
        limit=certification.limit,
        note=certification.note,
        package_json=certification.package_json,
        pending_amount_cents=certification.pending_amount_cents,
        receipt_count=certification.receipt_count,
        received_amount_cents=certification.received_amount_cents,
        signature=certification.signature,
        signature_algorithm=certification.signature_algorithm,
        status_filter=certification.status_filter,
    )


def _campaign_received_amount(db: Session, campaign_id: uuid.UUID) -> int:
    return int(
        db.scalar(
            select(func.coalesce(func.sum(Contribution.amount_cents), 0)).where(
                Contribution.campaign_id == campaign_id,
                Contribution.status == RECEIVED_STATUS,
            )
        )
        or 0
    )


def _campaign_committed_disbursement_amount(
    db: Session,
    campaign_id: uuid.UUID,
    *,
    exclude_disbursement_request_id: uuid.UUID | None = None,
) -> int:
    query = select(func.coalesce(func.sum(ContributionDisbursementRequest.amount_cents), 0)).where(
        ContributionDisbursementRequest.campaign_id == campaign_id,
        ContributionDisbursementRequest.status.in_(DISBURSEMENT_COMMITTED_STATUSES),
    )
    if exclude_disbursement_request_id:
        query = query.where(ContributionDisbursementRequest.id != exclude_disbursement_request_id)
    return int(db.scalar(query) or 0)


def _ensure_disbursement_amount_available(
    db: Session,
    *,
    amount_cents: int,
    campaign_id: uuid.UUID,
    exclude_disbursement_request_id: uuid.UUID | None = None,
) -> None:
    received_amount = _campaign_received_amount(db, campaign_id)
    committed_amount = _campaign_committed_disbursement_amount(
        db,
        campaign_id,
        exclude_disbursement_request_id=exclude_disbursement_request_id,
    )
    if amount_cents > received_amount - committed_amount:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Disbursement amount exceeds available received funds",
        )


def _disbursement_reported_expense_amount(
    db: Session,
    disbursement_request_id: uuid.UUID,
    *,
    exclude_expense_report_id: uuid.UUID | None = None,
) -> int:
    query = select(func.coalesce(func.sum(ContributionExpenseReport.amount_cents), 0)).where(
        ContributionExpenseReport.disbursement_request_id == disbursement_request_id,
        ContributionExpenseReport.status.in_(EXPENSE_COMMITTED_STATUSES),
    )
    if exclude_expense_report_id:
        query = query.where(ContributionExpenseReport.id != exclude_expense_report_id)
    return int(db.scalar(query) or 0)


def _ensure_expense_amount_available(
    db: Session,
    *,
    amount_cents: int,
    disbursement_request: ContributionDisbursementRequest,
    exclude_expense_report_id: uuid.UUID | None = None,
) -> None:
    committed_amount = _disbursement_reported_expense_amount(
        db,
        disbursement_request.id,
        exclude_expense_report_id=exclude_expense_report_id,
    )
    if amount_cents > disbursement_request.amount_cents - committed_amount:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Expense report amount exceeds available disbursement funds",
        )


def _add_expense_ledger_entry(
    db: Session,
    *,
    amount_cents: int,
    created_by_user_id: uuid.UUID,
    entry_type: str,
    expense_report: ContributionExpenseReport,
    memo: str,
) -> None:
    db.add(
        ContributionLedgerEntry(
            amount_cents=amount_cents,
            created_by_user_id=created_by_user_id,
            currency=expense_report.currency,
            entry_type=entry_type,
            expense_report_id=expense_report.id,
            memo=memo[:500],
        )
    )


def _serialize_disbursement_request(
    disbursement_request: ContributionDisbursementRequest,
) -> ContributionDisbursementRequestResponse:
    return ContributionDisbursementRequestResponse(
        amount_cents=disbursement_request.amount_cents,
        campaign_id=disbursement_request.campaign_id,
        campaign_title=disbursement_request.campaign.title
        if disbursement_request.campaign
        else None,
        created_at=disbursement_request.created_at,
        currency=disbursement_request.currency,
        decision_note=disbursement_request.decision_note,
        id=disbursement_request.id,
        note=disbursement_request.note,
        paid_at=disbursement_request.paid_at,
        paid_by_display_name=disbursement_request.paid_by.display_name
        if disbursement_request.paid_by
        else None,
        paid_by_email=disbursement_request.paid_by.email
        if disbursement_request.paid_by
        else None,
        paid_by_user_id=disbursement_request.paid_by_user_id,
        payee_name=disbursement_request.payee_name,
        payee_reference=disbursement_request.payee_reference,
        purpose=disbursement_request.purpose,
        requested_by_display_name=disbursement_request.requested_by.display_name
        if disbursement_request.requested_by
        else None,
        requested_by_email=disbursement_request.requested_by.email
        if disbursement_request.requested_by
        else None,
        requested_by_user_id=disbursement_request.requested_by_user_id,
        reviewed_at=disbursement_request.reviewed_at,
        reviewed_by_display_name=disbursement_request.reviewed_by.display_name
        if disbursement_request.reviewed_by
        else None,
        reviewed_by_email=disbursement_request.reviewed_by.email
        if disbursement_request.reviewed_by
        else None,
        reviewed_by_user_id=disbursement_request.reviewed_by_user_id,
        status=disbursement_request.status,
        updated_at=disbursement_request.updated_at,
    )


def _serialize_expense_evidence(
    evidence: ContributionExpenseEvidence,
) -> ContributionExpenseEvidenceResponse:
    return ContributionExpenseEvidenceResponse(
        amount_cents=evidence.amount_cents,
        content_type=evidence.content_type,
        created_at=evidence.created_at,
        download_url=(
            f"/api/v1/contributions/admin/expense-reports/"
            f"{evidence.expense_report_id}/evidence/{evidence.id}/download"
            if evidence.storage_key
            else None
        ),
        evidence_type=evidence.evidence_type,
        expense_report_id=evidence.expense_report_id,
        file_name=evidence.file_name,
        file_size_bytes=evidence.file_size_bytes,
        id=evidence.id,
        issued_at=evidence.issued_at,
        note=evidence.note,
        receipt_number=evidence.receipt_number,
        reference_url=evidence.reference_url,
        storage_provider=evidence.storage_provider,
        title=evidence.title,
        updated_at=evidence.updated_at,
        uploaded_by_user_id=evidence.uploaded_by_user_id,
    )


def _serialize_expense_evidence_retention_candidate(
    evidence: ContributionExpenseEvidence,
) -> ContributionExpenseEvidenceRetentionCandidateResponse:
    return ContributionExpenseEvidenceRetentionCandidateResponse(
        created_at=evidence.created_at,
        expense_report_id=evidence.expense_report_id,
        file_name=evidence.file_name,
        file_size_bytes=evidence.file_size_bytes,
        id=evidence.id,
        storage_provider=evidence.storage_provider,
    )


def _expense_evidence_retention_cutoff() -> tuple[int, datetime]:
    retention_days = max(0, get_settings().contribution_expense_evidence_retention_days)
    return retention_days, utcnow() - timedelta(days=retention_days)


def _expense_evidence_retention_candidates(
    db: Session,
    cutoff_at: datetime,
    *,
    limit: int,
) -> tuple[int, list[ContributionExpenseEvidence]]:
    filters = (
        ContributionExpenseEvidence.storage_key.is_not(None),
        ContributionExpenseEvidence.created_at <= cutoff_at,
    )
    total = db.scalar(select(func.count()).where(*filters)) or 0
    candidates = db.scalars(
        select(ContributionExpenseEvidence)
        .where(*filters)
        .order_by(ContributionExpenseEvidence.created_at.asc())
        .limit(limit)
    ).all()
    return int(total), list(candidates)


def _expense_evidence_retention_response(
    *,
    candidates: list[ContributionExpenseEvidence],
    cutoff_at: datetime,
    deleted_count: int,
    dry_run: bool,
    retention_days: int,
    scanned_count: int,
) -> ContributionExpenseEvidenceRetentionResponse:
    return ContributionExpenseEvidenceRetentionResponse(
        candidates=[
            _serialize_expense_evidence_retention_candidate(candidate)
            for candidate in candidates
        ],
        cutoff_at=cutoff_at,
        deleted_count=deleted_count,
        dry_run=dry_run,
        retention_days=retention_days,
        scanned_count=scanned_count,
    )


def _serialize_expense_report(
    expense_report: ContributionExpenseReport,
) -> ContributionExpenseReportResponse:
    return ContributionExpenseReportResponse(
        amount_cents=expense_report.amount_cents,
        campaign_id=expense_report.campaign_id,
        campaign_title=expense_report.campaign.title if expense_report.campaign else None,
        created_at=expense_report.created_at,
        currency=expense_report.currency,
        decision_note=expense_report.decision_note,
        description=expense_report.description,
        disbursement_request_id=expense_report.disbursement_request_id,
        evidence_items=[
            _serialize_expense_evidence(evidence)
            for evidence in expense_report.evidence_items
        ],
        expense_at=expense_report.expense_at,
        expense_category=expense_report.expense_category,
        id=expense_report.id,
        note=expense_report.note,
        reviewed_at=expense_report.reviewed_at,
        reviewed_by_display_name=expense_report.reviewed_by.display_name
        if expense_report.reviewed_by
        else None,
        reviewed_by_email=expense_report.reviewed_by.email
        if expense_report.reviewed_by
        else None,
        reviewed_by_user_id=expense_report.reviewed_by_user_id,
        status=expense_report.status,
        submitted_by_display_name=expense_report.submitted_by.display_name
        if expense_report.submitted_by
        else None,
        submitted_by_email=expense_report.submitted_by.email
        if expense_report.submitted_by
        else None,
        submitted_by_user_id=expense_report.submitted_by_user_id,
        summary=expense_report.summary,
        updated_at=expense_report.updated_at,
        vendor_name=expense_report.vendor_name,
    )


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
    campaign_id: Annotated[uuid.UUID | None, Query()] = None,
    status_filter: Annotated[str | None, Query(alias="status", max_length=40)] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 12,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ContributionListResponse:
    _ = current_user
    query = _admin_contributions_query(campaign_id=campaign_id, status_filter=status_filter)
    return _list_contribution_response(db, query, limit=limit, offset=offset)


@router.get("/admin/contributions/export")
@router.get("/admin/contributions/export/")
def export_admin_contributions(
    request: Request,
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
    campaign_id: Annotated[uuid.UUID | None, Query()] = None,
    status_filter: Annotated[str | None, Query(alias="status", max_length=40)] = None,
    limit: Annotated[int, Query(ge=1, le=5000)] = 1000,
) -> Response:
    query = _admin_contributions_query(campaign_id=campaign_id, status_filter=status_filter)
    contributions = db.scalars(query.order_by(Contribution.created_at.desc()).limit(limit)).all()
    rows: list[list[object | None]] = [
        [
            "contribution_id",
            "campaign_id",
            "campaign_title",
            "receipt_number",
            "status",
            "amount_cents",
            "currency",
            "payment_method",
            "payment_reference",
            "contributor_name",
            "contributor_email",
            "anonymous_publicly",
            "paid_at",
            "created_at",
            "note",
        ]
    ]
    rows.extend(
        [
            [
                contribution.id,
                contribution.campaign_id,
                contribution.campaign.title if contribution.campaign else None,
                contribution.receipt.receipt_number if contribution.receipt else None,
                contribution.status,
                contribution.amount_cents,
                contribution.currency,
                contribution.payment_method,
                contribution.payment_reference,
                contribution.contributor.display_name if contribution.contributor else None,
                contribution.contributor.email if contribution.contributor else None,
                contribution.anonymous,
                contribution.paid_at.isoformat() if contribution.paid_at else None,
                contribution.created_at.isoformat(),
                contribution.note,
            ]
            for contribution in contributions
        ]
    )
    _create_security_event(
        db,
        request,
        current_user,
        "contributions.exported",
        {"campaign_id": str(campaign_id) if campaign_id else None, "count": len(contributions)},
    )
    db.commit()
    return _csv_response(f"yalumni-contributions-{utcnow().date().isoformat()}.csv", rows)


@router.post("/admin/{contribution_id}/refund", response_model=ContributionResponse)
@router.post("/admin/contributions/{contribution_id}/refund", response_model=ContributionResponse)
def refund_contribution(
    contribution_id: uuid.UUID,
    payload: ContributionCampaignStatusAction,
    request: Request,
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ContributionResponse:
    contribution = _get_contribution_or_404(db, contribution_id)
    if contribution.status != RECEIVED_STATUS:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only received contributions can be refunded",
        )
    return _apply_contribution_adjustment(
        action="Refund",
        contribution=contribution,
        current_user=current_user,
        db=db,
        event_type="contributions.refunded",
        ledger_amount_cents=-contribution.amount_cents,
        ledger_type=LEDGER_REFUND,
        next_status=REFUNDED_STATUS,
        note=payload.note,
        receipt_status=REFUNDED_STATUS,
        request=request,
    )


@router.post("/admin/{contribution_id}/provider-refund", response_model=ContributionResponse)
@router.post(
    "/admin/contributions/{contribution_id}/provider-refund",
    response_model=ContributionResponse,
)
def provider_refund_contribution(
    contribution_id: uuid.UUID,
    payload: ContributionCampaignStatusAction,
    request: Request,
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ContributionResponse:
    contribution = _get_contribution_or_404(db, contribution_id)
    if contribution.status != RECEIVED_STATUS:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only received contributions can be refunded",
        )
    if not contribution.payment_reference:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Provider refund requires a payment reference",
        )
    refund_provider = _normalize_enum(get_settings().contribution_refund_provider) or "LOCAL_TEST"
    _create_provider_refund_request(contribution=contribution, provider=refund_provider)
    return _apply_contribution_adjustment(
        action="Provider refund",
        contribution=contribution,
        current_user=current_user,
        db=db,
        event_type="contributions.provider_refund_requested",
        ledger_amount_cents=-contribution.amount_cents,
        ledger_type=LEDGER_REFUND,
        next_status=REFUNDED_STATUS,
        note=payload.note,
        receipt_status=REFUNDED_STATUS,
        request=request,
    )


@router.post("/admin/{contribution_id}/void", response_model=ContributionResponse)
@router.post("/admin/contributions/{contribution_id}/void", response_model=ContributionResponse)
def void_contribution(
    contribution_id: uuid.UUID,
    payload: ContributionCampaignStatusAction,
    request: Request,
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ContributionResponse:
    contribution = _get_contribution_or_404(db, contribution_id)
    if contribution.status != PENDING_STATUS:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only pending contributions can be voided",
        )
    return _apply_contribution_adjustment(
        action="Void",
        contribution=contribution,
        current_user=current_user,
        db=db,
        event_type="contributions.voided",
        ledger_amount_cents=0,
        ledger_type=LEDGER_VOID,
        next_status=VOIDED_STATUS,
        note=payload.note,
        receipt_status=VOIDED_STATUS,
        request=request,
    )


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
        _ledger_entries_query()
        .order_by(ContributionLedgerEntry.created_at.desc())
        .limit(8)
    ).all()
    currency_summaries = _treasury_currency_summaries(db)
    expense_category_summaries = _treasury_expense_category_summaries(db)
    return TreasurySummaryResponse(
        campaign_count=campaign_count,
        campaigns=[_serialize_campaign(db, campaign, current_user) for campaign in campaigns],
        currency_summaries=currency_summaries,
        expense_category_summaries=expense_category_summaries,
        ledger_entries=[_serialize_ledger_entry(entry) for entry in ledger_entries],
        pending_amount_cents=int(pending),
        published_campaign_count=published_campaign_count,
        receipt_count=receipt_count,
        received_amount_cents=int(received),
        recent_contributions=[_serialize_contribution(item) for item in recent_contributions],
    )


@router.get("/admin/treasury/export")
@router.get("/admin/treasury/export/")
def export_treasury_ledger(
    request: Request,
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
    limit: Annotated[int, Query(ge=1, le=5000)] = 1000,
) -> Response:
    entries = db.scalars(
        _ledger_entries_query()
        .order_by(ContributionLedgerEntry.created_at.desc())
        .limit(limit)
    ).all()
    rows: list[list[object | None]] = [
        [
            "ledger_entry_id",
            "created_at",
            "entry_type",
            "amount_cents",
            "currency",
            "memo",
            "contribution_id",
            "expense_report_id",
            "expense_category",
            "campaign_id",
            "campaign_title",
            "receipt_number",
            "contributor_email",
            "expense_summary",
            "expense_vendor_name",
        ]
    ]
    rows.extend(
        [
            [
                entry.id,
                entry.created_at.isoformat(),
                entry.entry_type,
                entry.amount_cents,
                entry.currency,
                entry.memo,
                entry.contribution_id,
                entry.expense_report_id,
                entry.expense_report.expense_category if entry.expense_report else None,
                _ledger_entry_campaign_id(entry),
                _ledger_entry_campaign(entry).title if _ledger_entry_campaign(entry) else None,
                _ledger_entry_receipt_number(entry),
                entry.contribution.contributor.email
                if entry.contribution and entry.contribution.contributor
                else None,
                entry.expense_report.summary if entry.expense_report else None,
                entry.expense_report.vendor_name if entry.expense_report else None,
            ]
            for entry in entries
        ]
    )
    _create_security_event(
        db,
        request,
        current_user,
        "contributions.treasury_exported",
        {"count": len(entries)},
    )
    db.commit()
    return _csv_response(f"yalumni-treasury-ledger-{utcnow().date().isoformat()}.csv", rows)


@router.get("/admin/treasury/currency-summary/export")
@router.get("/admin/treasury/currency-summary/export/")
def export_treasury_currency_summary(
    request: Request,
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> Response:
    currency_summaries = _treasury_currency_summaries(db)
    rows: list[list[object | None]] = [
        [
            "currency",
            "contribution_count",
            "receipt_count",
            "ledger_entry_count",
            "received_amount_cents",
            "pending_amount_cents",
            "ledger_net_amount_cents",
        ]
    ]
    rows.extend(
        [
            [
                summary.currency,
                summary.contribution_count,
                summary.receipt_count,
                summary.ledger_entry_count,
                summary.received_amount_cents,
                summary.pending_amount_cents,
                summary.ledger_net_amount_cents,
            ]
            for summary in currency_summaries
        ]
    )
    _create_security_event(
        db,
        request,
        current_user,
        "contributions.treasury_currency_summary_exported",
        {"currency_count": len(currency_summaries)},
    )
    db.commit()
    return _csv_response(
        f"yalumni-treasury-currency-summary-{utcnow().date().isoformat()}.csv",
        rows,
    )


@router.get("/admin/treasury/expense-category-summary/export")
@router.get("/admin/treasury/expense-category-summary/export/")
def export_treasury_expense_category_summary(
    request: Request,
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> Response:
    category_summaries = _treasury_expense_category_summaries(db)
    rows: list[list[object | None]] = [
        [
            "expense_category",
            "currency",
            "report_count",
            "approved_report_count",
            "rejected_report_count",
            "submitted_report_count",
            "approved_amount_cents",
            "rejected_amount_cents",
            "submitted_amount_cents",
            "total_amount_cents",
        ]
    ]
    rows.extend(
        [
            [
                summary.expense_category,
                summary.currency,
                summary.report_count,
                summary.approved_report_count,
                summary.rejected_report_count,
                summary.submitted_report_count,
                summary.approved_amount_cents,
                summary.rejected_amount_cents,
                summary.submitted_amount_cents,
                summary.total_amount_cents,
            ]
            for summary in category_summaries
        ]
    )
    _create_security_event(
        db,
        request,
        current_user,
        "contributions.treasury_expense_category_summary_exported",
        {"category_count": len(category_summaries)},
    )
    db.commit()
    return _csv_response(
        f"yalumni-treasury-expense-category-summary-{utcnow().date().isoformat()}.csv",
        rows,
    )


@router.post(
    "/admin/treasury/certifications",
    response_model=TreasuryCertificationResponse,
    status_code=status.HTTP_201_CREATED,
)
@router.post(
    "/admin/treasury/certifications/",
    response_model=TreasuryCertificationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_treasury_certification(
    payload: TreasuryCertificationCreate,
    request: Request,
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> TreasuryCertificationResponse:
    if payload.campaign_id:
        _get_campaign_or_404(db, payload.campaign_id)
    normalized_status = _normalize_enum(payload.status)
    generated_at = utcnow()
    contributions, ledger_entries = _treasury_audit_inputs(
        db,
        campaign_id=payload.campaign_id,
        limit=payload.limit,
        status_filter=payload.status,
    )
    package = _build_treasury_audit_package(
        campaign_id=payload.campaign_id,
        contributions=contributions,
        generated_at=generated_at,
        generated_by=current_user,
        ledger_entries=ledger_entries,
        limit=payload.limit,
        status_filter=payload.status,
    )
    summary = package["package"]["summary"]
    certification = ContributionTreasuryCertification(
        campaign_id=payload.campaign_id,
        canonical_sha256=package["integrity"]["canonical_sha256"],
        certified_at=generated_at,
        certified_by_user_id=current_user.id,
        contribution_count=summary["contribution_count"],
        currencies_json=summary["currencies"],
        ledger_entry_count=summary["ledger_entry_count"],
        limit=payload.limit,
        note=payload.note,
        package_json=package,
        pending_amount_cents=summary["pending_amount_cents"],
        receipt_count=summary["receipt_count"],
        received_amount_cents=summary["received_amount_cents"],
        signature=package["integrity"]["signature"],
        signature_algorithm=package["integrity"]["signature_algorithm"],
        status_filter=normalized_status,
    )
    db.add(certification)
    db.flush()
    _create_security_event(
        db,
        request,
        current_user,
        "contributions.treasury_certification_created",
        {
            "campaign_id": str(payload.campaign_id) if payload.campaign_id else None,
            "canonical_sha256": certification.canonical_sha256,
            "certification_id": str(certification.id),
            "contribution_count": certification.contribution_count,
            "ledger_entry_count": certification.ledger_entry_count,
        },
    )
    db.commit()
    db.refresh(certification)
    return _serialize_treasury_certification(certification)


@router.get(
    "/admin/treasury/certifications",
    response_model=TreasuryCertificationListResponse,
)
@router.get(
    "/admin/treasury/certifications/",
    response_model=TreasuryCertificationListResponse,
)
def list_treasury_certifications(
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
    campaign_id: Annotated[uuid.UUID | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> TreasuryCertificationListResponse:
    _ = current_user
    query = select(ContributionTreasuryCertification).options(
        joinedload(ContributionTreasuryCertification.campaign),
        joinedload(ContributionTreasuryCertification.certified_by),
    )
    if campaign_id:
        query = query.where(ContributionTreasuryCertification.campaign_id == campaign_id)
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    certifications = db.scalars(
        query.order_by(ContributionTreasuryCertification.certified_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return TreasuryCertificationListResponse(
        certifications=[
            _serialize_treasury_certification(certification)
            for certification in certifications
        ],
        has_more=offset + len(certifications) < total,
        limit=limit,
        offset=offset,
        total=total,
    )


@router.get(
    "/admin/treasury/certifications/{certification_id}",
    response_model=TreasuryCertificationResponse,
)
def get_treasury_certification(
    certification_id: uuid.UUID,
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> TreasuryCertificationResponse:
    _ = current_user
    certification = db.scalar(
        select(ContributionTreasuryCertification)
        .options(
            joinedload(ContributionTreasuryCertification.campaign),
            joinedload(ContributionTreasuryCertification.certified_by),
        )
        .where(ContributionTreasuryCertification.id == certification_id)
    )
    if certification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Treasury certification not found",
        )
    return _serialize_treasury_certification(certification)


@router.post(
    "/admin/campaigns/{campaign_id}/disbursement-requests",
    response_model=ContributionDisbursementRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
@router.post(
    "/admin/campaigns/{campaign_id}/disbursement-requests/",
    response_model=ContributionDisbursementRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_disbursement_request(
    campaign_id: uuid.UUID,
    payload: ContributionDisbursementRequestCreate,
    request: Request,
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ContributionDisbursementRequestResponse:
    campaign = _get_campaign_or_404(db, campaign_id)
    if payload.currency != campaign.currency:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Currency must match campaign",
        )
    _ensure_disbursement_amount_available(
        db,
        amount_cents=payload.amount_cents,
        campaign_id=campaign.id,
    )
    disbursement_request = ContributionDisbursementRequest(
        amount_cents=payload.amount_cents,
        campaign_id=campaign.id,
        currency=payload.currency,
        note=payload.note,
        payee_name=payload.payee_name,
        payee_reference=payload.payee_reference,
        purpose=payload.purpose,
        requested_by_user_id=current_user.id,
        status=DISBURSEMENT_REQUESTED,
    )
    db.add(disbursement_request)
    db.flush()
    _create_security_event(
        db,
        request,
        current_user,
        "contributions.disbursement_requested",
        {
            "amount_cents": payload.amount_cents,
            "campaign_id": str(campaign.id),
            "disbursement_request_id": str(disbursement_request.id),
        },
    )
    db.commit()
    db.refresh(disbursement_request)
    return _serialize_disbursement_request(disbursement_request)


@router.get(
    "/admin/disbursement-requests",
    response_model=ContributionDisbursementRequestListResponse,
)
@router.get(
    "/admin/disbursement-requests/",
    response_model=ContributionDisbursementRequestListResponse,
)
def list_disbursement_requests(
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
    campaign_id: Annotated[uuid.UUID | None, Query()] = None,
    status_filter: Annotated[str | None, Query(alias="status", max_length=40)] = "ALL",
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ContributionDisbursementRequestListResponse:
    _ = current_user
    normalized_status = _normalize_enum(status_filter)
    query = select(ContributionDisbursementRequest).options(
        joinedload(ContributionDisbursementRequest.campaign),
        joinedload(ContributionDisbursementRequest.requested_by),
        joinedload(ContributionDisbursementRequest.reviewed_by),
        joinedload(ContributionDisbursementRequest.paid_by),
    )
    if campaign_id:
        query = query.where(ContributionDisbursementRequest.campaign_id == campaign_id)
    if normalized_status and normalized_status != "ALL":
        if normalized_status not in DISBURSEMENT_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid disbursement request status",
            )
        query = query.where(ContributionDisbursementRequest.status == normalized_status)
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    disbursement_requests = db.scalars(
        query.order_by(ContributionDisbursementRequest.created_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return ContributionDisbursementRequestListResponse(
        disbursement_requests=[
            _serialize_disbursement_request(disbursement_request)
            for disbursement_request in disbursement_requests
        ],
        has_more=offset + len(disbursement_requests) < total,
        limit=limit,
        offset=offset,
        total=total,
    )


@router.get(
    "/admin/disbursement-requests/{disbursement_request_id}",
    response_model=ContributionDisbursementRequestResponse,
)
def get_disbursement_request(
    disbursement_request_id: uuid.UUID,
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ContributionDisbursementRequestResponse:
    _ = current_user
    disbursement_request = _get_disbursement_or_404(db, disbursement_request_id)
    return _serialize_disbursement_request(disbursement_request)


@router.post(
    "/admin/disbursement-requests/{disbursement_request_id}/approve",
    response_model=ContributionDisbursementRequestResponse,
)
def approve_disbursement_request(
    disbursement_request_id: uuid.UUID,
    payload: ContributionDisbursementStatusAction,
    request: Request,
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ContributionDisbursementRequestResponse:
    disbursement_request = _get_disbursement_or_404(db, disbursement_request_id)
    if disbursement_request.status != DISBURSEMENT_REQUESTED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only requested disbursements can be approved",
        )
    _ensure_disbursement_amount_available(
        db,
        amount_cents=disbursement_request.amount_cents,
        campaign_id=disbursement_request.campaign_id,
        exclude_disbursement_request_id=disbursement_request.id,
    )
    disbursement_request.decision_note = payload.note
    disbursement_request.reviewed_at = utcnow()
    disbursement_request.reviewed_by_user_id = current_user.id
    disbursement_request.status = DISBURSEMENT_APPROVED
    _create_security_event(
        db,
        request,
        current_user,
        "contributions.disbursement_approved",
        {"disbursement_request_id": str(disbursement_request.id)},
    )
    db.commit()
    db.refresh(disbursement_request)
    return _serialize_disbursement_request(disbursement_request)


@router.post(
    "/admin/disbursement-requests/{disbursement_request_id}/reject",
    response_model=ContributionDisbursementRequestResponse,
)
def reject_disbursement_request(
    disbursement_request_id: uuid.UUID,
    payload: ContributionDisbursementStatusAction,
    request: Request,
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ContributionDisbursementRequestResponse:
    disbursement_request = _get_disbursement_or_404(db, disbursement_request_id)
    if disbursement_request.status not in {DISBURSEMENT_APPROVED, DISBURSEMENT_REQUESTED}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only requested or approved disbursements can be rejected",
        )
    disbursement_request.decision_note = payload.note
    disbursement_request.reviewed_at = utcnow()
    disbursement_request.reviewed_by_user_id = current_user.id
    disbursement_request.status = DISBURSEMENT_REJECTED
    _create_security_event(
        db,
        request,
        current_user,
        "contributions.disbursement_rejected",
        {"disbursement_request_id": str(disbursement_request.id)},
    )
    db.commit()
    db.refresh(disbursement_request)
    return _serialize_disbursement_request(disbursement_request)


@router.post(
    "/admin/disbursement-requests/{disbursement_request_id}/mark-paid",
    response_model=ContributionDisbursementRequestResponse,
)
def mark_disbursement_request_paid(
    disbursement_request_id: uuid.UUID,
    payload: ContributionDisbursementStatusAction,
    request: Request,
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ContributionDisbursementRequestResponse:
    disbursement_request = _get_disbursement_or_404(db, disbursement_request_id)
    if disbursement_request.status != DISBURSEMENT_APPROVED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only approved disbursements can be marked paid",
        )
    if payload.note:
        disbursement_request.decision_note = payload.note
    disbursement_request.paid_at = utcnow()
    disbursement_request.paid_by_user_id = current_user.id
    disbursement_request.status = DISBURSEMENT_PAID
    _create_security_event(
        db,
        request,
        current_user,
        "contributions.disbursement_paid",
        {"disbursement_request_id": str(disbursement_request.id)},
    )
    db.commit()
    db.refresh(disbursement_request)
    return _serialize_disbursement_request(disbursement_request)


@router.post(
    "/admin/disbursement-requests/{disbursement_request_id}/expense-reports",
    response_model=ContributionExpenseReportResponse,
    status_code=status.HTTP_201_CREATED,
)
@router.post(
    "/admin/disbursement-requests/{disbursement_request_id}/expense-reports/",
    response_model=ContributionExpenseReportResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_expense_report(
    disbursement_request_id: uuid.UUID,
    payload: ContributionExpenseReportCreate,
    request: Request,
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ContributionExpenseReportResponse:
    disbursement_request = _get_disbursement_or_404(db, disbursement_request_id)
    if disbursement_request.status != DISBURSEMENT_PAID:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only paid disbursements can receive expense reports",
        )
    if payload.currency != disbursement_request.currency:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Currency must match disbursement request",
        )
    _ensure_expense_amount_available(
        db,
        amount_cents=payload.amount_cents,
        disbursement_request=disbursement_request,
    )
    expense_report = ContributionExpenseReport(
        amount_cents=payload.amount_cents,
        campaign_id=disbursement_request.campaign_id,
        currency=payload.currency,
        description=payload.description,
        disbursement_request_id=disbursement_request.id,
        expense_at=payload.expense_at,
        expense_category=payload.expense_category,
        note=payload.note,
        status=EXPENSE_SUBMITTED,
        submitted_by_user_id=current_user.id,
        summary=payload.summary,
        vendor_name=payload.vendor_name,
    )
    expense_report.evidence_items = [
        ContributionExpenseEvidence(
            amount_cents=evidence.amount_cents,
            evidence_type=evidence.evidence_type,
            issued_at=evidence.issued_at,
            note=evidence.note,
            receipt_number=evidence.receipt_number,
            reference_url=evidence.reference_url,
            title=evidence.title,
        )
        for evidence in payload.evidence_items
    ]
    db.add(expense_report)
    db.flush()
    _create_security_event(
        db,
        request,
        current_user,
        "contributions.expense_report_submitted",
        {
            "amount_cents": expense_report.amount_cents,
            "disbursement_request_id": str(disbursement_request.id),
            "expense_category": expense_report.expense_category,
            "expense_report_id": str(expense_report.id),
        },
    )
    db.commit()
    expense_report = _get_expense_report_or_404(db, expense_report.id)
    return _serialize_expense_report(expense_report)


@router.get(
    "/admin/expense-reports",
    response_model=ContributionExpenseReportListResponse,
)
@router.get(
    "/admin/expense-reports/",
    response_model=ContributionExpenseReportListResponse,
)
def list_expense_reports(
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
    campaign_id: Annotated[uuid.UUID | None, Query()] = None,
    disbursement_request_id: Annotated[uuid.UUID | None, Query()] = None,
    expense_category: Annotated[str | None, Query(max_length=80)] = None,
    expense_from: Annotated[datetime | None, Query()] = None,
    expense_to: Annotated[datetime | None, Query()] = None,
    q: Annotated[str | None, Query(max_length=120)] = None,
    status_filter: Annotated[str | None, Query(alias="status", max_length=40)] = "ALL",
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ContributionExpenseReportListResponse:
    _ = current_user
    normalized_category = _normalize_enum(expense_category)
    normalized_status = _normalize_enum(status_filter)
    search_query = q.strip() if q else None
    if expense_from and expense_to and expense_to < expense_from:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="expense_to must be after expense_from",
        )
    query = select(ContributionExpenseReport).options(
        joinedload(ContributionExpenseReport.campaign),
        joinedload(ContributionExpenseReport.disbursement_request),
        joinedload(ContributionExpenseReport.submitted_by),
        joinedload(ContributionExpenseReport.reviewed_by),
    )
    if campaign_id:
        query = query.where(ContributionExpenseReport.campaign_id == campaign_id)
    if disbursement_request_id:
        query = query.where(
            ContributionExpenseReport.disbursement_request_id == disbursement_request_id
        )
    if normalized_category and normalized_category != "ALL":
        query = query.where(ContributionExpenseReport.expense_category == normalized_category)
    if expense_from:
        query = query.where(ContributionExpenseReport.expense_at >= expense_from)
    if expense_to:
        query = query.where(ContributionExpenseReport.expense_at <= expense_to)
    if search_query:
        search_term = f"%{search_query}%"
        query = query.where(
            or_(
                ContributionExpenseReport.description.ilike(search_term),
                ContributionExpenseReport.summary.ilike(search_term),
                ContributionExpenseReport.vendor_name.ilike(search_term),
            )
        )
    if normalized_status and normalized_status != "ALL":
        if normalized_status not in EXPENSE_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid expense report status",
            )
        query = query.where(ContributionExpenseReport.status == normalized_status)
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    expense_reports = db.scalars(
        query.order_by(ContributionExpenseReport.created_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return ContributionExpenseReportListResponse(
        expense_reports=[
            _serialize_expense_report(expense_report)
            for expense_report in expense_reports
        ],
        has_more=offset + len(expense_reports) < total,
        limit=limit,
        offset=offset,
        total=total,
    )


@router.get(
    "/admin/expense-reports/{expense_report_id}",
    response_model=ContributionExpenseReportResponse,
)
def get_expense_report(
    expense_report_id: uuid.UUID,
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ContributionExpenseReportResponse:
    _ = current_user
    expense_report = _get_expense_report_or_404(db, expense_report_id)
    return _serialize_expense_report(expense_report)


@router.get(
    "/admin/expense-evidence-policy",
    response_model=ContributionExpenseEvidencePolicyResponse,
)
def get_expense_evidence_policy(
    current_user: Annotated[User, Depends(finance_admin_dependency)],
) -> ContributionExpenseEvidencePolicyResponse:
    _ = current_user
    settings = get_settings()
    return ContributionExpenseEvidencePolicyResponse(
        allowed_content_types=_split_config_csv(
            settings.contribution_expense_evidence_allowed_types
        ),
        blocked_signature_count=len(
            _split_config_csv(settings.contribution_expense_evidence_blocked_signatures)
        ),
        max_file_size_bytes=settings.contribution_expense_evidence_upload_max_bytes,
        retention_days=settings.contribution_expense_evidence_retention_days,
        storage_provider=settings.upload_storage_provider,
    )


@router.get(
    "/admin/expense-evidence-retention",
    response_model=ContributionExpenseEvidenceRetentionResponse,
)
def preview_expense_evidence_retention(
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
) -> ContributionExpenseEvidenceRetentionResponse:
    _ = current_user
    retention_days, cutoff_at = _expense_evidence_retention_cutoff()
    scanned_count, candidates = _expense_evidence_retention_candidates(
        db,
        cutoff_at,
        limit=limit,
    )
    return _expense_evidence_retention_response(
        candidates=candidates,
        cutoff_at=cutoff_at,
        deleted_count=0,
        dry_run=True,
        retention_days=retention_days,
        scanned_count=scanned_count,
    )


@router.post(
    "/admin/expense-evidence-retention/run",
    response_model=ContributionExpenseEvidenceRetentionResponse,
)
def run_expense_evidence_retention(
    request: Request,
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
    dry_run: Annotated[bool, Query()] = True,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
) -> ContributionExpenseEvidenceRetentionResponse:
    retention_days, cutoff_at = _expense_evidence_retention_cutoff()
    scanned_count, candidates = _expense_evidence_retention_candidates(
        db,
        cutoff_at,
        limit=limit,
    )
    deleted_count = 0
    if not dry_run:
        for evidence in candidates:
            delete_upload(
                category=UploadCategory.CONTRIBUTION_EXPENSE_EVIDENCE,
                storage_key=evidence.storage_key,
                storage_provider=evidence.storage_provider,
            )
            evidence.storage_key = None
            evidence.storage_provider = None
            deleted_count += 1
    _create_security_event(
        db,
        request,
        current_user,
        "contributions.expense_evidence_retention_run",
        {
            "candidate_count": len(candidates),
            "cutoff_at": cutoff_at.isoformat(),
            "deleted_count": deleted_count,
            "dry_run": dry_run,
            "retention_days": retention_days,
            "scanned_count": scanned_count,
        },
    )
    db.commit()
    return _expense_evidence_retention_response(
        candidates=candidates,
        cutoff_at=cutoff_at,
        deleted_count=deleted_count,
        dry_run=dry_run,
        retention_days=retention_days,
        scanned_count=scanned_count,
    )


@router.get(
    "/admin/expense-category-policy",
    response_model=ContributionExpenseCategoryPolicyResponse,
)
def get_expense_category_policy(
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ContributionExpenseCategoryPolicyResponse:
    _ = current_user
    return _expense_category_policy(db)


@router.post(
    "/admin/expense-reports/{expense_report_id}/evidence-files",
    response_model=ContributionExpenseEvidenceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_expense_report_evidence_file(
    expense_report_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
    evidence_file: Annotated[UploadFile, File(alias="file")],
    evidence_type: Annotated[str, Form(max_length=40)] = "RECEIPT",
    title: Annotated[str | None, Form(max_length=160)] = None,
    receipt_number: Annotated[str | None, Form(max_length=120)] = None,
    amount_cents: Annotated[int | None, Form(ge=1, le=100_000_000_000)] = None,
    issued_at: Annotated[datetime | None, Form()] = None,
    reference_url: Annotated[str | None, Form(max_length=500)] = None,
    note: Annotated[str | None, Form(max_length=2000)] = None,
) -> ContributionExpenseEvidenceResponse:
    expense_report = _get_expense_report_or_404(db, expense_report_id)
    if expense_report.status != EXPENSE_SUBMITTED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Evidence files can only be added to submitted expense reports",
        )

    evidence_id = uuid.uuid4()
    stored_file = await store_contribution_expense_evidence_file(
        evidence_id=evidence_id,
        expense_report_id=expense_report.id,
        upload=evidence_file,
    )
    try:
        metadata = ContributionExpenseEvidenceCreate(
            amount_cents=amount_cents,
            evidence_type=evidence_type,
            issued_at=issued_at,
            note=note,
            receipt_number=receipt_number,
            reference_url=reference_url,
            title=(title.strip() if title else stored_file.file_name[:160]),
        )
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid expense evidence metadata",
        ) from exc

    evidence = ContributionExpenseEvidence(
        id=evidence_id,
        amount_cents=metadata.amount_cents,
        content_type=stored_file.content_type,
        evidence_type=metadata.evidence_type,
        expense_report_id=expense_report.id,
        file_name=stored_file.file_name,
        file_size_bytes=stored_file.file_size_bytes,
        issued_at=metadata.issued_at,
        note=metadata.note,
        receipt_number=metadata.receipt_number,
        reference_url=metadata.reference_url,
        storage_key=stored_file.storage_key,
        storage_provider=stored_file.storage_provider,
        title=metadata.title,
        uploaded_by_user_id=current_user.id,
    )
    db.add(evidence)
    settings = get_settings()
    _create_security_event(
        db,
        request,
        current_user,
        "contributions.expense_evidence_file_uploaded",
        {
            "content_type": evidence.content_type,
            "evidence_id": str(evidence.id),
            "expense_report_id": str(expense_report.id),
            "file_size_bytes": evidence.file_size_bytes,
            "retention_days": settings.contribution_expense_evidence_retention_days,
        },
    )
    db.commit()
    db.refresh(evidence)
    return _serialize_expense_evidence(evidence)


@router.get(
    "/admin/expense-reports/{expense_report_id}/evidence/{evidence_id}/download",
)
def download_expense_report_evidence_file(
    expense_report_id: uuid.UUID,
    evidence_id: uuid.UUID,
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> Response:
    _ = current_user
    expense_report = _get_expense_report_or_404(db, expense_report_id)
    evidence = db.scalar(
        select(ContributionExpenseEvidence).where(
            ContributionExpenseEvidence.id == evidence_id,
            ContributionExpenseEvidence.expense_report_id == expense_report.id,
        )
    )
    if evidence is None or not evidence.storage_key or not evidence.content_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense evidence file not found",
        )

    return upload_response(
        category=UploadCategory.CONTRIBUTION_EXPENSE_EVIDENCE,
        content_type=evidence.content_type,
        file_name=evidence.file_name,
        storage_key=evidence.storage_key,
        storage_provider=evidence.storage_provider,
    )


@router.post(
    "/admin/expense-reports/{expense_report_id}/approve",
    response_model=ContributionExpenseReportResponse,
)
def approve_expense_report(
    expense_report_id: uuid.UUID,
    payload: ContributionDisbursementStatusAction,
    request: Request,
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ContributionExpenseReportResponse:
    expense_report = _get_expense_report_or_404(db, expense_report_id)
    if expense_report.status != EXPENSE_SUBMITTED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only submitted expense reports can be approved",
        )
    _ensure_expense_amount_available(
        db,
        amount_cents=expense_report.amount_cents,
        disbursement_request=expense_report.disbursement_request,
        exclude_expense_report_id=expense_report.id,
    )
    expense_report.decision_note = payload.note
    expense_report.reviewed_at = utcnow()
    expense_report.reviewed_by_user_id = current_user.id
    expense_report.status = EXPENSE_APPROVED
    _add_expense_ledger_entry(
        db,
        amount_cents=-expense_report.amount_cents,
        created_by_user_id=current_user.id,
        entry_type=LEDGER_EXPENSE,
        expense_report=expense_report,
        memo=f"Approved expense report: {expense_report.summary}",
    )
    _create_security_event(
        db,
        request,
        current_user,
        "contributions.expense_report_approved",
        {"expense_report_id": str(expense_report.id)},
    )
    db.commit()
    expense_report = _get_expense_report_or_404(db, expense_report.id)
    return _serialize_expense_report(expense_report)


@router.post(
    "/admin/expense-reports/{expense_report_id}/reject",
    response_model=ContributionExpenseReportResponse,
)
def reject_expense_report(
    expense_report_id: uuid.UUID,
    payload: ContributionDisbursementStatusAction,
    request: Request,
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ContributionExpenseReportResponse:
    expense_report = _get_expense_report_or_404(db, expense_report_id)
    was_approved = expense_report.status == EXPENSE_APPROVED
    if expense_report.status not in {EXPENSE_APPROVED, EXPENSE_SUBMITTED}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only submitted or approved expense reports can be rejected",
        )
    expense_report.decision_note = payload.note
    expense_report.reviewed_at = utcnow()
    expense_report.reviewed_by_user_id = current_user.id
    expense_report.status = EXPENSE_REJECTED
    if was_approved:
        _add_expense_ledger_entry(
            db,
            amount_cents=expense_report.amount_cents,
            created_by_user_id=current_user.id,
            entry_type=LEDGER_EXPENSE_REVERSAL,
            expense_report=expense_report,
            memo=f"Rejected approved expense report: {expense_report.summary}",
        )
    _create_security_event(
        db,
        request,
        current_user,
        "contributions.expense_report_rejected",
        {"expense_report_id": str(expense_report.id)},
    )
    db.commit()
    expense_report = _get_expense_report_or_404(db, expense_report.id)
    return _serialize_expense_report(expense_report)


@router.get("/admin/treasury/audit-package")
@router.get("/admin/treasury/audit-package/")
def export_treasury_audit_package(
    request: Request,
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
    campaign_id: Annotated[uuid.UUID | None, Query()] = None,
    status_filter: Annotated[str | None, Query(alias="status", max_length=40)] = None,
    limit: Annotated[int, Query(ge=1, le=5000)] = 1000,
) -> Response:
    contribution_query = _admin_contributions_query(
        campaign_id=campaign_id,
        status_filter=status_filter,
    )
    contributions = db.scalars(
        contribution_query.order_by(Contribution.created_at.desc()).limit(limit)
    ).all()
    ledger_entries = db.scalars(
        _ledger_entries_query(campaign_id=campaign_id, status_filter=status_filter)
        .order_by(ContributionLedgerEntry.created_at.desc())
        .limit(limit)
    ).all()
    generated_at = utcnow()
    package = _build_treasury_audit_package(
        campaign_id=campaign_id,
        contributions=contributions,
        generated_at=generated_at,
        generated_by=current_user,
        ledger_entries=ledger_entries,
        limit=limit,
        status_filter=status_filter,
    )
    _create_security_event(
        db,
        request,
        current_user,
        "contributions.treasury_audit_package_exported",
        {
            "campaign_id": str(campaign_id) if campaign_id else None,
            "canonical_sha256": package["integrity"]["canonical_sha256"],
            "contribution_count": len(contributions),
            "ledger_entry_count": len(ledger_entries),
        },
    )
    db.commit()
    return _json_download_response(
        f"yalumni-treasury-audit-{generated_at.date().isoformat()}.json",
        package,
    )


@router.get("/admin/treasury/audit-report")
@router.get("/admin/treasury/audit-report/")
def export_treasury_audit_report(
    request: Request,
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
    campaign_id: Annotated[uuid.UUID | None, Query()] = None,
    status_filter: Annotated[str | None, Query(alias="status", max_length=40)] = None,
    limit: Annotated[int, Query(ge=1, le=5000)] = 1000,
) -> Response:
    contribution_query = _admin_contributions_query(
        campaign_id=campaign_id,
        status_filter=status_filter,
    )
    contributions = db.scalars(
        contribution_query.order_by(Contribution.created_at.desc()).limit(limit)
    ).all()
    ledger_entries = db.scalars(
        _ledger_entries_query(campaign_id=campaign_id, status_filter=status_filter)
        .order_by(ContributionLedgerEntry.created_at.desc())
        .limit(limit)
    ).all()
    generated_at = utcnow()
    package = _build_treasury_audit_package(
        campaign_id=campaign_id,
        contributions=contributions,
        generated_at=generated_at,
        generated_by=current_user,
        ledger_entries=ledger_entries,
        limit=limit,
        status_filter=status_filter,
    )
    _create_security_event(
        db,
        request,
        current_user,
        "contributions.treasury_audit_report_exported",
        {
            "campaign_id": str(campaign_id) if campaign_id else None,
            "canonical_sha256": package["integrity"]["canonical_sha256"],
            "contribution_count": len(contributions),
            "ledger_entry_count": len(ledger_entries),
        },
    )
    db.commit()
    return _treasury_audit_report_pdf_response(package, generated_at)


@router.post("/admin/campaigns/{campaign_id}/publish", response_model=ContributionCampaignResponse)
def publish_campaign(
    campaign_id: uuid.UUID,
    payload: ContributionCampaignStatusAction,
    request: Request,
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ContributionCampaignResponse:
    campaign = _get_campaign_or_404(db, campaign_id)
    if campaign.status not in {"APPROVED", "CLOSED", "DRAFT"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only draft, approved, or closed campaigns can be published",
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


@router.post(
    "/admin/campaigns/{campaign_id}/request-approval",
    response_model=ContributionCampaignResponse,
)
def request_campaign_approval(
    campaign_id: uuid.UUID,
    payload: ContributionCampaignStatusAction,
    request: Request,
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ContributionCampaignResponse:
    campaign = _get_campaign_or_404(db, campaign_id)
    if campaign.status != "DRAFT":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only draft campaigns can be submitted for approval",
        )
    campaign.status = "PENDING_APPROVAL"
    _create_security_event(
        db,
        request,
        current_user,
        "contributions.campaign_approval_requested",
        {"campaign_id": str(campaign.id), "note": payload.note},
    )
    db.commit()
    campaign = _get_campaign_or_404(db, campaign.id)
    return _serialize_campaign(db, campaign, current_user)


@router.post("/admin/campaigns/{campaign_id}/approve", response_model=ContributionCampaignResponse)
def approve_campaign(
    campaign_id: uuid.UUID,
    payload: ContributionCampaignStatusAction,
    request: Request,
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ContributionCampaignResponse:
    campaign = _get_campaign_or_404(db, campaign_id)
    if campaign.status != "PENDING_APPROVAL":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only campaigns pending approval can be approved",
        )
    campaign.status = "APPROVED"
    _create_security_event(
        db,
        request,
        current_user,
        "contributions.campaign_approved",
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
    _ensure_receipt_access(receipt, current_user)
    return _serialize_receipt(receipt)


@router.get("/receipts/{receipt_id}/download")
def download_receipt(
    receipt_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> Response:
    receipt = _get_receipt_or_404(db, receipt_id)
    _ensure_receipt_access(receipt, current_user)
    return _receipt_download_response(receipt)


@router.get("/receipts/{receipt_id}/download.pdf")
def download_receipt_pdf(
    receipt_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> Response:
    receipt = _get_receipt_or_404(db, receipt_id)
    _ensure_receipt_access(receipt, current_user)
    return _receipt_pdf_download_response(receipt)


@router.post(
    "/{campaign_id}/payment-intents",
    response_model=ContributionPaymentIntentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_payment_intent(
    campaign_id: uuid.UUID,
    payload: ContributionPaymentIntentCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ContributionPaymentIntentResponse:
    campaign = _get_campaign_or_404(db, campaign_id)
    _ensure_campaign_visible(campaign, current_user)
    _ensure_campaign_accepts_payment(campaign)
    _validate_payment_payload(payload, campaign)
    intent_id = uuid.uuid4()
    checkout_provider = _configured_checkout_provider()
    checkout_session = _create_checkout_session(
        campaign=campaign,
        intent_id=intent_id,
        payload=payload,
        provider=checkout_provider,
    )
    payment_intent = ContributionPaymentIntent(
        id=intent_id,
        amount_cents=payload.amount_cents,
        anonymous=payload.anonymous,
        campaign_id=campaign.id,
        contributor_user_id=current_user.id,
        currency=payload.currency,
        note=payload.note,
        payment_method=payload.payment_method,
        provider=checkout_session.provider,
        provider_intent_id=checkout_session.provider_intent_id,
        status=PAYMENT_INTENT_REQUIRES_CONFIRMATION,
    )
    payment_attempt = _create_payment_attempt(
        checkout_session=checkout_session,
        payment_intent=payment_intent,
    )
    db.add(payment_intent)
    db.add(payment_attempt)
    _create_security_event(
        db,
        request,
        current_user,
        "contributions.payment_intent_created",
        {
            "amount_cents": payment_intent.amount_cents,
            "campaign_id": str(campaign.id),
            "currency": payment_intent.currency,
            "payment_attempt_id": str(payment_attempt.id),
            "payment_intent_id": str(payment_intent.id),
            "payment_method": payment_intent.payment_method,
            "provider": payment_intent.provider,
            "status": payment_intent.status,
        },
    )
    db.commit()
    db.refresh(payment_intent)
    return _serialize_payment_intent(payment_intent)


@router.post(
    "/{campaign_id}/payment-intents/{payment_intent_id}/retry",
    response_model=ContributionPaymentIntentResponse,
    status_code=status.HTTP_201_CREATED,
)
def retry_payment_intent(
    campaign_id: uuid.UUID,
    payment_intent_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ContributionPaymentIntentResponse:
    payment_intent = _get_payment_intent_or_404(
        db,
        campaign_id=campaign_id,
        payment_intent_id=payment_intent_id,
    )
    _ensure_payment_intent_access(payment_intent, current_user)
    _ensure_campaign_visible(payment_intent.campaign, current_user)
    if payment_intent.status not in {PAYMENT_INTENT_FAILED, PAYMENT_INTENT_CANCELED}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only failed or canceled payment intents can be retried",
        )
    _ensure_campaign_accepts_payment(payment_intent.campaign)
    checkout_session = _create_checkout_session(
        campaign=payment_intent.campaign,
        intent_id=payment_intent.id,
        payload=_payment_intent_retry_payload(payment_intent),
        provider=_configured_checkout_provider(),
    )
    payment_intent.provider = checkout_session.provider
    payment_intent.provider_intent_id = checkout_session.provider_intent_id
    payment_intent.status = PAYMENT_INTENT_REQUIRES_CONFIRMATION
    payment_attempt = _create_payment_attempt(
        checkout_session=checkout_session,
        payment_intent=payment_intent,
    )
    db.add(payment_attempt)
    _create_security_event(
        db,
        request,
        current_user,
        "contributions.payment_intent_retried",
        {
            "campaign_id": str(payment_intent.campaign_id),
            "payment_attempt_id": str(payment_attempt.id),
            "payment_intent_id": str(payment_intent.id),
            "provider": payment_intent.provider,
            "status": payment_intent.status,
        },
    )
    db.commit()
    db.refresh(payment_intent)
    return _serialize_payment_intent(payment_intent)


@router.post(
    "/{campaign_id}/payment-intents/{payment_intent_id}/confirm",
    response_model=ContributionResponse,
    status_code=status.HTTP_201_CREATED,
)
def confirm_payment_intent(
    campaign_id: uuid.UUID,
    payment_intent_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ContributionResponse:
    payment_intent = _get_payment_intent_or_404(
        db,
        campaign_id=campaign_id,
        payment_intent_id=payment_intent_id,
    )
    _ensure_payment_intent_access(payment_intent, current_user)
    _ensure_campaign_visible(payment_intent.campaign, current_user)
    if payment_intent.status != PAYMENT_INTENT_REQUIRES_CONFIRMATION:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Payment intent has already been reconciled",
        )
    _ensure_campaign_accepts_payment(payment_intent.campaign)
    contribution = _record_payment_intent_contribution(
        actor_user=current_user,
        db=db,
        event_metadata=None,
        event_type="contributions.payment_intent_confirmed",
        ledger_memo=f"Payment intent confirmed for {payment_intent.campaign.title}",
        payment_intent=payment_intent,
        request=request,
    )
    return _serialize_contribution(contribution)


@router.get("/admin/payment-attempts", response_model=ContributionPaymentAttemptListResponse)
@router.get("/admin/payment-attempts/", response_model=ContributionPaymentAttemptListResponse)
def list_admin_payment_attempts(
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
    payment_intent_id: Annotated[uuid.UUID | None, Query()] = None,
    provider: Annotated[str | None, Query(max_length=60)] = None,
    provider_intent_id: Annotated[str | None, Query(max_length=120)] = None,
    status_filter: Annotated[str | None, Query(alias="status", max_length=40)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ContributionPaymentAttemptListResponse:
    _ = current_user
    query = select(ContributionPaymentAttempt).options(
        joinedload(ContributionPaymentAttempt.payment_intent)
    )
    normalized_provider = _normalize_enum(provider)
    normalized_status = _normalize_enum(status_filter)
    if payment_intent_id:
        query = query.where(ContributionPaymentAttempt.payment_intent_id == payment_intent_id)
    if normalized_provider:
        query = query.where(ContributionPaymentAttempt.provider == normalized_provider)
    if normalized_status:
        query = query.where(ContributionPaymentAttempt.status == normalized_status)
    if provider_intent_id:
        query = query.where(
            ContributionPaymentAttempt.provider_intent_id == provider_intent_id.strip()
        )
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    attempts = db.scalars(
        query.order_by(ContributionPaymentAttempt.created_at.desc()).offset(offset).limit(limit)
    ).all()
    return ContributionPaymentAttemptListResponse(
        attempts=[_serialize_payment_attempt(attempt) for attempt in attempts],
        has_more=offset + len(attempts) < total,
        limit=limit,
        offset=offset,
        total=total,
    )


@router.get("/admin/webhook-events", response_model=ContributionWebhookEventListResponse)
@router.get("/admin/webhook-events/", response_model=ContributionWebhookEventListResponse)
def list_admin_webhook_events(
    current_user: Annotated[User, Depends(finance_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
    event_type: Annotated[str | None, Query(max_length=80)] = None,
    provider: Annotated[str | None, Query(max_length=60)] = None,
    provider_intent_id: Annotated[str | None, Query(max_length=120)] = None,
    status_filter: Annotated[str | None, Query(alias="status", max_length=40)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ContributionWebhookEventListResponse:
    _ = current_user
    query = select(ContributionWebhookEvent)
    normalized_provider = _normalize_enum(provider)
    normalized_event_type = _normalize_enum(event_type)
    normalized_status = _normalize_enum(status_filter)
    if normalized_provider:
        query = query.where(ContributionWebhookEvent.provider == normalized_provider)
    if normalized_event_type:
        query = query.where(ContributionWebhookEvent.event_type == normalized_event_type)
    if normalized_status:
        query = query.where(ContributionWebhookEvent.status == normalized_status)
    if provider_intent_id:
        query = query.where(
            ContributionWebhookEvent.provider_intent_id == provider_intent_id.strip()
        )
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    events = db.scalars(
        query.order_by(ContributionWebhookEvent.created_at.desc()).offset(offset).limit(limit)
    ).all()
    return ContributionWebhookEventListResponse(
        events=[_serialize_webhook_event(event) for event in events],
        has_more=offset + len(events) < total,
        limit=limit,
        offset=offset,
        total=total,
    )


@router.post("/webhooks/{provider}", response_model=ContributionWebhookResponse)
async def receive_provider_webhook(
    provider: str,
    request: Request,
    db: Annotated[Session, Depends(get_db_session)],
) -> ContributionWebhookResponse:
    raw_body = await request.body()
    _verify_contribution_webhook_signature(request, raw_body)
    payload = _parse_contribution_webhook_payload(raw_body)
    normalized_provider = _normalize_enum(provider)
    if not normalized_provider:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provider is required",
        )
    webhook_event = _start_webhook_event(db, payload=payload, provider=normalized_provider)
    supported_events = WEBHOOK_SUCCESS_EVENTS | WEBHOOK_FAILED_EVENTS | WEBHOOK_CANCELED_EVENTS
    if payload.event_type not in supported_events:
        _finalize_webhook_event(
            webhook_event,
            error_message="Unsupported contribution webhook event",
            status_value=WEBHOOK_EVENT_REJECTED,
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported contribution webhook event",
        )

    payment_intent = _get_payment_intent_by_provider_reference(
        db,
        provider=normalized_provider,
        provider_intent_id=payload.provider_intent_id,
    )
    if payment_intent is None:
        _finalize_webhook_event(
            webhook_event,
            error_message="Payment intent not found",
            status_value=WEBHOOK_EVENT_UNMATCHED,
        )
        _create_system_security_event(
            db,
            request,
            "contributions.provider_webhook_unmatched",
            {
                "event_type": payload.event_type,
                "provider": normalized_provider,
                "provider_event_id": payload.provider_event_id,
                "provider_intent_id": payload.provider_intent_id,
            },
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment intent not found",
        )

    try:
        _validate_webhook_amount(payload, payment_intent)
    except HTTPException as exc:
        _finalize_webhook_event(
            webhook_event,
            error_message=str(exc.detail),
            payment_intent=payment_intent,
            status_value=WEBHOOK_EVENT_REJECTED,
        )
        db.commit()
        raise
    event_metadata = {
        "event_type": payload.event_type,
        "provider": normalized_provider,
        "provider_event_id": payload.provider_event_id,
    }

    if payload.event_type in WEBHOOK_SUCCESS_EVENTS:
        existing_contribution = _find_contribution_for_payment_intent(db, payment_intent)
        if existing_contribution is not None:
            if payment_intent.status != PAYMENT_INTENT_CONFIRMED:
                payment_intent.status = PAYMENT_INTENT_CONFIRMED
                _update_latest_payment_attempt_status(
                    db,
                    payment_intent,
                    PAYMENT_INTENT_CONFIRMED,
                )
            _create_system_security_event(
                db,
                request,
                "contributions.provider_webhook_duplicate",
                {
                    **event_metadata,
                    "contribution_id": str(existing_contribution.id),
                    "payment_intent_id": str(payment_intent.id),
                    "provider_intent_id": payment_intent.provider_intent_id,
                },
            )
            _finalize_webhook_event(
                webhook_event,
                contribution=existing_contribution,
                payment_intent=payment_intent,
                status_value=WEBHOOK_EVENT_DUPLICATE,
            )
            db.commit()
            return _serialize_webhook_response(
                contribution=existing_contribution,
                event_type=payload.event_type,
                message="Payment intent already reconciled",
                payment_intent=payment_intent,
                provider_event_id=payload.provider_event_id,
                reconciled=False,
            )
        if payment_intent.status != PAYMENT_INTENT_REQUIRES_CONFIRMATION:
            _finalize_webhook_event(
                webhook_event,
                error_message="Payment intent cannot be reconciled from its current status",
                payment_intent=payment_intent,
                status_value=WEBHOOK_EVENT_REJECTED,
            )
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Payment intent cannot be reconciled from its current status",
            )
        contribution = _record_payment_intent_contribution(
            actor_user=None,
            db=db,
            event_metadata=event_metadata,
            event_type="contributions.provider_webhook_reconciled",
            ledger_memo=f"Provider webhook reconciled for {payment_intent.campaign.title}",
            payment_intent=payment_intent,
            request=request,
            webhook_event=webhook_event,
        )
        return _serialize_webhook_response(
            contribution=contribution,
            event_type=payload.event_type,
            message="Payment intent reconciled",
            payment_intent=payment_intent,
            provider_event_id=payload.provider_event_id,
            reconciled=True,
        )

    next_status = (
        PAYMENT_INTENT_FAILED
        if payload.event_type in WEBHOOK_FAILED_EVENTS
        else PAYMENT_INTENT_CANCELED
    )
    if payment_intent.status == PAYMENT_INTENT_CONFIRMED:
        _finalize_webhook_event(
            webhook_event,
            error_message="Confirmed payment intent cannot be marked failed or canceled",
            payment_intent=payment_intent,
            status_value=WEBHOOK_EVENT_REJECTED,
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Confirmed payment intent cannot be marked failed or canceled",
        )
    was_already_marked = payment_intent.status == next_status
    payment_intent.status = next_status
    _update_latest_payment_attempt_status(
        db,
        payment_intent,
        next_status,
        error_message=payload.failure_reason,
    )
    _create_system_security_event(
        db,
        request,
        "contributions.provider_webhook_marked_failed"
        if next_status == PAYMENT_INTENT_FAILED
        else "contributions.provider_webhook_marked_canceled",
        {
            **event_metadata,
            "failure_reason": payload.failure_reason,
            "payment_intent_id": str(payment_intent.id),
            "provider_intent_id": payment_intent.provider_intent_id,
        },
    )
    _finalize_webhook_event(
        webhook_event,
        payment_intent=payment_intent,
        status_value=(
            WEBHOOK_EVENT_FAILED
            if next_status == PAYMENT_INTENT_FAILED
            else WEBHOOK_EVENT_CANCELED
        ),
    )
    db.commit()
    return _serialize_webhook_response(
        contribution=None,
        event_type=payload.event_type,
        message=(
            f"Payment intent already {next_status.lower()}"
            if was_already_marked
            else f"Payment intent marked {next_status.lower()}"
        ),
        payment_intent=payment_intent,
        provider_event_id=payload.provider_event_id,
        reconciled=not was_already_marked,
    )


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
