from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.permissions import GlobalRole
from app.core.security import hash_password, utcnow
from app.modules.alumni.models import AlumniProfile, ProgramAffiliation
from app.modules.auth.models import Role, RoleAssignment, User


@dataclass(frozen=True)
class TestAccountSeed:
    email: str
    display_name: str
    roles: tuple[str, ...]
    first_name: str | None = None
    last_name: str | None = None
    profile: dict | None = None
    program: dict | None = None


TEST_ACCOUNT_SEEDS = (
    TestAccountSeed(
        email="test.superadmin@yalumni.local",
        display_name="Test Super Admin",
        first_name="Test",
        last_name="Super Admin",
        roles=(
            GlobalRole.SUPER_ADMIN.value,
            GlobalRole.PLATFORM_ADMIN.value,
            GlobalRole.VERIFICATION_ADMIN.value,
        ),
    ),
    TestAccountSeed(
        email="test.verifier@yalumni.local",
        display_name="Test Verification Admin",
        first_name="Test",
        last_name="Verifier",
        roles=(GlobalRole.VERIFICATION_ADMIN.value,),
    ),
    TestAccountSeed(
        email="test.moderator@yalumni.local",
        display_name="Test Moderator",
        first_name="Test",
        last_name="Moderator",
        roles=(GlobalRole.MODERATOR.value,),
    ),
    TestAccountSeed(
        email="test.alumni@yalumni.local",
        display_name="Test Verified Alumni",
        first_name="Test",
        last_name="Alumni",
        roles=(GlobalRole.ALUMNI_MEMBER.value,),
        profile={
            "headline": "Civic technology organizer",
            "bio": "Demo verified member profile for local directory and dashboard QA.",
            "country": "Ghana",
            "city": "Accra",
            "sector": "Civic technology",
            "organization": "Open Chapter Lab",
            "job_title": "Program Lead",
            "skills": ["Governance", "Data", "Community"],
            "visibility": {
                "email": False,
                "location": True,
                "organization": True,
                "skills": True,
                "programs": True,
            },
        },
        program={
            "program_name": "YALI Regional Leadership Center",
            "cohort_year": 2024,
            "country": "Ghana",
            "city": "Accra",
            "status": "COMPLETED",
        },
    ),
    TestAccountSeed(
        email="test.applicant@yalumni.local",
        display_name="Test Applicant",
        first_name="Test",
        last_name="Applicant",
        roles=(GlobalRole.UNVERIFIED_USER.value,),
    ),
    TestAccountSeed(
        email="qa.superadmin@yalumni.org",
        display_name="QA Super Admin",
        first_name="QA",
        last_name="Super Admin",
        roles=(
            GlobalRole.SUPER_ADMIN.value,
            GlobalRole.PLATFORM_ADMIN.value,
            GlobalRole.VERIFICATION_ADMIN.value,
        ),
    ),
    TestAccountSeed(
        email="qa.platformadmin@yalumni.org",
        display_name="QA Platform Admin",
        first_name="QA",
        last_name="Platform Admin",
        roles=(GlobalRole.PLATFORM_ADMIN.value,),
    ),
    TestAccountSeed(
        email="qa.verifier@yalumni.org",
        display_name="QA Verification Admin",
        first_name="QA",
        last_name="Verifier",
        roles=(GlobalRole.VERIFICATION_ADMIN.value,),
    ),
    TestAccountSeed(
        email="qa.moderator@yalumni.org",
        display_name="QA Moderator",
        first_name="QA",
        last_name="Moderator",
        roles=(GlobalRole.MODERATOR.value,),
    ),
    TestAccountSeed(
        email="qa.finance@yalumni.org",
        display_name="QA Finance Admin",
        first_name="QA",
        last_name="Finance",
        roles=(GlobalRole.FINANCE_ADMIN.value,),
    ),
    TestAccountSeed(
        email="qa.elections@yalumni.org",
        display_name="QA Elections Admin",
        first_name="QA",
        last_name="Elections",
        roles=(GlobalRole.ELECTION_ADMIN.value,),
    ),
    TestAccountSeed(
        email="qa.member1@yalumni.org",
        display_name="QA Member One",
        first_name="QA",
        last_name="Member One",
        roles=(GlobalRole.ALUMNI_MEMBER.value,),
        profile={
            "headline": "Pan-African civic strategist",
            "bio": "QA member account for directory, profile, and dashboard verification.",
            "country": "Kenya",
            "city": "Nairobi",
            "sector": "Public leadership",
            "organization": "YALUMNI QA Circle",
            "job_title": "Community Lead",
            "skills": ["Leadership", "Policy", "Community"],
            "visibility": {
                "email": False,
                "location": True,
                "organization": True,
                "skills": True,
                "programs": True,
            },
        },
        program={
            "program_name": "Mandela Washington Fellowship",
            "cohort_year": 2023,
            "country": "Kenya",
            "city": "Nairobi",
            "status": "COMPLETED",
        },
    ),
    TestAccountSeed(
        email="qa.member2@yalumni.org",
        display_name="QA Member Two",
        first_name="QA",
        last_name="Member Two",
        roles=(GlobalRole.ALUMNI_MEMBER.value,),
        profile={
            "headline": "Regional chapter builder",
            "bio": "QA member account for messages, communities, and event walkthroughs.",
            "country": "Rwanda",
            "city": "Kigali",
            "sector": "Entrepreneurship",
            "organization": "YALUMNI Growth Lab",
            "job_title": "Program Manager",
            "skills": ["Operations", "Mentorship", "Events"],
            "visibility": {
                "email": False,
                "location": True,
                "organization": True,
                "skills": True,
                "programs": True,
            },
        },
        program={
            "program_name": "YALI Regional Leadership Center",
            "cohort_year": 2022,
            "country": "Rwanda",
            "city": "Kigali",
            "status": "COMPLETED",
        },
    ),
    TestAccountSeed(
        email="qa.applicant1@yalumni.org",
        display_name="QA Applicant One",
        first_name="QA",
        last_name="Applicant One",
        roles=(GlobalRole.UNVERIFIED_USER.value,),
    ),
    TestAccountSeed(
        email="qa.applicant2@yalumni.org",
        display_name="QA Applicant Two",
        first_name="QA",
        last_name="Applicant Two",
        roles=(GlobalRole.UNVERIFIED_USER.value,),
    ),
)
TEST_ACCOUNT_ENVIRONMENTS = frozenset({"local", "development", "dev", "test"})


