import uuid
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response, status
from sqlalchemy import distinct, func, select
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_settings
from app.core.database import get_db_session
from app.core.permissions import ADMIN_ROLE_NAMES, GlobalRole
from app.core.rate_limit import RateLimitRule, enforce_rate_limit
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_token,
    utcnow,
    verify_password,
)
from app.core.totp import (
    build_otpauth_url,
    consume_recovery_code,
    decrypt_totp_secret,
    encrypt_totp_secret,
    generate_recovery_codes,
    generate_totp_secret,
    hash_recovery_codes,
    verify_totp_code,
)
from app.modules.auth.dependencies import get_current_user, require_roles
from app.modules.auth.emails import send_email_verification_email, send_password_reset_email
from app.modules.auth.models import (
    AccountToken,
    AuthSession,
    Role,
    RoleAssignment,
    SecurityEvent,
    User,
)
from app.modules.auth.platform_owner import (
    ensure_platform_owner,
    is_platform_owner_email,
    restore_platform_owner_if_needed,
)
from app.modules.auth.schemas import (
    AdminAuditEvent,
    AdminAuditEventListResponse,
    AdminOverview,
    AuthResponse,
    AuthSessionInfo,
    AuthSessionsResponse,
    AuthUser,
    DevTokenResponse,
    ForgotPasswordRequest,
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    SessionRevocationResponse,
    TwoFactorConfirmRequest,
    TwoFactorDisableRequest,
    TwoFactorEnableResponse,
    TwoFactorRecoveryCodesRegenerateRequest,
    TwoFactorRecoveryCodesResponse,
    TwoFactorSetupRequest,
    TwoFactorSetupResponse,
    TwoFactorStatusResponse,
    VerifyEmailRequest,
)

router = APIRouter()
admin_user_dependency = require_roles(*ADMIN_ROLE_NAMES)


def _request_context(request: Request) -> tuple[str | None, str | None]:
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    if user_agent and len(user_agent) > 255:
        user_agent = user_agent[:255]
    return ip_address, user_agent


def _client_key(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _enforce_login_rate_limit(request: Request, email: str) -> None:
    settings = get_settings()
    enforce_rate_limit(
        f"auth:login:{_client_key(request)}:{email}",
        RateLimitRule(
            attempts=settings.login_rate_limit_attempts,
            window_seconds=settings.login_rate_limit_window_seconds,
        ),
    )


def _enforce_password_reset_rate_limit(request: Request, identifier: str) -> None:
    settings = get_settings()
    enforce_rate_limit(
        f"auth:password-reset:{_client_key(request)}:{identifier}",
        RateLimitRule(
            attempts=settings.password_reset_rate_limit_attempts,
            window_seconds=settings.password_reset_rate_limit_window_seconds,
        ),
    )


def _enforce_admin_action_rate_limit(request: Request, user: User, action: str) -> None:
    settings = get_settings()
    enforce_rate_limit(
        f"auth:admin-action:{action}:{_client_key(request)}:{user.id}",
        RateLimitRule(
            attempts=settings.admin_action_rate_limit_attempts,
            window_seconds=settings.admin_action_rate_limit_window_seconds,
        ),
    )


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
        two_factor_enabled=user.two_factor_enabled_at is not None,
        roles=_role_names(user),
    )


def _serialize_session(
    session: AuthSession,
    current_refresh_token_hash: str | None = None,
) -> AuthSessionInfo:
    return AuthSessionInfo(
        id=session.id,
        ip_address=session.ip_address,
        user_agent=session.user_agent,
        created_at=session.created_at,
        expires_at=session.expires_at,
        revoked_at=session.revoked_at,
        is_current=current_refresh_token_hash == session.refresh_token_hash,
        is_active=session.revoked_at is None and not _is_expired(session.expires_at),
    )


