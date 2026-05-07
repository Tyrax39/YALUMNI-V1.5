import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.modules.auth.models import TimestampMixin, User


class Community(Base, TimestampMixin):
    __tablename__ = "communities"
    __table_args__ = (
        Index("ix_communities_type_country", "community_type", "country"),
        Index("ix_communities_slug", "slug"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(140), nullable=False)
    slug: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    community_type: Mapped[str] = mapped_column(String(40), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    country: Mapped[str | None] = mapped_column(String(80))
    city: Mapped[str | None] = mapped_column(String(100))
    sector: Mapped[str | None] = mapped_column(String(120))
    program_name: Mapped[str | None] = mapped_column(String(120))
    cohort_year: Mapped[int | None] = mapped_column(Integer)
    visibility: Mapped[str] = mapped_column(String(40), default="MEMBER_ONLY", nullable=False)
    join_policy: Mapped[str] = mapped_column(String(40), default="OPEN", nullable=False)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )

    created_by_user: Mapped[User | None] = relationship()
    memberships: Mapped[list["CommunityMembership"]] = relationship(
        back_populates="community",
        cascade="all, delete-orphan",
        order_by="CommunityMembership.created_at.asc()",
    )
    invitations: Mapped[list["CommunityInvitation"]] = relationship(
        back_populates="community",
        cascade="all, delete-orphan",
        order_by="CommunityInvitation.created_at.asc()",
    )
    posts: Mapped[list["CommunityPost"]] = relationship(
        back_populates="community",
        cascade="all, delete-orphan",
        order_by="CommunityPost.created_at.desc()",
    )


class CommunityMembership(Base, TimestampMixin):
    __tablename__ = "community_memberships"
    __table_args__ = (
        UniqueConstraint("community_id", "user_id", name="uq_community_membership_user"),
        Index("ix_community_memberships_user_status", "user_id", "status"),
        Index("ix_community_memberships_community_status", "community_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    community_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("communities.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(String(40), default="MEMBER", nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="ACTIVE", nullable=False)
    joined_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    community: Mapped[Community] = relationship(back_populates="memberships")
    user: Mapped[User] = relationship()


class CommunityInvitation(Base, TimestampMixin):
    __tablename__ = "community_invitations"
    __table_args__ = (
        Index("ix_community_invitations_community_status", "community_id", "status"),
        Index("ix_community_invitations_email_status", "invited_email", "status"),
        Index("ix_community_invitations_token_hash", "token_hash"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    community_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("communities.id", ondelete="CASCADE"),
        nullable=False,
    )
    invited_email: Mapped[str] = mapped_column(String(320), nullable=False)
    invited_role: Mapped[str] = mapped_column(String(40), default="MEMBER", nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="PENDING", nullable=False)
    token_hash: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    invited_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    accepted_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    canceled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    community: Mapped[Community] = relationship(back_populates="invitations")
    invited_by_user: Mapped[User | None] = relationship(foreign_keys=[invited_by_user_id])
    accepted_by_user: Mapped[User | None] = relationship(foreign_keys=[accepted_by_user_id])


class CommunityPost(Base, TimestampMixin):
    __tablename__ = "community_posts"
    __table_args__ = (
        Index(
            "ix_community_posts_community_status_created",
            "community_id",
            "status",
            "created_at",
        ),
        Index("ix_community_posts_author_created", "author_user_id", "created_at"),
        Index(
            "ix_community_posts_moderation_escalation", "moderation_severity", "escalation_status"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    community_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("communities.id", ondelete="CASCADE"),
        nullable=False,
    )
    author_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="ACTIVE", nullable=False)
    removed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    removed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    moderation_note: Mapped[str | None] = mapped_column(Text)
    moderation_severity: Mapped[str] = mapped_column(String(40), default="MEDIUM", nullable=False)
    escalation_status: Mapped[str] = mapped_column(String(40), default="NONE", nullable=False)
    escalated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    escalated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    community: Mapped[Community] = relationship(back_populates="posts")
    author: Mapped[User | None] = relationship(foreign_keys=[author_user_id])
    removed_by_user: Mapped[User | None] = relationship(foreign_keys=[removed_by_user_id])
    escalated_by_user: Mapped[User | None] = relationship(foreign_keys=[escalated_by_user_id])
    comments: Mapped[list["CommunityPostComment"]] = relationship(
        back_populates="post",
        cascade="all, delete-orphan",
        order_by="CommunityPostComment.created_at.asc()",
    )
    reactions: Mapped[list["CommunityPostReaction"]] = relationship(
        back_populates="post",
        cascade="all, delete-orphan",
    )
    reports: Mapped[list["CommunityPostReport"]] = relationship(
        back_populates="post",
        cascade="all, delete-orphan",
        order_by="CommunityPostReport.created_at.desc()",
    )


class CommunityPostComment(Base, TimestampMixin):
    __tablename__ = "community_post_comments"
    __table_args__ = (
        Index("ix_community_post_comments_post_status_created", "post_id", "status", "created_at"),
        Index("ix_community_post_comments_author_created", "author_user_id", "created_at"),
        Index(
            "ix_community_post_comments_moderation_escalation",
            "moderation_severity",
            "escalation_status",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("community_posts.id", ondelete="CASCADE"),
        nullable=False,
    )
    author_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="ACTIVE", nullable=False)
    removed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    removed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    moderation_note: Mapped[str | None] = mapped_column(Text)
    moderation_severity: Mapped[str] = mapped_column(String(40), default="MEDIUM", nullable=False)
    escalation_status: Mapped[str] = mapped_column(String(40), default="NONE", nullable=False)
    escalated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    escalated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    post: Mapped[CommunityPost] = relationship(back_populates="comments")
    author: Mapped[User | None] = relationship(foreign_keys=[author_user_id])
    removed_by_user: Mapped[User | None] = relationship(foreign_keys=[removed_by_user_id])
    escalated_by_user: Mapped[User | None] = relationship(foreign_keys=[escalated_by_user_id])


class CommunityPostReaction(Base, TimestampMixin):
    __tablename__ = "community_post_reactions"
    __table_args__ = (
        UniqueConstraint("post_id", "user_id", name="uq_community_post_reaction_user"),
        Index("ix_community_post_reactions_post_type", "post_id", "reaction_type"),
        Index("ix_community_post_reactions_user", "user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("community_posts.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    reaction_type: Mapped[str] = mapped_column(String(40), default="LIKE", nullable=False)

    post: Mapped[CommunityPost] = relationship(back_populates="reactions")
    user: Mapped[User] = relationship()


class CommunityPostReport(Base, TimestampMixin):
    __tablename__ = "community_post_reports"
    __table_args__ = (
        Index("ix_community_post_reports_post_status", "post_id", "status"),
        Index("ix_community_post_reports_reporter_status", "reporter_user_id", "status"),
        Index("ix_community_post_reports_review", "severity", "escalation_status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("community_posts.id", ondelete="CASCADE"),
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

    post: Mapped[CommunityPost] = relationship(back_populates="reports")
    reporter: Mapped[User | None] = relationship(foreign_keys=[reporter_user_id])
    escalated_by_user: Mapped[User | None] = relationship(foreign_keys=[escalated_by_user_id])
    resolved_by_user: Mapped[User | None] = relationship(foreign_keys=[resolved_by_user_id])
