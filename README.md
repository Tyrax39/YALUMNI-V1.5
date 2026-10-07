# YALUMNI V1.5

Modern rebuild foundation for the YALI Alumni Platform.

This repository is a greenfield rebuild based on the legacy `Tyrax39/Yalumni_V0` domain model and the planning packet in `Yalumni_rebuild_docs`. The legacy Laravel app remains a reference and migration source; this codebase is intentionally a new monorepo.

Current implementation status, frozen baseline, launch blockers, and next
execution slices are tracked canonically in `IMPLEMENTATION_STATUS.md`.

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

For the normal persistent local runtime, set `DATABASE_URL` in the ignored
`apps/api/.env` to a loopback PostgreSQL database, then apply migrations and
verify it before starting the API:

```powershell
npm run migrate:api
npm run verify:local-postgres
```

Docker Compose remains available for an isolated container stack, but it is not
required to use the local PostgreSQL workflow.

## Run Locally

API:

```bash
cd D:\YALUMNI-V1.5
npm run dev:api
```

Web:

```bash
npm run dev:member
```

Notification digest worker:

```bash
npm run worker:api:notification-digests -- --once
```

Remove `--once` to run the worker loop. The worker uses
`NOTIFICATION_DIGEST_WORKER_*` settings and records digest worker events in the
admin audit log.

Contribution expense evidence retention worker:

```bash
npm run worker:api:contribution-expense-retention -- --once
```

Add `--dry-run` to preview cleanup candidates. Remove `--once` to run the
worker loop. The worker uses `CONTRIBUTION_EXPENSE_EVIDENCE_RETENTION_WORKER_*`
settings and records retention worker events in the admin audit log. Set
`CONTRIBUTION_EXPENSE_EVIDENCE_RETENTION_WORKER_LOCK_PROVIDER=REDIS` to enable
the opt-in Redis non-overlap lock for production-style deployments.

Contribution expense evidence malware scanner:

```bash
CONTRIBUTION_EXPENSE_EVIDENCE_MALWARE_SCANNER_PROVIDER=HTTP
CONTRIBUTION_EXPENSE_EVIDENCE_MALWARE_SCANNER_URL=https://scanner.example/scan
```

The default `SIGNATURE_ONLY` provider keeps local denylist checks. The `HTTP`
provider scans expense evidence before storage and fails closed when the scanner
is unavailable or returns an unknown verdict.

Docker:

```bash
docker compose up --build
```

## URLs

- Member/public app: http://localhost:3010
- Admin RBAC console: http://localhost:3011
- Super-admin console: http://localhost:3012
- API health: http://localhost:8002/health
- API docs: http://localhost:8002/docs

## Current Milestone

The current milestone is platform foundation plus the first identity, alumni profile, and verification workflow slices:

- FastAPI app with health endpoint and request ID middleware
- Next.js app with native public landing, login, register, dashboard, and admin surfaces
- Registration, login, refresh, logout, current-user lookup, email verification, password reset, role-gated admin overview, session management, and in-process rate limiting
- Protected platform owner seed, role restoration, and local-only test-account seeding through environment configuration
- Current-user alumni profile, profile photo upload/display, program affiliation, visibility JSON settings, dashboard profile completion panel, verification request submission, private storage-backed evidence uploads, admin review queue, and verified alumni directory search
- Role-gated admin overview, verification queue, audit log viewer, community moderation queues, direct-message report queues, removed-message review, and digest controls
- Direct conversations with participant guards, unread counts, contact blocking, reporting, admin redaction, and restore controls
- Docker Compose for PostgreSQL, Redis, API, three frontend apps, and dedicated workers
- CI workflow for web build and API tests
- Architecture, API, data model, security, migration, development test-account, and project status docs

## Important Launch Note

The planning packet notes that official YALI terminology, URLs, brand permissions, logo usage, and public claims must be validated before public launch. This repository does not assume official endorsement.
