import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.core.logging import RequestIdMiddleware, SecurityHeadersMiddleware, configure_logging
from app.modules.alumni.router import router as alumni_router
from app.modules.auth.platform_owner import ensure_platform_owner
from app.modules.auth.router import router as auth_router
from app.modules.auth.test_accounts import ensure_test_accounts, test_accounts_allowed
from app.modules.communities.router import router as communities_router
from app.modules.contributions.router import router as contributions_router
from app.modules.elections.router import router as elections_router
from app.modules.events.router import router as events_router
from app.modules.initiatives.router import router as initiatives_router
from app.modules.mentorship.router import router as mentorship_router
from app.modules.messages.router import router as messages_router
from app.modules.notifications.router import router as notifications_router
from app.modules.opportunities.router import router as opportunities_router
from app.modules.resources.router import router as resources_router
from app.modules.success_stories.router import router as success_stories_router
from app.modules.system.router import router as system_router

settings = get_settings()
configure_logging()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    if settings.platform_owner_password:
        db = SessionLocal()
        try:
            ensure_platform_owner(db, settings.platform_owner_password)
            if settings.seed_test_accounts:
                if not test_accounts_allowed(settings.app_env):
                    raise RuntimeError("SEED_TEST_ACCOUNTS is only allowed in local/test envs")
                ensure_test_accounts(db, settings.test_accounts_password)
        finally:
            db.close()

    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="API foundation for the YALI Alumni Platform rebuild.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestIdMiddleware)
app.add_middleware(SecurityHeadersMiddleware)


@app.exception_handler(OperationalError)
async def database_operational_error_handler(_, __: OperationalError) -> JSONResponse:
    return JSONResponse(
        status_code=503,
        content={"detail": "Database temporarily unavailable. Please try again shortly."},
    )


@app.get("/health", tags=["system"])
def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "api",
        "environment": settings.app_env,
    }


@app.get("/release", tags=["system"])
def release_identity() -> dict[str, str | None]:
    return {
        "service": "api",
        "environment": settings.app_env,
        "commit_sha": os.getenv("YALUMNI_RELEASE_SHA") or os.getenv("SOURCE_VERSION"),
        "release_version": os.getenv("YALUMNI_RELEASE_VERSION"),
    }


app.include_router(system_router, prefix="/api/v1/system", tags=["system"])
app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(alumni_router, prefix="/api/v1/alumni", tags=["alumni"])
app.include_router(communities_router, prefix="/api/v1/communities", tags=["communities"])
app.include_router(contributions_router, prefix="/api/v1/contributions", tags=["contributions"])
app.include_router(elections_router, prefix="/api/v1/elections", tags=["elections"])
app.include_router(events_router, prefix="/api/v1/events", tags=["events"])
app.include_router(initiatives_router, prefix="/api/v1/initiatives", tags=["initiatives"])
app.include_router(messages_router, prefix="/api/v1/messages", tags=["messages"])
app.include_router(mentorship_router, prefix="/api/v1/mentorship", tags=["mentorship"])
app.include_router(notifications_router, prefix="/api/v1/notifications", tags=["notifications"])
app.include_router(
    opportunities_router,
    prefix="/api/v1/opportunities",
    tags=["opportunities"],
)
app.include_router(
    resources_router,
    prefix="/api/v1/resources",
    tags=["resources"],
)
app.include_router(
    success_stories_router,
    prefix="/api/v1/success-stories",
    tags=["success-stories"],
)
