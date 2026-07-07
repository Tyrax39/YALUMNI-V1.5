import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.core.database import get_db_session
from app.core.permissions import ADMIN_ROLE_NAMES
from app.core.security import utcnow
from app.modules.auth.dependencies import get_current_user, require_roles
from app.modules.auth.models import SecurityEvent, User
from app.modules.messages.models import (
    Conversation,
    ConversationParticipant,
    DirectMessage,
    DirectMessageReport,
    IntroductionRequest,
    UserBlock,
)
from app.modules.messages.schemas import (
    ConversationCreate,
    ConversationListResponse,
    ConversationParticipantResponse,
    ConversationResponse,
    IntroductionRequestCreate,
    IntroductionRequestListResponse,
    IntroductionRequestResponse,
    IntroductionRequestReview,
    MessageCreate,
    MessageListResponse,
    MessageModerationReviewUpdate,
    MessageReadResponse,
    MessageReportCreate,
    MessageReportQueueItem,
    MessageReportQueueResponse,
    MessageReportResponse,
    MessageResponse,
    RemovedMessageQueueItem,
    RemovedMessageQueueResponse,
    UserBlockCreate,
    UserBlockResponse,
)
from app.modules.notifications.service import notify_users

router = APIRouter()
MESSAGE_STATUSES = {"ACTIVE", "DELETED"}
MESSAGE_REPORT_REASONS = {"HARASSMENT", "IMPERSONATION", "OTHER", "SPAM", "UNSAFE_CONTENT"}
MESSAGE_REPORT_STATUSES = {"OPEN", "RESOLVED"}
MESSAGE_MODERATION_SEVERITIES = {"CRITICAL", "HIGH", "LOW", "MEDIUM"}
MESSAGE_ESCALATION_STATUSES = {"ESCALATED", "NONE"}
MESSAGE_REMOVED_BODY = "This message was removed by moderation."
message_admin_dependency = require_roles(*ADMIN_ROLE_NAMES)


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


def _serialize_participant(
    participant: ConversationParticipant,
) -> ConversationParticipantResponse:
    return ConversationParticipantResponse(
        id=participant.id,
        user_id=participant.user_id,
        display_name=participant.user.display_name,
        email=participant.user.email,
        role=participant.role,
        last_read_at=participant.last_read_at,
        created_at=participant.created_at,
    )


def _serialize_message(
    message: DirectMessage,
    *,
    include_moderation: bool = False,
) -> MessageResponse:
    is_removed = message.status != "ACTIVE"
    return MessageResponse(
        id=message.id,
        conversation_id=message.conversation_id,
        sender_user_id=message.sender_user_id,
        sender_display_name=message.sender.display_name if message.sender else "Deleted user",
        body=message.body if include_moderation or not is_removed else MESSAGE_REMOVED_BODY,
        status=message.status,
        removed_by_user_id=message.removed_by_user_id,
        removed_at=message.deleted_at,
        moderation_note=message.moderation_note if include_moderation else None,
        moderation_severity=message.moderation_severity if include_moderation else None,
        escalation_status=message.escalation_status if include_moderation else None,
        escalated_by_user_id=message.escalated_by_user_id if include_moderation else None,
        escalated_at=message.escalated_at if include_moderation else None,
        sent_at=message.sent_at,
        created_at=message.created_at,
        updated_at=message.updated_at,
    )


def _serialize_report(
    report: DirectMessageReport,
    *,
    include_moderation: bool = False,
) -> MessageReportResponse:
    return MessageReportResponse(
        id=report.id,
        message_id=report.message_id,
        conversation_id=report.conversation_id,
        reporter_user_id=report.reporter_user_id,
        reporter_display_name=report.reporter.display_name if report.reporter else "Deleted user",
        reason=report.reason,
        note=report.note,
        status=report.status,
        moderator_note=report.moderator_note if include_moderation else None,
        severity=report.severity if include_moderation else None,
        escalation_status=report.escalation_status if include_moderation else None,
        escalated_by_user_id=report.escalated_by_user_id if include_moderation else None,
        escalated_at=report.escalated_at if include_moderation else None,
        resolved_by_user_id=report.resolved_by_user_id,
        resolved_at=report.resolved_at,
        created_at=report.created_at,
        updated_at=report.updated_at,
    )


