import hashlib
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
from app.modules.elections.models import Election, ElectionCandidate, ElectionVote, ElectionVoter
from app.modules.elections.schemas import (
    ElectionAuditEventResponse,
    ElectionAuditResponse,
    ElectionCandidateCreate,
    ElectionCandidateResponse,
    ElectionCreate,
    ElectionListResponse,
    ElectionPrivacyResponse,
    ElectionResponse,
    ElectionResultCandidate,
    ElectionResultsResponse,
    ElectionStatusAction,
    ElectionVoteCreate,
    ElectionVoterResponse,
    ElectionVoterRollResponse,
    ElectionVoterRollUpsert,
)

router = APIRouter()
election_admin_dependency = require_roles(
    GlobalRole.SUPER_ADMIN.value,
    GlobalRole.PLATFORM_ADMIN.value,
    GlobalRole.ELECTION_ADMIN.value,
)

ELECTION_STATUSES = {"ARCHIVED", "CLOSED", "DRAFT", "OPEN"}
ELECTION_SCOPES = {"CHAPTER", "COMMITTEE", "PLATFORM", "REGIONAL"}
RESULTS_VISIBILITY = {"AFTER_CLOSE", "LIVE"}
ACTIVE_CANDIDATE_STATUS = "ACTIVE"
ELIGIBLE_VOTER_STATUS = "ELIGIBLE"


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


def _is_election_admin(user: User) -> bool:
    return has_any_role(
        _user_role_names(user),
        {
            GlobalRole.SUPER_ADMIN.value,
            GlobalRole.PLATFORM_ADMIN.value,
            GlobalRole.ELECTION_ADMIN.value,
        },
    )


def _is_platform_admin(user: User) -> bool:
    return has_any_role(_user_role_names(user), ADMIN_ROLE_NAMES)


def _validate_election_payload(payload: ElectionCreate) -> None:
    if payload.scope_type not in ELECTION_SCOPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid election scope",
        )
    if payload.results_visibility not in RESULTS_VISIBILITY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid results visibility",
        )


def _election_options():
    return [joinedload(Election.creator)]


def _query_elections():
    return select(Election).options(*_election_options())


def _get_election_or_404(db: Session, election_id: uuid.UUID) -> Election:
    election = db.scalar(_query_elections().where(Election.id == election_id))
    if election is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Election not found")
    return election


