import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.modules.auth.models import TimestampMixin, User


class Election(Base, TimestampMixin):
    __tablename__ = "elections"
    __table_args__ = (
        Index("ix_elections_status_dates", "status", "starts_at", "ends_at"),
        Index("ix_elections_scope_status", "scope_type", "status"),
        Index("ix_elections_creator_status", "created_by_user_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    summary: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    scope_type: Mapped[str] = mapped_column(String(60), default="PLATFORM", nullable=False)
    scope_label: Mapped[str | None] = mapped_column(String(160))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="DRAFT", nullable=False)
    results_visibility: Mapped[str] = mapped_column(
        String(40),
        default="AFTER_CLOSE",
        nullable=False,
    )
    privacy_mode: Mapped[str] = mapped_column(
        String(60),
        default="BALLOT_LINKED_AUDIT",
        nullable=False,
    )
    quorum_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    opened_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    creator: Mapped[User | None] = relationship(foreign_keys=[created_by_user_id])
    candidates: Mapped[list["ElectionCandidate"]] = relationship(cascade="all, delete-orphan")
    voters: Mapped[list["ElectionVoter"]] = relationship(cascade="all, delete-orphan")
    votes: Mapped[list["ElectionVote"]] = relationship(cascade="all, delete-orphan")


class ElectionCandidate(Base, TimestampMixin):
    __tablename__ = "election_candidates"
    __table_args__ = (
        Index("ix_election_candidates_election_status", "election_id", "status"),
        Index("ix_election_candidates_election_sort", "election_id", "sort_order"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    election_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("elections.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    display_name: Mapped[str] = mapped_column(String(160), nullable=False)
    headline: Mapped[str | None] = mapped_column(String(180))
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="ACTIVE", nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    user: Mapped[User | None] = relationship(foreign_keys=[user_id])


class ElectionVoter(Base, TimestampMixin):
    __tablename__ = "election_voters"
    __table_args__ = (
        UniqueConstraint("election_id", "user_id", name="uq_election_voter_user"),
        Index("ix_election_voters_election_status", "election_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    election_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("elections.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(String(40), default="ELIGIBLE", nullable=False)
    invited_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    voted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship(foreign_keys=[user_id])


class ElectionVote(Base, TimestampMixin):
    __tablename__ = "election_votes"
    __table_args__ = (
        UniqueConstraint("election_id", "voter_user_id", name="uq_election_vote_user"),
        Index("ix_election_votes_election_candidate", "election_id", "candidate_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    election_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("elections.id", ondelete="CASCADE"),
        nullable=False,
    )
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("election_candidates.id", ondelete="CASCADE"),
        nullable=False,
    )
    voter_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    ballot_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    cast_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    candidate: Mapped[ElectionCandidate] = relationship(foreign_keys=[candidate_id])
    voter: Mapped[User] = relationship(foreign_keys=[voter_user_id])
