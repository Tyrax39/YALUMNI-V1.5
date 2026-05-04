from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.permissions import ADMIN_ROLE_NAMES, GlobalRole
from app.core.security import hash_password, utcnow
from app.modules.auth.models import Role, RoleAssignment, User

PLATFORM_OWNER_ROLES = tuple(
    sorted(
        {
            *ADMIN_ROLE_NAMES,
            GlobalRole.ALUMNI_MEMBER.value,
        }
    )
)


def platform_owner_email() -> str:
    return get_settings().platform_owner_email.strip().lower()


def is_platform_owner_email(email: str | None) -> bool:
    return bool(email) and email.strip().lower() == platform_owner_email()


def _ensure_role(db: Session, role_name: str) -> Role:
    role = db.scalar(select(Role).where(Role.name == role_name))
    if role:
        return role

    role = Role(name=role_name)
    db.add(role)
    db.flush()
    return role


def ensure_platform_owner(
    db: Session,
    password: str | None = None,
    *,
    commit: bool = True,
) -> User:
    settings = get_settings()
    email = platform_owner_email()
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        if not password:
            raise ValueError("PLATFORM_OWNER_PASSWORD is required to create the platform owner")
        user = User(
            email=email,
            display_name=settings.platform_owner_display_name,
            first_name=settings.platform_owner_display_name,
            password_hash=hash_password(password),
            status="ACTIVE",
            email_verified_at=utcnow(),
        )
        db.add(user)
        db.flush()
    else:
        user.email = email
        user.display_name = settings.platform_owner_display_name
        user.first_name = user.first_name or settings.platform_owner_display_name
        user.status = "ACTIVE"
        user.email_verified_at = user.email_verified_at or utcnow()
        if password:
            user.password_hash = hash_password(password)

    for role_name in PLATFORM_OWNER_ROLES:
        role = _ensure_role(db, role_name)
        assignment = db.scalar(
            select(RoleAssignment).where(
                RoleAssignment.user_id == user.id,
                RoleAssignment.role_id == role.id,
                RoleAssignment.scope_type == "GLOBAL",
                RoleAssignment.scope_id.is_(None),
            )
        )
        if assignment is None:
            db.add(RoleAssignment(user_id=user.id, role_id=role.id))

    if commit:
        db.commit()
        db.refresh(user)
    else:
        db.flush()

    return user


def restore_platform_owner_if_needed(db: Session, user: User) -> User:
    if not is_platform_owner_email(user.email):
        return user

    return ensure_platform_owner(db, commit=True)