def _serialize_introduction_request(
    introduction_request: IntroductionRequest,
) -> IntroductionRequestResponse:
    return IntroductionRequestResponse(
        id=introduction_request.id,
        requester_user_id=introduction_request.requester_user_id,
        requester_display_name=introduction_request.requester.display_name,
        requester_email=introduction_request.requester.email,
        recipient_user_id=introduction_request.recipient_user_id,
        recipient_display_name=introduction_request.recipient.display_name,
        recipient_email=introduction_request.recipient.email,
        conversation_id=introduction_request.conversation_id,
        note=introduction_request.note,
        status=introduction_request.status,
        responded_by_user_id=introduction_request.responded_by_user_id,
        responded_at=introduction_request.responded_at,
        created_at=introduction_request.created_at,
        updated_at=introduction_request.updated_at,
    )


def _serialize_report_queue_item(report: DirectMessageReport) -> MessageReportQueueItem:
    message = report.message
    return MessageReportQueueItem(
        **_serialize_report(report, include_moderation=True).model_dump(),
        sender_display_name=message.sender.display_name if message.sender else "Deleted user",
        sender_user_id=message.sender_user_id,
        message_body=message.body,
        message_status=message.status,
        message_removed_at=message.deleted_at,
        message_sent_at=message.sent_at,
    )


def _serialize_removed_message_queue_item(
    db: Session,
    message: DirectMessage,
) -> RemovedMessageQueueItem:
    report_count = (
        db.scalar(
            select(func.count())
            .select_from(DirectMessageReport)
            .where(DirectMessageReport.message_id == message.id)
        )
        or 0
    )
    return RemovedMessageQueueItem(
        **_serialize_message(message, include_moderation=True).model_dump(),
        removed_by_display_name=(
            message.removed_by_user.display_name if message.removed_by_user else "Deleted user"
        ),
        report_count=report_count,
    )


def _last_message(db: Session, conversation_id: uuid.UUID) -> DirectMessage | None:
    return db.scalar(
        select(DirectMessage)
        .where(
            DirectMessage.conversation_id == conversation_id,
            DirectMessage.status == "ACTIVE",
        )
        .order_by(DirectMessage.created_at.desc())
        .limit(1)
    )


def _participant_for_user(
    conversation: Conversation,
    user_id: uuid.UUID,
) -> ConversationParticipant | None:
    return next(
        (
            participant
            for participant in conversation.participants
            if participant.user_id == user_id
        ),
        None,
    )


def _other_participant_ids(conversation: Conversation, user_id: uuid.UUID) -> list[uuid.UUID]:
    return [
        participant.user_id
        for participant in conversation.participants
        if participant.user_id != user_id
    ]


def _unread_count(
    db: Session,
    *,
    conversation_id: uuid.UUID,
    participant: ConversationParticipant,
) -> int:
    query = (
        select(func.count())
        .select_from(DirectMessage)
        .where(
            DirectMessage.conversation_id == conversation_id,
            DirectMessage.status == "ACTIVE",
            DirectMessage.sender_user_id != participant.user_id,
        )
    )
    if participant.last_read_at is not None:
        query = query.where(DirectMessage.created_at > participant.last_read_at)

    return db.scalar(query) or 0


def _serialize_conversation(
    db: Session,
    conversation: Conversation,
    current_user: User,
) -> ConversationResponse:
    participant = _participant_for_user(conversation, current_user.id)
    if participant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    last_message = _last_message(db, conversation.id)
    return ConversationResponse(
        id=conversation.id,
        conversation_type=conversation.conversation_type,
        participants=[
            _serialize_participant(participant)
            for participant in sorted(
                conversation.participants,
                key=lambda item: (item.user_id != current_user.id, item.created_at),
            )
        ],
        last_message=_serialize_message(last_message) if last_message else None,
        unread_count=_unread_count(db, conversation_id=conversation.id, participant=participant),
        last_message_at=conversation.last_message_at,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
    )


def _conversation_query():
    return select(Conversation).options(
        selectinload(Conversation.participants).selectinload(ConversationParticipant.user),
    )


def _introduction_request_query():
    return select(IntroductionRequest).options(
        joinedload(IntroductionRequest.requester),
        joinedload(IntroductionRequest.recipient),
        joinedload(IntroductionRequest.responder),
    )


def _get_conversation_for_user(
    db: Session,
    conversation_id: uuid.UUID,
    user: User,
) -> Conversation:
    conversation = db.scalar(
        _conversation_query()
        .join(ConversationParticipant)
        .where(
            Conversation.id == conversation_id,
            ConversationParticipant.user_id == user.id,
        )
    )
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return conversation