def _serialize_audit_event(event: SecurityEvent) -> AdminAuditEvent:
    return AdminAuditEvent(
        id=event.id,
        event_type=event.event_type,
        user_id=event.user_id,
        user_email=event.user.email if event.user else None,
        user_display_name=event.user.display_name if event.user else None,
        ip_address=event.ip_address,
        user_agent=event.user_agent,
        metadata=event.metadata_json,
        created_at=event.created_at,
    )


def _ensure_role(db: Session, role_name: str) -> Role:
    role = db.scalar(select(Role).where(Role.name == role_name))
    if role:
        return role

    role = Role(name=role_name)
    db.add(role)
    db.flush()
    return role


def _is_admin_user(user: User) -> bool:
    return bool(set(_role_names(user)).intersection(ADMIN_ROLE_NAMES))


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


def _is_local_environment() -> bool:
    return get_settings().app_env.lower() in {"local", "development", "dev", "test"}


def _is_expired(expires_at: datetime) -> bool:
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    return expires_at <= utcnow()


def _remaining_recovery_codes(user: User) -> int:
    return len(user.two_factor_recovery_codes_json or [])


def _issue_recovery_codes(user: User) -> list[str]:
    recovery_codes = generate_recovery_codes()
    user.two_factor_recovery_codes_json = hash_recovery_codes(recovery_codes)
    return recovery_codes


def _verify_two_factor_challenge(
    user: User,
    *,
    code: str | None = None,
    recovery_code: str | None = None,
) -> tuple[bool, bool]:
    secret_encrypted = user.two_factor_secret_encrypted
    if not secret_encrypted:
        return False, False

    secret = decrypt_totp_secret(secret_encrypted)
    if code and verify_totp_code(secret, code):
        return True, False

    if recovery_code:
        remaining_hashes = consume_recovery_code(user.two_factor_recovery_codes_json, recovery_code)
        if remaining_hashes is not None:
            user.two_factor_recovery_codes_json = remaining_hashes
            return True, True

    return False, False


def _create_account_token(
    db: Session,
    user: User,
    purpose: str,
    expires_at: datetime,
) -> str:
    token = create_refresh_token()
    db.add(
        AccountToken(
            user_id=user.id,
            token_hash=hash_token(token),
            purpose=purpose,
            expires_at=expires_at,
        )
    )
    return token


def _get_valid_account_token(db: Session, token: str, purpose: str) -> AccountToken:
    account_token = db.scalar(
        select(AccountToken).where(
            AccountToken.token_hash == hash_token(token),
            AccountToken.purpose == purpose,
        )
    )
    if not account_token or account_token.consumed_at or _is_expired(account_token.expires_at):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired token",
        )

    return account_token


def _issue_auth_response(
    db: Session,
    request: Request,
    user: User,
    event_type: str,
    dev_email_verification_token: str | None = None,
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
        dev_email_verification_token=dev_email_verification_token,
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

    settings = get_settings()
    verification_token = _create_account_token(
        db,
        user,
        "email_verification",
        utcnow() + timedelta(hours=settings.email_verification_token_hours),
    )
    send_email_verification_email(user, verification_token)

    return _issue_auth_response(
        db,
        request,
        user,
        "auth.registered",
        dev_email_verification_token=verification_token if _is_local_environment() else None,
    )


@router.post("/login", response_model=AuthResponse)
def login(
    payload: LoginRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db_session)],
) -> AuthResponse:
    _enforce_login_rate_limit(request, payload.email)
    user = db.scalar(select(User).where(User.email == payload.email))
    if is_platform_owner_email(payload.email):
        settings = get_settings()
        if settings.platform_owner_password:
            user = ensure_platform_owner(db, settings.platform_owner_password)
    if not user or not verify_password(payload.password, user.password_hash):
        _create_security_event(db, request, user, "auth.login_failed")
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if user.status != "ACTIVE":
        if is_platform_owner_email(user.email):
            user = restore_platform_owner_if_needed(db, user)
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is not active",
            )
    if user.status != "ACTIVE":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is not active")

    user = restore_platform_owner_if_needed(db, user)
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


