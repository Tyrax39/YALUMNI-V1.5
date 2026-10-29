import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.security import utcnow
from app.modules.auth.models import TimestampMixin, User


class Conversation(Base, TimestampMixin):
    __tablename__ = "conversations"
    __table_args__ = (
        Index("ix_conversations_type_last_message", "conversation_type", "last_message_at"),
        Index("ix_conversations_created_by", "created_by_user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_type: Mapped[str] = mapped_column(String(40), default="DIRECT", nullable=False)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    last_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    created_by_user: Mapped[User | None] = relationship(foreign_keys=[created_by_user_id])
    participants: Mapped[list["ConversationParticipant"]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="ConversationParticipant.created_at.asc()",
    )
    messages: Mapped[list["DirectMessage"]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="DirectMessage.created_at.asc()",
    )
    introduction_requests: Mapped[list["IntroductionRequest"]] = relationship(
        back_populates="conversation"
    )


class ConversationParticipant(Base, TimestampMixin):
    __tablename__ = "conversation_participants"
    __table_args__ = (
        UniqueConstraint("conversation_id", "user_id", name="uq_conversation_participant_user"),
        Index("ix_conversation_participants_user", "user_id"),
        Index("ix_conversation_participants_conversation", "conversation_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(String(40), default="MEMBER", nullable=False)
    last_read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    muted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    conversation: Mapped[Conversation] = relationship(back_populates="participants")
    user: Mapped[User] = relationship()


class DirectMessage(Base, TimestampMixin):
    __tablename__ = "direct_messages"
    __table_args__ = (
        Index("ix_direct_messages_conversation_created", "conversation_id", "created_at"),
        Index("ix_direct_messages_sender_created", "sender_user_id", "created_at"),
        Index(
            "ix_direct_messages_moderation_escalation",
            "moderation_severity",
            "escalation_status",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
    )
    sender_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    removed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="ACTIVE", nullable=False)
    moderation_note: Mapped[str | None] = mapped_column(Text)
    moderation_severity: Mapped[str] = mapped_column(
        String(40),
        default="MEDIUM",
        nullable=False,
    )
    escalation_status: Mapped[str] = mapped_column(String(40), default="NONE", nullable=False)
    escalated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    escalated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        nullable=False,
    )
    edited_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    conversation: Mapped[Conversation] = relationship(back_populates="messages")
    sender: Mapped[User | None] = relationship(foreign_keys=[sender_user_id])
    removed_by_user: Mapped[User | None] = relationship(foreign_keys=[removed_by_user_id])
    escalated_by_user: Mapped[User | None] = relationship(foreign_keys=[escalated_by_user_id])
    reports: Mapped[list["DirectMessageReport"]] = relationship(
        back_populates="message",
        cascade="all, delete-orphan",
        order_by="DirectMessageReport.created_at.desc()",
    )


class DirectMessageReport(Base, TimestampMixin):
    __tablename__ = "direct_message_reports"
    __table_args__ = (
        UniqueConstraint("message_id", "reporter_user_id", name="uq_direct_message_reporter"),
        Index("ix_direct_message_reports_message_status", "message_id", "status"),
        Index("ix_direct_message_reports_reporter_status", "reporter_user_id", "status"),
        Index("ix_direct_message_reports_conversation_status", "conversation_id", "status"),
        Index("ix_direct_message_reports_review", "severity", "escalation_status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("direct_messages.id", ondelete="CASCADE"),
        nullable=False,
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
    )
    reporter_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    reason: Mapped[str] = mapped_column(String(80), nullable=False)
    note: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(40), default="OPEN", nullable=False)
    moderator_note: Mapped[str | None] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String(40), default="MEDIUM", nullable=False)
    escalation_status: Mapped[str] = mapped_column(String(40), default="NONE", nullable=False)
    escalated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    escalated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolved_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    message: Mapped[DirectMessage] = relationship(back_populates="reports")
    conversation: Mapped[Conversation] = relationship()
    reporter: Mapped[User | None] = relationship(foreign_keys=[reporter_user_id])
    escalated_by_user: Mapped[User | None] = relationship(foreign_keys=[escalated_by_user_id])
    resolved_by_user: Mapped[User | None] = relationship(foreign_keys=[resolved_by_user_id])


class UserBlock(Base, TimestampMixin):
    __tablename__ = "user_blocks"
    __table_args__ = (
        UniqueConstraint("blocker_user_id", "blocked_user_id", name="uq_user_block_pair"),
        Index("ix_user_blocks_blocker", "blocker_user_id"),
        Index("ix_user_blocks_blocked", "blocked_user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    blocker_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    blocked_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    reason: Mapped[str | None] = mapped_column(Text)

    blocker: Mapped[User] = relationship(foreign_keys=[blocker_user_id])
    blocked: Mapped[User] = relationship(foreign_keys=[blocked_user_id])


class IntroductionRequest(Base, TimestampMixin):
    __tablename__ = "introduction_requests"
    __table_args__ = (
        Index("ix_introduction_requests_recipient_status", "recipient_user_id", "status"),
        Index("ix_introduction_requests_requester_status", "requester_user_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    requester_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    recipient_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    conversation_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("conversations.id", ondelete="SET NULL"),
    )
    responded_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    note: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(40), default="PENDING", nullable=False)
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    requester: Mapped[User] = relationship(foreign_keys=[requester_user_id])
    recipient: Mapped[User] = relationship(foreign_keys=[recipient_user_id])
    responder: Mapped[User | None] = relationship(foreign_keys=[responded_by_user_id])
    conversation: Mapped[Conversation | None] = relationship(back_populates="introduction_requests")
