from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.logging import RequestIdMiddleware, configure_logging
from app.modules.alumni.router import router as alumni_router
from app.modules.auth.router import router as auth_router
from app.modules.system.router import router as system_router

settings = get_settings()
configure_logging()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="API foundation for the YALI Alumni Platform rebuild.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestIdMiddleware)


@app.get("/health", tags=["system"])
def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "api",
        "environment": settings.app_env,
    }


app.include_router(system_router, prefix="/api/v1/system", tags=["system"])
app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(alumni_router, prefix="/api/v1/alumni", tags=["alumni"])