@router.get("/me/security", response_model=TwoFactorStatusResponse)
def two_factor_status(
    current_user: Annotated[User, Depends(get_current_user)],
) -> TwoFactorStatusResponse:
    admin_two_factor_required = get_settings().admin_two_factor_required and _is_admin_user(
        current_user
    )
    enabled = current_user.two_factor_enabled_at is not None
    return TwoFactorStatusResponse(
        enabled=enabled,
        admin_two_factor_required=admin_two_factor_required,
        admin_two_factor_satisfied=not admin_two_factor_required or enabled,
        recovery_codes_remaining=_remaining_recovery_codes(current_user),
    )


@router.post("/me/2fa/setup", response_model=TwoFactorSetupResponse)
def setup_two_factor(
    payload: TwoFactorSetupRequest,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> TwoFactorSetupResponse:
    if not verify_password(payload.password, current_user.password_hash):
        _create_security_event(db, request, current_user, "auth.two_factor_setup_failed")
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is invalid",
        )

    if current_user.two_factor_enabled_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Two-factor authentication is already enabled",
        )

    secret = generate_totp_secret()
    current_user.two_factor_secret_encrypted = encrypt_totp_secret(secret)
    _create_security_event(db, request, current_user, "auth.two_factor_setup_started")
    db.commit()

    return TwoFactorSetupResponse(
        secret=secret,
        otpauth_url=build_otpauth_url(secret, current_user.email),
        enabled=False,
    )


@router.post("/me/2fa/confirm", response_model=TwoFactorEnableResponse)
def confirm_two_factor(
    payload: TwoFactorConfirmRequest,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> TwoFactorEnableResponse:
    if not current_user.two_factor_secret_encrypted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Two-factor setup has not been started",
        )

    secret = decrypt_totp_secret(current_user.two_factor_secret_encrypted)
    if not verify_totp_code(secret, payload.code):
        _create_security_event(db, request, current_user, "auth.two_factor_confirm_failed")
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid two-factor code",
        )

    recovery_codes = _issue_recovery_codes(current_user)
    current_user.two_factor_enabled_at = utcnow()
    _create_security_event(db, request, current_user, "auth.two_factor_enabled")
    _create_security_event(db, request, current_user, "auth.two_factor_recovery_codes_issued")
    db.commit()
    db.refresh(current_user)
    return TwoFactorEnableResponse(
        user=_serialize_user(current_user),
        recovery_codes=recovery_codes,
        recovery_codes_remaining=_remaining_recovery_codes(current_user),
    )


@router.post("/me/2fa/disable", response_model=AuthUser)
def disable_two_factor(
    payload: TwoFactorDisableRequest,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> AuthUser:
    if current_user.two_factor_enabled_at is None or not current_user.two_factor_secret_encrypted:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Two-factor authentication is not enabled",
        )

    if not verify_password(payload.password, current_user.password_hash):
        _create_security_event(db, request, current_user, "auth.two_factor_disable_failed")
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is invalid",
        )

    challenge_valid, used_recovery_code = _verify_two_factor_challenge(
        current_user,
        code=payload.code,
        recovery_code=payload.recovery_code,
    )
    if not challenge_valid:
        _create_security_event(db, request, current_user, "auth.two_factor_disable_failed")
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid two-factor code or recovery code",
        )

    current_user.two_factor_secret_encrypted = None
    current_user.two_factor_enabled_at = None
    current_user.two_factor_recovery_codes_json = None
    _create_security_event(db, request, current_user, "auth.two_factor_disabled")
    if used_recovery_code:
        _create_security_event(
            db,
            request,
            current_user,
            "auth.two_factor_disabled_with_recovery_code",
        )
    db.commit()
    db.refresh(current_user)
    return _serialize_user(current_user)