def test_accounts_allowed(app_env: str | None = None) -> bool:
    environment = (app_env or get_settings().app_env).strip().lower()
    return environment in TEST_ACCOUNT_ENVIRONMENTS


def _ensure_role(db: Session, role_name: str) -> Role:
    role = db.scalar(select(Role).where(Role.name == role_name))
    if role:
        return role

    role = Role(name=role_name)
    db.add(role)
    db.flush()
    return role


def _ensure_role_assignment(db: Session, user: User, role_name: str) -> None:
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


def _ensure_demo_profile(db: Session, user: User, seed: TestAccountSeed) -> None:
    if not seed.profile:
        return

    profile = db.scalar(select(AlumniProfile).where(AlumniProfile.user_id == user.id))
    if profile is None:
        profile = AlumniProfile(user_id=user.id)
        db.add(profile)
        db.flush()

    for field, value in seed.profile.items():
        setattr(profile, field, value)
    profile.profile_completed_at = profile.profile_completed_at or utcnow()

    if seed.program:
        existing_program = db.scalar(
            select(ProgramAffiliation).where(
                ProgramAffiliation.profile_id == profile.id,
                ProgramAffiliation.program_name == seed.program["program_name"],
                ProgramAffiliation.cohort_year == seed.program["cohort_year"],
            )
        )
        if existing_program is None:
            db.add(ProgramAffiliation(profile_id=profile.id, **seed.program))


def ensure_test_accounts(
    db: Session,
    password: str | None = None,
    *,
    commit: bool = True,
) -> list[User]:
    settings = get_settings()
    account_password = password or settings.test_accounts_password
    users: list[User] = []

    for seed in TEST_ACCOUNT_SEEDS:
        email = seed.email.strip().lower()
        user = db.scalar(select(User).where(User.email == email))
        if user is None:
            user = User(
                email=email,
                display_name=seed.display_name,
                first_name=seed.first_name,
                last_name=seed.last_name,
                password_hash=hash_password(account_password),
                status="ACTIVE",
                email_verified_at=utcnow(),
            )
            db.add(user)
            db.flush()
        else:
            user.display_name = seed.display_name
            user.first_name = seed.first_name
            user.last_name = seed.last_name
            user.status = "ACTIVE"
            user.email_verified_at = user.email_verified_at or utcnow()
            user.password_hash = hash_password(account_password)

        for role_name in seed.roles:
            _ensure_role_assignment(db, user, role_name)
        _ensure_demo_profile(db, user, seed)
        users.append(user)

    if commit:
        db.commit()
        for user in users:
            db.refresh(user)
    else:
        db.flush()

    return users
