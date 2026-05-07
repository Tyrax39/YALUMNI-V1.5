import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db_session
from app.core.security import utcnow
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.models import SecurityEvent, User
from app.modules.messages.models import (
    Conversation,
    ConversationParticipant,
    DirectMessage,
    UserBlock,
)
from app.modules.messages.schemas import (
    ConversationCreate,
    ConversationListResponse,
    ConversationParticipantResponse,
    ConversationResponse,
    MessageCreate,
    MessageListResponse,
    MessageReadResponse,
    MessageResponse,
    UserBlockCreate,
    UserBlockResponse,
)
from app.modules.notifications.service import notify_users

router = APIRouter()
MESSAGE_STATUSES = {"ACTIVE", "DELETED"}


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


def _serialize_message(message: DirectMessage) -> MessageResponse:
    return MessageResponse(
        id=message.id,
        conversation_id=message.conversation_id,
        sender_user_id=message.sender_user_id,
        sender_display_name=message.sender.display_name if message.sender else "Deleted user",
        body=message.body,
        status=message.status,
        sent_at=message.sent_at,
        created_at=message.created_at,
        updated_at=message.updated_at,
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

    conversation = _find_direct_conversation(db, current_user.id, participant_user.id)
    created = False
    if conversation is None:
        now = utcnow()
        conversation = Conversation(
            conversation_type="DIRECT",
            created_by_user_id=current_user.id,
        )
        db.add(conversation)
        db.flush()
        db.add_all(
            [
                ConversationParticipant(
                    conversation_id=conversation.id,
                    user_id=current_user.id,
                    last_read_at=now,
                ),
                ConversationParticipant(
                    conversation_id=conversation.id,
                    user_id=participant_user.id,
                ),
            ]
        )
        db.flush()
        conversation = db.scalar(_conversation_query().where(Conversation.id == conversation.id))
        created = True

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
    query = select(DirectMessage).where(DirectMessage.conversation_id == conversation_id)
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