@router.post("/me/2fa/recovery-codes/regenerate", response_model=TwoFactorRecoveryCodesResponse)
def regenerate_two_factor_recovery_codes(
    payload: TwoFactorRecoveryCodesRegenerateRequest,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> TwoFactorRecoveryCodesResponse:
    if current_user.two_factor_enabled_at is None or not current_user.two_factor_secret_encrypted:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Two-factor authentication is not enabled",
        )

    if not verify_password(payload.password, current_user.password_hash):
        _create_security_event(
            db, request, current_user, "auth.two_factor_recovery_codes_regenerate_failed"
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is invalid",
        )

    challenge_valid, used_recovery_code = _verify_two_factor_challenge(
        current_user,
        code=payload.code,
        recovery_code=payload.recovery_code,
    )
    if not challenge_valid:
        _create_security_event(
            db, request, current_user, "auth.two_factor_recovery_codes_regenerate_failed"
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid two-factor code or recovery code",
        )

    recovery_codes = _issue_recovery_codes(current_user)
    _create_security_event(db, request, current_user, "auth.two_factor_recovery_codes_regenerated")
    if used_recovery_code:
        _create_security_event(
            db,
            request,
            current_user,
            "auth.two_factor_recovery_code_consumed",
        )
    db.commit()
    db.refresh(current_user)
    return TwoFactorRecoveryCodesResponse(
        recovery_codes=recovery_codes,
        recovery_codes_remaining=_remaining_recovery_codes(current_user),
    )


@router.get("/sessions", response_model=AuthSessionsResponse)
def list_sessions(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
    x_refresh_token: Annotated[str | None, Header(alias="X-Refresh-Token")] = None,
) -> AuthSessionsResponse:
    current_refresh_token_hash = hash_token(x_refresh_token) if x_refresh_token else None
    sessions = db.scalars(
        select(AuthSession)
        .where(AuthSession.user_id == current_user.id)
        .order_by(AuthSession.created_at.desc())
    ).all()

    return AuthSessionsResponse(
        sessions=[_serialize_session(session, current_refresh_token_hash) for session in sessions]
    )


@router.delete("/sessions/{session_id}", response_model=SessionRevocationResponse)
def revoke_session(
    session_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
    x_refresh_token: Annotated[str | None, Header(alias="X-Refresh-Token")] = None,
) -> SessionRevocationResponse:
    session = db.scalar(
        select(AuthSession).where(
            AuthSession.id == session_id,
            AuthSession.user_id == current_user.id,
        )
    )
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    revoked_current_session = bool(x_refresh_token) and session.refresh_token_hash == hash_token(
        x_refresh_token
    )
    if session.revoked_at is None:
        session.revoked_at = utcnow()
        _create_security_event(db, request, current_user, "auth.session_revoked")
        db.commit()

    return SessionRevocationResponse(
        message="Session revoked.",
        revoked_session_id=session.id,
        revoked_current_session=revoked_current_session,
    )


@router.post("/dev/bootstrap-admin", response_model=AuthUser)
def bootstrap_local_admin(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> AuthUser:
    _enforce_admin_action_rate_limit(request, current_user, "dev-bootstrap-admin")
    if not _is_local_environment():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Local admin bootstrap is disabled outside local development",
        )

    role = _ensure_role(db, GlobalRole.SUPER_ADMIN.value)
    assignment = db.scalar(
        select(RoleAssignment).where(
            RoleAssignment.user_id == current_user.id,
            RoleAssignment.role_id == role.id,
            RoleAssignment.scope_type == "GLOBAL",
            RoleAssignment.scope_id.is_(None),
        )
    )
    if assignment is None:
        db.add(RoleAssignment(user_id=current_user.id, role_id=role.id))

    _create_security_event(db, request, current_user, "auth.dev_admin_bootstrapped")
    db.commit()
    user = db.scalar(select(User).where(User.id == current_user.id))
    return _serialize_user(user or current_user)


