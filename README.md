# YALUMNI V1.5

Modern rebuild foundation for the YALI Alumni Platform.

This repository is a greenfield rebuild based on the legacy `Tyrax39/Yalumni_V0` domain model and the planning packet in `Yalumni_rebuild_docs`. The legacy Laravel app remains a reference and migration source; this codebase is intentionally a new monorepo.

## Stack

- Web: Next.js, React, TypeScript, Tailwind CSS
- API: Python, FastAPI, Pydantic, SQLAlchemy, Alembic
- Data: PostgreSQL, Redis
- Tooling: npm workspaces, pytest, ruff, GitHub Actions, Docker Compose

## Local Setup

```bash
npm install
cd apps/api
python -m pip install -e ".[dev]"
```

Copy `.env.example` to `.env` when you are ready to use local secrets.

## Run Locally

API:

```bash
cd apps/api
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Web:

```bash
npm run dev:web
```

Docker:

```bash
docker compose up --build
```

## URLs

- Web app: http://localhost:3000
- Admin console placeholder: http://localhost:3000/admin
- API health: http://localhost:8000/health
- API docs: http://localhost:8000/docs

## Current Milestone

The current milestone is platform foundation plus the first identity, alumni profile, and verification workflow slices:

- FastAPI app with health endpoint and request ID middleware
- Next.js app with native public landing, login, register, dashboard, and admin surfaces
- Registration, login, refresh, logout, current-user lookup, email verification, password reset, role-gated admin overview, session management, and in-process rate limiting
- Protected platform owner seed, role restoration, and local-only test-account seeding through environment configuration
- Current-user alumni profile, profile photo upload/display, program affiliation, visibility JSON settings, dashboard profile completion panel, verification request submission, private storage-backed evidence uploads, admin review queue, and verified alumni directory search
- Docker Compose for PostgreSQL, Redis, API, and web
- CI workflow for web build and API tests
- Architecture, API, data model, security, migration, development test-account, and project status docs

## Important Launch Note

The planning packet notes that official YALI terminology, URLs, brand permissions, logo usage, and public claims must be validated before public launch. This repository does not assume official endorsement.
