import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db_session
from app.core.permissions import has_any_role
from app.core.security import decode_access_token
from app.modules.auth.models import User
from app.modules.auth.platform_owner import restore_platform_owner_if_needed

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db_session)],
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)
        user_id = uuid.UUID(str(payload["sub"]))
    except (KeyError, TypeError, ValueError) as exc:
        raise unauthorized from exc

    user = db.scalar(select(User).where(User.id == user_id))
    if user is None:
        raise unauthorized

    user = restore_platform_owner_if_needed(db, user)
    if user.status != "ACTIVE":
        raise unauthorized

    return user


def _user_role_names(user: User) -> list[str]:
    return [assignment.role.name for assignment in user.role_assignments]


def require_roles(*allowed_roles: str):
    def dependency(current_user: Annotated[User, Depends(get_current_user)]) -> User:
        if not has_any_role(_user_role_names(current_user), allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource",
            )

        return current_user

    return dependency