@router.get("/admin/overview", response_model=AdminOverview)
def admin_overview(
    current_user: Annotated[User, Depends(admin_user_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
) -> AdminOverview:
    _ = current_user
    now = utcnow()
    total_users = db.scalar(select(func.count(User.id))) or 0
    verified_users = (
        db.scalar(select(func.count(User.id)).where(User.email_verified_at.is_not(None))) or 0
    )
    active_sessions = (
        db.scalar(
            select(func.count(AuthSession.id)).where(
                AuthSession.revoked_at.is_(None),
                AuthSession.expires_at > now,
            )
        )
        or 0
    )
    admin_users = (
        db.scalar(
            select(func.count(distinct(RoleAssignment.user_id)))
            .join(Role)
            .where(Role.name.in_(ADMIN_ROLE_NAMES))
        )
        or 0
    )
    pending_verification_users = (
        db.scalar(
            select(func.count(User.id)).where(
                User.status == "ACTIVE",
                User.email_verified_at.is_(None),
            )
        )
        or 0
    )
    latest_events = db.scalars(
        select(SecurityEvent).order_by(SecurityEvent.created_at.desc()).limit(5)
    ).all()

    return AdminOverview(
        total_users=total_users,
        verified_users=verified_users,
        unverified_users=total_users - verified_users,
        active_sessions=active_sessions,
        admin_users=admin_users,
        pending_verification_users=pending_verification_users,
        latest_security_events=list(latest_events),
    )


@router.get("/admin/audit-events", response_model=AdminAuditEventListResponse)
def list_admin_audit_events(
    current_user: Annotated[User, Depends(admin_user_dependency)],
    db: Annotated[Session, Depends(get_db_session)],
    event_type: Annotated[str | None, Query(max_length=80)] = None,
    user_id: uuid.UUID | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> AdminAuditEventListResponse:
    _ = current_user
    filters = []
    if event_type:
        filters.append(SecurityEvent.event_type.ilike(f"%{event_type.strip()}%"))
    if user_id:
        filters.append(SecurityEvent.user_id == user_id)

    total = db.scalar(select(func.count(SecurityEvent.id)).where(*filters)) or 0
    events = db.scalars(
        select(SecurityEvent)
        .options(joinedload(SecurityEvent.user))
        .where(*filters)
        .order_by(SecurityEvent.created_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()

    return AdminAuditEventListResponse(
        events=[_serialize_audit_event(event) for event in events],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("/password/forgot", response_model=DevTokenResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db_session)],
) -> DevTokenResponse:
    _enforce_password_reset_rate_limit(request, payload.email)
    settings = get_settings()
    user = db.scalar(select(User).where(User.email == payload.email))
    dev_token: str | None = None

    if user and user.status == "ACTIVE":
        token = _create_account_token(
            db,
            user,
            "password_reset",
            utcnow() + timedelta(minutes=settings.password_reset_token_minutes),
        )
        _create_security_event(db, request, user, "auth.password_reset_requested")
        send_password_reset_email(user, token)
        dev_token = token if _is_local_environment() else None

    db.commit()
    return DevTokenResponse(
        message=(
            "If an active account exists for that email, password reset instructions were sent."
        ),
        dev_token=dev_token,
    )


@router.post("/password/reset", response_model=DevTokenResponse)
def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db_session)],
) -> DevTokenResponse:
    _enforce_password_reset_rate_limit(request, payload.token)
    account_token = _get_valid_account_token(db, payload.token, "password_reset")
    user = account_token.user
    user.password_hash = hash_password(payload.new_password)
    account_token.consumed_at = utcnow()

    active_sessions = db.scalars(
        select(AuthSession).where(
            AuthSession.user_id == user.id,
            AuthSession.revoked_at.is_(None),
        )
    )
    for session in active_sessions:
        session.revoked_at = utcnow()

    _create_security_event(db, request, user, "auth.password_reset_completed")
    db.commit()
    return DevTokenResponse(message="Password reset completed.")


@router.post("/email/verify", response_model=AuthUser)
def verify_email(
    payload: VerifyEmailRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db_session)],
) -> AuthUser:
    account_token = _get_valid_account_token(db, payload.token, "email_verification")
    user = account_token.user
    if user.email_verified_at is None:
        user.email_verified_at = utcnow()
    account_token.consumed_at = utcnow()
    _create_security_event(db, request, user, "auth.email_verified")
    db.commit()
    db.refresh(user)
    return _serialize_user(user)
