# Architecture

## Decision

YALUMNI V1.5 uses a greenfield modular monorepo. The legacy Laravel app remains a reference and migration source.

## Monorepo Layout

```text
apps/
  web/        Next.js public/member/admin UI
  api/        FastAPI backend
  workers/    Future background worker entrypoints
packages/
  ui/         Shared design tokens and UI primitives
  types/      Shared generated/API types
  config/     Shared lint and environment configs
infra/        Docker, deployment, and CI/CD assets
scripts/      Legacy import and seed tools
docs/         Product and technical documentation
```

## Runtime Topology

```text
Browser/PWA
  -> Next.js web app
  -> FastAPI REST API
  -> PostgreSQL
  -> Redis
  -> Object storage
  -> Search index
  -> Queue workers
```

## Architectural Principles

- API-first and versioned under `/api/v1`.
- Modular monolith before microservices.
- Privacy-by-default profile and directory data.
- Trust-first verification and audit workflows.
- RBAC plus scoped roles for communities, events, elections, and campaigns.
- Append-only records for financial ledgers and election audit events.
- Mobile-first member UX and desktop-powerful admin UX.

## Current Foundation

- FastAPI exposes `/health` and `/api/v1/system/status`.
- Next.js exposes `/`, `/login`, `/register`, `/dashboard`, and `/admin`.
- Docker Compose defines PostgreSQL, Redis, API, and web services.
- CI defines separate web and API checks.

## Near-Term Architecture Work

- Add SQLAlchemy models and Alembic migrations.
- Add JWT access tokens and refresh token sessions.
- Add auth dependencies and permission guards.
- Add OpenAPI-driven TypeScript type generation.
- Add worker process after notifications and email flows begin.