def _find_direct_conversation(
    db: Session,
    user_id: uuid.UUID,
    participant_user_id: uuid.UUID,
) -> Conversation | None:
    current_user_conversation_ids = (
        select(ConversationParticipant.conversation_id)
        .join(Conversation)
        .where(
            Conversation.conversation_type == "DIRECT",
            ConversationParticipant.user_id == user_id,
        )
    )
    return db.scalar(
        _conversation_query()
        .join(ConversationParticipant)
        .where(
            Conversation.id.in_(current_user_conversation_ids),
            ConversationParticipant.user_id == participant_user_id,
        )
    )


def _create_direct_conversation_record(
    db: Session,
    initiator_user: User,
    participant_user: User,
) -> Conversation:
    now = utcnow()
    conversation = Conversation(
        conversation_type="DIRECT",
        created_by_user_id=initiator_user.id,
    )
    db.add(conversation)
    db.flush()
    db.add_all(
        [
            ConversationParticipant(
                conversation_id=conversation.id,
                user_id=initiator_user.id,
                last_read_at=now,
            ),
            ConversationParticipant(
                conversation_id=conversation.id,
                user_id=participant_user.id,
            ),
        ]
    )
    db.flush()
    return (
        db.scalar(_conversation_query().where(Conversation.id == conversation.id))
        or conversation
    )


def _create_or_get_direct_conversation(
    db: Session,
    initiator_user: User,
    participant_user: User,
) -> tuple[Conversation, bool]:
    conversation = _find_direct_conversation(db, initiator_user.id, participant_user.id)
    if conversation is not None:
        return conversation, False
    return _create_direct_conversation_record(db, initiator_user, participant_user), True


def _ensure_messaging_allowed(db: Session, user_id: uuid.UUID, other_user_id: uuid.UUID) -> None:
    block = db.scalar(
        select(UserBlock).where(
            or_(
                and_(
                    UserBlock.blocker_user_id == user_id,
                    UserBlock.blocked_user_id == other_user_id,
                ),
                and_(
                    UserBlock.blocker_user_id == other_user_id,
                    UserBlock.blocked_user_id == user_id,
                ),
            )
        )
    )
    if block is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Messaging is blocked between these users",
        )


def _validate_moderation_review_payload(payload: MessageModerationReviewUpdate) -> None:
    if payload.severity is not None and payload.severity not in MESSAGE_MODERATION_SEVERITIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid moderation severity",
        )
    if (
        payload.escalation_status is not None
        and payload.escalation_status not in MESSAGE_ESCALATION_STATUSES
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid escalation status",
        )


def _apply_escalation_review(
    target: DirectMessage | DirectMessageReport,
    escalation_status: str | None,
    current_user: User,
) -> None:
    if escalation_status is None:
        return
    if escalation_status == "ESCALATED":
        if target.escalation_status != "ESCALATED":
            target.escalated_by_user_id = current_user.id
            target.escalated_at = utcnow()
    else:
        target.escalated_by_user_id = None
        target.escalated_at = None
    target.escalation_status = escalation_status


def _message_options():
    return (
        joinedload(DirectMessage.sender),
        joinedload(DirectMessage.removed_by_user),
        joinedload(DirectMessage.escalated_by_user),
    )


def _get_introduction_request_for_user(
    db: Session,
    introduction_request_id: uuid.UUID,
    user: User,
) -> IntroductionRequest:
    introduction_request = db.scalar(
        _introduction_request_query().where(IntroductionRequest.id == introduction_request_id)
    )
    if introduction_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Introduction request not found",
        )
    if user.id not in {
        introduction_request.requester_user_id,
        introduction_request.recipient_user_id,
    }:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Introduction request not found",
        )
    return introduction_request


def _report_options():
    return (
        joinedload(DirectMessageReport.reporter),
        joinedload(DirectMessageReport.message).joinedload(DirectMessage.sender),
        joinedload(DirectMessageReport.message).joinedload(DirectMessage.removed_by_user),
    )


def _get_message_for_conversation(
    db: Session,
    conversation_id: uuid.UUID,
    message_id: uuid.UUID,
) -> DirectMessage:
    message = db.scalar(
        select(DirectMessage)
        .options(*_message_options())
        .where(
            DirectMessage.id == message_id,
            DirectMessage.conversation_id == conversation_id,
        )
    )
    if message is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    return message


def _get_message_or_404(db: Session, message_id: uuid.UUID) -> DirectMessage:
    message = db.scalar(
        select(DirectMessage).options(*_message_options()).where(DirectMessage.id == message_id)
    )
    if message is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    return message


def _get_report_or_404(db: Session, report_id: uuid.UUID) -> DirectMessageReport:
    report = db.scalar(
        select(DirectMessageReport)
        .options(*_report_options())
        .where(DirectMessageReport.id == report_id)
    )
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return report


