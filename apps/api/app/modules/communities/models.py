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
