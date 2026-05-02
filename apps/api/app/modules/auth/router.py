from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db_session
from app.core.permissions import GlobalRole
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_token,
    utcnow,
    verify_password,
)
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.models import AuthSession, Role, RoleAssignment, SecurityEvent, User
from app.modules.auth.schemas import (
    AuthResponse,
    AuthUser,
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    RegisterRequest,
)

router = APIRouter()


def _request_context(request: Request) -> tuple[str | None, str | None]:
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    if user_agent and len(user_agent) > 255:
        user_agent = user_agent[:255]
    return ip_address, user_agent


def _role_names(user: User) -> list[str]:
    return sorted({assignment.role.name for assignment in user.role_assignments})


def _serialize_user(user: User) -> AuthUser:
    return AuthUser(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        first_name=user.first_name,
        last_name=user.last_name,
        status=user.status,
        email_verified_at=user.email_verified_at,
        roles=_role_names(user),
    )


def _ensure_role(db: Session, role_name: str) -> Role:
    role = db.scalar(select(Role).where(Role.name == role_name))
    if role:
        return role

    role = Role(name=role_name)
    db.add(role)
    db.flush()
    return role


def _create_security_event(
    db: Session,
    request: Request,
    user: User | None,
    event_type: str,
) -> None:
    ip_address, user_agent = _request_context(request)
    db.add(
        SecurityEvent(
            user_id=user.id if user else None,
            event_type=event_type,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    )


def _is_expired(expires_at: datetime) -> bool:
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    return expires_at <= utcnow()


def _issue_auth_response(
    db: Session,
    request: Request,
    user: User,
    event_type: str,
) -> AuthResponse:
    settings = get_settings()
    refresh_token = create_refresh_token()
    ip_address, user_agent = _request_context(request)

    db.add(
        AuthSession(
            user_id=user.id,
            refresh_token_hash=hash_token(refresh_token),
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=utcnow() + timedelta(days=settings.jwt_refresh_token_days),
        )
    )
    _create_security_event(db, request, user, event_type)
    db.commit()
    db.refresh(user)

    roles = _role_names(user)
    return AuthResponse(
        access_token=create_access_token(user.id, roles),
        refresh_token=refresh_token,
        expires_in=settings.jwt_access_token_minutes * 60,
        user=_serialize_user(user),
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db_session)],
) -> AuthResponse:
    existing_user = db.scalar(select(User).where(User.email == payload.email))
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account already exists for this email",
        )

    user = User(
        email=payload.email,
        display_name=payload.display_name,
        first_name=payload.first_name,
        last_name=payload.last_name,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.flush()

    role = _ensure_role(db, GlobalRole.UNVERIFIED_USER.value)
    db.add(RoleAssignment(user_id=user.id, role_id=role.id))
    db.flush()

    return _issue_auth_response(db, request, user, "auth.registered")


@router.post("/login", response_model=AuthResponse)
def login(
    payload: LoginRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db_session)],
) -> AuthResponse:
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user or not verify_password(payload.password, user.password_hash):
        _create_security_event(db, request, user, "auth.login_failed")
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if user.status != "ACTIVE":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is not active")

    return _issue_auth_response(db, request, user, "auth.login_succeeded")


@router.post("/refresh", response_model=AuthResponse)
def refresh(
    payload: RefreshRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db_session)],
) -> AuthResponse:
    refresh_token_hash = hash_token(payload.refresh_token)
    session = db.scalar(
        select(AuthSession).where(AuthSession.refresh_token_hash == refresh_token_hash)
    )
    if not session or session.revoked_at or _is_expired(session.expires_at):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    session.revoked_at = utcnow()
    _create_security_event(db, request, session.user, "auth.refresh_rotated")
    db.flush()
    return _issue_auth_response(db, request, session.user, "auth.refresh_succeeded")


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    payload: LogoutRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db_session)],
) -> Response:
    refresh_token_hash = hash_token(payload.refresh_token)
    session = db.scalar(
        select(AuthSession).where(AuthSession.refresh_token_hash == refresh_token_hash)
    )
    if session and not session.revoked_at:
        session.revoked_at = utcnow()
        _create_security_event(db, request, session.user, "auth.logout")
        db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=AuthUser)
def me(current_user: Annotated[User, Depends(get_current_user)]) -> AuthUser:
    return _serialize_user(current_user)