def _send_message(
    db: Session,
    conversation: Conversation,
    sender: User,
    body: str,
) -> DirectMessage:
    other_user_ids = _other_participant_ids(conversation, sender.id)
    for other_user_id in other_user_ids:
        _ensure_messaging_allowed(db, sender.id, other_user_id)

    now = utcnow()
    message = DirectMessage(
        conversation_id=conversation.id,
        sender_user_id=sender.id,
        body=body,
        sent_at=now,
    )
    db.add(message)
    conversation.last_message_at = now
    sender_participant = _participant_for_user(conversation, sender.id)
    if sender_participant:
        sender_participant.last_read_at = now
    notify_users(
        db,
        other_user_ids,
        event_type="message.direct_received",
        title=f"New message from {sender.display_name}",
        actor_user_id=sender.id,
        body=body[:180],
        target_url="/dashboard",
        metadata={"conversation_id": str(conversation.id)},
    )
    return message


@router.get("/conversations", response_model=ConversationListResponse)
def list_my_conversations(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ConversationListResponse:
    query = (
        _conversation_query()
        .join(ConversationParticipant)
        .where(ConversationParticipant.user_id == current_user.id)
    )
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    conversations = db.scalars(
        query.order_by(func.coalesce(Conversation.last_message_at, Conversation.created_at).desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return ConversationListResponse(
        conversations=[
            _serialize_conversation(db, conversation, current_user)
            for conversation in conversations
        ],
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(conversations) < total,
    )


@router.get("/introduction-requests", response_model=IntroductionRequestListResponse)
def list_my_introduction_requests(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> IntroductionRequestListResponse:
    incoming = db.scalars(
        _introduction_request_query()
        .where(IntroductionRequest.recipient_user_id == current_user.id)
        .order_by(IntroductionRequest.created_at.desc())
    ).all()
    outgoing = db.scalars(
        _introduction_request_query()
        .where(IntroductionRequest.requester_user_id == current_user.id)
        .order_by(IntroductionRequest.created_at.desc())
    ).all()
    return IntroductionRequestListResponse(
        incoming=[_serialize_introduction_request(item) for item in incoming],
        outgoing=[_serialize_introduction_request(item) for item in outgoing],
        actionable_count=sum(1 for item in incoming if item.status == "PENDING"),
    )


@router.post(
    "/introduction-requests",
    response_model=IntroductionRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_introduction_request(
    payload: IntroductionRequestCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> IntroductionRequestResponse:
    if payload.recipient_user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot request an introduction with yourself",
        )

    recipient_user = db.scalar(select(User).where(User.id == payload.recipient_user_id))
    if recipient_user is None or recipient_user.status != "ACTIVE":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    _ensure_messaging_allowed(db, current_user.id, recipient_user.id)

    existing_pending_request = db.scalar(
        _introduction_request_query().where(
            IntroductionRequest.requester_user_id == current_user.id,
            IntroductionRequest.recipient_user_id == recipient_user.id,
            IntroductionRequest.status == "PENDING",
        )
    )
    if existing_pending_request is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An introduction request is already pending for this member",
        )

    introduction_request = IntroductionRequest(
        requester_user_id=current_user.id,
        recipient_user_id=recipient_user.id,
        note=payload.note,
        status="PENDING",
    )
    db.add(introduction_request)
    db.flush()
    _create_security_event(
        db,
        request,
        current_user,
        "messages.introduction_requested",
        {
            "introduction_request_id": str(introduction_request.id),
            "recipient_user_id": str(recipient_user.id),
        },
    )
    notify_users(
        db,
        [recipient_user.id],
        actor_user_id=current_user.id,
        body=(payload.note or "A member asked to connect with you.")[:180],
        event_type="messages.introduction_requested",
        metadata={"introduction_request_id": str(introduction_request.id)},
        target_url="/messages/introductions",
        title=f"Introduction request from {current_user.display_name}",
    )
    db.commit()
    introduction_request = _get_introduction_request_for_user(
        db,
        introduction_request.id,
        current_user,
    )
    return _serialize_introduction_request(introduction_request)


@router.post(
    "/introduction-requests/{introduction_request_id}/accept",
    response_model=IntroductionRequestResponse,
)
def accept_introduction_request(
    introduction_request_id: uuid.UUID,
    payload: IntroductionRequestReview,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> IntroductionRequestResponse:
    introduction_request = _get_introduction_request_for_user(
        db,
        introduction_request_id,
        current_user,
    )
    if introduction_request.recipient_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the requested member can accept this introduction",
        )
    if introduction_request.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only pending introduction requests can be accepted",
        )

    requester = db.scalar(select(User).where(User.id == introduction_request.requester_user_id))
    recipient = db.scalar(select(User).where(User.id == introduction_request.recipient_user_id))
    if requester is None or recipient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    _ensure_messaging_allowed(db, requester.id, recipient.id)

    conversation, _created = _create_or_get_direct_conversation(db, requester, recipient)
    note_to_send = payload.note or introduction_request.note
    if note_to_send and conversation.last_message_at is None:
        _send_message(db, conversation, requester, note_to_send)

    introduction_request.status = "ACCEPTED"
    introduction_request.responded_by_user_id = current_user.id
    introduction_request.responded_at = utcnow()
    introduction_request.conversation_id = conversation.id
    _create_security_event(
        db,
        request,
        current_user,
        "messages.introduction_accepted",
        {
            "conversation_id": str(conversation.id),
            "introduction_request_id": str(introduction_request.id),
        },
    )
    notify_users(
        db,
        [requester.id],
        actor_user_id=current_user.id,
        body=f"{current_user.display_name} accepted your introduction request.",
        event_type="messages.introduction_accepted",
        metadata={
            "conversation_id": str(conversation.id),
            "introduction_request_id": str(introduction_request.id),
        },
        target_url=f"/messages/{conversation.id}",
        title="Introduction request accepted",
    )
    db.commit()
    introduction_request = _get_introduction_request_for_user(
        db,
        introduction_request.id,
        current_user,
    )
    return _serialize_introduction_request(introduction_request)


@router.post(
    "/introduction-requests/{introduction_request_id}/decline",
    response_model=IntroductionRequestResponse,
)
def decline_introduction_request(
    introduction_request_id: uuid.UUID,
    payload: IntroductionRequestReview,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> IntroductionRequestResponse:
    introduction_request = _get_introduction_request_for_user(
        db,
        introduction_request_id,
        current_user,
    )
    if introduction_request.recipient_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the requested member can decline this introduction",
        )
    if introduction_request.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only pending introduction requests can be declined",
        )

    introduction_request.status = "DECLINED"
    introduction_request.responded_by_user_id = current_user.id
    introduction_request.responded_at = utcnow()
    if payload.note:
        introduction_request.note = payload.note
    _create_security_event(
        db,
        request,
        current_user,
        "messages.introduction_declined",
        {"introduction_request_id": str(introduction_request.id)},
    )
    notify_users(
        db,
        [introduction_request.requester_user_id],
        actor_user_id=current_user.id,
        body=f"{current_user.display_name} declined your introduction request.",
        event_type="messages.introduction_declined",
        metadata={"introduction_request_id": str(introduction_request.id)},
        target_url="/messages/introductions",
        title="Introduction request declined",
    )
    db.commit()
    introduction_request = _get_introduction_request_for_user(
        db,
        introduction_request.id,
        current_user,
    )
    return _serialize_introduction_request(introduction_request)


@router.post(
    "/conversations",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_or_get_direct_conversation(
    payload: ConversationCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ConversationResponse:
    if payload.participant_user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot start a conversation with yourself",
        )

    participant_user = db.scalar(select(User).where(User.id == payload.participant_user_id))
    if participant_user is None or participant_user.status != "ACTIVE":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    _ensure_messaging_allowed(db, current_user.id, participant_user.id)

    conversation, created = _create_or_get_direct_conversation(
        db,
        current_user,
        participant_user,
    )

    if payload.initial_message:
        _send_message(db, conversation, current_user, payload.initial_message)

    _create_security_event(
        db,
        request,
        current_user,
        "messages.conversation_started" if created else "messages.conversation_reused",
        {"conversation_id": str(conversation.id), "participant_user_id": str(participant_user.id)},
    )
    db.commit()
    conversation = _get_conversation_for_user(db, conversation.id, current_user)
    return _serialize_conversation(db, conversation, current_user)


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
def get_my_conversation(
    conversation_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ConversationResponse:
    conversation = _get_conversation_for_user(db, conversation_id, current_user)
    return _serialize_conversation(db, conversation, current_user)


@router.get("/conversations/{conversation_id}/messages", response_model=MessageListResponse)
def list_conversation_messages(
    conversation_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> MessageListResponse:
    _get_conversation_for_user(db, conversation_id, current_user)
    query = (
        select(DirectMessage)
        .options(*_message_options())
        .where(DirectMessage.conversation_id == conversation_id)
    )
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    messages = db.scalars(
        query.order_by(DirectMessage.created_at.asc()).offset(offset).limit(limit)
    ).all()
    return MessageListResponse(
        messages=[_serialize_message(message) for message in messages],
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(messages) < total,
    )


@router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse)
def send_conversation_message(
    conversation_id: uuid.UUID,
    payload: MessageCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> MessageResponse:
    conversation = _get_conversation_for_user(db, conversation_id, current_user)
    message = _send_message(db, conversation, current_user, payload.body)
    db.commit()
    db.refresh(message)
    return _serialize_message(message)


@router.post(
    "/conversations/{conversation_id}/messages/{message_id}/reports",
    response_model=MessageReportResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_direct_message_report(
    conversation_id: uuid.UUID,
    message_id: uuid.UUID,
    payload: MessageReportCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> MessageReportResponse:
    _get_conversation_for_user(db, conversation_id, current_user)
    if payload.reason not in MESSAGE_REPORT_REASONS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid report reason")

    message = _get_message_for_conversation(db, conversation_id, message_id)
    if message.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only active messages can be reported",
        )
    if message.sender_user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot report your own message",
        )

    existing_open_report = db.scalar(
        select(DirectMessageReport.id).where(
            DirectMessageReport.message_id == message.id,
            DirectMessageReport.reporter_user_id == current_user.id,
            DirectMessageReport.status == "OPEN",
        )
    )
    if existing_open_report:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have an open report for this message",
        )

    report = DirectMessageReport(
        message_id=message.id,
        conversation_id=conversation_id,
        reporter_user_id=current_user.id,
        reason=payload.reason,
        note=payload.note,
        status="OPEN",
    )
    db.add(report)
    db.flush()
    _create_security_event(
        db,
        request,
        current_user,
        "messages.report_created",
        metadata={
            "conversation_id": str(conversation_id),
            "message_id": str(message.id),
            "reason": report.reason,
            "report_id": str(report.id),
        },
    )
    db.commit()
    report = _get_report_or_404(db, report.id)
    return _serialize_report(report)


@router.post("/conversations/{conversation_id}/read", response_model=MessageReadResponse)
def mark_conversation_read(
    conversation_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> MessageReadResponse:
    conversation = _get_conversation_for_user(db, conversation_id, current_user)
    participant = _participant_for_user(conversation, current_user.id)
    if participant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    participant.last_read_at = utcnow()
    db.commit()
    db.refresh(participant)
    return MessageReadResponse(
        conversation_id=conversation_id,
        last_read_at=participant.last_read_at,
        unread_count=_unread_count(db, conversation_id=conversation_id, participant=participant),
    )


@router.get(
    "/admin/moderation/reports",
    response_model=MessageReportQueueResponse,
)
def list_admin_message_report_queue(
    current_user: Annotated[User, Depends(message_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
    status_filter: Annotated[
        str,
        Query(alias="status", pattern="^(OPEN|RESOLVED|ALL)$"),
    ] = "OPEN",
    reason: Annotated[
        str | None,
        Query(pattern="^(HARASSMENT|IMPERSONATION|OTHER|SPAM|UNSAFE_CONTENT)$"),
    ] = None,
    severity: Annotated[
        str | None,
        Query(pattern="^(CRITICAL|HIGH|LOW|MEDIUM)$"),
    ] = None,
    escalation_status: Annotated[
        str | None,
        Query(pattern="^(ESCALATED|NONE)$"),
    ] = None,
    q: Annotated[str | None, Query(max_length=120)] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> MessageReportQueueResponse:
    _ = current_user
    normalized_status = status_filter.strip().upper()
    query = (
        select(DirectMessageReport)
        .join(DirectMessage, DirectMessageReport.message_id == DirectMessage.id)
        .options(*_report_options())
    )
    if normalized_status != "ALL":
        query = query.where(DirectMessageReport.status == normalized_status)
    if reason:
        query = query.where(DirectMessageReport.reason == reason.strip().upper())
    if severity:
        query = query.where(DirectMessageReport.severity == severity.strip().upper())
    if escalation_status:
        query = query.where(
            DirectMessageReport.escalation_status == escalation_status.strip().upper()
        )
    if q:
        search_term = f"%{q.strip()}%"
        query = query.where(
            or_(
                DirectMessage.body.ilike(search_term),
                DirectMessageReport.note.ilike(search_term),
                DirectMessageReport.moderator_note.ilike(search_term),
            )
        )

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    reports = db.scalars(
        query.order_by(DirectMessageReport.created_at.desc()).offset(offset).limit(limit)
    ).all()
    return MessageReportQueueResponse(
        reports=[_serialize_report_queue_item(report) for report in reports],
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(reports) < total,
    )


@router.patch(
    "/admin/moderation/reports/{report_id}/review",
    response_model=MessageReportResponse,
)
def update_admin_message_report_review(
    report_id: uuid.UUID,
    payload: MessageModerationReviewUpdate,
    request: Request,
    current_user: Annotated[User, Depends(message_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> MessageReportResponse:
    _validate_moderation_review_payload(payload)
    report = _get_report_or_404(db, report_id)
    if "moderator_note" in payload.model_fields_set:
        report.moderator_note = payload.moderator_note
    if payload.severity is not None:
        report.severity = payload.severity
    _apply_escalation_review(report, payload.escalation_status, current_user)
    _create_security_event(
        db,
        request,
        current_user,
        "messages.report_review_updated",
        metadata={
            "escalation_status": report.escalation_status,
            "message_id": str(report.message_id),
            "report_id": str(report.id),
            "severity": report.severity,
        },
    )
    db.commit()
    report = _get_report_or_404(db, report.id)
    return _serialize_report(report, include_moderation=True)


@router.post(
    "/admin/moderation/reports/{report_id}/resolve",
    response_model=MessageReportResponse,
)
def resolve_admin_message_report(
    report_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(message_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> MessageReportResponse:
    report = _get_report_or_404(db, report_id)
    if report.status != "OPEN":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only open reports can be resolved",
        )

    report.status = "RESOLVED"
    report.resolved_by_user_id = current_user.id
    report.resolved_at = utcnow()
    _create_security_event(
        db,
        request,
        current_user,
        "messages.report_resolved",
        metadata={
            "conversation_id": str(report.conversation_id),
            "message_id": str(report.message_id),
            "report_id": str(report.id),
        },
    )
    if report.reporter_user_id:
        notify_users(
            db,
            [report.reporter_user_id],
            actor_user_id=current_user.id,
            body="A direct message report you submitted has been resolved.",
            event_type="messages.report_resolved",
            exclude_user_ids={current_user.id},
            metadata={
                "conversation_id": str(report.conversation_id),
                "message_id": str(report.message_id),
                "report_id": str(report.id),
            },
            target_url="/dashboard",
            title="Message report resolved",
        )
    db.commit()
    report = _get_report_or_404(db, report.id)
    return _serialize_report(report, include_moderation=True)


@router.get(
    "/admin/moderation/removed-messages",
    response_model=RemovedMessageQueueResponse,
)
def list_admin_removed_message_queue(
    current_user: Annotated[User, Depends(message_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
    severity: Annotated[
        str | None,
        Query(pattern="^(CRITICAL|HIGH|LOW|MEDIUM)$"),
    ] = None,
    escalation_status: Annotated[
        str | None,
        Query(pattern="^(ESCALATED|NONE)$"),
    ] = None,
    q: Annotated[str | None, Query(max_length=120)] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> RemovedMessageQueueResponse:
    _ = current_user
    query = (
        select(DirectMessage).options(*_message_options()).where(DirectMessage.status == "DELETED")
    )
    if severity:
        query = query.where(DirectMessage.moderation_severity == severity.strip().upper())
    if escalation_status:
        query = query.where(DirectMessage.escalation_status == escalation_status.strip().upper())
    if q:
        search_term = f"%{q.strip()}%"
        query = query.where(
            or_(
                DirectMessage.body.ilike(search_term),
                DirectMessage.moderation_note.ilike(search_term),
            )
        )

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    messages = db.scalars(
        query.order_by(DirectMessage.deleted_at.desc(), DirectMessage.created_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return RemovedMessageQueueResponse(
        messages=[_serialize_removed_message_queue_item(db, message) for message in messages],
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(messages) < total,
    )


@router.patch(
    "/admin/moderation/messages/{message_id}/review",
    response_model=MessageResponse,
)
def update_admin_message_moderation_review(
    message_id: uuid.UUID,
    payload: MessageModerationReviewUpdate,
    request: Request,
    current_user: Annotated[User, Depends(message_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> MessageResponse:
    _validate_moderation_review_payload(payload)
    message = _get_message_or_404(db, message_id)
    if "moderator_note" in payload.model_fields_set:
        message.moderation_note = payload.moderator_note
    if payload.severity is not None:
        message.moderation_severity = payload.severity
    _apply_escalation_review(message, payload.escalation_status, current_user)
    _create_security_event(
        db,
        request,
        current_user,
        "messages.moderation_review_updated",
        metadata={
            "conversation_id": str(message.conversation_id),
            "escalation_status": message.escalation_status,
            "message_id": str(message.id),
            "severity": message.moderation_severity,
        },
    )
    db.commit()
    message = _get_message_or_404(db, message.id)
    return _serialize_message(message, include_moderation=True)


@router.post(
    "/admin/moderation/messages/{message_id}/remove",
    response_model=MessageResponse,
)
def remove_admin_message(
    message_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(message_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
    payload: MessageModerationReviewUpdate | None = None,
) -> MessageResponse:
    payload = payload or MessageModerationReviewUpdate()
    _validate_moderation_review_payload(payload)
    message = _get_message_or_404(db, message_id)
    if message.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only active messages can be removed",
        )

    message.status = "DELETED"
    message.deleted_at = utcnow()
    message.removed_by_user_id = current_user.id
    if "moderator_note" in payload.model_fields_set:
        message.moderation_note = payload.moderator_note
    if payload.severity is not None:
        message.moderation_severity = payload.severity
    _apply_escalation_review(message, payload.escalation_status, current_user)
    _create_security_event(
        db,
        request,
        current_user,
        "messages.message_removed",
        metadata={
            "conversation_id": str(message.conversation_id),
            "message_id": str(message.id),
            "sender_user_id": str(message.sender_user_id) if message.sender_user_id else None,
        },
    )
    db.commit()
    message = _get_message_or_404(db, message.id)
    return _serialize_message(message, include_moderation=True)


@router.post(
    "/admin/moderation/messages/{message_id}/restore",
    response_model=MessageResponse,
)
def restore_admin_message(
    message_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(message_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> MessageResponse:
    message = _get_message_or_404(db, message_id)
    if message.status != "DELETED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only removed messages can be restored",
        )

    message.status = "ACTIVE"
    message.deleted_at = None
    message.removed_by_user_id = None
    _create_security_event(
        db,
        request,
        current_user,
        "messages.message_restored",
        metadata={
            "conversation_id": str(message.conversation_id),
            "message_id": str(message.id),
            "sender_user_id": str(message.sender_user_id) if message.sender_user_id else None,
        },
    )
    db.commit()
    message = _get_message_or_404(db, message.id)
    return _serialize_message(message, include_moderation=True)


@router.get("/blocks", response_model=list[UserBlockResponse])
def list_my_user_blocks(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> list[UserBlockResponse]:
    blocks = db.scalars(
        select(UserBlock)
        .where(UserBlock.blocker_user_id == current_user.id)
        .order_by(UserBlock.created_at.desc())
    ).all()
    return [
        UserBlockResponse(
            id=block.id,
            blocker_user_id=block.blocker_user_id,
            blocked_user_id=block.blocked_user_id,
            blocked_display_name=block.blocked.display_name,
            reason=block.reason,
            created_at=block.created_at,
        )
        for block in blocks
    ]


@router.post("/blocks", response_model=UserBlockResponse, status_code=status.HTTP_201_CREATED)
def block_user(
    payload: UserBlockCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> UserBlockResponse:
    if payload.blocked_user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot block yourself")
    blocked_user = db.scalar(select(User).where(User.id == payload.blocked_user_id))
    if blocked_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    block = db.scalar(
        select(UserBlock).where(
            UserBlock.blocker_user_id == current_user.id,
            UserBlock.blocked_user_id == blocked_user.id,
        )
    )
    if block is None:
        block = UserBlock(
            blocker_user_id=current_user.id,
            blocked_user_id=blocked_user.id,
            reason=payload.reason,
        )
        db.add(block)
    else:
        block.reason = payload.reason

    _create_security_event(
        db,
        request,
        current_user,
        "messages.user_blocked",
        {"blocked_user_id": str(blocked_user.id)},
    )
    db.commit()
    db.refresh(block)
    return UserBlockResponse(
        id=block.id,
        blocker_user_id=block.blocker_user_id,
        blocked_user_id=block.blocked_user_id,
        blocked_display_name=blocked_user.display_name,
        reason=block.reason,
        created_at=block.created_at,
    )


@router.delete("/blocks/{blocked_user_id}", status_code=status.HTTP_204_NO_CONTENT)
def unblock_user(
    blocked_user_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> Response:
    block = db.scalar(
        select(UserBlock).where(
            UserBlock.blocker_user_id == current_user.id,
            UserBlock.blocked_user_id == blocked_user_id,
        )
    )
    if block is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Block not found")

    db.delete(block)
    _create_security_event(
        db,
        request,
        current_user,
        "messages.user_unblocked",
        {"blocked_user_id": str(blocked_user_id)},
    )
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
