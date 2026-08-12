from collections.abc import Iterable
from enum import StrEnum


class GlobalRole(StrEnum):
    SUPER_ADMIN = "SUPER_ADMIN"
    PLATFORM_ADMIN = "PLATFORM_ADMIN"
    VERIFICATION_ADMIN = "VERIFICATION_ADMIN"
    MODERATOR = "MODERATOR"
    FINANCE_ADMIN = "FINANCE_ADMIN"
    ELECTION_ADMIN = "ELECTION_ADMIN"
    ALUMNI_MEMBER = "ALUMNI_MEMBER"
    UNVERIFIED_USER = "UNVERIFIED_USER"


ADMIN_ROLE_NAMES = frozenset(
    {
        GlobalRole.SUPER_ADMIN.value,
        GlobalRole.PLATFORM_ADMIN.value,
        GlobalRole.VERIFICATION_ADMIN.value,
        GlobalRole.MODERATOR.value,
        GlobalRole.FINANCE_ADMIN.value,
        GlobalRole.ELECTION_ADMIN.value,
    }
)


def has_any_role(user_roles: Iterable[str], allowed_roles: Iterable[str]) -> bool:
    return bool(set(user_roles).intersection(set(allowed_roles)))
