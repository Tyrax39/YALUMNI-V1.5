# Runtime Split Status

## Current Slice

The project now has three isolated frontend runtimes backed by one FastAPI service:

- Member/public app: `http://127.0.0.1:3010`
- Admin RBAC console: `http://127.0.0.1:3011`
- Super-admin console: `http://127.0.0.1:3012`
- Backend API: `http://127.0.0.1:8002`

The latest slices wired the separated Admin RBAC console to live verification and moderation APIs,
then added reviewer evidence access and moderation review metadata controls.

## Implemented

- `apps/web` remains the public and alumni/member app.
- `apps/admin-console` is a separate Next app with RBAC-filtered admin surfaces.
- `apps/super-admin-console` is a separate Next app restricted to `SUPER_ADMIN`.
- `packages/frontend-shared` contains shared role rules, route constants, design tokens, and proxy-aware API helpers.
- Public navigation no longer exposes member-only features before login.
- Member dashboard has been rebuilt as a dashboard hub with live API widgets and links to dedicated routes.
- Admin verification on `3011` now loads pending verification requests from the live backend and supports approve, reject, and request-info actions.
- Admin verification on `3011` exposes attached evidence files through authenticated download links.
- Admin moderation on `3011` now loads community post reports, removed posts/comments, direct-message reports, and removed direct messages from the live backend, with resolve/remove/restore actions.
- Admin moderation on `3011` supports moderator notes, severity, and escalation status review updates for live community and direct-message moderation items.
- `npm run smoke:rbac` checks public-nav visibility, anonymous API blocking, and super-admin access across the member, admin, and super-admin apps when local credentials are supplied through environment variables.
- Backend CORS/env defaults include ports `3010`, `3011`, and `3012`.

## RBAC Surface Map

- `VERIFICATION_ADMIN`: verification queue.
- `MODERATOR`: moderation, opportunities, resources, success stories.
- `FINANCE_ADMIN`: treasury and contributions.
- `ELECTION_ADMIN`: election tools.
- `PLATFORM_ADMIN`: broad operational admin surfaces except super-admin-only diagnostics.
- `SUPER_ADMIN`: all admin surfaces and the isolated super-admin console.

## Remaining Gaps

- Admin verification still needs inline evidence preview; authenticated evidence download is implemented.
- Admin moderation has live review-note/severity/escalation edit forms; bulk filters, pagination, and richer audit detail are still pending in `3011`.
- Events, elections, contributions, opportunities, resources, mentorship, initiatives, stories, treasury, and analytics still need backend modules.
- Route-level backend RBAC exists for current auth/admin APIs, but every future module must add backend enforcement before enabling write actions.
- Super-admin diagnostics are read-only until backend diagnostic/action endpoints are designed.