def _ensure_visible(election: Election, current_user: User) -> None:
    is_creator = election.created_by_user_id == current_user.id
    if (
        election.status == "DRAFT"
        and not is_creator
        and not _is_platform_admin(current_user)
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Election not found")


def _candidate_counts(db: Session, election_ids: list[uuid.UUID]) -> dict[uuid.UUID, int]:
    if not election_ids:
        return {}
    rows = db.execute(
        select(ElectionCandidate.election_id, func.count())
        .where(
            ElectionCandidate.election_id.in_(election_ids),
            ElectionCandidate.status == ACTIVE_CANDIDATE_STATUS,
        )
        .group_by(ElectionCandidate.election_id)
    ).all()
    return {election_id: count for election_id, count in rows}


def _voter_counts(db: Session, election_ids: list[uuid.UUID]) -> dict[uuid.UUID, int]:
    if not election_ids:
        return {}
    rows = db.execute(
        select(ElectionVoter.election_id, func.count())
        .where(
            ElectionVoter.election_id.in_(election_ids),
            ElectionVoter.status == ELIGIBLE_VOTER_STATUS,
        )
        .group_by(ElectionVoter.election_id)
    ).all()
    return {election_id: count for election_id, count in rows}


def _vote_counts(db: Session, election_ids: list[uuid.UUID]) -> dict[uuid.UUID, int]:
    if not election_ids:
        return {}
    rows = db.execute(
        select(ElectionVote.election_id, func.count())
        .where(ElectionVote.election_id.in_(election_ids))
        .group_by(ElectionVote.election_id)
    ).all()
    return {election_id: count for election_id, count in rows}


def _candidate_vote_counts(db: Session, election_id: uuid.UUID) -> dict[uuid.UUID, int]:
    rows = db.execute(
        select(ElectionVote.candidate_id, func.count())
        .where(ElectionVote.election_id == election_id)
        .group_by(ElectionVote.candidate_id)
    ).all()
    return {candidate_id: count for candidate_id, count in rows}


def _get_voter(db: Session, election_id: uuid.UUID, user_id: uuid.UUID) -> ElectionVoter | None:
    return db.scalar(
        select(ElectionVoter).where(
            ElectionVoter.election_id == election_id,
            ElectionVoter.user_id == user_id,
        )
    )


def _aware_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def _has_voted(db: Session, election_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    return (
        db.scalar(
            select(ElectionVote.id).where(
                ElectionVote.election_id == election_id,
                ElectionVote.voter_user_id == user_id,
            )
        )
        is not None
    )


def _can_vote(db: Session, election: Election, current_user: User) -> bool:
    now = utcnow()
    voter = _get_voter(db, election.id, current_user.id)
    return (
        election.status == "OPEN"
        and _aware_datetime(election.starts_at) <= now <= _aware_datetime(election.ends_at)
        and voter is not None
        and voter.status == ELIGIBLE_VOTER_STATUS
        and not _has_voted(db, election.id, current_user.id)
    )


def _serialize_election(
    db: Session,
    election: Election,
    current_user: User,
    *,
    candidate_count: int | None = None,
    voter_count: int | None = None,
    vote_count: int | None = None,
) -> ElectionResponse:
    election_ids = [election.id]
    candidate_count_value = (
        candidate_count
        if candidate_count is not None
        else _candidate_counts(db, election_ids).get(election.id, 0)
    )
    voter_count_value = (
        voter_count
        if voter_count is not None
        else _voter_counts(db, election_ids).get(election.id, 0)
    )
    vote_count_value = (
        vote_count if vote_count is not None else _vote_counts(db, election_ids).get(election.id, 0)
    )
    return ElectionResponse(
        candidate_count=candidate_count_value,
        can_vote=_can_vote(db, election, current_user),
        closed_at=election.closed_at,
        created_at=election.created_at,
        created_by_display_name=election.creator.display_name if election.creator else None,
        created_by_user_id=election.created_by_user_id,
        description=election.description,
        ends_at=election.ends_at,
        has_voted=_has_voted(db, election.id, current_user.id),
        id=election.id,
        opened_at=election.opened_at,
        privacy_mode=election.privacy_mode,
        quorum_count=election.quorum_count,
        results_visibility=election.results_visibility,
        scope_label=election.scope_label,
        scope_type=election.scope_type,
        starts_at=election.starts_at,
        status=election.status,
        summary=election.summary,
        title=election.title,
        updated_at=election.updated_at,
        voter_count=voter_count_value,
        vote_count=vote_count_value,
    )


def _serialize_candidate(
    candidate: ElectionCandidate,
    *,
    vote_count: int = 0,
) -> ElectionCandidateResponse:
    return ElectionCandidateResponse(
        created_at=candidate.created_at,
        display_name=candidate.display_name,
        election_id=candidate.election_id,
        headline=candidate.headline,
        id=candidate.id,
        sort_order=candidate.sort_order,
        statement=candidate.statement,
        status=candidate.status,
        updated_at=candidate.updated_at,
        user_id=candidate.user_id,
        vote_count=vote_count,
    )


def _serialize_voter(voter: ElectionVoter) -> ElectionVoterResponse:
    return ElectionVoterResponse(
        display_name=voter.user.display_name,
        email=voter.user.email,
        id=voter.id,
        invited_at=voter.invited_at,
        status=voter.status,
        user_id=voter.user_id,
        voted_at=voter.voted_at,
    )


def _list_response(
    db: Session,
    query,
    *,
    current_user: User,
    limit: int,
    offset: int,
) -> ElectionListResponse:
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    elections = db.scalars(
        query.order_by(Election.starts_at.desc()).offset(offset).limit(limit)
    ).all()
    election_ids = [item.id for item in elections]
    candidates = _candidate_counts(db, election_ids)
    voters = _voter_counts(db, election_ids)
    votes = _vote_counts(db, election_ids)
    return ElectionListResponse(
        elections=[
            _serialize_election(
                db,
                item,
                current_user,
                candidate_count=candidates.get(item.id, 0),
                voter_count=voters.get(item.id, 0),
                vote_count=votes.get(item.id, 0),
            )
            for item in elections
        ],
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(elections) < total,
    )


def _apply_filters(
    query,
    *,
    q: str | None = None,
    scope_type: str | None = None,
    status_filter: str | None = None,
):
    if q:
        search_term = f"%{q.strip()}%"
        query = query.where(
            or_(
                Election.title.ilike(search_term),
                Election.summary.ilike(search_term),
                Election.description.ilike(search_term),
                Election.scope_label.ilike(search_term),
            )
        )
    normalized_scope = _normalize_enum(scope_type)
    if normalized_scope:
        query = query.where(Election.scope_type == normalized_scope)
    normalized_status = _normalize_enum(status_filter)
    if normalized_status and normalized_status != "ALL":
        query = query.where(Election.status == normalized_status)
    return query


@router.get("", response_model=ElectionListResponse)
@router.get("/", response_model=ElectionListResponse)
def list_elections(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
    q: Annotated[str | None, Query(max_length=120)] = None,
    scope_type: Annotated[str | None, Query(max_length=60)] = None,
    status_filter: Annotated[str | None, Query(alias="status", max_length=40)] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 12,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ElectionListResponse:
    query = _query_elections().where(Election.status.in_(("OPEN", "CLOSED", "ARCHIVED")))
    query = _apply_filters(query, q=q, scope_type=scope_type, status_filter=status_filter)
    return _list_response(db, query, current_user=current_user, limit=limit, offset=offset)


@router.get("/admin", response_model=ElectionListResponse)
@router.get("/admin/", response_model=ElectionListResponse)
def list_admin_elections(
    current_user: Annotated[User, Depends(election_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
    q: Annotated[str | None, Query(max_length=120)] = None,
    scope_type: Annotated[str | None, Query(max_length=60)] = None,
    status_filter: Annotated[str | None, Query(alias="status", max_length=40)] = "ALL",
    limit: Annotated[int, Query(ge=1, le=50)] = 12,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ElectionListResponse:
    query = _query_elections()
    query = _apply_filters(query, q=q, scope_type=scope_type, status_filter=status_filter)
    return _list_response(db, query, current_user=current_user, limit=limit, offset=offset)


@router.post("/admin", response_model=ElectionResponse, status_code=status.HTTP_201_CREATED)
@router.post("/admin/", response_model=ElectionResponse, status_code=status.HTTP_201_CREATED)
def create_election(
    payload: ElectionCreate,
    request: Request,
    current_user: Annotated[User, Depends(election_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ElectionResponse:
    _validate_election_payload(payload)
    election = Election(
        created_by_user_id=current_user.id,
        description=payload.description,
        ends_at=payload.ends_at,
        quorum_count=payload.quorum_count,
        results_visibility=payload.results_visibility,
        scope_label=payload.scope_label,
        scope_type=payload.scope_type,
        starts_at=payload.starts_at,
        status="DRAFT",
        summary=payload.summary,
        title=payload.title,
    )
    db.add(election)
    db.flush()
    _create_security_event(
        db,
        request,
        current_user,
        "elections.created",
        {"election_id": str(election.id), "status": election.status},
    )
    db.commit()
    election = _get_election_or_404(db, election.id)
    return _serialize_election(db, election, current_user)


@router.get("/{election_id}", response_model=ElectionResponse)
def get_election(
    election_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ElectionResponse:
    election = _get_election_or_404(db, election_id)
    _ensure_visible(election, current_user)
    return _serialize_election(db, election, current_user)


@router.get("/{election_id}/candidates", response_model=list[ElectionCandidateResponse])
def list_candidates(
    election_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> list[ElectionCandidateResponse]:
    election = _get_election_or_404(db, election_id)
    _ensure_visible(election, current_user)
    counts = _candidate_vote_counts(db, election.id)
    candidates = db.scalars(
        select(ElectionCandidate)
        .where(ElectionCandidate.election_id == election.id)
        .order_by(ElectionCandidate.sort_order.asc(), ElectionCandidate.created_at.asc())
    ).all()
    return [
        _serialize_candidate(candidate, vote_count=counts.get(candidate.id, 0))
        for candidate in candidates
    ]


@router.post(
    "/admin/{election_id}/candidates",
    response_model=ElectionCandidateResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_candidate(
    election_id: uuid.UUID,
    payload: ElectionCandidateCreate,
    request: Request,
    current_user: Annotated[User, Depends(election_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ElectionCandidateResponse:
    election = _get_election_or_404(db, election_id)
    if election.status != "DRAFT":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Candidates can only be added while the election is in draft",
        )
    candidate_user = None
    if payload.user_email:
        candidate_user = db.scalar(select(User).where(User.email == payload.user_email.lower()))
        if candidate_user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Candidate user was not found",
            )
    candidate = ElectionCandidate(
        display_name=payload.display_name,
        election_id=election.id,
        headline=payload.headline,
        sort_order=payload.sort_order,
        statement=payload.statement,
        status=ACTIVE_CANDIDATE_STATUS,
        user_id=candidate_user.id if candidate_user else None,
    )
    db.add(candidate)
    db.flush()
    _create_security_event(
        db,
        request,
        current_user,
        "elections.candidate_added",
        {"candidate_id": str(candidate.id), "election_id": str(election.id)},
    )
    db.commit()
    return _serialize_candidate(candidate)


@router.get("/admin/{election_id}/voter-roll", response_model=ElectionVoterRollResponse)
def get_voter_roll(
    election_id: uuid.UUID,
    current_user: Annotated[User, Depends(election_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ElectionVoterRollResponse:
    _ = current_user
    election = _get_election_or_404(db, election_id)
    voters = db.scalars(
        select(ElectionVoter)
        .options(joinedload(ElectionVoter.user))
        .where(ElectionVoter.election_id == election.id)
        .order_by(ElectionVoter.invited_at.asc())
    ).all()
    return ElectionVoterRollResponse(voters=[_serialize_voter(voter) for voter in voters])


@router.post("/admin/{election_id}/voter-roll", response_model=ElectionVoterRollResponse)
def upsert_voter_roll(
    election_id: uuid.UUID,
    payload: ElectionVoterRollUpsert,
    request: Request,
    current_user: Annotated[User, Depends(election_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ElectionVoterRollResponse:
    election = _get_election_or_404(db, election_id)
    if election.status != "DRAFT":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Voter roll can only be edited while the election is in draft",
        )
    users = db.scalars(select(User).where(User.email.in_(payload.emails))).all()
    users_by_email = {user.email: user for user in users}
    existing = db.scalars(
        select(ElectionVoter).where(
            ElectionVoter.election_id == election.id,
            ElectionVoter.user_id.in_([user.id for user in users]),
        )
    ).all()
    existing_user_ids = {voter.user_id for voter in existing}
    added_count = 0
    already_present_count = 0
    now = utcnow()
    for user in users:
        if user.id in existing_user_ids:
            already_present_count += 1
            continue
        db.add(
            ElectionVoter(
                election_id=election.id,
                invited_at=now,
                status=ELIGIBLE_VOTER_STATUS,
                user_id=user.id,
            )
        )
        added_count += 1

    not_found = [email for email in payload.emails if email not in users_by_email]
    _create_security_event(
        db,
        request,
        current_user,
        "elections.voter_roll_updated",
        {
            "added_count": added_count,
            "already_present_count": already_present_count,
            "election_id": str(election.id),
            "not_found_count": len(not_found),
        },
    )
    db.commit()
    voters = db.scalars(
        select(ElectionVoter)
        .options(joinedload(ElectionVoter.user))
        .where(ElectionVoter.election_id == election.id)
        .order_by(ElectionVoter.invited_at.asc())
    ).all()
    return ElectionVoterRollResponse(
        added_count=added_count,
        already_present_count=already_present_count,
        not_found=not_found,
        voters=[_serialize_voter(voter) for voter in voters],
    )


@router.post("/admin/{election_id}/open", response_model=ElectionResponse)
def open_election(
    election_id: uuid.UUID,
    payload: ElectionStatusAction,
    request: Request,
    current_user: Annotated[User, Depends(election_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ElectionResponse:
    election = _get_election_or_404(db, election_id)
    if election.status != "DRAFT":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only draft elections can be opened",
        )
    counts = _candidate_counts(db, [election.id])
    voters = _voter_counts(db, [election.id])
    if counts.get(election.id, 0) < 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="At least one candidate is required before opening",
        )
    if voters.get(election.id, 0) < 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="At least one eligible voter is required before opening",
        )
    election.status = "OPEN"
    election.opened_at = utcnow()
    _create_security_event(
        db,
        request,
        current_user,
        "elections.opened",
        {"election_id": str(election.id), "note": payload.note},
    )
    db.commit()
    election = _get_election_or_404(db, election.id)
    return _serialize_election(db, election, current_user)


@router.post("/admin/{election_id}/close", response_model=ElectionResponse)
def close_election(
    election_id: uuid.UUID,
    payload: ElectionStatusAction,
    request: Request,
    current_user: Annotated[User, Depends(election_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ElectionResponse:
    election = _get_election_or_404(db, election_id)
    if election.status != "OPEN":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only open elections can be closed",
        )
    election.status = "CLOSED"
    election.closed_at = utcnow()
    _create_security_event(
        db,
        request,
        current_user,
        "elections.closed",
        {"election_id": str(election.id), "note": payload.note},
    )
    db.commit()
    election = _get_election_or_404(db, election.id)
    return _serialize_election(db, election, current_user)


@router.post("/{election_id}/vote", response_model=ElectionResponse)
def cast_vote(
    election_id: uuid.UUID,
    payload: ElectionVoteCreate,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ElectionResponse:
    election = _get_election_or_404(db, election_id)
    _ensure_visible(election, current_user)
    if election.status != "OPEN":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Election is not open")
    now = utcnow()
    if not _aware_datetime(election.starts_at) <= now <= _aware_datetime(election.ends_at):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Election is outside the voting window",
        )
    voter = _get_voter(db, election.id, current_user.id)
    if voter is None or voter.status != ELIGIBLE_VOTER_STATUS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not eligible to vote in this election",
        )
    if _has_voted(db, election.id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already voted in this election",
        )
    candidate = db.scalar(
        select(ElectionCandidate).where(
            ElectionCandidate.election_id == election.id,
            ElectionCandidate.id == payload.candidate_id,
            ElectionCandidate.status == ACTIVE_CANDIDATE_STATUS,
        )
    )
    if candidate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")

    ballot_hash = hashlib.sha256(
        f"{election.id}:{current_user.id}:{candidate.id}:{now.isoformat()}".encode()
    ).hexdigest()
    db.add(
        ElectionVote(
            ballot_hash=ballot_hash,
            candidate_id=candidate.id,
            cast_at=now,
            election_id=election.id,
            voter_user_id=current_user.id,
        )
    )
    voter.voted_at = now
    _create_security_event(
        db,
        request,
        current_user,
        "elections.vote_cast",
        {"election_id": str(election.id), "vote_id_hash": ballot_hash},
    )
    db.commit()
    election = _get_election_or_404(db, election.id)
    return _serialize_election(db, election, current_user)


def _results_visible(election: Election, current_user: User) -> bool:
    is_creator = election.created_by_user_id == current_user.id
    return (
        election.status in {"CLOSED", "ARCHIVED"}
        or election.results_visibility == "LIVE"
        or is_creator
        or _is_election_admin(current_user)
    )


@router.get("/{election_id}/results", response_model=ElectionResultsResponse)
def get_results(
    election_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ElectionResultsResponse:
    election = _get_election_or_404(db, election_id)
    _ensure_visible(election, current_user)
    visible = _results_visible(election, current_user)
    if not visible:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Election results are not visible yet",
        )
    counts = _candidate_vote_counts(db, election.id)
    total_votes = sum(counts.values())
    candidates = db.scalars(
        select(ElectionCandidate)
        .where(ElectionCandidate.election_id == election.id)
        .order_by(ElectionCandidate.sort_order.asc(), ElectionCandidate.created_at.asc())
    ).all()
    serialized = []
    for candidate in candidates:
        count = counts.get(candidate.id, 0)
        percentage = round((count / total_votes) * 100, 2) if total_votes else 0
        serialized.append(
            ElectionResultCandidate(
                candidate_id=candidate.id,
                display_name=candidate.display_name,
                headline=candidate.headline,
                percentage=percentage,
                vote_count=count,
            )
        )
    eligible_voters = _voter_counts(db, [election.id]).get(election.id, 0)
    return ElectionResultsResponse(
        election=_serialize_election(db, election, current_user),
        eligible_voters=eligible_voters,
        quorum_met=total_votes >= election.quorum_count,
        results_visible=True,
        total_votes=total_votes,
        candidates=serialized,
    )


@router.get("/admin/{election_id}/audit", response_model=ElectionAuditResponse)
def get_election_audit(
    election_id: uuid.UUID,
    current_user: Annotated[User, Depends(election_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ElectionAuditResponse:
    election = _get_election_or_404(db, election_id)
    events = db.scalars(
        select(SecurityEvent)
        .options(joinedload(SecurityEvent.user))
        .where(
            SecurityEvent.event_type.ilike("elections.%"),
            SecurityEvent.metadata_json.is_not(None),
        )
        .order_by(SecurityEvent.created_at.desc())
        .limit(100)
    ).all()
    filtered = [
        event
        for event in events
        if str(event.metadata_json.get("election_id")) == str(election.id)
    ]
    return ElectionAuditResponse(
        election=_serialize_election(db, election, current_user),
        events=[
            ElectionAuditEventResponse(
                created_at=event.created_at,
                event_type=event.event_type,
                id=event.id,
                metadata=event.metadata_json,
                user_display_name=event.user.display_name if event.user else None,
                user_email=event.user.email if event.user else None,
            )
            for event in filtered
        ],
    )


@router.get("/admin/{election_id}/privacy", response_model=ElectionPrivacyResponse)
def get_election_privacy(
    election_id: uuid.UUID,
    current_user: Annotated[User, Depends(election_admin_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> ElectionPrivacyResponse:
    election = _get_election_or_404(db, election_id)
    return ElectionPrivacyResponse(
        audit_note=(
            "This foundation stores one auditable ballot record per eligible voter. "
            "A later privacy-hardening slice should add anonymized ballot envelopes before "
            "production voting."
        ),
        election=_serialize_election(db, election, current_user),
        privacy_mode=election.privacy_mode,
        vote_recording=(
            "One vote per election/user is enforced by a database uniqueness constraint."
        ),
    )
