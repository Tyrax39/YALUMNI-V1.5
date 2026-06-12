# Project Status Analysis

Prepared on 2026-05-02 from local workspace `C:\xampp\htdocs\yalumni-v0` and rebuild target `D:\YALUMNI-V1.5`.

## Executive Summary

The current Yalumni project is a useful Laravel 9 alumni management platform, but it is not the right long-term foundation for the requested product. It already proves many domain concepts: alumni profiles, public pages, directory search, posts, events, direct chat, memberships, transactions, roles, settings, multi-tenancy concepts, and optional donation/committee add-ons. The rebuild docs correctly recommend a greenfield monorepo using Next.js, TypeScript, FastAPI, PostgreSQL, Redis, and a modular product architecture.

The V1.5 implementation is active in `D:\YALUMNI-V1.5`. The new repository now contains a platform foundation with a FastAPI backend, Next.js web shell, Docker Compose, CI workflow, shared packages, copied YALUMNI logo assets, and documentation.

## Current V1.5 Implementation Update: 2026-06-12 Legacy Admin Content Route Handoff Slice

Completed after the community leader dashboard live slice:

- Replaced the stale member-app prototype routes for `/admin/opportunities`,
  `/admin/resources`, and `/admin/success-stories` with guarded handoffs into
  the separate RBAC admin console.
- The handoff now preserves admin auth gating in the member app, then redirects
  to the already-live admin-console moderation routes instead of rendering dead
  prototype shells.
- Added environment-aware admin-console URL resolution so local member-app
  routes hand off to port `3011`, while deployed member hostnames can map from
  `member` to `admin` without another hardcoded localhost-only redirect.

Current plan position:

- Route parity and runtime separation both improve because three legacy admin
  routes now terminate in live admin functionality instead of fixture-backed
  placeholders.
- Overall 24-week MVP-plus implementation moves from roughly 82% to roughly 83%
  complete as an estimate.

Frozen/protected behavior:

- Existing separate admin-console moderation queues, member publishing flows,
  and backend moderation APIs remain unchanged.
- The member app now serves only as a secure bridge for these three legacy
  admin paths; no moderation data contract changed.

## Current V1.5 Implementation Update: 2026-06-12 Community Leader Dashboard Live Slice

Completed after the live content hub pagination slice:

- Replaced the prototype `/communities/[communityId]/dashboard` export route
  with a real live leadership surface backed by the existing communities API.
- The dedicated route now loads live community profile data, active members,
  pending approvals, invitations, recent posts, and open report counts.
- Existing community detail behavior, join/leave controls, invitations,
  publishing, moderation, and ownership flows remain unchanged on the live
  community detail route.

Current plan position:

- Route parity improves again because another previously prototype-backed
  exported route now uses live API data instead of the generic feature shell.
- Overall 24-week MVP-plus implementation moves from roughly 81% to roughly 82%
  complete as an estimate.

Frozen/protected behavior:

- The existing `/communities` listing route and `/communities/[communityId]`
  operational detail route remain unchanged.
- This slice adds a dedicated live overview route for leaders without changing
  current API contracts or community moderation behavior.

## Current V1.5 Implementation Update: 2026-06-11 Live Content Hub Pagination Slice

Completed after the staging auth parity and deployment parity work:

- Added paginated load-more behavior to the live member resources,
  opportunities, and success stories hubs using the existing API `limit`,
  `offset`, and `has_more` response contracts.
- Reconciled stale screen parity entries for resources, opportunities, and
  success stories. These member routes are live API-backed, while the remaining
  gaps are deeper admin detail routes and production-hardening workflows.

Current plan position:

- Content discovery and publishing moves from partially reconciled to stronger
  live member coverage because published lists no longer stop at the first
  server page.
- Overall 24-week MVP-plus implementation moves from roughly 80% to roughly 81%
  complete as an estimate.

Frozen/protected behavior:

- Existing filters, member submissions, detail routes, admin review queues, auth
  gates, and API contracts remain unchanged.
- The new behavior only appends the next live API page when the backend reports
  `has_more`.

## Current V1.5 Implementation Update: 2026-06-04 Staging Auth Parity And QA Account Expansion Slice

Completed after the election audit CSV export slice:

- Added ten managed `@yalumni.org` QA accounts covering super-admin,
  platform-admin, verification, moderation, finance, elections,
  verified-member, and applicant flows.
- Extended the existing test-account seed script with an explicit
  `--allow-nonlocal` flag so the same managed QA account set can be seeded into
  staging deliberately without weakening normal runtime behavior.
- Confirmed the Azure login mismatch as a staging platform-owner password drift
  issue rather than a frontend-route or API-base-URL regression.

Current plan position:

- Deployment readiness improves materially because staging now has a repeatable
  path for QA account provisioning and owner-password parity verification.
- Overall 24-week MVP-plus implementation moves from roughly 79% to roughly 80%
  complete as an estimate because this slice closes an operational gap but does
  not introduce a new product module.

Frozen/protected behavior:

- Existing auth routes, login payloads, role restoration, and frontend auth
  flows remain unchanged.
- Runtime test-account auto-seeding remains local-only unless an operator
  deliberately runs the seed script with `--allow-nonlocal`.

## Current V1.5 Implementation Update: 2026-06-03 Election Audit CSV Export Slice

Completed after the election candidate review controls slice:

- Added a role-protected election audit CSV export endpoint backed by the
  existing live election audit events.
- Added an admin-console `Audit CSV` download action for the selected election
  in the existing live election lifecycle panel.
- Added focused API coverage for CSV headers, event content, attachment
  filename, and non-admin denial.

Current plan position:

- Post-MVP elections moves from roughly 70% to roughly 72% complete because
  election audit evidence is now exportable as a live CSV foundation.
- Overall 24-week MVP-plus implementation remains roughly 79% complete as an
  estimate because signed/certified audit packets, dispute workflows, and
  dedicated legacy admin detail routes are still future work.

Frozen/protected behavior:

- Existing JSON audit responses, election lifecycle operations, candidate
  review, voter rolls, vote casting, and results behavior remain unchanged.
- The new export reuses the existing audit event scope and RBAC boundary.

## Current V1.5 Implementation Update: 2026-05-31 Election Candidate Review Controls Slice

Completed after the member elections pagination slice:

- Added draft-only election candidate status review to the live elections API,
  allowing election admins to mark candidates `ACTIVE` or `REJECTED`.
- Added the corresponding admin-console controls inside the existing live
  election lifecycle panel, preserving the separate admin app on `3011`.
- Added focused API coverage for candidate rejection, re-approval, non-admin
  denial, and open-election lockout.

Current plan position:

- Post-MVP elections moves from roughly 68% to roughly 70% complete because the
  candidate review/control gap now has a live API and admin-console path.
- Overall 24-week MVP-plus implementation remains roughly 79% complete as an
  estimate because this was a focused governance hardening slice, not a new
  product module.

Frozen/protected behavior:

- Existing election creation, candidate creation, voter roll, open/close,
  voting, results, and audit behavior remain unchanged.
- Candidate review is intentionally limited to draft elections; open and closed
  elections still reject candidate status changes.

## Current V1.5 Implementation Update: 2026-05-30 Member Elections Pagination Slice

Completed after the mentor discovery pagination slice:

- Added paginated load-more behavior to the member `/elections` hub using the
  existing election API `limit`, `offset`, and `has_more` response contract.
- Reconciled the screen parity trackers with the current codebase: member
  election hub, voting, and results routes already use live election APIs, and
  the separate admin console already owns election lifecycle, candidate, voter
  roll, open, and close operations.
- No election database schema, backend route, or API response contract changed
  in this slice.

Current plan position:

- Post-MVP elections moves from the stale 24% estimate to roughly 68% complete
  because core election records, voter rolls, ballots, member voting/results,
  admin lifecycle controls, and API tests already exist.
- Overall 24-week MVP-plus implementation moves from roughly 78% to roughly
  79% complete as an estimate.

Frozen/protected behavior:

- Existing election detail, vote casting, result rendering, admin-console
  election lifecycle, candidate, voter-roll, open, and close behavior remain
  unchanged.
- Future election slices should preserve the current live API contract and focus
  on nominations, candidate approval/rejection, certified audit exports,
  chapter/cohort voter-roll imports, notifications, and dedicated admin detail
  subroutes.

## Current V1.5 Implementation Update: 2026-05-30 Mentor Discovery Pagination Slice

Completed after the introduction requests live messaging slice:

- Added pagination support to `/mentorship/find` so members can load additional
  live mentor profiles from the existing mentorship API instead of seeing only
  the first page of results.
- Reconciled the mentorship status trackers with the current codebase: mentor
  profiles, mentor discovery, mentor settings, mentorship requests, request
  review, cancellation, and mentorship summary APIs already exist and are used
  by the member routes.
- No new mentorship database schema or API contract was added in this slice.

Current plan position:

- Post-MVP mentorship moves from the stale 18% estimate to roughly 72% complete
  because the backend and member-facing routes are live; remaining work is more
  about matching quality, notifications/deeper handoffs, analytics, and admin
  oversight.
- Overall 24-week MVP-plus implementation moves from roughly 77% to roughly
  78% complete as an estimate.

Frozen/protected behavior:

- Existing mentor search filters, mentor profile settings, mentorship request
  creation, accept/decline, cancellation, and dashboard summary behavior remain
  unchanged.
- The new load-more control uses the existing `limit`, `offset`, and `has_more`
  contract returned by the mentorship API.

## Current V1.5 Implementation Update: 2026-05-29 Introduction Requests Live Messaging Slice

Completed after the member dashboard community feed slice:

- Replaced the `/messages/introductions` fixture prototype with a live
  member-only introduction center.
- The route now uses existing verified alumni directory search and direct
  conversation APIs to start and continue introduction handoff threads.
- No new backend request-state schema was added; accept, decline, brokered
  handoff, and mentorship-linked introduction states remain future backend
  work.

Current plan position:

- Phase 7 messaging/notifications moves from roughly 51% to roughly 54%
  complete because another exported messaging surface now uses live APIs.
- Overall 24-week MVP-plus implementation moves from roughly 76% to roughly
  77% complete as an estimate.

Frozen/protected behavior:

- Existing `/messages`, `/messages/new`, and `/messages/[conversationId]`
  direct messaging behavior remains unchanged.
- The route uses existing `listConversations`, `searchAlumniDirectory`, and
  `createDirectConversation` client helpers; no API contract changed.

## Current V1.5 Implementation Update: 2026-05-28 Member Dashboard Community Feed Slice

Completed after the member dashboard live bento slice:

- Added `Community feed highlights` to `/dashboard`, using existing
  membership-scoped community reads and existing community post APIs.
- The feed only pulls from communities returned by `membership=mine`, then
  requests active posts for those communities. It does not expose public or
  non-member community posts through the dashboard.
- Existing dashboard metrics, event panels, initiative panels, auth/RBAC
  behavior, routes, and backend contracts were not changed.

Current plan position:

- Phase 2 remains roughly 97% complete because this was a focused dashboard
  parity improvement inside an already-live route.
- Overall 24-week MVP-plus implementation remains roughly 76% complete as an
  estimate.

Frozen/protected behavior:

- Dashboard community counts still use the existing visible-community API call.
- Feed highlights are read-only links back to community detail pages; no post
  creation, reaction, comment, moderation, or media behavior changed.

## Current V1.5 Implementation Update: 2026-05-28 Member Dashboard Live Bento Slice

Completed after the full-width dashboard shell slice:

- Added member-dashboard panels for upcoming events and active initiatives,
  matching the `member_dashboard` export's bento-style dashboard intent without
  using screenshots or exported HTML.
- Reused the existing live event and initiative client APIs, so the dashboard
  now surfaces current member workspace activity alongside profile,
  verification, notifications, communities, messages, sessions, and 2FA status.
- Existing dashboard routes, app shell, auth/RBAC behavior, public navigation,
  and backend contracts were not changed.

Current plan position:

- Phase 2 is now roughly 97% complete because the primary member dashboard
  route has stronger design parity and live workspace context.
- Overall 24-week MVP-plus implementation remains roughly 76% complete as an
  estimate because this was a frontend live-context alignment slice, not a new
  backend feature module.

Frozen/protected behavior:

- Existing profile, verification, notification, community, message, session,
  2FA, event, and initiative API client contracts remain unchanged.
- Future dashboard slices should preserve the live summary cards and avoid
  replacing them with static fixture-only dashboard data.

## Current V1.5 Implementation Update: 2026-05-28 Full-Width Dashboard Shell Slice

Completed after the local auth runtime fix:

- Removed the fixed centered `max-w-[1500px]` dashboard shell wrappers from the
  authenticated member app, admin console, and super-admin console.
- The shared dashboard chrome now uses full-width header and content grid
  containers so wide screens no longer show large empty side gutters around the
  dashboard surface.
- Public landing/auth pages and individual feature screen internals were not
  changed in this slice.

Current plan position:

- This improves UI shell fidelity and responsive dashboard behavior but does
  not change backend feature completion.
- Phase 2 remains roughly 96% complete.
- Overall 24-week MVP-plus implementation remains roughly 76% complete as an
  estimate.

Frozen/protected behavior:

- Auth routing, RBAC gating, dashboard data loading, dashboard cards, public
  navigation, and all API contracts remain unchanged.
- Future layout-only slices should avoid restyling individual dashboard cards
  unless a specific screen or breakpoint requires it.

## Current V1.5 Implementation Update: 2026-05-28 Local Auth Runtime Fix

Completed after the verification screen slice:

- Diagnosed the member/admin login "Internal Server Error" as a local API
  runtime database configuration issue, not a frontend auth-form regression.
- The running API had fallen back to the default PostgreSQL URL
  `postgresql+psycopg://postgres:postgres@localhost:5432/yali_alumni`, but the
  local PostgreSQL listener rejected that password. Login failed before user
  lookup or password verification.
- Restarted the local API on `127.0.0.1:8002` with the existing local SQLite
  development database at `.local/yalumni.sqlite3`, then re-seeded the protected
  platform owner and test accounts into that local database.
- Verified the platform owner login through the API, member session proxy,
  admin session proxy, and super-admin session proxy.

Current plan position:

- No product feature percentage changed; this was an operational local runtime
  repair.
- Overall 24-week MVP-plus implementation remains roughly 76% complete as an
  estimate.

Frozen/protected behavior:

- No auth code, schemas, routes, password rules, session cookies, CSRF checks,
  RBAC rules, or frontend login UI were changed.
- The protected platform owner account remains active with all member and admin
  roles in the local development database.
- The API must be started with a valid `DATABASE_URL`; for current local QA that
  is the ignored SQLite database under `.local/yalumni.sqlite3`.

## Current V1.5 Implementation Update: 2026-05-28 UI Phase 2 Verification Screen Slice

Completed after the profile setup screen slice:

- Replaced the `/verification` generic app-shell panel with a focused Step 3
  credentials submission screen based on the `alumni_verification` export.
- The screen now presents the verification workflow, current profile/program
  snapshot, existing request status, evidence attachments, evidence upload, and
  trust context while preserving the existing live verification APIs.
- Existing request submission rules, evidence upload rules, route paths,
  authenticated access, admin verification queues, profile setup, and program
  affiliation behavior were not changed.
- Updated the screen parity tracker so `alumni_verification` now reflects the
  dedicated focused UI instead of a generic verification panel.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 is now roughly 96% complete because the verification request,
  profile setup, program affiliation, onboarding, and submitted confirmation
  surfaces now have focused code-native implementations using live APIs where
  available.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury remains roughly 70% complete.
- Overall 24-week MVP-plus implementation remains roughly 76% complete as an
  estimate.

Frozen/protected behavior:

- `/verification` remains authenticated-only and uses existing
  `getMyAlumniProfile`, `getMyVerificationRequests`,
  `submitVerificationRequest`, and `uploadVerificationEvidence` client helpers.
- Existing verification submission eligibility remains unchanged: profile
  completion must be 100% and there must not already be a pending review.
- Evidence upload availability remains tied to the existing request status
  rules.

## Current V1.5 Implementation Update: 2026-05-28 UI Phase 2 Profile Setup Screen Slice

Completed after the program affiliation screen slice:

- Replaced the `/profile/setup` shared app-shell editor surface with a
  focused Step 4 profile setup screen based on the `complete_your_profile`
  export.
- The screen now keeps members in the onboarding-style flow while preserving
  the existing live profile save API, profile photo upload/removal API, skill
  editing, public links, and completion status.
- Existing `/profile/program-affiliation`, `/verification`, onboarding routes,
  route paths, auth guard behavior, and backend API contracts were not changed.
- Updated the screen parity tracker so `complete_your_profile` now reflects the
  dedicated focused UI instead of a generic shared profile panel.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 is now roughly 95% complete because profile setup, program
  affiliation, verification, onboarding, and submitted confirmation surfaces
  now have focused code-native implementations using live APIs where available.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury remains roughly 70% complete.
- Overall 24-week MVP-plus implementation remains roughly 75% complete as an
  estimate.

Frozen/protected behavior:

- `/profile/setup` remains authenticated-only and uses existing
  `getMyAlumniProfile`, `updateMyAlumniProfile`, `uploadProfilePhoto`, and
  `deleteProfilePhoto` client helpers.
- `/profile/program-affiliation` remains the focused Step 2 program selection
  screen and should not be modified by future profile-setup-only slices unless
  explicitly requested.
- Existing verification submission and onboarding confirmation routes remain
  unchanged.

## Current V1.5 Implementation Update: 2026-05-27 UI Phase 2 Program Affiliation Screen Slice

Completed after the onboarding live context slice:

- Replaced the `/profile/program-affiliation` shared profile-editor surface
  with a focused Step 2 program affiliation selection screen based on the
  `program_affiliation` export.
- The screen now lets authenticated members select RLC, Mandela Washington
  Fellowship, or both programs, records missing affiliations through the
  existing profile affiliation API, and continues to `/verification`.
- Existing `/profile/setup` profile editing, profile photo upload/removal,
  verification submission, route paths, auth guard behavior, and backend API
  contracts were not changed.
- Updated the screen parity tracker so `program_affiliation` now reflects the
  dedicated focused UI instead of a shared profile panel.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 is now roughly 94% complete because the dedicated program
  affiliation export is implemented as a focused, live API-backed screen.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury remains roughly 70% complete.
- Overall 24-week MVP-plus implementation remains roughly 75% complete as an
  estimate.

Frozen/protected behavior:

- `/profile/program-affiliation` remains authenticated-only and uses existing
  `getMyAlumniProfile` and `addProgramAffiliation` client helpers.
- `/profile/setup` remains the full profile editor and should not be modified
  by future program-affiliation-only slices unless explicitly requested.
- Existing verification and onboarding routes remain unchanged.

## Current V1.5 Implementation Update: 2026-05-27 UI Phase 2 Onboarding Live Context Slice

Completed after the Phase 2 onboarding screen slice:

- Added live member profile and verification request context to the
  code-native `/onboarding` screen.
- Added live verification request, submission date, evidence count, and profile
  completion context to the code-native `/verification/submitted` screen.
- Both screens continue to use the existing authenticated route guard and the
  existing profile/verification APIs. No backend contracts, route paths,
  verification submission behavior, or broader app-shell navigation changed.
- Updated the screen parity tracker so both onboarding export rows now report
  live API data instead of placeholder/fixture-only state.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 is now roughly 93% complete because the remaining onboarding
  confirmation surfaces now have live profile and verification context while
  preserving their export-aligned layouts.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury remains roughly 70% complete.
- Overall 24-week MVP-plus implementation remains roughly 75% complete as an
  estimate.

Frozen/protected behavior:

- `/onboarding` and `/verification/submitted` remain authenticated-only routes.
- Existing `/profile/setup`, `/profile/program-affiliation`, `/verification`,
  `/dashboard`, directory, messaging, and community route behavior remain
  unchanged.
- The live onboarding context must continue using the existing
  `getMyAlumniProfile` and `getMyVerificationRequests` client helpers unless a
  future slice explicitly changes the profile or verification API contract.

## Current V1.5 Implementation Update: 2026-05-27 UI Phase 2 Onboarding Screen Slice

Completed after the expense evidence retention worker lock slice:

- Replaced the generic prototype renderer for `/onboarding` with a code-native
  mobile-first onboarding verification screen based on the
  `mobile_onboarding_flow` export.
- Replaced the generic prototype renderer for `/verification/submitted` with a
  code-native verification submitted screen based on the
  `welcome_to_the_network` export.
- Both screens remain authenticated-only, preserve the existing route paths,
  and link into existing live member routes for profile, program affiliation,
  verification, communities, mentorship, events, and dashboard actions.
- Existing profile setup, program affiliation, verification submission,
  directory, dashboard, and app shell behavior were not changed.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 is now roughly 92% complete because two remaining Phase 2
  onboarding/welcome screens have code-native export-aligned implementations
  instead of generic prototype rendering.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury remain roughly 70% complete.
- Overall 24-week MVP-plus implementation remains roughly 75% complete as an
  estimate.

Frozen/protected behavior:

- `/onboarding` and `/verification/submitted` remain authenticated-only routes.
- The core live Phase 2 identity routes remain unchanged:
  `/profile/setup`, `/profile/program-affiliation`, and `/verification`.

## Current V1.5 Implementation Update: 2026-05-27 Expense Evidence Retention Worker Lock Slice

Completed after the expense evidence scanner policy visibility slice:

- Added opt-in Redis non-overlap lock controls to the contribution expense
  evidence retention worker.
- The default lock provider remains `NONE`, preserving local/dev worker
  behavior unless production explicitly enables Redis locking.
- The worker now accepts `--lock-provider` and `--lock-ttl-seconds`, returns
  lock metadata in worker payloads, records lock metadata in `security_events`,
  and returns `skipped_locked` when another worker already holds the Redis lock.
- Existing manual retention endpoints, worker cleanup semantics, dry-run mode,
  evidence metadata preservation, storage deletion behavior, scanner behavior,
  and expense report behavior are preserved.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury are now roughly 70% complete because the
  expense evidence retention worker now has optional Redis non-overlap locking.
  Real provider checkout/refund adapters, provider retry/session semantics,
  broader worker health dashboards, scanner result audit dashboards, and
  production deployment supervision remain open.
- Overall 24-week MVP-plus implementation remains roughly 75% complete as an
  estimate.

Frozen/protected behavior:

- Retention worker locking is opt-in. `NONE` remains the default and existing
  local/dev cleanup behavior should not change in future slices unless
  explicitly requested.
- Existing expense evidence upload validation, malware scanning, retention
  cleanup, and category enforcement behavior remain protected.

## Current V1.5 Implementation Update: 2026-05-24 Expense Evidence Scanner Policy Visibility Slice

Completed after the expense category managed enforcement slice:

- Added finance-admin policy visibility for the active contribution expense
  evidence malware scanner provider.
- The policy endpoint now shows scanner timeout and whether the HTTP scanner URL
  is configured without exposing the scanner URL itself.
- Existing signature-only scanning, fail-closed HTTP scanner behavior, upload
  validation, private evidence storage/download, retention cleanup, and expense
  report behavior are preserved.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury are now roughly 69% complete because scanner
  operations now have non-secret policy visibility in addition to the upload
  scanner adapter boundary. Real provider checkout/refund adapters, provider
  retry/session semantics, scanner result audit dashboards, and production
  worker supervision remain open.
- Overall 24-week MVP-plus implementation remains roughly 75% complete as an
  estimate.

Frozen/protected behavior:

- Expense evidence upload validation and malware scanning semantics are
  unchanged; this slice only exposes non-secret scanner configuration metadata.
- Existing expense category enforcement behavior remains open by default and
  should not be changed in future slices unless explicitly requested.

## Current V1.5 Implementation Update: 2026-05-23 Expense Category Managed Enforcement Slice

Completed after the expense evidence malware scanner adapter slice:

- Added optional contribution expense category enforcement for finance-admin
  expense reports.
- The default `OPEN` mode preserves existing custom category behavior and keeps
  unmanaged-category visibility in the finance-admin policy endpoint.
- The new `MANAGED_ONLY` mode rejects new expense reports when the normalized
  category is not present in `CONTRIBUTION_EXPENSE_CATEGORY_TAXONOMY`.
- The expense category policy endpoint now exposes the active enforcement mode
  alongside the configured taxonomy, budgets, usage, and remaining budget.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury are now roughly 68% complete because expense
  category visibility now has an opt-in managed-only enforcement path. Real
  provider checkout/refund adapters, provider retry/session semantics,
  mandatory multi-review approval policy if desired, production scanner
  operations, and production worker supervision remain open.
- Overall 24-week MVP-plus implementation remains roughly 75% complete as an
  estimate.

Frozen/protected behavior:

- Existing expense report creation remains open-category by default.
- Existing normalized category reporting, treasury rollups, exports, audit
  packages, evidence uploads, malware scanning, and retention cleanup behavior
  should not be changed in future slices unless explicitly requested.

## Current V1.5 Implementation Update: 2026-05-23 Expense Evidence Malware Scanner Adapter Slice

Completed after the expense evidence retention worker slice:

- Added a configurable contribution expense evidence malware scanner boundary.
- The default `SIGNATURE_ONLY` provider preserves existing blocked-signature
  denylist behavior before storage.
- Added optional `HTTP` scanner provider that posts the uploaded evidence file
  to a configured scanner URL before storage and fails closed on scanner errors,
  unknown verdicts, blocked verdicts, or missing scanner configuration.
- Existing content-type validation, upload size validation, private
  finance-admin upload/download behavior, retention cleanup, retention worker,
  category policy visibility, treasury summaries, and exports are preserved.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury are now roughly 67% complete because expense
  evidence now has signature denylist checks, an optional external HTTP malware
  scanner adapter, retention preview/cleanup, and a retention worker. Real
  provider checkout/refund adapters, provider retry/session semantics, category
  enforcement workflows, and production scanner/worker operations remain open.
- Overall 24-week MVP-plus implementation is roughly 75% complete as an
  estimate.

Implemented now:

- Runtime split across public/member `3010`, admin RBAC `3011`, super-admin
  `3012`, and FastAPI `8002`.
- Auth, protected platform owner seed, web sessions, CSRF, 2FA enforcement, rate
  limiting, verification, YALUMNI directory, MWF alumni cache directory plus
  worker/history operations, communities, notifications, direct messages,
  moderation, opportunities, resources, success stories, member events, member
  initiatives, mentorship foundation, elections foundation, contributions
  foundation, contribution campaign approval foundation, local payment intent
  creation/confirmation/retry, provider-neutral checkout attempt persistence,
  local checkout adapter boundary, finance-admin checkout attempt diagnostics,
  signed contribution provider webhook reconciliation, webhook diagnostics
  persistence, refund adapter boundary, local provider-refund fallback,
  contribution finance exports, signed treasury audit packages, certified
  treasury audit PDF reports, stored treasury certification snapshots,
  per-currency treasury summaries and exports, local refund/void finance
  adjustments, contribution disbursement request workflow, contribution expense
  report workflow with categories/reporting filters/category rollups/category
  policy visibility, uploaded expense evidence files with policy visibility,
  signature denylist checks, optional HTTP malware scanner adapter, retention
  preview, retention cleanup, retention worker execution, expense-backed
  treasury ledger entries, and generated receipt PDFs.

Main gaps now:

- Contributions still need a selected real payment provider, provider secrets,
  real provider checkout-session adapters, provider-side refund API calls inside
  implemented adapters, provider retry/session semantics, mandatory approval
  policy if desired, and category governance/enforcement workflows beyond
  visibility.
- Malware scanning now has an adapter boundary, but production still needs a
  selected scanner service, scanner credentials/network policy if required,
  scanner observability, and scanner result audit dashboards.
- Retention cleanup now has a backend worker entrypoint, but production
  scheduling, distributed locking, worker health monitoring, and deployment
  supervision remain operational follow-ups.
- Elections still need nomination workflows, candidate approval/rejection,
  position-based multi-seat ballots, stronger anonymous ballot envelopes,
  dispute handling, exportable certified audit reports, notification hooks,
  voter-roll imports from chapters/cohorts, and admin detail subroutes beyond
  the consolidated console panel.
- Chapter analytics still needs a backend module.
- Mentorship still needs matching recommendations, scheduling, mentor capacity
  enforcement beyond counts, session notes, feedback, reporting/moderation,
  notifications, and admin analytics.
- MWF cache still needs admin diff review, source-field quality dashboards,
  retention policy controls, and production worker supervision.

Recommended next implementation slices:

1. Real provider checkout adapter implementation once the payment provider and
   provider credentials are selected.
2. Real provider refund adapter implementation for the selected payment
   provider, replacing the fail-closed placeholder with provider API calls.
3. Production worker supervision and distributed lock controls for scheduled
   backend jobs.
4. Contribution expense category governance workflows, such as enforced managed
   categories or approval thresholds, if the operating policy requires them.
5. Scanner operations hardening: selected provider deployment, observability,
   and finance/security admin scan-result reporting.

## Current V1.5 Implementation Update: 2026-05-22 Expense Evidence Retention Worker Slice

Completed after the expense evidence retention enforcement slice:

- Extracted contribution expense evidence retention cleanup mechanics into a
  shared backend service used by both the finance-admin API and worker code.
- Added backend worker entrypoint
  `python -m app.workers.contribution_expense_retention`, with monorepo script
  `npm run worker:api:contribution-expense-retention`.
- The worker supports one-shot runs, loop mode, dry-run previews, configurable
  interval seconds, and configurable per-cycle candidate limit.
- Worker cleanup deletes stored evidence objects through the shared upload
  storage adapter, clears storage pointers, preserves evidence metadata rows,
  and records system audit events.
- Existing finance-admin retention preview/run endpoints, private evidence
  upload/download behavior, category policy visibility, treasury summaries, and
  exports are preserved.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury are now roughly 66% complete because expense
  evidence retention now has both manual admin controls and a reusable worker
  entrypoint, while real provider checkout/refund adapters, provider retry and
  session semantics, category enforcement workflows, external malware scanning,
  and production worker supervision remain open.
- Overall 24-week MVP-plus implementation is roughly 75% complete as an
  estimate.

Implemented now:

- Runtime split across public/member `3010`, admin RBAC `3011`, super-admin
  `3012`, and FastAPI `8002`.
- Auth, protected platform owner seed, web sessions, CSRF, 2FA enforcement, rate
  limiting, verification, YALUMNI directory, MWF alumni cache directory plus
  worker/history operations, communities, notifications, direct messages,
  moderation, opportunities, resources, success stories, member events, member
  initiatives, mentorship foundation, elections foundation, contributions
  foundation, contribution campaign approval foundation, local payment intent
  creation/confirmation/retry, provider-neutral checkout attempt persistence,
  local checkout adapter boundary, finance-admin checkout attempt diagnostics,
  signed contribution provider webhook reconciliation, webhook diagnostics
  persistence, refund adapter boundary, local provider-refund fallback,
  contribution finance exports, signed treasury audit packages, certified
  treasury audit PDF reports, stored treasury certification snapshots,
  per-currency treasury summaries and exports, local refund/void finance
  adjustments, contribution disbursement request workflow, contribution expense
  report workflow with categories/reporting filters/category rollups/category
  policy visibility, uploaded expense evidence files with policy visibility,
  signature denylist checks, retention preview, retention cleanup, retention
  worker execution, expense-backed treasury ledger entries, and generated
  receipt PDFs.

Main gaps now:

- Contributions still need a selected real payment provider, provider secrets,
  real provider checkout-session adapters, provider-side refund API calls inside
  implemented adapters, provider retry/session semantics, mandatory approval
  policy if desired, category governance/enforcement workflows beyond
  visibility, and external malware scanning service integration.
- Retention cleanup now has a backend worker entrypoint, but production
  scheduling, distributed locking, worker health monitoring, and deployment
  supervision remain operational follow-ups.
- Elections still need nomination workflows, candidate approval/rejection,
  position-based multi-seat ballots, stronger anonymous ballot envelopes,
  dispute handling, exportable certified audit reports, notification hooks,
  voter-roll imports from chapters/cohorts, and admin detail subroutes beyond
  the consolidated console panel.
- Chapter analytics still needs a backend module.
- Mentorship still needs matching recommendations, scheduling, mentor capacity
  enforcement beyond counts, session notes, feedback, reporting/moderation,
  notifications, and admin analytics.
- MWF cache still needs admin diff review, source-field quality dashboards,
  retention policy controls, and production worker supervision.

Recommended next implementation slices:

1. Real provider checkout adapter implementation once the payment provider and
   provider credentials are selected.
2. Real provider refund adapter implementation for the selected payment
   provider, replacing the fail-closed placeholder with provider API calls.
3. External malware scanner adapter for uploaded evidence.
4. Production worker supervision and distributed lock controls for scheduled
   backend jobs.
5. Contribution expense category governance workflows, such as enforced managed
   categories or approval thresholds, if the operating policy requires them.

## Current V1.5 Implementation Update: 2026-05-22 Expense Evidence Retention Enforcement Slice

Completed after the expense category policy slice:

- Added finance-admin retention preview at
  `GET /api/v1/contributions/admin/expense-evidence-retention`, listing stored
  expense evidence files eligible for cleanup under the configured retention
  period.
- Added finance-admin retention run endpoint at
  `POST /api/v1/contributions/admin/expense-evidence-retention/run`, supporting
  dry-run mode and actual stored-file deletion through the shared upload storage
  abstraction.
- Cleanup removes the stored object and clears storage pointers while preserving
  the evidence metadata row for audit history.
- Added security audit events for retention runs, including dry-run state,
  cutoff, scanned count, and deleted count.
- Existing private evidence upload/download behavior, evidence metadata,
  expense approval flow, category policy visibility, treasury summaries, and
  exports are preserved.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury are now roughly 65% complete because expense
  evidence has retention preview and cleanup enforcement, while real provider
  checkout/refund adapters, provider retry/session semantics, category
  enforcement workflows, and external malware scanner integration remain open.
- Overall 24-week MVP-plus implementation is roughly 75% complete as an
  estimate.

Implemented now:

- Runtime split across public/member `3010`, admin RBAC `3011`, super-admin
  `3012`, and FastAPI `8002`.
- Auth, protected platform owner seed, web sessions, CSRF, 2FA enforcement, rate
  limiting, verification, YALUMNI directory, MWF alumni cache directory plus
  worker/history operations, communities, notifications, direct messages,
  moderation, opportunities, resources, success stories, member events, member
  initiatives, mentorship foundation, elections foundation, contributions
  foundation, contribution campaign approval foundation, local payment intent
  creation/confirmation/retry, provider-neutral checkout attempt persistence,
  local checkout adapter boundary, finance-admin checkout attempt diagnostics,
  signed contribution provider webhook reconciliation, webhook diagnostics
  persistence, refund adapter boundary, local provider-refund fallback,
  contribution finance exports, signed treasury audit packages, certified
  treasury audit PDF reports, stored treasury certification snapshots,
  per-currency treasury summaries and exports, local refund/void finance
  adjustments, contribution disbursement request workflow, contribution expense
  report workflow with categories/reporting filters/category rollups/category
  policy visibility, uploaded expense evidence files with policy visibility,
  signature denylist checks, retention preview, and retention cleanup,
  expense-backed treasury ledger entries, and generated receipt PDFs.

Main gaps now:

- Contributions still need a selected real payment provider, provider secrets,
  real provider checkout-session adapters, provider-side refund API calls inside
  implemented adapters, provider retry/session semantics, mandatory approval
  policy if desired, category governance/enforcement workflows beyond
  visibility, and external malware scanning service integration.
- Evidence retention cleanup is endpoint-driven; a scheduled worker or cron
  trigger remains a future operational hardening step.
- Elections still need nomination workflows, candidate approval/rejection,
  position-based multi-seat ballots, stronger anonymous ballot envelopes,
  dispute handling, exportable certified audit reports, notification hooks,
  voter-roll imports from chapters/cohorts, and admin detail subroutes beyond
  the consolidated console panel.
- Chapter analytics still needs a backend module.
- Mentorship still needs matching recommendations, scheduling, mentor capacity
  enforcement beyond counts, session notes, feedback, reporting/moderation,
  notifications, and admin analytics.
- MWF cache still needs admin diff review, source-field quality dashboards,
  retention policy controls, and scheduled background sync infrastructure.

Recommended next implementation slices:

1. Real provider checkout adapter implementation once the payment provider and
   provider credentials are selected.
2. Real provider refund adapter implementation for the selected payment
   provider, replacing the fail-closed placeholder with provider API calls.
3. External malware scanner adapter for uploaded evidence.
4. Contribution expense category governance workflows, such as enforced managed
   categories or approval thresholds, if the operating policy requires them.

## Current V1.5 Implementation Update: 2026-05-22 Expense Category Policy Slice

Completed after the expense evidence safety policy slice:

- Added configurable contribution expense category taxonomy and optional
  category/currency budget policy settings.
- Added finance-admin policy visibility at
  `GET /api/v1/contributions/admin/expense-category-policy`, exposing managed
  categories, labels, optional budgets, current approved/submitted/rejected
  report totals, and remaining budget where configured.
- The endpoint includes both configured taxonomy categories and observed
  categories from existing expense reports. Custom categories remain allowed and
  are surfaced as unmanaged instead of being rejected.
- Existing expense report creation, category normalization, category filters,
  treasury category summaries, expense evidence upload/download behavior, and
  treasury exports are preserved.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury are now roughly 64% complete because finance
  admins now have category taxonomy and budget-policy visibility, while real
  provider checkout/refund adapters, provider retry/session semantics, category
  enforcement workflows, external malware scanning, and automated evidence
  retention enforcement remain open.
- Overall 24-week MVP-plus implementation is roughly 75% complete as an
  estimate.

Implemented now:

- Runtime split across public/member `3010`, admin RBAC `3011`, super-admin
  `3012`, and FastAPI `8002`.
- Auth, protected platform owner seed, web sessions, CSRF, 2FA enforcement, rate
  limiting, verification, YALUMNI directory, MWF alumni cache directory plus
  worker/history operations, communities, notifications, direct messages,
  moderation, opportunities, resources, success stories, member events, member
  initiatives, mentorship foundation, elections foundation, contributions
  foundation, contribution campaign approval foundation, local payment intent
  creation/confirmation/retry, provider-neutral checkout attempt persistence,
  local checkout adapter boundary, finance-admin checkout attempt diagnostics,
  signed contribution provider webhook reconciliation, webhook diagnostics
  persistence, refund adapter boundary, local provider-refund fallback,
  contribution finance exports, signed treasury audit packages, certified
  treasury audit PDF reports, stored treasury certification snapshots,
  per-currency treasury summaries and exports, local refund/void finance
  adjustments, contribution disbursement request workflow, contribution expense
  report workflow with categories/reporting filters/category rollups/category
  policy visibility, uploaded expense evidence files with policy visibility and
  signature denylist checks, expense-backed treasury ledger entries, and
  generated receipt PDFs.

Main gaps now:

- Contributions still need a selected real payment provider, provider secrets,
  real provider checkout-session adapters, provider-side refund API calls inside
  implemented adapters, provider retry/session semantics, mandatory approval
  policy if desired, category governance/enforcement workflows beyond
  visibility, external malware scanning service integration, and automated
  retention deletion/enforcement for uploaded evidence.
- Elections still need nomination workflows, candidate approval/rejection,
  position-based multi-seat ballots, stronger anonymous ballot envelopes,
  dispute handling, exportable certified audit reports, notification hooks,
  voter-roll imports from chapters/cohorts, and admin detail subroutes beyond
  the consolidated console panel.
- Chapter analytics still needs a backend module.
- Mentorship still needs matching recommendations, scheduling, mentor capacity
  enforcement beyond counts, session notes, feedback, reporting/moderation,
  notifications, and admin analytics.
- MWF cache still needs admin diff review, source-field quality dashboards,
  retention policy controls, and scheduled background sync infrastructure.

Recommended next implementation slices:

1. Real provider checkout adapter implementation once the payment provider and
   provider credentials are selected.
2. Real provider refund adapter implementation for the selected payment
   provider, replacing the fail-closed placeholder with provider API calls.
3. External malware scanner adapter and automated evidence-retention
   enforcement.
4. Contribution expense category governance workflows, such as enforced managed
   categories or approval thresholds, if the operating policy requires them.

## Current V1.5 Implementation Update: 2026-05-21 Expense Evidence Safety Policy Slice

Completed after the treasury expense category rollup slice:

- Added configurable contribution expense evidence upload safety settings for
  blocked signature denylist checks and retention-days policy.
- Added finance-admin policy visibility at
  `GET /api/v1/contributions/admin/expense-evidence-policy`, exposing allowed
  content types, max upload size, retention days, storage provider, and blocked
  signature count.
- Added a pre-storage blocked-signature check for expense evidence files. The
  default local policy blocks the EICAR test signature without introducing a
  fake external antivirus integration.
- Added retention-days metadata to the expense evidence upload audit event.
- Existing private evidence upload/download behavior, content-type validation,
  size validation, submitted-only upload rule, expense approval flow, treasury
  summaries, and category rollups are preserved.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury are now roughly 63% complete because expense
  evidence uploads have policy visibility, retention configuration, and a
  pre-storage signature denylist, while real provider checkout/refund adapters,
  provider retry/session semantics, managed category taxonomy/budget governance,
  external malware scanning, and automated retention enforcement remain open.
- Overall 24-week MVP-plus implementation is roughly 75% complete as an
  estimate.

Implemented now:

- Runtime split across public/member `3010`, admin RBAC `3011`, super-admin
  `3012`, and FastAPI `8002`.
- Auth, protected platform owner seed, web sessions, CSRF, 2FA enforcement, rate
  limiting, verification, YALUMNI directory, MWF alumni cache directory plus
  worker/history operations, communities, notifications, direct messages,
  moderation, opportunities, resources, success stories, member events, member
  initiatives, mentorship foundation, elections foundation, contributions
  foundation, contribution campaign approval foundation, local payment intent
  creation/confirmation/retry, provider-neutral checkout attempt persistence,
  local checkout adapter boundary, finance-admin checkout attempt diagnostics,
  signed contribution provider webhook reconciliation, webhook diagnostics
  persistence, refund adapter boundary, local provider-refund fallback,
  contribution finance exports, signed treasury audit packages, certified
  treasury audit PDF reports, stored treasury certification snapshots,
  per-currency treasury summaries and exports, local refund/void finance
  adjustments, contribution disbursement request workflow, contribution expense
  report workflow with categories/reporting filters/category rollups, uploaded
  expense evidence files with policy visibility and signature denylist checks,
  expense-backed treasury ledger entries, and generated receipt PDFs.

Main gaps now:

- Contributions still need a selected real payment provider, provider secrets,
  real provider checkout-session adapters, provider-side refund API calls inside
  implemented adapters, provider retry/session semantics, mandatory approval
  policy if desired, managed expense category taxonomy/budget governance,
  external malware scanning service integration, and automated retention
  deletion/enforcement for uploaded evidence.
- Elections still need nomination workflows, candidate approval/rejection,
  position-based multi-seat ballots, stronger anonymous ballot envelopes,
  dispute handling, exportable certified audit reports, notification hooks,
  voter-roll imports from chapters/cohorts, and admin detail subroutes beyond
  the consolidated console panel.
- Chapter analytics still needs a backend module.
- Mentorship still needs matching recommendations, scheduling, mentor capacity
  enforcement beyond counts, session notes, feedback, reporting/moderation,
  notifications, and admin analytics.
- MWF cache still needs admin diff review, source-field quality dashboards,
  retention policy controls, and scheduled background sync infrastructure.

Recommended next implementation slices:

1. Real provider checkout adapter implementation once the payment provider and
   provider credentials are selected.
2. Real provider refund adapter implementation for the selected payment
   provider, replacing the fail-closed placeholder with provider API calls.
3. Managed contribution expense category taxonomy and budget policy controls.
4. External malware scanner adapter and automated evidence-retention
   enforcement.

## Current V1.5 Implementation Update: 2026-05-19 Treasury Expense Category Rollup Slice

Completed after the contribution expense categorization slice:

- Added expense category rollups to
  `GET /api/v1/contributions/admin/treasury`, grouped by category and currency
  with approved, rejected, submitted, and total report counts and amounts.
- Added `expense_category` to treasury ledger API rows, treasury ledger CSV
  exports, and signed treasury audit package ledger rows.
- Added finance-admin CSV export:
  `GET /api/v1/contributions/admin/treasury/expense-category-summary/export`.
- Existing expense report submit/approve/reject behavior, category filters,
  private evidence upload/download behavior, expense-backed ledger entries,
  treasury currency summaries, refunds, voids, and contribution receipt behavior
  are preserved.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury are now roughly 62% complete because expense
  category summaries and finance exports are implemented, while real provider
  checkout/refund adapters, provider retry/session semantics, managed category
  taxonomy/budget governance, and malware scanning/retention policy for uploaded
  evidence remain open.
- Overall 24-week MVP-plus implementation is roughly 75% complete as an
  estimate.

Implemented now:

- Runtime split across public/member `3010`, admin RBAC `3011`, super-admin
  `3012`, and FastAPI `8002`.
- Auth, protected platform owner seed, web sessions, CSRF, 2FA enforcement, rate
  limiting, verification, YALUMNI directory, MWF alumni cache directory plus
  worker/history operations, communities, notifications, direct messages,
  moderation, opportunities, resources, success stories, member events, member
  initiatives, mentorship foundation, elections foundation, contributions
  foundation, contribution campaign approval foundation, local payment intent
  creation/confirmation/retry, provider-neutral checkout attempt persistence,
  local checkout adapter boundary, finance-admin checkout attempt diagnostics,
  signed contribution provider webhook reconciliation, webhook diagnostics
  persistence, refund adapter boundary, local provider-refund fallback,
  contribution finance exports, signed treasury audit packages, certified
  treasury audit PDF reports, stored treasury certification snapshots,
  per-currency treasury summaries and exports, local refund/void finance
  adjustments, contribution disbursement request workflow, contribution expense
  report workflow with categories/reporting filters/category rollups, uploaded
  expense evidence files, expense-backed treasury ledger entries, and generated
  receipt PDFs.

Main gaps now:

- Contributions still need a selected real payment provider, provider secrets,
  real provider checkout-session adapters, provider-side refund API calls inside
  implemented adapters, provider retry/session semantics, mandatory approval
  policy if desired, managed expense category taxonomy/budget governance, and
  malware scanning/retention policy for uploaded evidence.
- Elections still need nomination workflows, candidate approval/rejection,
  position-based multi-seat ballots, stronger anonymous ballot envelopes,
  dispute handling, exportable certified audit reports, notification hooks,
  voter-roll imports from chapters/cohorts, and admin detail subroutes beyond
  the consolidated console panel.
- Chapter analytics still needs a backend module.
- Mentorship still needs matching recommendations, scheduling, mentor capacity
  enforcement beyond counts, session notes, feedback, reporting/moderation,
  notifications, and admin analytics.
- MWF cache still needs admin diff review, source-field quality dashboards,
  retention policy controls, and scheduled background sync infrastructure.

Recommended next implementation slices:

1. Real provider checkout adapter implementation once the payment provider and
   provider credentials are selected.
2. Real provider refund adapter implementation for the selected payment
   provider, replacing the fail-closed placeholder with provider API calls.
3. Expense evidence malware scanning and retention policy controls.
4. Managed contribution expense category taxonomy and budget policy controls.

## Current V1.5 Implementation Update: 2026-05-19 Contribution Expense Categorization Slice

Completed after the treasury currency summary slice:

- Added normalized expense categories to contribution expense reports while
  preserving the existing default behavior as `OTHER`.
- Added finance-admin reporting filters to
  `GET /api/v1/contributions/admin/expense-reports` for category, expense date
  range, and vendor/summary/description text search.
- Added a database migration and focused API coverage for category
  normalization, category filtering, date filtering, text filtering, and invalid
  date-range rejection.
- Existing expense report submit/approve/reject behavior, private evidence
  upload/download behavior, expense-backed ledger entries, treasury summaries,
  refunds, voids, and contribution receipt behavior are preserved.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury are now roughly 61% complete because expense
  reports now have normalized categories and reporting filters, while real
  provider checkout/refund adapters, provider retry/session semantics, advanced
  expense taxonomy/rollups, and malware scanning/retention policy for uploaded
  evidence remain open.
- Overall 24-week MVP-plus implementation is roughly 75% complete as an
  estimate.

Implemented now:

- Runtime split across public/member `3010`, admin RBAC `3011`, super-admin
  `3012`, and FastAPI `8002`.
- Auth, protected platform owner seed, web sessions, CSRF, 2FA enforcement, rate
  limiting, verification, YALUMNI directory, MWF alumni cache directory plus
  worker/history operations, communities, notifications, direct messages,
  moderation, opportunities, resources, success stories, member events, member
  initiatives, mentorship foundation, elections foundation, contributions
  foundation, contribution campaign approval foundation, local payment intent
  creation/confirmation/retry, provider-neutral checkout attempt persistence,
  local checkout adapter boundary, finance-admin checkout attempt diagnostics,
  signed contribution provider webhook reconciliation, webhook diagnostics
  persistence, refund adapter boundary, local provider-refund fallback,
  contribution finance exports, signed treasury audit packages, certified
  treasury audit PDF reports, stored treasury certification snapshots,
  per-currency treasury summaries and exports, local refund/void finance
  adjustments, contribution disbursement request workflow, contribution expense
  report workflow with categories and reporting filters, uploaded expense
  evidence files, expense-backed treasury ledger entries, and generated receipt
  PDFs.

Main gaps now:

- Contributions still need a selected real payment provider, provider secrets,
  real provider checkout-session adapters, provider-side refund API calls inside
  implemented adapters, provider retry/session semantics, mandatory approval
  policy if desired, advanced expense category taxonomy/rollups, and malware
  scanning/retention policy for uploaded evidence.
- Elections still need nomination workflows, candidate approval/rejection,
  position-based multi-seat ballots, stronger anonymous ballot envelopes,
  dispute handling, exportable certified audit reports, notification hooks,
  voter-roll imports from chapters/cohorts, and admin detail subroutes beyond
  the consolidated console panel.
- Chapter analytics still needs a backend module.
- Mentorship still needs matching recommendations, scheduling, mentor capacity
  enforcement beyond counts, session notes, feedback, reporting/moderation,
  notifications, and admin analytics.
- MWF cache still needs admin diff review, source-field quality dashboards,
  retention policy controls, and scheduled background sync infrastructure.

Recommended next implementation slices:

1. Real provider checkout adapter implementation once the payment provider and
   provider credentials are selected.
2. Real provider refund adapter implementation for the selected payment
   provider, replacing the fail-closed placeholder with provider API calls.
3. Expense evidence malware scanning and retention policy controls.
4. Advanced contribution expense category taxonomy, rollups, and export columns.

## Current V1.5 Implementation Update: 2026-05-18 Treasury Currency Summary Slice

Completed after the contribution expense evidence upload slice:

- Added per-currency treasury summaries to
  `GET /api/v1/contributions/admin/treasury` while preserving the existing
  aggregate totals.
- Added per-currency accounting snapshots into signed treasury audit packages,
  certified treasury snapshots, and PDF audit report content.
- Added finance-admin CSV export:
  `GET /api/v1/contributions/admin/treasury/currency-summary/export`.
- Existing ledger rows, receipt exports, audit package signing, certification
  persistence, contribution/refund/void flows, disbursement workflows, and
  expense evidence workflows are preserved.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury are now roughly 60% complete because
  treasury reporting now keeps separate per-currency accounting summaries,
  while real provider checkout/refund adapters, provider retry/session
  semantics, richer expense categorization, and malware scanning/retention
  policy for uploaded evidence remain open.
- Overall 24-week MVP-plus implementation is roughly 74-75% complete as an
  estimate.

Implemented now:

- Runtime split across public/member `3010`, admin RBAC `3011`, super-admin
  `3012`, and FastAPI `8002`.
- Auth, protected platform owner seed, web sessions, CSRF, 2FA enforcement, rate
  limiting, verification, YALUMNI directory, MWF alumni cache directory plus
  worker/history operations, communities, notifications, direct messages,
  moderation, opportunities, resources, success stories, member events, member
  initiatives, mentorship foundation, elections foundation, contributions
  foundation, contribution campaign approval foundation, local payment intent
  creation/confirmation/retry, provider-neutral checkout attempt persistence,
  local checkout adapter boundary, finance-admin checkout attempt diagnostics,
  signed contribution provider webhook reconciliation, webhook diagnostics
  persistence, refund adapter boundary, local provider-refund fallback,
  contribution finance exports, signed treasury audit packages, certified
  treasury audit PDF reports, stored treasury certification snapshots,
  per-currency treasury summaries and exports, local refund/void finance
  adjustments, contribution disbursement request workflow, contribution expense
  report workflow, uploaded expense evidence files, expense-backed treasury
  ledger entries, and generated receipt PDFs.

Main gaps now:

- Contributions still need a selected real payment provider, provider secrets,
  real provider checkout-session adapters, provider-side refund API calls inside
  implemented adapters, provider retry/session semantics, mandatory approval
  policy if desired, richer expense categorization, and malware
  scanning/retention policy for uploaded evidence.
- Elections still need nomination workflows, candidate approval/rejection,
  position-based multi-seat ballots, stronger anonymous ballot envelopes,
  dispute handling, exportable certified audit reports, notification hooks,
  voter-roll imports from chapters/cohorts, and admin detail subroutes beyond
  the consolidated console panel.
- Chapter analytics still needs a backend module.
- Mentorship still needs matching recommendations, scheduling, mentor capacity
  enforcement beyond counts, session notes, feedback, reporting/moderation,
  notifications, and admin analytics.
- MWF cache still needs admin diff review, source-field quality dashboards,
  retention policy controls, and scheduled background sync infrastructure.

Recommended next implementation slices:

1. Real provider checkout adapter implementation once the payment provider and
   provider credentials are selected.
2. Real provider refund adapter implementation for the selected payment
   provider, replacing the fail-closed placeholder with provider API calls.
3. Expense evidence malware scanning and retention policy controls.
4. Richer contribution expense categorization and reporting filters.

## Current V1.5 Implementation Update: 2026-05-18 Contribution Expense Evidence File Upload Slice

Completed after the contribution expense ledger entries slice:

- Added private finance-admin expense evidence file uploads for submitted
  contribution expense reports:
  `POST /api/v1/contributions/admin/expense-reports/{expense_report_id}/evidence-files`.
- Added private finance-admin expense evidence downloads:
  `GET /api/v1/contributions/admin/expense-reports/{expense_report_id}/evidence/{evidence_id}/download`.
- Extended `contribution_expense_evidence` with nullable file metadata,
  uploaded-by user, storage provider, and storage key fields while preserving
  existing structured URL-only evidence rows.
- Added the `CONTRIBUTION_EXPENSE_EVIDENCE` upload category to the shared
  local/S3 storage adapter and local configuration for contribution expense
  evidence files.
- Existing expense report submit/approve/reject behavior and treasury ledger
  behavior are preserved; evidence files can only be added while the expense
  report is still submitted.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury are now roughly 58% complete because
  expense evidence file storage now exists for finance-admin review, while real
  provider checkout/refund adapters, provider retry/session semantics, richer
  expense categorization, and multi-currency accounting remain open.
- Overall 24-week MVP-plus implementation is roughly 74% complete as an
  estimate.

Implemented now:

- Runtime split across public/member `3010`, admin RBAC `3011`, super-admin
  `3012`, and FastAPI `8002`.
- Auth, protected platform owner seed, web sessions, CSRF, 2FA enforcement, rate
  limiting, verification, YALUMNI directory, MWF alumni cache directory plus
  worker/history operations, communities, notifications, direct messages,
  moderation, opportunities, resources, success stories, member events, member
  initiatives, mentorship foundation, elections foundation, contributions
  foundation, contribution campaign approval foundation, local payment intent
  creation/confirmation/retry, provider-neutral checkout attempt persistence,
  local checkout adapter boundary, finance-admin checkout attempt diagnostics,
  signed contribution provider webhook reconciliation, webhook diagnostics
  persistence, refund adapter boundary, local provider-refund fallback,
  contribution finance exports, signed treasury audit packages, certified
  treasury audit PDF reports, stored treasury certification snapshots, local
  refund/void finance adjustments, contribution disbursement request workflow,
  contribution expense report workflow, uploaded expense evidence files,
  expense-backed treasury ledger entries, and generated receipt PDFs.

Main gaps now:

- Contributions still need real provider checkout-session adapters, provider
  secrets, provider-side refund API calls inside implemented adapters, provider
  retry/session semantics, mandatory approval policy if desired, richer expense
  categorization, malware scanning/retention policy for uploaded evidence, and
  multi-currency accounting rules.
- Elections still need nomination workflows, candidate approval/rejection,
  position-based multi-seat ballots, stronger anonymous ballot envelopes,
  dispute handling, exportable certified audit reports, notification hooks,
  voter-roll imports from chapters/cohorts, and admin detail subroutes beyond
  the consolidated console panel.
- Chapter analytics still needs a backend module.
- Mentorship still needs matching recommendations, scheduling, mentor capacity
  enforcement beyond counts, session notes, feedback, reporting/moderation,
  notifications, and admin analytics.
- MWF cache still needs admin diff review, source-field quality dashboards,
  retention policy controls, and scheduled background sync infrastructure.

Recommended next implementation slices:

1. Real provider checkout adapter implementation for the selected payment
   provider, including provider secrets and external checkout session creation.
2. Real provider refund adapter implementation for the selected payment
   provider, replacing the fail-closed placeholder with provider API calls.
3. Multi-currency treasury accounting rules and per-currency export summaries.
4. Expense evidence malware scanning and retention policy controls.

## Current V1.5 Implementation Update: 2026-05-18 Contribution Expense Ledger Entries Slice

Completed after the treasury expense report foundation slice:

- Added expense-aware contribution ledger entries that can attach directly to
  `contribution_expense_reports` without requiring a donor `contribution_id`.
- Approved expense reports now write negative `CONTRIBUTION_EXPENSE` ledger
  rows; rejected approved reports now write positive
  `CONTRIBUTION_EXPENSE_REVERSAL` rows.
- Treasury summary, CSV export, JSON audit package, PDF audit report, and stored
  certification inputs now include both contribution-backed and expense-backed
  ledger rows.
- Existing contribution credit/refund/provider-refund/void ledger behavior is
  preserved.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury are now roughly 56% complete because
  expense report approvals now flow into treasury ledger exports/audit packages,
  while evidence file storage, real provider checkout/refund adapters, and
  multi-currency accounting remain open.
- Overall 24-week MVP-plus implementation is roughly 73-74% complete as an
  estimate.

Implemented now:

- Runtime split across public/member `3010`, admin RBAC `3011`, super-admin
  `3012`, and FastAPI `8002`.
- Auth, protected platform owner seed, web sessions, CSRF, 2FA enforcement, rate
  limiting, verification, YALUMNI directory, MWF alumni cache directory plus
  worker/history operations, communities, notifications, direct messages,
  moderation, opportunities, resources, success stories, member events, member
  initiatives, mentorship foundation, elections foundation, contributions
  foundation, contribution campaign approval foundation, local payment intent
  creation/confirmation/retry, provider-neutral checkout attempt persistence,
  local checkout adapter boundary, finance-admin checkout attempt diagnostics,
  signed contribution provider webhook reconciliation, webhook diagnostics
  persistence, refund adapter boundary, local provider-refund fallback,
  contribution finance exports, signed treasury audit packages, certified
  treasury audit PDF reports, stored treasury certification snapshots, local
  refund/void finance adjustments, contribution disbursement request workflow,
  contribution expense report/evidence workflow, expense-backed treasury ledger
  entries, and generated receipt PDFs.

Main gaps now:

- Contributions still need real provider checkout-session adapters, provider
  secrets, provider-side refund API calls inside implemented adapters, provider
  retry/session semantics, mandatory approval policy if desired, uploaded
  disbursement/expense evidence files, richer expense categorization, and
  multi-currency accounting rules.
- Elections still need nomination workflows, candidate approval/rejection,
  position-based multi-seat ballots, stronger anonymous ballot envelopes,
  dispute handling, exportable certified audit reports, notification hooks,
  voter-roll imports from chapters/cohorts, and admin detail subroutes beyond
  the consolidated console panel.
- Chapter analytics still needs a backend module.
- Mentorship still needs matching recommendations, scheduling, mentor capacity
  enforcement beyond counts, session notes, feedback, reporting/moderation,
  notifications, and admin analytics.
- MWF cache still needs admin diff review, source-field quality dashboards,
  retention policy controls, and scheduled background sync infrastructure.

Recommended next implementation slices:

1. Expense evidence upload/storage integration for disbursement and expense
   reports.
2. Real provider checkout adapter implementation for the selected payment
   provider, including provider secrets and external checkout session creation.
3. Real provider refund adapter implementation for the selected payment
   provider, replacing the fail-closed placeholder with provider API calls.
4. Multi-currency treasury accounting rules and per-currency export summaries.

## Current V1.5 Implementation Update: 2026-05-17 Treasury Expense Report Foundation Slice

Completed after the contribution disbursement request foundation slice:

- Added finance-admin expense report records tied to paid disbursement requests:
  `POST /api/v1/contributions/admin/disbursement-requests/{disbursement_request_id}/expense-reports`.
- Added finance-admin list/detail endpoints:
  `GET /api/v1/contributions/admin/expense-reports`
  and `GET /api/v1/contributions/admin/expense-reports/{expense_report_id}`.
- Added review lifecycle endpoints:
  `POST /api/v1/contributions/admin/expense-reports/{expense_report_id}/approve`
  and `POST /api/v1/contributions/admin/expense-reports/{expense_report_id}/reject`.
- Added `contribution_expense_reports` and `contribution_expense_evidence` for
  submitted expense records, reviewer decisions, vendor/summary metadata, and
  structured receipt/evidence rows.
- Added paid-disbursement availability checks. Submitted and approved reports
  reserve the paid disbursement amount; rejected reports release that amount.
- Existing contribution ledger behavior remains unchanged because expense ledger
  entries that are independent from donor contributions remain a later treasury
  accounting slice.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury are now roughly 54% complete because
  disbursement requests and expense report/evidence review records exist, while
  expense ledger entries, evidence file storage, real provider checkout/refund
  adapters, and multi-currency accounting remain open.
- Overall 24-week MVP-plus implementation remains roughly 73% complete as an
  estimate.

Implemented now:

- Runtime split across public/member `3010`, admin RBAC `3011`, super-admin
  `3012`, and FastAPI `8002`.
- Auth, protected platform owner seed, web sessions, CSRF, 2FA enforcement, rate
  limiting, verification, YALUMNI directory, MWF alumni cache directory plus
  worker/history operations, communities, notifications, direct messages,
  moderation, opportunities, resources, success stories, member events, member
  initiatives, mentorship foundation, elections foundation, contributions
  foundation, contribution campaign approval foundation, local payment intent
  creation/confirmation/retry, provider-neutral checkout attempt persistence,
  local checkout adapter boundary, finance-admin checkout attempt diagnostics,
  signed contribution provider webhook reconciliation, webhook diagnostics
  persistence, refund adapter boundary, local provider-refund fallback,
  contribution finance exports, signed treasury audit packages, certified
  treasury audit PDF reports, stored treasury certification snapshots, local
  refund/void finance adjustments, contribution disbursement request workflow,
  contribution expense report/evidence workflow, and generated receipt PDFs.

Main gaps now:

- Contributions still need real provider checkout-session adapters, provider
  secrets, provider-side refund API calls inside implemented adapters, provider
  retry/session semantics, mandatory approval policy if desired, uploaded
  disbursement/expense evidence files, expense ledger entries, and
  multi-currency accounting rules.
- Elections still need nomination workflows, candidate approval/rejection,
  position-based multi-seat ballots, stronger anonymous ballot envelopes,
  dispute handling, exportable certified audit reports, notification hooks,
  voter-roll imports from chapters/cohorts, and admin detail subroutes beyond
  the consolidated console panel.
- Chapter analytics still needs a backend module.
- Mentorship still needs matching recommendations, scheduling, mentor capacity
  enforcement beyond counts, session notes, feedback, reporting/moderation,
  notifications, and admin analytics.
- MWF cache still needs admin diff review, source-field quality dashboards,
  retention policy controls, and scheduled background sync infrastructure.

Recommended next implementation slices:

1. Contribution expense ledger entries that are not forced to attach to a donor
   contribution row.
2. Expense evidence upload/storage integration for disbursement and expense
   reports.
3. Real provider checkout adapter implementation for the selected payment
   provider, including provider secrets and external checkout session creation.
4. Real provider refund adapter implementation for the selected payment
   provider, replacing the fail-closed placeholder with provider API calls.

## Current V1.5 Implementation Update: 2026-05-17 Contribution Disbursement Request Foundation Slice

Completed after the treasury certification snapshot slice:

- Added finance-admin contribution disbursement request records:
  `POST /api/v1/contributions/admin/campaigns/{campaign_id}/disbursement-requests`.
- Added finance-admin list/detail endpoints:
  `GET /api/v1/contributions/admin/disbursement-requests`
  and `GET /api/v1/contributions/admin/disbursement-requests/{disbursement_request_id}`.
- Added request lifecycle endpoints:
  `POST /api/v1/contributions/admin/disbursement-requests/{disbursement_request_id}/approve`,
  `POST /api/v1/contributions/admin/disbursement-requests/{disbursement_request_id}/reject`,
  and `POST /api/v1/contributions/admin/disbursement-requests/{disbursement_request_id}/mark-paid`.
- Added `contribution_disbursement_requests` to store campaign, amount,
  currency, payee, purpose, requester, reviewer, paid-by user, notes, status,
  review timestamp, and paid timestamp.
- Added received-funds availability checks. Requested, approved, and paid
  disbursements reserve campaign funds; rejected requests release them.
- Existing contribution ledger behavior remains unchanged because the current
  ledger entries are contribution-bound. Expense ledger entries remain a later
  treasury accounting slice.
- Added contribution tests proving member denial, overdraw protection, reserved
  funds behavior, list/detail access, approve/reject transitions, mark-paid
  transition, and duplicate transition rejection.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury are now roughly 52% complete because
  disbursement request records and review transitions exist, while expense
  reports, expense ledger entries, provider checkout/refund adapters, and
  multi-currency accounting remain open.
- Overall 24-week MVP-plus implementation is roughly 73% complete as an
  estimate.

Implemented now:

- Runtime split across public/member `3010`, admin RBAC `3011`, super-admin
  `3012`, and FastAPI `8002`.
- Auth, protected platform owner seed, web sessions, CSRF, 2FA enforcement, rate
  limiting, verification, YALUMNI directory, MWF alumni cache directory plus
  worker/history operations, communities, notifications, direct messages,
  moderation, opportunities, resources, success stories, member events, member
  initiatives, mentorship foundation, elections foundation, contributions
  foundation, contribution campaign approval foundation, local payment intent
  creation/confirmation/retry, provider-neutral checkout attempt persistence,
  local checkout adapter boundary, finance-admin checkout attempt diagnostics,
  signed contribution provider webhook reconciliation, webhook diagnostics
  persistence, refund adapter boundary, local provider-refund fallback,
  contribution finance exports, signed treasury audit packages, certified
  treasury audit PDF reports, stored treasury certification snapshots, local
  refund/void finance adjustments, contribution disbursement request workflow,
  and generated receipt PDFs.

Main gaps now:

- Contributions still need real provider checkout-session adapters, provider
  secrets, provider-side refund API calls inside implemented adapters, provider
  retry/session semantics, mandatory approval policy if desired, expense reports,
  disbursement evidence/attachments, expense ledger entries, and multi-currency
  accounting rules.
- Elections still need nomination workflows, candidate approval/rejection,
  position-based multi-seat ballots, stronger anonymous ballot envelopes,
  dispute handling, exportable certified audit reports, notification hooks,
  voter-roll imports from chapters/cohorts, and admin detail subroutes beyond
  the consolidated console panel.
- Chapter analytics still needs a backend module.
- Mentorship still needs matching recommendations, scheduling, mentor capacity
  enforcement beyond counts, session notes, feedback, reporting/moderation,
  notifications, and admin analytics.
- MWF cache still needs admin diff review, source-field quality dashboards,
  retention policy controls, and scheduled background sync infrastructure.

Recommended next implementation slices:

1. Treasury expense report foundation with supporting receipt/evidence records.
2. Contribution expense ledger entries that are not forced to attach to a donor
   contribution row.
3. Real provider checkout adapter implementation for the selected payment
   provider, including provider secrets and external checkout session creation.
4. Real provider refund adapter implementation for the selected payment
   provider, replacing the fail-closed placeholder with provider API calls.

## Current V1.5 Implementation Update: 2026-05-17 Treasury Certification Snapshot Slice

Completed after the contribution campaign approval foundation slice:

- Added persistent treasury certification snapshots for finance admins:
  `POST /api/v1/contributions/admin/treasury/certifications`.
- Added finance-admin certification list/detail endpoints:
  `GET /api/v1/contributions/admin/treasury/certifications`
  and `GET /api/v1/contributions/admin/treasury/certifications/{certification_id}`.
- Added `contribution_treasury_certifications` to store immutable signed audit
  packages with canonical SHA-256 digest, HMAC signature metadata, reviewer,
  scope, summary counts, currencies, and optional certification notes.
- Existing live treasury audit package/report exports remain unchanged.
- Added contribution tests proving finance-only access, stored digest integrity,
  list/detail retrieval, and snapshot immutability after later refund
  adjustments.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury are now roughly 50% complete because
  certified treasury audit snapshots are now persisted, while disbursements,
  expense reports, provider checkout/refund adapters, and multi-currency
  accounting remain open.
- Overall 24-week MVP-plus implementation is roughly 73% complete as an
  estimate.

Implemented now:

- Runtime split across public/member `3010`, admin RBAC `3011`, super-admin
  `3012`, and FastAPI `8002`.
- Auth, protected platform owner seed, web sessions, CSRF, 2FA enforcement, rate
  limiting, verification, YALUMNI directory, MWF alumni cache directory plus
  worker/history operations, communities, notifications, direct messages,
  moderation, opportunities, resources, success stories, member events, member
  initiatives, mentorship foundation, elections foundation, contributions
  foundation, contribution campaign approval foundation, local payment intent
  creation/confirmation/retry, provider-neutral checkout attempt persistence,
  local checkout adapter boundary, finance-admin checkout attempt diagnostics,
  signed contribution provider webhook reconciliation, webhook diagnostics
  persistence, refund adapter boundary, local provider-refund fallback,
  contribution finance exports, signed treasury audit packages, certified
  treasury audit PDF reports, stored treasury certification snapshots, local
  refund/void finance adjustments, and generated receipt PDFs.

Main gaps now:

- Contributions still need real provider checkout-session adapters, provider
  secrets, provider-side refund API calls inside implemented adapters, provider
  retry/session semantics, mandatory approval policy if desired, disbursement
  requests, expense reports, and multi-currency accounting rules.
- Elections still need nomination workflows, candidate approval/rejection,
  position-based multi-seat ballots, stronger anonymous ballot envelopes,
  dispute handling, exportable certified audit reports, notification hooks,
  voter-roll imports from chapters/cohorts, and admin detail subroutes beyond
  the consolidated console panel.
- Chapter analytics still needs a backend module.
- Mentorship still needs matching recommendations, scheduling, mentor capacity
  enforcement beyond counts, session notes, feedback, reporting/moderation,
  notifications, and admin analytics.
- MWF cache still needs admin diff review, source-field quality dashboards,
  retention policy controls, and scheduled background sync infrastructure.

Recommended next implementation slices:

1. Contribution disbursement request foundation.
2. Real provider checkout adapter implementation for the selected payment
   provider, including provider secrets and external checkout session creation.
3. Real provider refund adapter implementation for the selected payment
   provider, replacing the fail-closed placeholder with provider API calls.
4. Treasury expense report foundation with supporting receipt/evidence records.

## Current V1.5 Implementation Update: 2026-05-16 Contribution Campaign Approval Foundation Slice

Completed after the contribution payment intent retry slice:

- Added optional contribution campaign approval workflow endpoints:
  `POST /api/v1/contributions/admin/campaigns/{campaign_id}/request-approval`
  and `POST /api/v1/contributions/admin/campaigns/{campaign_id}/approve`.
- Added `PENDING_APPROVAL` and `APPROVED` campaign statuses to the contribution
  campaign status filter set.
- Campaigns in pending/approved states remain hidden from member campaign
  discovery until published.
- Approved campaigns can be published through the existing publish endpoint.
- Existing direct draft/closed publish behavior remains intact to avoid breaking
  current finance-admin workflows and tests.
- Expanded contribution tests to verify member denial, pending/approved hidden
  visibility, admin status filtering, approval transition, duplicate approval
  rejection, and publishing after approval.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury are now roughly 48% complete because
  campaign approval states and transitions now exist while mandatory approval
  policy remains a later hardening choice.
- Overall 24-week MVP-plus implementation remains roughly 72% complete.

Implemented now:

- Runtime split across public/member `3010`, admin RBAC `3011`, super-admin
  `3012`, and FastAPI `8002`.
- Auth, protected platform owner seed, web sessions, CSRF, 2FA enforcement, rate
  limiting, verification, YALUMNI directory, MWF alumni cache directory plus
  worker/history operations, communities, notifications, direct messages,
  moderation, opportunities, resources, success stories, member events, member
  initiatives, mentorship foundation, elections foundation, contributions
  foundation, contribution campaign approval foundation, local payment intent
  creation/confirmation/retry, provider-neutral checkout attempt persistence,
  local checkout adapter boundary, finance-admin checkout attempt diagnostics,
  signed contribution provider webhook reconciliation, webhook diagnostics
  persistence, refund adapter boundary, local provider-refund fallback,
  contribution finance exports, signed treasury audit packages, certified
  treasury audit PDF reports, local refund/void finance adjustments, and
  generated receipt PDFs.

Main gaps now:

- Contributions still need real provider checkout-session adapters, provider
  secrets, provider-side refund API calls inside implemented adapters, provider
  retry/session semantics, mandatory approval policy if desired, disbursement
  requests, expense reports, multi-currency accounting rules, and immutable
  stored audit package approval/certification workflows.
- Elections still need nomination workflows, candidate approval/rejection,
  position-based multi-seat ballots, stronger anonymous ballot envelopes,
  dispute handling, exportable certified audit reports, notification hooks,
  voter-roll imports from chapters/cohorts, and admin detail subroutes beyond
  the consolidated console panel.
- Chapter analytics still needs a backend module.
- Mentorship still needs matching recommendations, scheduling, mentor capacity
  enforcement beyond counts, session notes, feedback, reporting/moderation,
  notifications, and admin analytics.
- MWF cache still needs admin diff review, source-field quality dashboards,
  retention policy controls, and scheduled background sync infrastructure.

Recommended next implementation slices:

1. Treasury certification workflow with stored reviewer approvals and immutable
   audit-package snapshots.
2. Real provider checkout adapter implementation for the selected payment
   provider, including provider secrets and external checkout session creation.
3. Real provider refund adapter implementation for the selected payment
   provider, replacing the fail-closed placeholder with provider API calls.
4. Contribution disbursement request foundation.

## Current V1.5 Implementation Update: 2026-05-16 Contribution Payment Intent Retry Slice

Completed after the contribution provider refund boundary slice:

- Added `POST /api/v1/contributions/{campaign_id}/payment-intents/{payment_intent_id}/retry`.
- Failed or canceled payment intents can now create a new local checkout attempt
  and return a refreshed local client secret.
- In-flight and confirmed payment intents remain protected from retry.
- Retry access uses the existing payment-intent ownership/finance-admin guard,
  campaign visibility guard, and campaign payment-open guard.
- Expanded contribution tests to verify failed-intent retry, new attempt
  persistence, refreshed local client secret, denied cross-user retry, and
  successful confirmation after retry.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury are now roughly 47% complete because local
  failed/canceled checkout attempts have a retry path while still requiring
  real provider retry/session semantics later.
- Overall 24-week MVP-plus implementation remains roughly 72% complete.

Implemented now:

- Runtime split across public/member `3010`, admin RBAC `3011`, super-admin
  `3012`, and FastAPI `8002`.
- Auth, protected platform owner seed, web sessions, CSRF, 2FA enforcement, rate
  limiting, verification, YALUMNI directory, MWF alumni cache directory plus
  worker/history operations, communities, notifications, direct messages,
  moderation, opportunities, resources, success stories, member events, member
  initiatives, mentorship foundation, elections foundation, contributions
  foundation, local payment intent creation/confirmation/retry, provider-neutral
  checkout attempt persistence, local checkout adapter boundary, finance-admin
  checkout attempt diagnostics, signed contribution provider webhook
  reconciliation, webhook diagnostics persistence, refund adapter boundary,
  local provider-refund fallback, contribution finance exports, signed treasury
  audit packages, certified treasury audit PDF reports, local refund/void
  finance adjustments, and generated receipt PDFs.

Main gaps now:

- Contributions still need real provider checkout-session adapters, provider
  secrets, provider-side refund API calls inside implemented adapters, provider
  retry/session semantics, campaign approvals, disbursement requests, expense
  reports, multi-currency accounting rules, and immutable stored audit package
  approval/certification workflows.
- Elections still need nomination workflows, candidate approval/rejection,
  position-based multi-seat ballots, stronger anonymous ballot envelopes,
  dispute handling, exportable certified audit reports, notification hooks,
  voter-roll imports from chapters/cohorts, and admin detail subroutes beyond
  the consolidated console panel.
- Chapter analytics still needs a backend module.
- Mentorship still needs matching recommendations, scheduling, mentor capacity
  enforcement beyond counts, session notes, feedback, reporting/moderation,
  notifications, and admin analytics.
- MWF cache still needs admin diff review, source-field quality dashboards,
  retention policy controls, and scheduled background sync infrastructure.

Recommended next implementation slices:

1. Real provider checkout adapter implementation for the selected payment
   provider, including provider secrets and external checkout session creation.
2. Real provider refund adapter implementation for the selected payment
   provider, replacing the fail-closed placeholder with provider API calls.
3. Treasury certification workflow with stored reviewer approvals and immutable
   audit-package snapshots.
4. Contribution campaign approval workflow before campaign publishing.

## Current V1.5 Implementation Update: 2026-05-16 Contribution Provider Refund Boundary Slice

Completed after the contribution payment attempt diagnostics slice:

- Added `CONTRIBUTION_REFUND_PROVIDER`, defaulting to `LOCAL_TEST`, as the
  contribution provider-refund adapter selector.
- Provider-refund requests now pass through a refund adapter boundary before the
  local refund ledger transition is applied.
- The `LOCAL_TEST` refund adapter preserves the existing staging/local
  provider-refund fallback behavior.
- Unsupported refund providers fail closed with `503 Service Unavailable`
  instead of recording a local refund as if a provider API call had happened.
- Expanded contribution tests to verify the unsupported refund-provider guard
  while preserving existing local provider-refund coverage.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury are now roughly 46% complete because both
  checkout creation and provider-refund requests now have explicit adapter
  boundaries that fail closed for unimplemented providers.
- Overall 24-week MVP-plus implementation remains roughly 72% complete.

Implemented now:

- Runtime split across public/member `3010`, admin RBAC `3011`, super-admin
  `3012`, and FastAPI `8002`.
- Auth, protected platform owner seed, web sessions, CSRF, 2FA enforcement, rate
  limiting, verification, YALUMNI directory, MWF alumni cache directory plus
  worker/history operations, communities, notifications, direct messages,
  moderation, opportunities, resources, success stories, member events, member
  initiatives, mentorship foundation, elections foundation, contributions
  foundation, local payment intent creation/confirmation, provider-neutral
  checkout attempt persistence, local checkout adapter boundary, finance-admin
  checkout attempt diagnostics, signed contribution provider webhook
  reconciliation, webhook diagnostics persistence, refund adapter boundary,
  local provider-refund fallback, contribution finance exports, signed treasury
  audit packages, certified treasury audit PDF reports, local refund/void
  finance adjustments, and generated receipt PDFs.

Main gaps now:

- Contributions still need real provider checkout-session adapters, provider
  secrets, provider-side refund API calls inside implemented adapters,
  retryable multi-attempt checkout orchestration, campaign approvals,
  disbursement requests, expense reports, multi-currency accounting rules, and
  immutable stored audit package approval/certification workflows.
- Elections still need nomination workflows, candidate approval/rejection,
  position-based multi-seat ballots, stronger anonymous ballot envelopes,
  dispute handling, exportable certified audit reports, notification hooks,
  voter-roll imports from chapters/cohorts, and admin detail subroutes beyond
  the consolidated console panel.
- Chapter analytics still needs a backend module.
- Mentorship still needs matching recommendations, scheduling, mentor capacity
  enforcement beyond counts, session notes, feedback, reporting/moderation,
  notifications, and admin analytics.
- MWF cache still needs admin diff review, source-field quality dashboards,
  retention policy controls, and scheduled background sync infrastructure.

Recommended next implementation slices:

1. Real provider checkout adapter implementation for the selected payment
   provider, including provider secrets and external checkout session creation.
2. Real provider refund adapter implementation for the selected payment
   provider, replacing the fail-closed placeholder with provider API calls.
3. Retryable multi-attempt checkout orchestration for failed or expired checkout
   attempts.
4. Treasury certification workflow with stored reviewer approvals and immutable
   audit-package snapshots.

## Current V1.5 Implementation Update: 2026-05-16 Contribution Payment Attempt Diagnostics Slice

Completed after the contribution checkout adapter boundary slice:

- Added a finance-admin read-only checkout attempt diagnostics endpoint at
  `GET /api/v1/contributions/admin/payment-attempts`.
- The endpoint supports `provider`, `status`, `provider_intent_id`,
  `payment_intent_id`, `limit`, and `offset` filters.
- Responses include attempt lifecycle, provider reference, related campaign and
  contributor IDs, and boolean flags for checkout URL/client-secret presence,
  while keeping stored checkout secrets out of the diagnostics payload.
- Expanded contribution API tests to verify finance-member denial, admin list
  access, local-test filter normalization, and status updates after local
  checkout confirmation.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury are now roughly 45% complete because
  checkout attempts are persisted, provider-boundary protected, and now visible
  to finance admins for troubleshooting.
- Overall 24-week MVP-plus implementation remains roughly 72% complete.

Implemented now:

- Runtime split across public/member `3010`, admin RBAC `3011`, super-admin
  `3012`, and FastAPI `8002`.
- Auth, protected platform owner seed, web sessions, CSRF, 2FA enforcement, rate
  limiting, verification, YALUMNI directory, MWF alumni cache directory plus
  worker/history operations, communities, notifications, direct messages,
  moderation, opportunities, resources, success stories, member events, member
  initiatives, mentorship foundation, elections foundation, contributions
  foundation, local payment intent creation/confirmation, provider-neutral
  checkout attempt persistence, local checkout adapter boundary, finance-admin
  checkout attempt diagnostics, signed contribution provider webhook
  reconciliation, webhook diagnostics persistence, local provider-refund
  fallback, contribution finance exports, signed treasury audit packages,
  certified treasury audit PDF reports, local refund/void finance adjustments,
  and generated receipt PDFs.

Main gaps now:

- Contributions still need real provider checkout-session adapters, provider
  secrets, provider-side refund API calls, retryable multi-attempt checkout
  orchestration, campaign approvals, disbursement requests, expense reports,
  multi-currency accounting rules, and immutable stored audit package
  approval/certification workflows.
- Elections still need nomination workflows, candidate approval/rejection,
  position-based multi-seat ballots, stronger anonymous ballot envelopes,
  dispute handling, exportable certified audit reports, notification hooks,
  voter-roll imports from chapters/cohorts, and admin detail subroutes beyond
  the consolidated console panel.
- Chapter analytics still needs a backend module.
- Mentorship still needs matching recommendations, scheduling, mentor capacity
  enforcement beyond counts, session notes, feedback, reporting/moderation,
  notifications, and admin analytics.
- MWF cache still needs admin diff review, source-field quality dashboards,
  retention policy controls, and scheduled background sync infrastructure.

Recommended next implementation slices:

1. Real provider checkout adapter implementation for the selected payment
   provider, including provider secrets and external checkout session creation.
2. Real provider refund adapters that call the payment provider before the local
   refund ledger transition.
3. Retryable multi-attempt checkout orchestration for failed or expired checkout
   attempts.
4. Treasury certification workflow with stored reviewer approvals and immutable
   audit-package snapshots.

## Current V1.5 Implementation Update: 2026-05-16 Contribution Checkout Adapter Boundary Slice

Completed after the contribution checkout attempt foundation slice:

- Added `CONTRIBUTION_CHECKOUT_PROVIDER`, defaulting to `LOCAL_TEST`, as the
  contribution checkout adapter selector.
- Payment-intent creation now goes through a checkout adapter boundary before
  creating the payment intent and persisted checkout attempt.
- The `LOCAL_TEST` adapter preserves existing local client-secret behavior and
  now records adapter metadata in the checkout attempt response payload.
- Unsupported checkout providers fail closed with `503 Service Unavailable`
  instead of creating fake provider records.
- Expanded contribution tests to verify the unsupported-provider guard while
  preserving local-test checkout attempt behavior.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury are now roughly 44% complete because checkout
  creation has a real adapter boundary while still failing closed for
  unimplemented providers.
- Overall 24-week MVP-plus implementation remains roughly 72% complete.

Implemented now:

- Runtime split across public/member `3010`, admin RBAC `3011`, super-admin
  `3012`, and FastAPI `8002`.
- Auth, protected platform owner seed, web sessions, CSRF, 2FA enforcement, rate
  limiting, verification, YALUMNI directory, MWF alumni cache directory plus
  worker/history operations, communities, notifications, direct messages,
  moderation, opportunities, resources, success stories, member events, member
  initiatives, mentorship foundation, elections foundation, contributions
  foundation, local payment intent creation/confirmation, provider-neutral
  checkout attempt persistence, local checkout adapter boundary, signed
  contribution provider webhook reconciliation, webhook diagnostics persistence,
  local provider-refund fallback, contribution finance exports, signed treasury
  audit packages, certified treasury audit PDF reports, local refund/void
  finance adjustments, and generated receipt PDFs.

Main gaps now:

- Contributions still need real provider checkout-session adapters, provider
  secrets, provider-side refund API calls, retryable multi-attempt checkout
  orchestration, campaign approvals, disbursement requests, expense reports,
  multi-currency accounting rules, and immutable stored audit package
  approval/certification workflows.
- Elections still need nomination workflows, candidate approval/rejection,
  position-based multi-seat ballots, stronger anonymous ballot envelopes,
  dispute handling, exportable certified audit reports, notification hooks,
  voter-roll imports from chapters/cohorts, and admin detail subroutes beyond
  the consolidated console panel.
- Chapter analytics still needs a backend module.
- Mentorship still needs matching recommendations, scheduling, mentor capacity
  enforcement beyond counts, session notes, feedback, reporting/moderation,
  notifications, and admin analytics.
- MWF cache still needs admin diff review, source-field quality dashboards,
  retention policy controls, and scheduled background sync infrastructure.

Recommended next implementation slices:

1. Real provider checkout adapter implementation for the selected payment
   provider, including provider secrets and external checkout session creation.
2. Real provider refund adapters that call the payment provider before the local
   refund ledger transition.
3. Treasury certification workflow with stored reviewer approvals and immutable
   audit-package snapshots.
4. Chapter analytics backend module feeding the existing admin route shell.

## Current V1.5 Implementation Update: 2026-05-16 Contribution Checkout Attempt Foundation Slice

Completed after the contribution provider-refund orchestration slice:

- Added `contribution_payment_attempts` persistence and migration as the
  provider-neutral checkout attempt record for contribution payment intents.
- Payment-intent creation now creates one local checkout attempt with a local
  client secret, provider intent reference, request/response metadata, and
  `REQUIRES_CONFIRMATION` status.
- Manual payment-intent confirmation and provider webhook reconciliation now
  update the latest checkout attempt to `CONFIRMED`.
- Provider webhook failed/canceled events now keep the payment intent and latest
  checkout attempt lifecycle statuses aligned and preserve provider failure
  reasons on the attempt.
- Expanded contribution tests to verify checkout attempt persistence, client
  secret response fields, confirmed status transitions, and failed webhook
  attempt error recording.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury are now roughly 43% complete because local
  payment intents now have provider-neutral checkout attempt persistence and
  lifecycle status tracking.
- Overall 24-week MVP-plus implementation remains roughly 72% complete.

Implemented now:

- Runtime split across public/member `3010`, admin RBAC `3011`, super-admin
  `3012`, and FastAPI `8002`.
- Auth, protected platform owner seed, web sessions, CSRF, 2FA enforcement, rate
  limiting, verification, YALUMNI directory, MWF alumni cache directory plus
  worker/history operations, communities, notifications, direct messages,
  moderation, opportunities, resources, success stories, member events, member
  initiatives, mentorship foundation, elections foundation, contributions
  foundation, local payment intent creation/confirmation, provider-neutral
  checkout attempt persistence, signed contribution provider webhook
  reconciliation, webhook diagnostics persistence, local provider-refund
  fallback, contribution finance exports, signed treasury audit packages,
  certified treasury audit PDF reports, local refund/void finance adjustments,
  and generated receipt PDFs.

Main gaps now:

- Contributions still need real provider checkout-session creation,
  provider-specific adapters, provider-side refund API calls, retryable
  multi-attempt checkout orchestration, campaign approvals, disbursement
  requests, expense reports, multi-currency accounting rules, and immutable
  stored audit package approval/certification workflows.
- Elections still need nomination workflows, candidate approval/rejection,
  position-based multi-seat ballots, stronger anonymous ballot envelopes,
  dispute handling, exportable certified audit reports, notification hooks,
  voter-roll imports from chapters/cohorts, and admin detail subroutes beyond
  the consolidated console panel.
- Chapter analytics still needs a backend module.
- Mentorship still needs matching recommendations, scheduling, mentor capacity
  enforcement beyond counts, session notes, feedback, reporting/moderation,
  notifications, and admin analytics.
- MWF cache still needs admin diff review, source-field quality dashboards,
  retention policy controls, and scheduled background sync infrastructure.

Recommended next implementation slices:

1. Real provider checkout adapter boundary that can create external checkout
   sessions while preserving the local-test adapter.
2. Real provider refund adapters that call the payment provider before the local
   refund ledger transition.
3. Treasury certification workflow with stored reviewer approvals and immutable
   audit-package snapshots.
4. Chapter analytics backend module feeding the existing admin route shell.

## Current V1.5 Implementation Update: 2026-05-16 Contribution Provider Refund Orchestration Slice

Completed after the contribution webhook diagnostics slice:

- Added finance-admin provider-refund routes at
  `/api/v1/contributions/admin/contributions/{contribution_id}/provider-refund`
  and the legacy `/api/v1/contributions/admin/{contribution_id}/provider-refund`
  alias.
- Provider-refund fallback now requires a received contribution with a stored
  payment reference, then reuses the existing ledger-safe refund path to mark
  the contribution and receipt as `REFUNDED`.
- The provider-refund action records a negative treasury ledger refund entry and
  emits a `contributions.provider_refund_requested` security event for audit
  visibility.
- Expanded contribution tests to verify successful provider-refund fallback,
  duplicate refund rejection, and member denial on the finance-admin endpoint.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury are now roughly 41% complete because local
  provider-refund orchestration is represented in the API, ledger, receipts, and
  tests.
- Overall 24-week MVP-plus implementation remains roughly 72% complete.

Implemented now:

- Runtime split across public/member `3010`, admin RBAC `3011`, super-admin
  `3012`, and FastAPI `8002`.
- Auth, protected platform owner seed, web sessions, CSRF, 2FA enforcement, rate
  limiting, verification, YALUMNI directory, MWF alumni cache directory plus
  worker/history operations, communities, notifications, direct messages,
  moderation, opportunities, resources, success stories, member events, member
  initiatives, mentorship foundation, elections foundation, contributions
  foundation, local payment intent creation/confirmation, signed contribution
  provider webhook reconciliation, webhook diagnostics persistence, local
  provider-refund fallback, contribution finance exports, signed treasury audit
  packages, certified treasury audit PDF reports, local refund/void finance
  adjustments, and generated receipt PDFs.

Main gaps now:

- Contributions still need real provider checkout/client secret integration,
  provider-specific adapters, provider-side refund API calls, checkout-level
  attempt storage, campaign approvals, disbursement requests, expense reports,
  multi-currency accounting rules, and immutable stored audit package
  approval/certification workflows.
- Elections still need nomination workflows, candidate approval/rejection,
  position-based multi-seat ballots, stronger anonymous ballot envelopes,
  dispute handling, exportable certified audit reports, notification hooks,
  voter-roll imports from chapters/cohorts, and admin detail subroutes beyond
  the consolidated console panel.
- Chapter analytics still needs a backend module.
- Mentorship still needs matching recommendations, scheduling, mentor capacity
  enforcement beyond counts, session notes, feedback, reporting/moderation,
  notifications, and admin analytics.
- MWF cache still needs admin diff review, source-field quality dashboards,
  retention policy controls, and scheduled background sync infrastructure.

Recommended next implementation slices:

1. Provider checkout/client-secret foundation with provider-neutral payment
   attempt records.
2. Real provider refund adapters that call the payment provider before the local
   refund ledger transition.
3. Treasury certification workflow with stored reviewer approvals and immutable
   audit-package snapshots.
4. Chapter analytics backend module feeding the existing admin route shell.

## Current V1.5 Implementation Update: 2026-05-15 Contribution Webhook Diagnostics Slice

Completed after the provider webhook reconciliation slice:

- Added `contribution_webhook_events` persistence and migration for signed
  provider webhook diagnostics.
- Webhook processing now records normalized provider event IDs, provider intent
  references, event type, amount/currency metadata, delivery count, processing
  status, processed timestamp, payment intent/contribution links, payload
  snapshots, and error messages.
- Provider event replays with the same provider event ID increment delivery
  count instead of creating duplicate diagnostic rows.
- Added finance-admin endpoint
  `/api/v1/contributions/admin/webhook-events` for filtering webhook
  diagnostics by provider, event type, provider intent ID, and processing
  status.
- Expanded contribution tests for webhook diagnostic persistence, duplicate
  delivery counts, rejected mismatch logging, failed-event logging, and member
  denial on the admin diagnostics endpoint.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury are now roughly 40% complete because webhook
  replay diagnostics are persisted and queryable by finance admins.
- Overall 24-week MVP-plus implementation remains roughly 72% complete.

Implemented now:

- Runtime split across public/member `3010`, admin RBAC `3011`, super-admin
  `3012`, and FastAPI `8002`.
- Auth, protected platform owner seed, web sessions, CSRF, 2FA enforcement, rate
  limiting, verification, YALUMNI directory, MWF alumni cache directory plus
  worker/history operations, communities, notifications, direct messages,
  moderation, opportunities, resources, success stories, member events, member
  initiatives, mentorship foundation, elections foundation, contributions
  foundation, local payment intent creation/confirmation, signed contribution
  provider webhook reconciliation, webhook diagnostics persistence,
  contribution finance exports, signed treasury audit packages, certified
  treasury audit PDF reports, local refund/void finance adjustments, and
  generated receipt PDFs.

Main gaps now:

- Contributions still need real provider checkout/client secret integration,
  provider-specific adapters, provider-side refunds, checkout-level attempt
  storage, campaign approvals, disbursement requests, expense reports,
  multi-currency accounting rules, and immutable stored audit package
  approval/certification workflows.
- Elections still need nomination workflows, candidate approval/rejection,
  position-based multi-seat ballots, stronger anonymous ballot envelopes,
  dispute handling, exportable certified audit reports, notification hooks,
  voter-roll imports from chapters/cohorts, and admin detail subroutes beyond
  the consolidated console panel.
- Chapter analytics still needs a backend module.
- Mentorship still needs matching recommendations, scheduling, mentor capacity
  enforcement beyond counts, session notes, feedback, reporting/moderation,
  notifications, and admin analytics.
- MWF cache still needs admin diff review, source-field quality dashboards,
  retention policy controls, and scheduled background sync infrastructure.

Recommended next implementation slices:

- Add provider checkout/client-secret creation for a real payment provider while
  preserving local-test payment intents for development.
- Add provider-side refund orchestration while keeping the current local ledger
  reversal as the development fallback.
- Add immutable treasury audit package certification records and approval
  workflow.
- Build chapter analytics backend and wire the admin analytics route.

## Current V1.5 Implementation Update: 2026-05-15 Contribution Provider Webhook Foundation Slice

Completed after the payment intent confirmation slice:

- Added signed provider webhook endpoint
  `/api/v1/contributions/webhooks/{provider}` guarded by
  `CONTRIBUTION_WEBHOOK_SECRET` and `X-YALUMNI-WEBHOOK-SIGNATURE`.
- Webhook success events reconcile eligible cached payment intents through the
  same contribution, receipt, ledger credit, and audit-event path used by local
  manual confirmation.
- Duplicate success webhooks are idempotent and return the existing
  contribution without creating duplicate receipts or ledger entries.
- Provider failure/cancel events mark payment intents as `FAILED` or `CANCELED`
  without creating contribution accounting rows.
- Amount and currency mismatches are blocked before reconciliation.
- Expanded contribution tests for signed success reconciliation, duplicate
  success idempotency, bad-signature rejection, amount mismatch rejection, and
  failed-event idempotency.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury are now roughly 39% complete because payment
  intents can be reconciled by signed provider events without double-posting the
  accounting trail.
- Overall 24-week MVP-plus implementation remains roughly 72% complete.

Implemented now:

- Runtime split across public/member `3010`, admin RBAC `3011`, super-admin
  `3012`, and FastAPI `8002`.
- Auth, protected platform owner seed, web sessions, CSRF, 2FA enforcement, rate
  limiting, verification, YALUMNI directory, MWF alumni cache directory plus
  worker/history operations, communities, notifications, direct messages,
  moderation, opportunities, resources, success stories, member events, member
  initiatives, mentorship foundation, elections foundation, contributions
  foundation, local payment intent creation/confirmation, signed contribution
  provider webhook reconciliation, contribution finance exports, signed
  treasury audit packages, certified treasury audit PDF reports, local
  refund/void finance adjustments, and generated receipt PDFs.

Main gaps now:

- Contributions still need real provider checkout/client secret integration,
  provider-specific adapters, provider-side refunds, persistent webhook attempt
  storage/retry tracking, campaign approvals, disbursement requests, expense
  reports, multi-currency accounting rules, and immutable stored audit package
  approval/certification workflows.
- Elections still need nomination workflows, candidate approval/rejection,
  position-based multi-seat ballots, stronger anonymous ballot envelopes,
  dispute handling, exportable certified audit reports, notification hooks,
  voter-roll imports from chapters/cohorts, and admin detail subroutes beyond
  the consolidated console panel.
- Chapter analytics still needs a backend module.
- Mentorship still needs matching recommendations, scheduling, mentor capacity
  enforcement beyond counts, session notes, feedback, reporting/moderation,
  notifications, and admin analytics.
- MWF cache still needs admin diff review, source-field quality dashboards,
  retention policy controls, and scheduled background sync infrastructure.

Recommended next implementation slices:

- Add provider checkout/client-secret creation for a real payment provider while
  preserving local-test payment intents for development.
- Add provider-side refund orchestration while keeping the current local ledger
  reversal as the development fallback.
- Add persistent webhook attempt/retry tables if provider replay diagnostics are
  needed before checkout integration.
- Add immutable treasury audit package certification records and approval
  workflow.
- Build chapter analytics backend and wire the admin analytics route.

## Current V1.5 Implementation Update: 2026-05-14 Payment Intent Confirmation Slice

Completed after the payment intent foundation slice:

- Added authenticated endpoint
  `/api/v1/contributions/{campaign_id}/payment-intents/{payment_intent_id}/confirm`
  for turning an existing local payment intent into the normal
  contribution, receipt, and ledger credit flow.
- Confirmed intents are marked `CONFIRMED`, use the local provider intent
  reference as the contribution payment reference, and emit a security audit
  event.
- Duplicate confirmation is blocked with `409 Conflict`, and other members
  cannot confirm a payment intent they do not own.
- The existing `/api/v1/contributions/{campaign_id}/pay` direct local payment
  path remains unchanged.
- Added shared frontend API helper `confirmContributionPaymentIntent`.
- Expanded contribution tests for intent owner confirmation, other-member
  denial, duplicate confirmation blocking, receipt creation, and payment
  reference preservation.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury are now roughly 37% complete because local
  payment intents can now complete into the live accounting trail without
  bypassing the future provider reconciliation point.
- Overall 24-week MVP-plus implementation remains roughly 72% complete.

Implemented now:

- Runtime split across public/member `3010`, admin RBAC `3011`, super-admin
  `3012`, and FastAPI `8002`.
- Auth, protected platform owner seed, web sessions, CSRF, 2FA enforcement, rate
  limiting, verification, YALUMNI directory, MWF alumni cache directory plus
  worker/history operations, communities, notifications, direct messages,
  moderation, opportunities, resources, success stories, member events, member
  initiatives, mentorship foundation, elections foundation, contributions
  foundation, local payment intent creation/confirmation, contribution finance
  exports, signed treasury audit packages, certified treasury audit PDF reports,
  local refund/void finance adjustments, and generated receipt PDFs.

Main gaps now:

- Contributions still need real provider checkout/client secret integration,
  provider webhooks, asynchronous reconciliation state transitions,
  provider-side refunds, campaign approvals, disbursement requests, expense
  reports, multi-currency accounting rules, and immutable stored audit package
  approval/certification workflows.
- Elections still need nomination workflows, candidate approval/rejection,
  position-based multi-seat ballots, stronger anonymous ballot envelopes,
  dispute handling, exportable certified audit reports, notification hooks,
  voter-roll imports from chapters/cohorts, and admin detail subroutes beyond
  the consolidated console panel.
- Chapter analytics still needs a backend module.
- Mentorship still needs matching recommendations, scheduling, mentor capacity
  enforcement beyond counts, session notes, feedback, reporting/moderation,
  notifications, and admin analytics.
- MWF cache still needs admin diff review, source-field quality dashboards,
  retention policy controls, and scheduled background sync infrastructure.

Recommended next implementation slices:

- Add provider webhook foundation for contribution payment reconciliation.
- Add provider-side refund orchestration while keeping the current local ledger
  reversal as the development fallback.
- Add immutable treasury audit package certification records and approval
  workflow.
- Build chapter analytics backend and wire the admin analytics route.
- Continue elections hardening with nomination/candidate approval and certified
  result exports.

## Current V1.5 Implementation Update: 2026-05-14 Payment Intent Foundation Slice

Completed after the treasury audit report PDF slice:

- Added `contribution_payment_intents` persistence with campaign, contributor,
  amount, currency, payment method, local provider reference, status, note, and
  anonymous metadata.
- Added authenticated member endpoint
  `/api/v1/contributions/{campaign_id}/payment-intents` for creating local
  payment intents before a confirmed contribution is recorded.
- Payment intents reuse existing campaign visibility, campaign acceptance, method
  validation, and currency validation rules.
- Payment intent creation does not issue receipts, create ledger entries, or
  change existing `/pay` behavior.
- Added migration `20260514_0028_contribution_payment_intents`.
- Added shared frontend API helper `createContributionPaymentIntent`.
- Expanded contribution tests for successful intent creation, no contribution
  count side effect, invalid method rejection, and closed campaign blocking.
- Updated API, data model, roadmap, and status documentation.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury are now roughly 36% complete because the
  payment-provider lifecycle now has a local payment intent persistence point
  before future provider webhooks/reconciliation are added.
- Overall 24-week MVP-plus implementation remains roughly 72% complete.

Implemented now:

- Runtime split across public/member `3010`, admin RBAC `3011`, super-admin
  `3012`, and FastAPI `8002`.
- Auth, protected platform owner seed, web sessions, CSRF, 2FA enforcement, rate
  limiting, verification, YALUMNI directory, MWF alumni cache directory plus
  worker/history operations, communities, notifications, direct messages,
  moderation, opportunities, resources, success stories, member events, member
  initiatives, mentorship foundation, elections foundation, contributions
  foundation, local payment intents, contribution finance exports, signed
  treasury audit packages, certified treasury audit PDF reports, local
  refund/void finance adjustments, and generated receipt PDFs.
- Route parity exists for exported screens; live data is wired for the modules
  listed above, while chapter analytics and deeper finance/election governance
  workflows remain prototype or foundation-level.

Main gaps now:

- Contributions still need real provider checkout/client secret integration,
  provider webhooks, reconciliation state transitions, provider-side refunds,
  campaign approvals, disbursement requests, expense reports, multi-currency
  accounting rules, and immutable stored audit package approval/certification
  workflows.
- Elections still need nomination workflows, candidate approval/rejection,
  position-based multi-seat ballots, stronger anonymous ballot envelopes,
  dispute handling, exportable certified audit reports, notification hooks,
  voter-roll imports from chapters/cohorts, and admin detail subroutes beyond
  the consolidated console panel.
- Chapter analytics still needs a backend module.
- Mentorship still needs matching recommendations, scheduling, mentor capacity
  enforcement beyond counts, session notes, feedback, reporting/moderation,
  notifications, and admin analytics.
- MWF cache still needs admin diff review, source-field quality dashboards,
  distributed worker locking, and full-text/faceted search indexing.
- Directory search remains database-backed MVP search rather than
  Meilisearch/OpenSearch.
- Initiatives and events still need richer admin/organizer workflows,
  notifications, analytics, and operational lifecycle depth.
- Production hardening remains for Redis/WebSocket fanout, supervised
  background workers, email delivery logs/bounces/unsubscribe, malware
  scanning, CDN/signed URLs, and compliance exports.

Next possible implementation slices:

- Payment-intent confirmation/reconciliation endpoint and provider webhook
  foundation.
- Provider-side refund orchestration.
- Immutable treasury audit approval/certification workflow.
- Chapter analytics backend foundation.
- Elections hardening with nominations, anonymous ballot envelopes, certified
  audit exports, disputes, and notification hooks.
- Mentorship notifications, scheduling, session notes, and admin analytics.

## Current V1.5 Implementation Update: 2026-05-14 Treasury Audit Report PDF Slice

Completed after the PDF receipt slice:

- Added finance-admin certified treasury audit PDF report downloads at
  `/api/v1/contributions/admin/treasury/audit-report`.
- The PDF report is generated from the same signed audit package data as the
  JSON audit package and includes scope, summary counts, canonical SHA-256, HMAC
  signature metadata, recent contributions, and recent ledger entries.
- Added an admin treasury console action for downloading the audit PDF.
- Expanded contribution tests for PDF audit report content type, filename,
  PDF signature, report title, and member access denial.
- Updated API, data model, roadmap, and status documentation.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury are now roughly 35% complete because treasury
  exports now include CSV ledger exports, signed JSON audit packages, and
  certified PDF audit reports alongside receipt downloads and local
  refund/void controls.
- Overall 24-week MVP-plus implementation remains roughly 72% complete.

Implemented now:

- Runtime split across public/member `3010`, admin RBAC `3011`, super-admin
  `3012`, and FastAPI `8002`.
- Auth, protected platform owner seed, web sessions, CSRF, 2FA enforcement, rate
  limiting, verification, YALUMNI directory, MWF alumni cache directory plus
  worker/history operations, communities, notifications, direct messages,
  moderation, opportunities, resources, success stories, member events, member
  initiatives, mentorship foundation, elections foundation, contributions
  foundation, contribution finance exports, signed treasury audit packages,
  certified treasury audit PDF reports, local refund/void finance adjustments,
  and generated receipt PDFs.
- Route parity exists for exported screens; live data is wired for the modules
  listed above, while chapter analytics and deeper finance/election governance
  workflows remain prototype or foundation-level.

Main gaps now:

- Contributions still need real payment provider integration, payment intent
  lifecycle, webhook reconciliation, provider-side refunds, campaign approvals,
  disbursement requests, expense reports, multi-currency accounting rules, and
  immutable stored audit package approval/certification workflows.
- Elections still need nomination workflows, candidate approval/rejection,
  position-based multi-seat ballots, stronger anonymous ballot envelopes,
  dispute handling, exportable certified audit reports, notification hooks,
  voter-roll imports from chapters/cohorts, and admin detail subroutes beyond
  the consolidated console panel.
- Chapter analytics still needs a backend module.
- Mentorship still needs matching recommendations, scheduling, mentor capacity
  enforcement beyond counts, session notes, feedback, reporting/moderation,
  notifications, and admin analytics.
- MWF cache still needs admin diff review, source-field quality dashboards,
  distributed worker locking, and full-text/faceted search indexing.
- Directory search remains database-backed MVP search rather than
  Meilisearch/OpenSearch.
- Initiatives and events still need richer admin/organizer workflows,
  notifications, analytics, and operational lifecycle depth.
- Production hardening remains for Redis/WebSocket fanout, supervised
  background workers, email delivery logs/bounces/unsubscribe, malware
  scanning, CDN/signed URLs, and compliance exports.

Next possible implementation slices:

- Contribution payment-provider intent/webhook reconciliation and provider-side
  refund orchestration.
- Immutable treasury audit approval/certification workflow.
- Chapter analytics backend foundation.
- Elections hardening with nominations, anonymous ballot envelopes, certified
  audit exports, disputes, and notification hooks.
- Mentorship notifications, scheduling, session notes, and admin analytics.
- MWF source diff/quality dashboard and search indexing.

## Current V1.5 Implementation Update: 2026-05-14 PDF Receipt Slice

Completed after the contribution refund/void slice:

- Added authenticated PDF receipt downloads at
  `/api/v1/contributions/receipts/{receipt_id}/download.pdf`.
- The PDF download uses the same owner-or-finance-admin access rule as receipt
  detail and text download.
- Added a member receipt page action for downloading the generated PDF receipt.
- Expanded contribution tests for member PDF download, content type, filename,
  PDF signature, admin access, and non-owner denial.
- Updated API, data model, roadmap, and status documentation.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury are now roughly 34% complete because member
  receipt downloads now include both text and PDF formats alongside campaign
  lifecycle, local contribution recording, treasury summaries, exports, signed
  audit packages, and local refund/void controls.
- Overall 24-week MVP-plus implementation remains roughly 72% complete.

Implemented now:

- Runtime split across public/member `3010`, admin RBAC `3011`, super-admin
  `3012`, and FastAPI `8002`.
- Auth, protected platform owner seed, web sessions, CSRF, 2FA enforcement, rate
  limiting, verification, YALUMNI directory, MWF alumni cache directory plus
  worker/history operations, communities, notifications, direct messages,
  moderation, opportunities, resources, success stories, member events, member
  initiatives, mentorship foundation, elections foundation, contributions
  foundation, contribution finance exports, signed treasury audit packages,
  local refund/void finance adjustments, and generated receipt PDFs.
- Route parity exists for exported screens; live data is wired for the modules
  listed above, while chapter analytics and deeper finance/election governance
  workflows remain prototype or foundation-level.

Main gaps now:

- Contributions still need real payment provider integration, payment intent
  lifecycle, webhook reconciliation, provider-side refunds, campaign approvals,
  disbursement requests, expense reports, multi-currency accounting rules,
  immutable stored audit package approvals, and certified PDF audit reports.
- Elections still need nomination workflows, candidate approval/rejection,
  position-based multi-seat ballots, stronger anonymous ballot envelopes,
  dispute handling, exportable certified audit reports, notification hooks,
  voter-roll imports from chapters/cohorts, and admin detail subroutes beyond
  the consolidated console panel.
- Chapter analytics still needs a backend module.
- Mentorship still needs matching recommendations, scheduling, mentor capacity
  enforcement beyond counts, session notes, feedback, reporting/moderation,
  notifications, and admin analytics.
- MWF cache still needs admin diff review, source-field quality dashboards,
  distributed worker locking, and full-text/faceted search indexing.
- Directory search remains database-backed MVP search rather than
  Meilisearch/OpenSearch.
- Initiatives and events still need richer admin/organizer workflows,
  notifications, analytics, and operational lifecycle depth.
- Production hardening remains for Redis/WebSocket fanout, supervised
  background workers, email delivery logs/bounces/unsubscribe, malware
  scanning, CDN/signed URLs, and compliance exports.

Next possible implementation slices:

- Contribution payment-provider intent/webhook reconciliation and provider-side
  refund orchestration.
- Certified treasury audit report PDFs.
- Chapter analytics backend foundation.
- Elections hardening with nominations, anonymous ballot envelopes, certified
  audit exports, disputes, and notification hooks.
- Mentorship notifications, scheduling, session notes, and admin analytics.
- MWF source diff/quality dashboard and search indexing.

## Current V1.5 Implementation Update: 2026-05-14 Contribution Refund Void Slice

Completed after the treasury audit package slice:

- Added finance-admin refund recording at
  `/api/v1/contributions/admin/contributions/{contribution_id}/refund` for
  received contributions.
- Added finance-admin pending contribution voiding at
  `/api/v1/contributions/admin/contributions/{contribution_id}/void`.
- Refunds now mark the contribution and receipt as `REFUNDED`, create a
  negative `CONTRIBUTION_REFUND` ledger entry, and record a security event.
- Voids now mark pending contributions as `VOIDED`, create a zero-value
  `CONTRIBUTION_VOID` ledger marker, and record a security event.
- Added admin RBAC treasury UI actions for eligible recent contributions.
- Expanded contribution tests for refund success, duplicate-refund blocking,
  receipt status updates, treasury reversal totals, member access denial, void
  success, duplicate-void blocking, and void ledger markers.
- Updated API, data model, roadmap, and status documentation.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury are now roughly 33% complete because
  campaign lifecycle, local contribution recording, receipts, ledger summary,
  receipt downloads, finance CSV exports, signed audit JSON packages, and local
  refund/void adjustment controls now exist.
- Overall 24-week MVP-plus implementation is roughly 72% complete.

Implemented now:

- Runtime split across public/member `3010`, admin RBAC `3011`, super-admin
  `3012`, and FastAPI `8002`.
- Auth, protected platform owner seed, web sessions, CSRF, 2FA enforcement, rate
  limiting, verification, YALUMNI directory, MWF alumni cache directory plus
  worker/history operations, communities, notifications, direct messages,
  moderation, opportunities, resources, success stories, member events, member
  initiatives, mentorship foundation, elections foundation, contributions
  foundation, contribution finance exports, signed treasury audit packages, and
  local refund/void finance adjustments.
- Route parity exists for exported screens; live data is wired for the modules
  listed above, while chapter analytics and deeper finance/election governance
  workflows remain prototype or foundation-level.

Main gaps now:

- Contributions still need real payment provider integration, payment intent
  lifecycle, webhook reconciliation, provider-side refunds, generated PDF
  receipts, campaign approvals, disbursement requests, expense reports,
  multi-currency accounting rules, immutable stored audit package approvals,
  and certified PDF audit reports.
- Elections still need nomination workflows, candidate approval/rejection,
  position-based multi-seat ballots, stronger anonymous ballot envelopes,
  dispute handling, exportable certified audit reports, notification hooks,
  voter-roll imports from chapters/cohorts, and admin detail subroutes beyond
  the consolidated console panel.
- Chapter analytics still needs a backend module.
- Mentorship still needs matching recommendations, scheduling, mentor capacity
  enforcement beyond counts, session notes, feedback, reporting/moderation,
  notifications, and admin analytics.
- MWF cache still needs admin diff review, source-field quality dashboards,
  distributed worker locking, and full-text/faceted search indexing.
- Directory search remains database-backed MVP search rather than
  Meilisearch/OpenSearch.
- Initiatives and events still need richer admin/organizer workflows,
  notifications, analytics, and operational lifecycle depth.
- Production hardening remains for Redis/WebSocket fanout, supervised
  background workers, email delivery logs/bounces/unsubscribe, malware
  scanning, CDN/signed URLs, and compliance exports.

Next possible implementation slices:

- Contribution payment-provider intent/webhook reconciliation and provider-side
  refund orchestration.
- Generated PDF receipts and certified treasury audit reports.
- Chapter analytics backend foundation.
- Elections hardening with nominations, anonymous ballot envelopes, certified
  audit exports, disputes, and notification hooks.
- Mentorship notifications, scheduling, session notes, and admin analytics.
- MWF source diff/quality dashboard and search indexing.

## Current V1.5 Implementation Update: 2026-05-14 Treasury Audit Package Slice

Completed after the contribution exports slice:

- Added finance-admin signed treasury audit package export at
  `/api/v1/contributions/admin/treasury/audit-package`.
- The audit package is generated from live contribution and ledger records,
  includes the export scope, summary totals, contribution snapshots, ledger
  snapshots, a canonical SHA-256 digest, and an HMAC-SHA256 server signature.
- Added an admin treasury download action for the audit JSON package.
- Expanded contribution tests to verify package integrity, HMAC signature
  generation, receipt inclusion, and member access denial.
- Updated API, data model, roadmap, and status documentation.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury are now roughly 30% complete because
  campaign lifecycle, local contribution recording, receipts, ledger summary,
  receipt downloads, finance CSV exports, and signed audit JSON packages now
  exist.
- Overall 24-week MVP-plus implementation is roughly 71% complete.

Implemented now:

- Runtime split across public/member `3010`, admin RBAC `3011`, super-admin
  `3012`, and FastAPI `8002`.
- Auth, protected platform owner seed, web sessions, CSRF, 2FA enforcement, rate
  limiting, verification, YALUMNI directory, MWF alumni cache directory plus
  worker/history operations, communities, notifications, direct messages,
  moderation, opportunities, resources, success stories, member events, member
  initiatives, mentorship foundation, elections foundation, contributions
  foundation, contribution finance exports, and signed treasury audit packages.
- Route parity exists for exported screens; live data is wired for the modules
  listed above, while chapter analytics and deeper finance/election governance
  workflows remain prototype or foundation-level.

Main gaps now:

- Contributions still need real payment provider integration, payment intent
  lifecycle, webhook reconciliation, refunds/voids, generated PDF receipts,
  campaign approvals, disbursement requests, expense reports, multi-currency
  accounting rules, immutable stored audit package approvals, and certified PDF
  audit reports.
- Elections still need nomination workflows, candidate approval/rejection,
  position-based multi-seat ballots, stronger anonymous ballot envelopes,
  dispute handling, exportable certified audit reports, notification hooks,
  voter-roll imports from chapters/cohorts, and admin detail subroutes beyond
  the consolidated console panel.
- Chapter analytics still needs a backend module.
- Mentorship still needs matching recommendations, scheduling, mentor capacity
  enforcement beyond counts, session notes, feedback, reporting/moderation,
  notifications, and admin analytics.
- MWF cache still needs admin diff review, source-field quality dashboards,
  distributed worker locking, and full-text/faceted search indexing.
- Directory search remains database-backed MVP search rather than
  Meilisearch/OpenSearch.
- Initiatives and events still need richer admin/organizer workflows,
  notifications, analytics, and operational lifecycle depth.
- Production hardening remains for Redis/WebSocket fanout, supervised
  background workers, email delivery logs/bounces/unsubscribe, malware
  scanning, CDN/signed URLs, and compliance exports.

Next possible implementation slices:

- Contribution payment-provider/webhook reconciliation and refund/void flows.
- Generated PDF receipts and certified treasury audit reports.
- Chapter analytics backend foundation.
- Elections hardening with nominations, anonymous ballot envelopes, certified
  audit exports, disputes, and notification hooks.
- Mentorship notifications, scheduling, session notes, and admin analytics.
- MWF source diff/quality dashboard and search indexing.

## Current V1.5 Implementation Update: 2026-05-14 Contribution Exports Slice

Completed after the contributions foundation slice:

- Added member/admin receipt text download support at
  `/api/v1/contributions/receipts/{receipt_id}/download` with the same
  owner-or-finance-admin access rules as receipt detail.
- Added finance-admin contribution CSV export at
  `/api/v1/contributions/admin/contributions/export`, including campaign,
  receipt, donor, payment reference, status, and note fields.
- Added finance-admin treasury ledger CSV export at
  `/api/v1/contributions/admin/treasury/export`, including ledger, campaign,
  receipt, and contributor context.
- Updated member receipt UI with download and print actions.
- Updated the admin RBAC contribution/treasury panels with CSV export actions.
- Updated all Next backend proxy helpers to preserve `Content-Disposition`
  headers so downloaded receipt/CSV filenames survive through the app ports.
- Expanded contribution API tests for receipt download permissions and CSV
  export output.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury are now roughly 27% complete because
  campaign lifecycle, local contribution recording, receipts, ledger summary,
  receipt downloads, and finance CSV exports now exist.
- Overall 24-week MVP-plus implementation is roughly 70% complete.

Implemented now:

- Runtime split across public/member `3010`, admin RBAC `3011`, super-admin
  `3012`, and FastAPI `8002`.
- Auth, protected platform owner seed, web sessions, CSRF, 2FA enforcement, rate
  limiting, verification, YALUMNI directory, MWF alumni cache directory plus
  worker/history operations, communities, notifications, direct messages,
  moderation, opportunities, resources, success stories, member events, member
  initiatives, mentorship foundation, elections foundation, contributions
  foundation, and contribution finance exports.
- Route parity exists for exported screens; live data is wired for the modules
  listed above, while chapter analytics and deeper finance/election governance
  workflows remain prototype or foundation-level.

Main gaps now:

- Contributions still need real payment provider integration, payment intent
  lifecycle, webhook reconciliation, refunds/voids, generated PDF receipts,
  campaign approvals, disbursement requests, expense reports, multi-currency
  accounting rules, and signed/formal treasury audit packages.
- Elections still need nomination workflows, candidate approval/rejection,
  position-based multi-seat ballots, stronger anonymous ballot envelopes,
  dispute handling, exportable certified audit reports, notification hooks,
  voter-roll imports from chapters/cohorts, and admin detail subroutes beyond
  the consolidated console panel.
- Chapter analytics still needs a backend module.
- Mentorship still needs matching recommendations, scheduling, mentor capacity
  enforcement beyond counts, session notes, feedback, reporting/moderation,
  notifications, and admin analytics.
- MWF cache still needs admin diff review, source-field quality dashboards,
  distributed worker locking, and full-text/faceted search indexing.
- Directory search remains database-backed MVP search rather than
  Meilisearch/OpenSearch.
- Initiatives and events still need richer admin/organizer workflows,
  notifications, analytics, and operational lifecycle depth.
- Production hardening remains for Redis/WebSocket fanout, supervised
  background workers, email delivery logs/bounces/unsubscribe, malware
  scanning, CDN/signed URLs, and compliance exports.

Next possible implementation slices:

- Contribution payment-provider/webhook reconciliation and refund/void flows.
- Generated PDF receipts and signed treasury audit packages.
- Chapter analytics backend foundation.
- Elections hardening with nominations, anonymous ballot envelopes, certified
  audit exports, disputes, and notification hooks.
- Mentorship notifications, scheduling, session notes, and admin analytics.
- MWF source diff/quality dashboard and search indexing.

## Current V1.5 Implementation Update: 2026-05-13 Contributions Foundation Slice

Completed after the elections foundation slice:

- Added a live FastAPI Contributions module with `contribution_campaigns`,
  `contributions`, `contribution_receipts`, and `contribution_ledger_entries`
  persistence.
- Added Alembic migration `20260513_0027_contributions`.
- Added finance-admin APIs for campaign draft creation, publish/close lifecycle,
  contribution record review, receipt/ledger visibility, and treasury summary.
- Added member APIs for published campaign listing/detail, local confirmed
  contribution recording, and member receipt retrieval with owner/admin access
  rules.
- Replaced `/contributions`, `/contributions/[campaignId]`,
  `/contributions/[campaignId]/pay`, and
  `/contributions/receipts/[receiptId]` with live member UI wired to the
  backend.
- Added live contributions and treasury panels to the separate admin RBAC
  console on port 3011.
- Added shared frontend API types/client methods for campaigns, payments,
  receipts, contribution records, ledger entries, and treasury summary.
- Added API tests for campaign lifecycle, member visibility, payment/receipt
  issuance, treasury totals, ledger creation, finance role gates, invalid
  payment methods, closed-campaign payment blocking, and receipt privacy.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections remain roughly 24% complete.
- Post-MVP contributions/treasury are now roughly 22% complete because
  campaign setup, member contribution recording, receipts, and ledger summary
  now exist.
- Overall 24-week MVP-plus implementation is roughly 69% complete.

Implemented now:

- Runtime split across public/member `3010`, admin RBAC `3011`, super-admin
  `3012`, and FastAPI `8002`.
- Auth, protected platform owner seed, web sessions, CSRF, 2FA enforcement, rate
  limiting, verification, YALUMNI directory, MWF alumni cache directory plus
  worker/history operations, communities, notifications, direct messages,
  moderation, opportunities, resources, success stories, member events, member
  initiatives, mentorship foundation, elections foundation, and contributions
  foundation.
- Route parity exists for exported screens; live data is wired for the modules
  listed above, while chapter analytics and deeper finance/election governance
  workflows remain prototype or foundation-level.

Main gaps now:

- Contributions still need real payment provider integration, payment intent
  lifecycle, webhook reconciliation, refunds/voids, receipt PDF generation,
  donor exports, campaign approvals, disbursement requests, expense reports,
  multi-currency accounting rules, and formal treasury audit exports.
- Elections still need nomination workflows, candidate approval/rejection,
  position-based multi-seat ballots, stronger anonymous ballot envelopes,
  dispute handling, exportable certified audit reports, notification hooks,
  voter-roll imports from chapters/cohorts, and admin detail subroutes beyond
  the consolidated console panel.
- Chapter analytics still needs a backend module.
- Mentorship still needs matching recommendations, scheduling, mentor capacity
  enforcement beyond counts, session notes, feedback, reporting/moderation,
  notifications, and admin analytics.
- MWF cache still needs admin diff review, source-field quality dashboards,
  distributed worker locking, and full-text/faceted search indexing.
- Directory search remains database-backed MVP search rather than
  Meilisearch/OpenSearch.
- Initiatives and events still need richer admin/organizer workflows,
  notifications, analytics, and operational lifecycle depth.
- Production hardening remains for Redis/WebSocket fanout, supervised background
  workers, email delivery logs/bounces/unsubscribe, malware scanning,
  CDN/signed URLs, and compliance exports.

Next possible implementation slices:

- Contributions hardening with payment provider/webhook reconciliation, refunds,
  receipt PDFs, donor exports, and treasury audit exports.
- Chapter analytics backend foundation.
- Elections hardening with nominations, anonymous ballot envelopes, certified
  audit exports, disputes, and notification hooks.
- Mentorship notifications, scheduling, session notes, and admin analytics.
- MWF source diff/quality dashboard and search indexing.
- Initiative collaboration workflow with team roles, updates, documents,
  milestone edits, and impact metrics.

## Current V1.5 Implementation Update: 2026-05-13 Elections Foundation Slice

Completed after the mentorship foundation slice:

- Added a live FastAPI Elections module with `elections`, `election_candidates`,
  `election_voters`, and `election_votes` persistence.
- Added Alembic migration `20260513_0026_elections`.
- Added admin APIs for election draft creation, candidate setup, voter-roll
  updates, open/close lifecycle controls, audit view, and privacy summary.
- Added member APIs for visible election listing/detail, candidates, voting, and
  results visibility after close or when configured as live.
- Added one-vote-per-user enforcement through database uniqueness, explicit
  voter-roll eligibility checks, quorum reporting, and security-event audit
  traces.
- Replaced `/elections`, `/elections/new`, `/elections/[electionId]`,
  `/elections/[electionId]/vote`, and `/elections/[electionId]/results` with
  live member UI wired to the backend.
- Added a live elections panel to the separate admin RBAC console on port 3011
  for draft creation, candidate setup, voter-roll updates, and open/close
  actions.
- Added shared frontend API types/client methods for election lifecycle,
  candidates, voter rolls, votes, results, audit, and privacy.
- Added API tests for election creation, candidate setup, voter-roll import,
  open/close lifecycle, member visibility, eligibility enforcement, duplicate
  vote prevention, results/quorum, audit, and admin role gates.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship remains roughly 18% complete.
- Post-MVP elections are now roughly 24% complete because draft setup,
  candidate/voter-roll operations, voting, results, and admin audit/privacy
  summary now exist.
- Overall 24-week MVP-plus implementation is roughly 67% complete.

Implemented now:

- Runtime split across public/member `3010`, admin RBAC `3011`, super-admin
  `3012`, and FastAPI `8002`.
- Auth, protected platform owner seed, web sessions, CSRF, 2FA enforcement, rate
  limiting, verification, YALUMNI directory, MWF alumni cache directory plus
  worker/history operations, communities, notifications, direct messages,
  moderation, opportunities, resources, success stories, member events, member
  initiatives, mentorship foundation, and elections foundation.
- Route parity exists for exported screens; live data is wired for the modules
  listed above, while finance/treasury and deeper analytics modules remain
  prototype-backed.

Main gaps now:

- Elections still need nomination workflows, candidate approval/rejection,
  position-based multi-seat ballots, stronger anonymous ballot envelopes,
  dispute handling, exportable certified audit reports, notification hooks,
  voter-roll imports from chapters/cohorts, and admin detail subroutes beyond
  the consolidated console panel.
- Contributions/payments/receipts, chapter analytics, and treasury still need
  backend modules.
- Mentorship still needs matching recommendations, scheduling, mentor capacity
  enforcement beyond counts, session notes, feedback, reporting/moderation,
  notifications, and admin analytics.
- MWF cache still needs admin diff review, source-field quality dashboards,
  distributed worker locking, and full-text/faceted search indexing.
- Directory search remains database-backed MVP search rather than
  Meilisearch/OpenSearch.
- Initiatives and events still need richer admin/organizer workflows,
  notifications, analytics, and operational lifecycle depth.
- Production hardening remains for Redis/WebSocket fanout, supervised background
  workers, email delivery logs/bounces/unsubscribe, malware scanning,
  CDN/signed URLs, and compliance exports.

Next possible implementation slices:

- Contributions campaign/payment/receipt backend foundation.
- Elections hardening with nominations, anonymous ballot envelopes, certified
  audit exports, disputes, and notification hooks.
- Mentorship notifications, scheduling, session notes, and admin analytics.
- Chapter analytics backend foundation.
- MWF source diff/quality dashboard and search indexing.
- Initiative collaboration workflow with team roles, updates, documents,
  milestone edits, and impact metrics.

## Current V1.5 Implementation Update: 2026-05-13 Mentorship Foundation Slice

Completed after the MWF cache operations slice:

- Added a live FastAPI Mentorship module with `mentor_profiles` and `mentorship_requests` persistence.
- Added Alembic migration `20260513_0025_mentorship`.
- Added authenticated APIs for mentor summary, mentor discovery, current-user mentor settings, request creation, incoming/outgoing request lists, accept, decline, and cancel.
- Replaced `/mentorship`, `/mentorship/find`, `/mentorship/request`, and `/mentorship/settings` prototype screens with live member UI wired to the backend.
- Added shared frontend API types/client methods for mentor profiles, mentor search, requests, and request review.
- Added API tests for mentor profile creation, discovery filters, request creation, duplicate/self-request guards, incoming review, cancellation, paused mentor availability, and auth.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 38% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Post-MVP mentorship is now roughly 18% complete because mentor profile/settings, discovery, request, and review workflows exist.
- Overall 24-week MVP-plus implementation is roughly 65% complete.

Implemented now:

- Runtime split across public/member `3010`, admin RBAC `3011`, super-admin `3012`, and FastAPI `8002`.
- Auth, protected platform owner seed, web sessions, CSRF, 2FA enforcement, rate limiting, verification, YALUMNI directory, MWF alumni cache directory plus worker/history operations, communities, notifications, direct messages, moderation, opportunities, resources, success stories, member events, member initiatives, and mentorship foundation.
- Route parity exists for exported screens; live data is wired for the modules listed above, while later governance/finance modules remain prototype-backed.

Main gaps now:

- Mentorship still needs matching recommendations, scheduling, mentor capacity enforcement beyond counts, session notes, feedback, reporting/moderation, notifications, and admin analytics.
- MWF cache still needs admin diff review, source-field quality dashboards, distributed worker locking, and full-text/faceted search indexing.
- Directory search remains database-backed MVP search rather than Meilisearch/OpenSearch.
- Initiatives still need team/member roles, comments, updates, documents, milestone editing, governance approval, admin moderation, notifications, analytics, and impact metric tracking.
- Events still need organizer/admin review, edit/draft/publish workflows, RSVP cancellation, waitlists, calendar exports, reminders, check-in, ticketing, event media, and notification hooks.
- Elections, contributions/payments/receipts, chapter analytics, and treasury still need backend modules.
- Production hardening remains for Redis/WebSocket fanout, supervised background workers, email delivery logs/bounces/unsubscribe, malware scanning, CDN/signed URLs, and compliance exports.

Next possible implementation slices:

- Contributions campaign/payment/receipt backend foundation.
- Election backend foundation with voter roll, candidate review, ballot integrity, and audit logs.
- Mentorship notifications, scheduling, session notes, and admin analytics.
- MWF source diff/quality dashboard and search indexing.
- Initiative collaboration workflow with team roles, updates, documents, milestone edits, and impact metrics.
- Events admin/organizer workflow with edits, approvals, cancellation, RSVP cancellation, calendar export, and reminders.

## Current V1.5 Implementation Update: 2026-05-13 MWF Cache Operations Slice

Completed after the MWF alumni directory hybrid cache slice:

- Added a scheduled MWF cache worker CLI at `python -m app.workers.mwf_alumni_sync`, also exposed through `npm run worker:api:mwf-sync`.
- Added cache cadence configuration through `MWF_DIRECTORY_SYNC_WORKER_INTERVAL_SECONDS` with a default one-hour check interval.
- Added a worker-safe sync-if-needed service that skips fresh caches, avoids duplicate in-progress refreshes, and supports forced refreshes for operator use.
- Added `GET /api/v1/alumni/admin/mwf-sync/runs` for SUPER_ADMIN sync history with recent run counts/status.
- Expanded SUPER_ADMIN `/system` MWF cache operations UI with worker cadence and recent sync-run history.
- Added API/service tests for sync history permissions, recent run ordering, fresh-cache skip behavior, and forced refresh behavior.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 is now roughly 38% complete because the MWF directory cache now has operational cadence, history visibility, and super-admin observability.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Overall 24-week MVP-plus implementation is roughly 64% complete.

Implemented now:

- Runtime split across public/member `3010`, admin RBAC `3011`, super-admin `3012`, and FastAPI `8002`.
- Auth, protected platform owner seed, web sessions, CSRF, 2FA enforcement, rate limiting, verification, YALUMNI directory, MWF alumni cache directory plus worker/history operations, communities, notifications, direct messages, moderation, opportunities, resources, success stories, member events, and member initiatives.
- Route parity exists for exported screens; live data is wired for the modules listed above, while later governance/finance modules remain prototype-backed.

Main gaps now:

- MWF cache still needs admin diff review, source-field quality dashboards, distributed worker locking, and full-text/faceted search indexing.
- Directory search remains database-backed MVP search rather than Meilisearch/OpenSearch.
- Initiatives still need team/member roles, comments, updates, documents, milestone editing, governance approval, admin moderation, notifications, analytics, and impact metric tracking.
- Events still need organizer/admin review, edit/draft/publish workflows, RSVP cancellation, waitlists, calendar exports, reminders, check-in, ticketing, event media, and notification hooks.
- Elections, contributions/payments/receipts, mentorship, chapter analytics, and treasury still need backend modules.
- Production hardening remains for Redis/WebSocket fanout, supervised background workers, email delivery logs/bounces/unsubscribe, malware scanning, CDN/signed URLs, and compliance exports.

Next possible implementation slices:

- Mentorship backend for mentor profile/settings, discovery, and requests.
- Contributions campaign/payment/receipt backend foundation.
- Election backend foundation with voter roll, candidate review, ballot integrity, and audit logs.
- MWF source diff/quality dashboard and search indexing.
- Initiative collaboration workflow with team roles, updates, documents, milestone edits, and impact metrics.
- Events admin/organizer workflow with edits, approvals, cancellation, RSVP cancellation, calendar export, and reminders.

## Current V1.5 Implementation Update: 2026-05-12 MWF Alumni Directory Hybrid Cache Slice

Completed after the initiatives member workflow slice:

- Added a separate MWF alumni cache model using `mwf_alumni_profiles` and `mwf_alumni_sync_runs`; imported MWF entries are not YALUMNI login users.
- Added Alembic migration `20260512_0024_mwf_alumni_directory`.
- Promoted `httpx` to a production API dependency and added a sync service for the official Mandela Washington Fellowship WordPress/Vue endpoints.
- Added alumni-only filtering, country/expertise label normalization, idempotent refresh updates, deactivation of missing source records, sync status, and manual refresh.
- Added member/SUPER_ADMIN APIs for cached MWF search/detail and SUPER_ADMIN APIs for cache status/manual refresh.
- Added the member-only `MWF Alumni` tab to `/directory` with search, country, year, field, expertise, and leadership-institute filters.
- Added super-admin `/system` cache status and refresh controls.
- Added API tests for import filtering, label normalization, idempotent refresh/deactivation, search filters/pagination, member auth, and SUPER_ADMIN sync permissions.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 is now roughly 36% complete because the verified-member directory now includes a separate MWF alumni hybrid cache and member-facing tab.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives remain roughly 24% complete.
- Overall 24-week MVP-plus implementation is roughly 63% complete.

Implemented now:

- Runtime split across public/member `3010`, admin RBAC `3011`, super-admin `3012`, and FastAPI `8002`.
- Auth, protected platform owner seed, web sessions, CSRF, 2FA enforcement, rate limiting, verification, YALUMNI directory, MWF alumni cache directory, communities, notifications, direct messages, moderation, opportunities, resources, success stories, member events, and member initiatives.
- Route parity exists for exported screens; live data is wired for the modules listed above, while later governance/finance modules remain prototype-backed.

Main gaps now:

- MWF cache is read-only and locally refreshed; it does not yet have scheduled worker cadence, admin diff review, source-field quality dashboards, or full-text/faceted search indexing.
- Directory search remains database-backed MVP search rather than Meilisearch/OpenSearch.
- Initiatives still need team/member roles, comments, updates, documents, milestone editing, governance approval, admin moderation, notifications, analytics, and impact metric tracking.
- Events still need organizer/admin review, edit/draft/publish workflows, RSVP cancellation, waitlists, calendar exports, reminders, check-in, ticketing, event media, and notification hooks.
- Elections, contributions/payments/receipts, mentorship, chapter analytics, and treasury still need backend modules.
- Production hardening remains for Redis/WebSocket fanout, background worker supervision, email delivery logs/bounces/unsubscribe, malware scanning, CDN/signed URLs, and compliance exports.

Next possible implementation slices:

- Scheduled MWF cache worker plus admin diff/history view.
- Mentorship backend for mentor profile/settings, discovery, and requests.
- Contributions campaign/payment/receipt backend foundation.
- Election backend foundation with voter roll, candidate review, ballot integrity, and audit logs.
- Initiative collaboration workflow with team roles, updates, documents, milestone edits, and impact metrics.
- Events admin/organizer workflow with edits, approvals, cancellation, RSVP cancellation, calendar export, and reminders.

## Current V1.5 Implementation Update: 2026-05-12 Initiatives Member Workflow Slice

Completed after the events member workflow slice:

- Added a live FastAPI Initiatives module with `initiatives` and `initiative_milestones` persistence.
- Added Alembic migration `20260512_0023_initiatives`.
- Added authenticated member APIs for initiative list/search, current-user initiatives, create, and detail.
- Added creator/admin visibility rules for non-public initiative records and security audit events for initiative creation.
- Replaced the route-complete Initiatives prototypes with live member UI for `/initiatives`, `/initiatives/new`, and `/initiatives/[initiativeId]`.
- Updated the shared frontend API client and screen parity/status docs for Initiatives.
- Added API tests covering create/list/detail/filter behavior, validation, and auth-required behavior.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 31% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events remains roughly 28% complete.
- Post-MVP initiatives are now roughly 24% complete: initiative persistence, member proposal, browsing, detail, milestones, basic filters, creator-owned lists, and audit records now exist.
- Overall 24-week MVP-plus implementation is roughly 61% complete.

Implemented now:

- Runtime split across public/member `3010`, admin RBAC `3011`, super-admin `3012`, and FastAPI `8002`.
- Auth, protected platform owner seed, web sessions, CSRF, 2FA enforcement, rate limiting, verification, directory, communities, notifications, direct messages, moderation, opportunities, resources, success stories, member events, and member initiatives.
- Route parity exists for exported screens; live data is wired for the modules listed above, while later governance/finance modules remain prototype-backed.

Main gaps now:

- Initiatives still need team/member roles, comments, updates, documents, milestone editing, governance approval, admin moderation, notifications, analytics, and impact metric tracking.
- Events still need organizer/admin review, edit/draft/publish workflows, RSVP cancellation, waitlists, calendar exports, reminders, check-in, ticketing, event media, and notification hooks.
- Elections, contributions/payments/receipts, mentorship, chapter analytics, and treasury still need backend modules.
- Opportunities, resources, and success stories have live MVP workflows, but still need richer attachments/media, notifications, and audit depth.
- Production hardening remains for Redis/WebSocket fanout, background worker supervision, email delivery logs/bounces/unsubscribe, malware scanning, CDN/signed URLs, and compliance exports.

Next possible implementation slices:

- Mentorship backend for mentor profile/settings, discovery, and requests.
- Contributions campaign/payment/receipt backend foundation.
- Election backend foundation with voter roll, candidate review, ballot integrity, and audit logs.
- Initiative collaboration workflow with team roles, updates, documents, milestone edits, and impact metrics.
- Events admin/organizer workflow with edits, approvals, cancellation, RSVP cancellation, calendar export, and reminders.

## Current V1.5 Implementation Update: 2026-05-12 Events Member Workflow Slice

Completed after the success-story editorial review slice:

- Added a live FastAPI Events module with `events`, `event_agenda_items`, and `event_attendees` persistence.
- Added Alembic migration `20260512_0022_events`.
- Added authenticated member APIs for event list/search, create, detail, agenda, attendees, and RSVP.
- Added security audit events for event creation and RSVP registration.
- Replaced the route-complete Events prototypes with live member UI for `/events`, `/events/new`, `/events/[eventId]`, `/events/[eventId]/agenda`, and `/events/[eventId]/attendees`.
- Updated the shared frontend API client and screen parity/status docs for Events.
- Added API tests covering create/list/detail/agenda/attendees/RSVP, validation, filtering, and auth-required behavior.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 31% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications remains roughly 51% complete.
- Phase 8 events is now roughly 28% complete: event persistence, member creation, browsing, detail, agenda, attendees, RSVP, and basic audit records now exist.
- Overall 24-week MVP implementation is roughly 59% complete.

Implemented now:

- Runtime split across public/member `3010`, admin RBAC `3011`, super-admin `3012`, and FastAPI `8002`.
- Auth, protected platform owner seed, web sessions, CSRF, 2FA enforcement, rate limiting, verification, directory, communities, notifications, direct messages, moderation, opportunities, resources, success stories, and member events.
- Route parity exists for exported screens; live data is wired for the modules listed above, while later governance/finance modules remain prototype-backed.

Main gaps now:

- Events still need organizer/admin review, edit/draft/publish workflows, RSVP cancellation, waitlists, calendar exports, reminders, check-in, ticketing, event media, and notification hooks.
- Elections, contributions/payments/receipts, initiatives, mentorship, chapter analytics, and treasury still need backend modules.
- Opportunities, resources, and success stories have live MVP workflows, but still need richer attachments/media, notifications, and audit depth.
- Production hardening remains for Redis/WebSocket fanout, background worker supervision, email delivery logs/bounces/unsubscribe, malware scanning, CDN/signed URLs, and compliance exports.

Next possible implementation slices:

- Initiatives backend and member proposal/detail workflow.
- Mentorship backend for mentor profile/settings, discovery, and requests.
- Contributions campaign/payment/receipt backend foundation.
- Election backend foundation with voter roll, candidate review, ballot integrity, and audit logs.
- Events admin/organizer workflow with edits, approvals, cancellation, RSVP cancellation, calendar export, and reminders.

## Current V1.5 Implementation Update: 2026-05-08 Direct Message Trust And Moderation Slice

Completed after the scheduled digest worker foundation slice:

- Added direct-message moderation persistence for message removal attribution, internal moderation notes, severity, escalation state, and per-message report records.
- Added Alembic migration `20260508_0018_direct_message_moderation` for direct-message review metadata and `direct_message_reports`.
- Added participant reporting at `POST /api/v1/messages/conversations/{conversation_id}/messages/{message_id}/reports` with duplicate-open-report protection and self-report prevention.
- Added admin report queue, report review, report resolution, removed-message queue, message review, message remove, and message restore APIs under `/api/v1/messages/admin/moderation/*`.
- Redacted removed message bodies from participant message history while preserving the original body and moderation metadata for admin queues.
- Added dashboard message report controls for non-owned active messages.
- Added admin console message moderation queues for reported messages and removed messages, including filters, review metadata controls, resolve, remove, and restore actions.
- Added backend coverage for report creation, duplicate prevention, participant/admin access control, review metadata, admin removal/redaction, removed-message queues, report resolution, and restore flow.
- Updated README, API, data model, roadmap, and status docs for direct-message moderation.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 31% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 55% complete.
- Phase 7 messaging/notifications is now roughly 51% complete: persisted notifications, community hooks, dashboard inbox, read APIs, SSE snapshots, notification preferences, console/SMTP email delivery, admin-run email digests, scheduled digest worker CLI, digest cadence audit state, one-to-one conversations, participant guards, message send/list, read markers, user blocks, dashboard messaging, message reporting, admin message moderation queues, removal redaction, and restore controls now exist.
- Overall 24-week MVP implementation is roughly 57% complete.

Implemented now:

- Native landing page.
- Monorepo foundation, CI, docs, Docker Compose.
- FastAPI health/status and request middleware.
- Identity auth, refresh sessions, account recovery, email verification, console/SMTP delivery for account emails, protected platform owner, role-gated admin overview, session management, admin 2FA policy gate, secure cookie-backed web sessions, CSRF protection, and MVP-local rate limiting.
- Local-only test-account seeding for role and directory QA.
- Protected dashboard/admin route behavior.
- Alumni current-user profile model/API/UI with profile photo upload/display/delete.
- Shared local/S3 upload storage adapter for profile photos, verification evidence, community feed media, and local uploaded assets.
- Program affiliation model/API/UI.
- Verification request submission, member status history, admin queue, review actions, alumni-member role grant, and evidence upload/review.
- Verified member directory search/profile detail with privacy-aware serializers and authenticated profile-photo display.
- Dedicated admin audit log viewer backed by `security_events`.
- Community discovery, creation, detail pages, active rosters, open/request joins, pending review, manager roles, role updates, non-owner member removal, owner/admin settings editing, invitation email delivery, invitation cancellation/acceptance, ownership transfer, gated community posts, media attachments, comments, likes, reports, manager-visible report counts, per-community report queues, removed post/comment queues, restore actions, cross-community admin moderation queues, moderation review metadata, notification inbox, community workflow notification hooks, live notification snapshot streaming, notification preferences, admin-run notification email digests, worker-run notification email digests, one-to-one direct messaging, contact blocking, direct-message reporting, and admin message moderation.

Main gaps now:

- Direct messaging still needs attachments, reactions, typing indicators, presence, per-message read receipts, message search, retention controls, exports, group conversations, and richer admin troubleshooting views.
- Digest worker execution exists as a separate CLI, but production still needs service supervision, deployment manifests, health checks, distributed locking, retries, backoff, and dead-letter handling.
- Email delivery is synchronous console/SMTP plumbing. Production still needs provider credentials, HTML templates, delivery logs, bounce handling, unsubscribe/compliance flows, and delivery audit exports.
- Notification preferences now cover in-app suppression and digest frequency, but per-channel preferences, quiet hours, admin override rules, unsubscribe state, and granular digest grouping remain open.
- Notification realtime is SSE polling for MVP, not Redis/WebSocket fanout. Production still needs multi-worker pub/sub, reconnection/backoff policy review, batching, and push delivery.
- Community feed still needs pinned posts, mentions, richer formatting, edit history, audit export tooling, and global feed aggregation.
- Feed media is storage-backed and moderated, but production media hardening still needs malware scanning, image processing, thumbnail generation, CDN/signed URL decisions, and retention policy.
- Directory search is database-backed MVP search, not Meilisearch/OpenSearch.
- Events, initiatives, contributions, elections, chapter analytics, and richer governance workflows are not wired yet.

Next possible implementation slices:

- Direct messaging attachments with private storage, validation, authenticated downloads, and moderation removal.
- Direct messaging reactions, message search, typing/presence, and per-message read receipts.
- Redis/WebSocket realtime fanout for notifications and messages.
- Production worker supervision and distributed lock/retry/dead-letter handling.
- Feed post editing with audit history and moderator-visible revision records.
- Pinned/featured posts and announcements for community owners/managers.
- Global feed aggregation from community posts and future public posts.
- Moderator audit exports and immutable compliance event tables.
- Production email hardening with provider templates, queue/retry, bounce tracking, unsubscribe controls, and delivery logs.

## Current V1.5 Implementation Update: 2026-05-08 Scheduled Digest Worker Foundation Slice

Completed after the direct messaging foundation slice:

- Added a standalone notification digest worker entrypoint at `python -m app.workers.notification_digests`.
- Added the root script `npm run worker:api:notification-digests` for running the worker from the monorepo.
- Added worker options for `--once`, `--dry-run`, `--force`, frequency selection, loop interval, candidate limit, read inclusion, and max items per email.
- Added `NOTIFICATION_DIGEST_WORKER_*` configuration defaults for loop interval, frequencies, candidate limits, item limits, and read-notification inclusion.
- Added daily/weekly cadence checks backed by `security_events` success records so normal worker runs do not resend before the next cadence window.
- Added worker dry-run, success, and failure audit events under `notifications.email_digest_worker.*`.
- Ensured dry runs preview candidates without marking notifications sent and without advancing worker cadence.
- Added worker tests for delivery, audit recording, digest sent marking, cadence skipping, and dry-run behavior.
- Updated README, API, data model, roadmap, and status docs for worker operations.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 31% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 54% complete.
- Phase 7 messaging/notifications is now roughly 46% complete: persisted notifications, community hooks, dashboard inbox, read APIs, SSE snapshots, notification preferences, console/SMTP email delivery, admin-run email digests, scheduled digest worker CLI, digest cadence audit state, one-to-one conversations, participant guards, message send/list, read markers, user blocks, and dashboard messaging now exist. Redis/WebSocket fanout, production worker supervision, distributed worker locking, group messaging, attachments, reactions, typing/presence, per-message receipts, queued retries, push delivery, moderation/reporting for messages, and delivery audit exports remain open.
- Overall 24-week MVP implementation is roughly 56% complete.

Implemented now:

- Native landing page.
- Monorepo foundation, CI, docs, Docker Compose.
- FastAPI health/status and request middleware.
- Identity auth, refresh sessions, account recovery, email verification, console/SMTP delivery for account emails, protected platform owner, role-gated admin overview, session management, admin 2FA policy gate, secure cookie-backed web sessions, CSRF protection, and MVP-local rate limiting.
- Local-only test-account seeding for role and directory QA.
- Protected dashboard/admin route behavior.
- Alumni current-user profile model/API/UI with profile photo upload/display/delete.
- Shared local/S3 upload storage adapter for profile photos, verification evidence, community feed media, and local uploaded assets.
- Program affiliation model/API/UI.
- Verification request submission, member status history, admin queue, review actions, alumni-member role grant, and evidence upload/review.
- Verified member directory search/profile detail with privacy-aware serializers and authenticated profile-photo display.
- Dedicated admin audit log viewer backed by `security_events`.
- Community discovery, creation, detail pages, active rosters, open/request joins, pending review, manager roles, role updates, non-owner member removal, owner/admin settings editing, invitation email delivery, invitation cancellation/acceptance, ownership transfer, gated community posts, media attachments, comments, likes, reports, manager-visible report counts, per-community report queues, removed post/comment queues, restore actions, cross-community admin moderation queues, moderation review metadata, notification inbox, community workflow notification hooks, live notification snapshot streaming, notification preferences, admin-run notification email digests, worker-run notification email digests, and one-to-one direct messaging.

Main gaps now:

- Digest worker execution now exists as a separate CLI, but production still needs service supervision, deployment manifests, health checks, distributed locking, retries, backoff, and dead-letter handling.
- Direct messaging is an MVP foundation. It still needs attachments, reactions, typing indicators, presence, per-message read receipts, message search, message reporting/moderation, retention controls, exports, group conversations, and admin troubleshooting views.
- Email delivery is synchronous console/SMTP plumbing. Production still needs provider credentials, HTML templates, delivery logs, bounce handling, unsubscribe/compliance flows, and delivery audit exports.
- Notification preferences now cover in-app suppression and digest frequency, but per-channel preferences, quiet hours, admin override rules, unsubscribe state, and granular digest grouping remain open.
- Notification realtime is SSE polling for MVP, not Redis/WebSocket fanout. Production still needs multi-worker pub/sub, reconnection/backoff policy review, batching, and push delivery.
- Community feed still needs pinned posts, mentions, richer formatting, edit history, audit export tooling, and global feed aggregation.
- Feed media is storage-backed and moderated, but production media hardening still needs malware scanning, image processing, thumbnail generation, CDN/signed URL decisions, and retention policy.
- Directory search is database-backed MVP search, not Meilisearch/OpenSearch.
- Events, initiatives, contributions, elections, chapter analytics, and richer governance workflows are not wired yet.

Next possible implementation slices:

- Direct messaging attachments, reactions, and reporting/moderation controls.
- Redis/WebSocket realtime fanout for notifications and messages.
- Production worker supervision and distributed lock/retry/dead-letter handling.
- Feed post editing with audit history and moderator-visible revision records.
- Pinned/featured posts and announcements for community owners/managers.
- Global feed aggregation from community posts and future public posts.
- Moderator audit exports and immutable compliance event tables.
- Production email hardening with provider templates, queue/retry, bounce tracking, unsubscribe controls, and delivery logs.

## Current V1.5 Implementation Update: 2026-05-08 Direct Messaging Foundation Slice

Completed after the notification email digest worker slice:

- Added direct messaging persistence for conversations, conversation participants, direct messages, and user blocks.
- Added Alembic migration `20260508_0017_direct_messaging` with indexes and uniqueness rules for direct conversations, participants, messages, and block relationships.
- Added authenticated direct messaging APIs for conversation list/detail, direct conversation creation/reuse, message list/send, read-state updates, and block/unblock management.
- Enforced participant-only conversation access and mutual block checks before creating conversations or sending messages.
- Added direct-message notification hooks so recipients receive in-app message notifications linked back to the dashboard.
- Added dashboard messaging UI with verified-member search, conversation list, unread counts, message thread, send box, read marking, and block/unblock controls.
- Added API coverage for direct conversation creation, message send/list, read-state updates, notification creation, conversation reuse, participant access control, and block enforcement.
- Updated API, data model, roadmap, and status docs for direct messaging.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 31% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 54% complete.
- Phase 7 messaging/notifications is now roughly 41% complete: persisted notifications, community hooks, dashboard inbox, read APIs, SSE snapshots, notification preferences, console/SMTP email delivery, admin-run email digests, one-to-one conversations, participant guards, message send/list, read markers, user blocks, and dashboard messaging now exist. Redis/WebSocket fanout, group messaging, attachments, reactions, typing/presence, per-message receipts, scheduled digest execution, queued retries, push delivery, moderation/reporting for messages, and delivery audit exports remain open.
- Overall 24-week MVP implementation is roughly 55% complete.

Implemented now:

- Native landing page.
- Monorepo foundation, CI, docs, Docker Compose.
- FastAPI health/status and request middleware.
- Identity auth, refresh sessions, account recovery, email verification, console/SMTP delivery for account emails, protected platform owner, role-gated admin overview, session management, admin 2FA policy gate, secure cookie-backed web sessions, CSRF protection, and MVP-local rate limiting.
- Local-only test-account seeding for role and directory QA.
- Protected dashboard/admin route behavior.
- Alumni current-user profile model/API/UI with profile photo upload/display/delete.
- Shared local/S3 upload storage adapter for profile photos, verification evidence, community feed media, and local uploaded assets.
- Program affiliation model/API/UI.
- Verification request submission, member status history, admin queue, review actions, alumni-member role grant, and evidence upload/review.
- Verified member directory search/profile detail with privacy-aware serializers and authenticated profile-photo display.
- Dedicated admin audit log viewer backed by `security_events`.
- Community discovery, creation, detail pages, active rosters, open/request joins, pending review, manager roles, role updates, non-owner member removal, owner/admin settings editing, invitation email delivery, invitation cancellation/acceptance, ownership transfer, gated community posts, media attachments, comments, likes, reports, manager-visible report counts, per-community report queues, removed post/comment queues, restore actions, cross-community admin moderation queues, moderation review metadata, notification inbox, community workflow notification hooks, live notification snapshot streaming, notification preferences, admin-run notification email digests, and one-to-one direct messaging.

Main gaps now:

- Direct messaging is an MVP foundation. It still needs attachments, reactions, typing indicators, presence, per-message read receipts, message search, message reporting/moderation, retention controls, exports, group conversations, and admin troubleshooting views.
- Digest execution is admin-triggered, not a scheduled background worker. Production still needs APScheduler/Celery/RQ or equivalent, worker health checks, retries, backoff, and dead-letter handling.
- Email delivery is synchronous console/SMTP plumbing. Production still needs provider credentials, HTML templates, delivery logs, bounce handling, unsubscribe/compliance flows, and delivery audit exports.
- Notification preferences now cover in-app suppression and digest frequency, but per-channel preferences, quiet hours, admin override rules, unsubscribe state, and granular digest grouping remain open.
- Notification realtime is SSE polling for MVP, not Redis/WebSocket fanout. Production still needs multi-worker pub/sub, reconnection/backoff policy review, batching, and push delivery.
- Community feed still needs pinned posts, mentions, richer formatting, edit history, audit export tooling, and global feed aggregation.
- Feed media is storage-backed and moderated, but production media hardening still needs malware scanning, image processing, thumbnail generation, CDN/signed URL decisions, and retention policy.
- Directory search is database-backed MVP search, not Meilisearch/OpenSearch.
- Events, initiatives, contributions, elections, chapter analytics, and richer governance workflows are not wired yet.

Next possible implementation slices:

- Scheduled background worker foundation for notification digests and future async jobs.
- Direct messaging attachments, reactions, and reporting/moderation controls.
- Redis/WebSocket realtime fanout for notifications and messages.
- Feed post editing with audit history and moderator-visible revision records.
- Pinned/featured posts and announcements for community owners/managers.
- Global feed aggregation from community posts and future public posts.
- Moderator audit exports and immutable compliance event tables.
- Production email hardening with provider templates, queue/retry, bounce tracking, unsubscribe controls, and delivery logs.

## Current V1.5 Implementation Update: 2026-05-07 Notification Email Digest Worker Slice

Completed after the email delivery foundation slice:

- Added `email_digest_sent_at` tracking on notifications plus an Alembic migration and supporting index for digest selection.
- Added a notification digest service that finds active users with `DAILY` or `WEEKLY` preferences, filters unread unsent notifications, respects muted event types, and builds summary emails with web links.
- Added an admin-only digest runner at `POST /api/v1/notifications/admin/email-digests/run` with dry-run mode, delivery mode, frequency selection, per-email item limits, and audit logging in `security_events`.
- Added admin console controls for digest dry runs and delivery runs, including candidate, skipped, sent, generated-at, and delivery preview output.
- Added API coverage for dry-run behavior, console email delivery, digest sent marking, no-resend behavior, and admin-only access.
- Updated API, data model, roadmap, and status docs for digest execution.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 91% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 31% complete.
- Phase 5 remains roughly 81% complete.
- Phase 6 feed/moderation remains roughly 54% complete.
- Phase 7 messaging/notifications is now roughly 32% complete: persisted notifications, community hooks, dashboard inbox, read APIs, SSE snapshots, notification preferences, console/SMTP email delivery, and admin-run email digest execution now exist. Direct messaging, Redis/WebSocket fanout, read receipts, blocks, scheduled worker execution, queued retries, push delivery, and delivery audit exports remain open.
- Overall 24-week MVP implementation is roughly 53% complete.

Implemented now:

- Native landing page.
- Monorepo foundation, CI, docs, Docker Compose.
- FastAPI health/status and request middleware.
- Identity auth, refresh sessions, account recovery, email verification, console/SMTP delivery for account emails, protected platform owner, role-gated admin overview, session management, admin 2FA policy gate, secure cookie-backed web sessions, CSRF protection, and MVP-local rate limiting.
- Local-only test-account seeding for role and directory QA.
- Protected dashboard/admin route behavior.
- Alumni current-user profile model/API/UI with profile photo upload/display/delete.
- Shared local/S3 upload storage adapter for profile photos, verification evidence, and community feed media.
- Program affiliation model/API/UI.
- Verification request submission, member status history, admin queue, review actions, alumni-member role grant, and evidence upload/review.
- Verified member directory search/profile detail with privacy-aware serializers and authenticated profile-photo display.
- Dedicated admin audit log viewer backed by `security_events`.
- Community discovery, creation, detail pages, active rosters, open/request joins, pending review, manager roles, role updates, non-owner member removal, owner/admin settings editing, invitation email delivery, invitation cancellation/acceptance, ownership transfer, gated community posts, media attachments, comments, likes, reports, manager-visible report counts, per-community report queues, removed post/comment queues, restore actions, cross-community admin moderation queues, moderation review metadata, notification inbox, community workflow notification hooks, live notification snapshot streaming, notification preferences, and admin-run notification email digests.

Main gaps now:

- Digest execution is admin-triggered, not a scheduled background worker. Production still needs APScheduler/Celery/RQ or equivalent, worker health checks, retries, backoff, and dead-letter handling.
- Email delivery is synchronous console/SMTP plumbing. Production still needs provider credentials, HTML templates, delivery logs, bounce handling, unsubscribe/compliance flows, and delivery audit exports.
- Notification preferences now cover in-app suppression and digest frequency, but per-channel preferences, quiet hours, admin override rules, unsubscribe state, and granular digest grouping remain open.
- Notification realtime is SSE polling for MVP, not Redis/WebSocket fanout. Production still needs multi-worker pub/sub, reconnection/backoff policy review, batching, and push delivery.
- Community feed still needs pinned posts, mentions, richer formatting, edit history, audit export tooling, and global feed aggregation.
- Feed media is storage-backed and moderated, but production media hardening still needs malware scanning, image processing, thumbnail generation, CDN/signed URL decisions, and retention policy.
- Directory search is database-backed MVP search, not Meilisearch/OpenSearch.
- Direct messaging, events, initiatives, contributions, elections, chapter analytics, and richer governance workflows are not wired yet.

Next possible implementation slices:

- Direct messaging foundation with conversations, participants, and message send/list APIs.
- Feed post editing with audit history and moderator-visible revision records.
- Pinned/featured posts and announcements for community owners/managers.
- Scheduled background worker foundation for email digests and future async jobs.
- Global feed aggregation from community posts and future public posts.
- Moderator audit exports and immutable compliance event tables.
- Production email hardening with provider templates, queue/retry, bounce tracking, unsubscribe controls, and delivery logs.

## Current V1.5 Implementation Update: 2026-05-07 Email Delivery Foundation Slice

Completed after the notification preferences slice:

- Added a backend email delivery abstraction with `console`, `smtp`, and disabled provider modes.
- Added local/test outbox helpers so email-generating flows can be verified without exposing message contents in public UI.
- Added email configuration for provider, sender identity, SMTP host/port/credentials/TLS, and `WEB_BASE_URL` link generation.
- Wired email verification, password reset, and community invitations to generate real web links and send them through the configured provider.
- Community invitation emails now go to every invited address; existing users still receive in-app notifications when allowed by their preferences.
- Local/dev responses still include one-time dev tokens for QA, while production responses continue to suppress those tokens.
- Added API coverage for registration verification emails, password reset emails, missing-account non-disclosure, and community invitation emails.
- Updated API, roadmap, environment, and status docs for the email delivery slice.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 is now roughly 91% complete because identity recovery and verification now have delivery plumbing, not only local/dev tokens.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 31% complete.
- Phase 5 remains roughly 81% complete because community invitations now include email delivery.
- Phase 6 feed/moderation remains roughly 54% complete.
- Phase 7 messaging/notifications is now roughly 27% complete: persisted notifications, community hooks, dashboard inbox, read APIs, SSE snapshots, notification preferences, and initial console/SMTP email delivery exist. Direct messaging, WebSocket/Redis fanout, read receipts, blocks, queue/retry delivery, digest worker execution, push delivery, and delivery audit exports remain open.
- Overall 24-week MVP implementation is roughly 52% complete.

Implemented now:

- Native landing page.
- Monorepo foundation, CI, docs, Docker Compose.
- FastAPI health/status and request middleware.
- Identity auth, refresh sessions, account recovery, email verification, console/SMTP delivery for account emails, protected platform owner, role-gated admin overview, session management, admin 2FA policy gate, secure cookie-backed web sessions, CSRF protection, and MVP-local rate limiting.
- Local-only test-account seeding for role and directory QA.
- Protected dashboard/admin route behavior.
- Alumni current-user profile model/API/UI with profile photo upload/display/delete.
- Shared local/S3 upload storage adapter for profile photos, verification evidence, and community feed media.
- Program affiliation model/API/UI.
- Verification request submission, member status history, admin queue, review actions, alumni-member role grant, and evidence upload/review.
- Verified member directory search/profile detail with privacy-aware serializers and authenticated profile-photo display.
- Dedicated admin audit log viewer backed by `security_events`.
- Community discovery, creation, detail pages, active rosters, open/request joins, pending review, manager roles, role updates, non-owner member removal, owner/admin settings editing, invitation email delivery, invitation cancellation/acceptance, ownership transfer, gated community posts, media attachments, comments, likes, reports, manager-visible report counts, per-community report queues, removed post/comment queues, restore actions, cross-community admin moderation queues, moderation review metadata, notification inbox, community workflow notification hooks, live notification snapshot streaming, and notification preferences.

Main gaps now:

- Email delivery is synchronous console/SMTP plumbing. Production still needs provider credentials, HTML templates, queue/retry behavior, delivery logs, bounce handling, unsubscribe/compliance flows, and delivery audit exports.
- Notification preferences are enforced for in-app delivery, but email digest execution, per-channel preferences, admin override rules, and quiet-hours controls remain open.
- Notification realtime is SSE polling for MVP, not Redis/WebSocket fanout. Production still needs multi-worker pub/sub, reconnection/backoff policy review, batching, and push delivery.
- Community feed still needs pinned posts, mentions, richer formatting, edit history, audit export tooling, and global feed aggregation.
- Feed media is storage-backed and moderated, but production media hardening still needs malware scanning, image processing, thumbnail generation, CDN/signed URL decisions, and retention policy.
- S3 adapter exists, but production still needs real bucket credentials and bucket policy validation.
- Directory search is database-backed MVP search, not Meilisearch/OpenSearch.
- Public profile pages, saved searches, recommendations, and richer dedicated search indexing are not implemented.
- Test accounts are local/dev seed data only; there is no production-safe demo identity lifecycle yet.
- Skills are stored as MVP JSON rather than normalized skill tables.
- Audit data is viewable through `security_events`, but richer immutable compliance audit tables and export tooling are not implemented.
- Redis-backed rate limiting, background jobs, direct messaging, events, initiatives, contributions, and elections are not wired yet.
- Communities still need chapter analytics and richer notification preference grouping.

Next possible implementation slices:

- Email digest worker foundation using stored digest-frequency preferences.
- Direct messaging foundation with conversations, participants, and message send/list APIs.
- Feed post editing with audit history and moderator-visible revision records.
- Pinned/featured posts and announcements for community owners/managers.
- Global feed aggregation from community posts and future public posts.
- Moderator audit exports and immutable compliance event tables.
- Production email hardening with provider templates, queue/retry, bounce tracking, and delivery logs.

## Current V1.5 Implementation Update: 2026-05-07 Notification Preferences Slice

Completed after the realtime notification stream slice:

- Added `notification_preferences` persistence with one current-user preference record per user.
- Added Alembic migration `20260507_0015_notification_preferences`.
- Added current-user notification preference APIs at `GET /api/v1/notifications/preferences` and `PATCH /api/v1/notifications/preferences`.
- Preferences include an in-app notification master toggle, muted event type list, and email digest frequency placeholder (`NONE|DAILY|WEEKLY`) for the upcoming email delivery work.
- Updated notification delivery so `notify_users` suppresses muted in-app events and fully respects the in-app master toggle before writing notification rows.
- Added dashboard notification preference controls for in-app delivery, digest frequency, and common community notification event types.
- Added API coverage for default preference creation, validation, duplicate event de-duping, muted event suppression, unmuted delivery, and full in-app suppression.
- Updated API, data model, roadmap, and status docs for the preferences slice.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 89% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 31% complete.
- Phase 5 remains roughly 80% complete.
- Phase 6 feed/moderation remains roughly 54% complete.
- Phase 7 messaging/notifications is now roughly 22% complete: persisted notifications, community workflow hooks, dashboard inbox, read APIs, SSE snapshots, and user notification preferences exist. Direct messaging, WebSocket/Redis fanout, read receipts, blocks, production email/push delivery, and digest worker execution remain open.
- Overall 24-week MVP implementation is roughly 51% complete.

Implemented now:

- Native landing page.
- Monorepo foundation, CI, docs, Docker Compose.
- FastAPI health/status and request middleware.
- Identity auth, refresh sessions, account recovery, email verification, protected platform owner, role-gated admin overview, session management, admin 2FA policy gate, secure cookie-backed web sessions, CSRF protection, and MVP-local rate limiting.
- Local-only test-account seeding for role and directory QA.
- Protected dashboard/admin route behavior.
- Alumni current-user profile model/API/UI with profile photo upload/display/delete.
- Shared local/S3 upload storage adapter for profile photos, verification evidence, and community feed media.
- Program affiliation model/API/UI.
- Verification request submission, member status history, admin queue, review actions, alumni-member role grant, and evidence upload/review.
- Verified member directory search/profile detail with privacy-aware serializers and authenticated profile-photo display.
- Dedicated admin audit log viewer backed by `security_events`.
- Community discovery, creation, detail pages, active rosters, open/request joins, pending review, manager roles, role updates, non-owner member removal, owner/admin settings editing, invitations, ownership transfer, gated community posts, media attachments, comments, likes, reports, manager-visible report counts, per-community report queues, removed post/comment queues, restore actions, cross-community admin moderation queues, moderation review metadata, notification inbox, community workflow notification hooks, live notification snapshot streaming, and notification preferences.

Main gaps now:

- Notification preferences are enforced for in-app delivery, but email digest execution, per-channel preferences, admin override rules, and delivery audit exports remain open.
- Notification realtime is SSE polling for MVP, not Redis/WebSocket fanout. Production still needs multi-worker pub/sub, reconnection/backoff policy review, batching, and push delivery.
- Community feed still needs pinned posts, mentions, richer formatting, edit history, audit export tooling, and global feed aggregation.
- Feed media is storage-backed and moderated, but production media hardening still needs malware scanning, image processing, thumbnail generation, CDN/signed URL decisions, and retention policy.
- Real email provider/templates are not wired, so invitation delivery is still local/dev-token based.
- S3 adapter exists, but production still needs real bucket credentials and bucket policy validation.
- Directory search is database-backed MVP search, not Meilisearch/OpenSearch.
- Public profile pages, saved searches, recommendations, and richer dedicated search indexing are not implemented.
- Test accounts are local/dev seed data only; there is no production-safe demo identity lifecycle yet.
- Skills are stored as MVP JSON rather than normalized skill tables.
- Audit data is viewable through `security_events`, but richer immutable compliance audit tables and export tooling are not implemented.
- Redis-backed rate limiting, background jobs, direct messaging, events, initiatives, contributions, and elections are not wired yet.
- Communities still need chapter analytics and richer notification preference grouping.

Next possible implementation slices:

- Production email delivery for account recovery, invitations, notification digests, and moderation escalations.
- Email digest worker foundation using the stored digest frequency preferences.
- Direct messaging foundation with conversations, participants, and message send/list APIs.
- Feed post editing with audit history and moderator-visible revision records.
- Pinned/featured posts and announcements for community owners/managers.
- Global feed aggregation from community posts and future public posts.
- Moderator audit exports and immutable compliance event tables.

## Current V1.5 Implementation Update: 2026-05-07 Realtime Notification Stream Slice

Completed after the feed media attachments slice:

- Added an authenticated notification server-sent events endpoint at `GET /api/v1/notifications/stream`.
- Stream snapshots include the current unread count, latest notification metadata, and generation timestamp.
- Added configurable stream polling through `NOTIFICATION_STREAM_POLL_SECONDS`.
- Added dashboard live notification refresh through the existing authenticated backend proxy, with quiet unread-count updates and list refresh when snapshots change.
- Added API coverage for unauthenticated stream denial, snapshot payloads, unread counts, latest notification metadata, and count refresh after marking notifications read.
- Updated API, roadmap, and status docs for the realtime notification stream slice.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 89% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 31% complete.
- Phase 5 remains roughly 80% complete.
- Phase 6 feed/moderation remains roughly 54% complete.
- Phase 7 messaging/notifications is now roughly 18% complete: persisted notifications, community workflow hooks, dashboard inbox, read APIs, and authenticated SSE snapshots exist. Direct messaging, WebSocket/Redis fanout, read receipts, blocks, notification preferences, and email/push delivery remain open.
- Overall 24-week MVP implementation is roughly 50% complete.

Implemented now:

- Native landing page.
- Monorepo foundation, CI, docs, Docker Compose.
- FastAPI health/status and request middleware.
- Identity auth, refresh sessions, account recovery, email verification, protected platform owner, role-gated admin overview, session management, admin 2FA policy gate, secure cookie-backed web sessions, CSRF protection, and MVP-local rate limiting.
- Local-only test-account seeding for role and directory QA.
- Protected dashboard/admin route behavior.
- Alumni current-user profile model/API/UI with profile photo upload/display/delete.
- Shared local/S3 upload storage adapter for profile photos, verification evidence, and community feed media.
- Program affiliation model/API/UI.
- Verification request submission, member status history, admin queue, review actions, alumni-member role grant, and evidence upload/review.
- Verified member directory search/profile detail with privacy-aware serializers and authenticated profile-photo display.
- Dedicated admin audit log viewer backed by `security_events`.
- Community discovery, creation, detail pages, active rosters, open/request joins, pending review, manager roles, role updates, non-owner member removal, owner/admin settings editing, invitations, ownership transfer, gated community posts, media attachments, comments, likes, reports, manager-visible report counts, per-community report queues, removed post/comment queues, restore actions, cross-community admin moderation queues, moderation review metadata, notification inbox, community workflow notification hooks, and live notification snapshot streaming.

Main gaps now:

- Notification realtime is SSE polling for MVP, not Redis/WebSocket fanout. Production still needs multi-worker pub/sub, reconnection/backoff policy review, notification preferences, batching, digest controls, and email/push delivery.
- Community feed still needs pinned posts, mentions, richer formatting, edit history, audit export tooling, and global feed aggregation.
- Feed media is storage-backed and moderated, but production media hardening still needs malware scanning, image processing, thumbnail generation, CDN/signed URL decisions, and retention policy.
- Real email provider/templates are not wired, so invitation delivery is still local/dev-token based.
- S3 adapter exists, but production still needs real bucket credentials and bucket policy validation.
- Directory search is database-backed MVP search, not Meilisearch/OpenSearch.
- Public profile pages, saved searches, recommendations, and richer dedicated search indexing are not implemented.
- Test accounts are local/dev seed data only; there is no production-safe demo identity lifecycle yet.
- Skills are stored as MVP JSON rather than normalized skill tables.
- Audit data is viewable through `security_events`, but richer immutable compliance audit tables and export tooling are not implemented.
- Redis-backed rate limiting, background jobs, direct messaging, events, initiatives, contributions, and elections are not wired yet.
- Communities still need chapter analytics and richer notification preferences.

Next possible implementation slices:

- Production email delivery for account recovery, invitations, notification digests, and moderation escalations.
- Notification preferences and digest/suppression controls.
- Direct messaging foundation with conversations, participants, and message send/list APIs.
- Feed post editing with audit history and moderator-visible revision records.
- Pinned/featured posts and announcements for community owners/managers.
- Global feed aggregation from community posts and future public posts.
- Moderator audit exports and immutable compliance event tables.

## Current V1.5 Implementation Update: 2026-05-07 Feed Media Attachments Slice

Completed after the notification center and community hooks slice:

- Added private `community_post_media` storage metadata with active/removed moderation status, uploader, remover, content type, byte size, and authenticated storage keys.
- Added Alembic migration `20260507_0014_community_post_media`.
- Extended the upload storage adapter with a community post media category and environment controls for upload directory, maximum byte size, and allowed content types.
- Added community post media APIs for upload, authenticated download, remove, and restore.
- Enforced active-post attachment rules: post authors and managers/admins can attach media, active attachments are capped at four per post, non-members cannot access media, removed media is hidden from ordinary members, and manager/admin review still sees removed media metadata.
- Added community detail UI support for selecting attachments when sharing a post, showing attachment tiles on posts, opening attachments through authenticated fetch, and removing/restoring attachments according to role.
- Added API coverage for upload validation, secure downloads, role denial, removal, hidden removed media for ordinary members, manager review visibility, and restore.
- Updated API, data model, roadmap, and status docs for the media slice.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 89% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 31% complete.
- Phase 5 remains roughly 80% complete.
- Phase 6 feed/moderation is now roughly 54% complete because community posts now have comments, likes, reports, moderation queues, review metadata, notification hooks, and media attachments. Pinned posts, mentions, richer formatting, edit history, audit exports, and global feed aggregation remain open.
- Phase 7 messaging/notifications remains roughly 12% complete: persisted in-app notifications exist, but direct messaging, realtime fanout, read receipts, blocks, notification preferences, and email/push delivery remain open.
- Overall 24-week MVP implementation is roughly 49% complete.

Implemented now:

- Native landing page.
- Monorepo foundation, CI, docs, Docker Compose.
- FastAPI health/status and request middleware.
- Identity auth, refresh sessions, account recovery, email verification, protected platform owner, role-gated admin overview, session management, admin 2FA policy gate, secure cookie-backed web sessions, CSRF protection, and MVP-local rate limiting.
- Local-only test-account seeding for role and directory QA.
- Protected dashboard/admin route behavior.
- Alumni current-user profile model/API/UI with profile photo upload/display/delete.
- Shared local/S3 upload storage adapter for profile photos, verification evidence, and community feed media.
- Program affiliation model/API/UI.
- Verification request submission, member status history, admin queue, review actions, alumni-member role grant, and evidence upload/review.
- Verified member directory search/profile detail with privacy-aware serializers and authenticated profile-photo display.
- Dedicated admin audit log viewer backed by `security_events`.
- Community discovery, creation, detail pages, active rosters, open/request joins, pending review, manager roles, role updates, non-owner member removal, owner/admin settings editing, invitations, ownership transfer, gated community posts, media attachments, comments, likes, reports, manager-visible report counts, per-community report queues, removed post/comment queues, restore actions, cross-community admin moderation queues, moderation review metadata, notification inbox, and community workflow notification hooks.

Main gaps now:

- Community feed still needs pinned posts, mentions, richer formatting, edit history, notification preferences, realtime fanout, audit export tooling, and global feed aggregation.
- Feed media is storage-backed and moderated, but production media hardening still needs malware scanning, image processing, thumbnail generation, CDN/signed URL decisions, and retention policy.
- Notification delivery is currently in-app only; email, push, WebSocket delivery, batching, digest preferences, and suppression rules are not implemented.
- Real email provider/templates are not wired, so invitation delivery is still local/dev-token based.
- S3 adapter exists, but production still needs real bucket credentials and bucket policy validation.
- Directory search is database-backed MVP search, not Meilisearch/OpenSearch.
- Public profile pages, saved searches, recommendations, and richer dedicated search indexing are not implemented.
- Test accounts are local/dev seed data only; there is no production-safe demo identity lifecycle yet.
- Skills are stored as MVP JSON rather than normalized skill tables.
- Audit data is viewable through `security_events`, but richer immutable compliance audit tables and export tooling are not implemented.
- Redis-backed rate limiting, background jobs, realtime messaging, events, initiatives, contributions, and elections are not wired yet.
- Communities still need chapter analytics and richer notification preferences.

Next possible implementation slices:

- Realtime notification delivery with WebSocket/SSE unread count refresh.
- Production email delivery for account recovery, invitations, notification digests, and moderation escalations.
- Feed post editing with audit history and moderator-visible revision records.
- Pinned/featured posts and announcements for community owners/managers.
- Global feed aggregation from community posts and future public posts.
- Moderator audit exports and immutable compliance event tables.

## Current V1.5 Implementation Update: 2026-05-07 Notification Center And Community Hooks Slice

Completed after moderation review metadata:

- Added persisted `notifications` inbox table with recipient, optional actor, event type, title, body, target URL, metadata, and read timestamp.
- Added Alembic migration `20260507_0013_notifications`.
- Added current-user notification APIs for listing unread/read/all notifications, marking one notification read, and marking all unread notifications read.
- Wired community workflow hooks for join requests, membership approval/rejection, role changes, ownership transfers, invitations for existing users, invitation cancellation/acceptance, post/comment removal and restoration, new comments on owned posts, post report creation/resolution, and moderation escalation fanout.
- Added a dashboard notification center with unread count, open links, single-read actions, mark-all-read, empty/loading/error states, and pagination.
- Added API coverage for notification auth isolation, read state transitions, mark-all-read behavior, join-request notifications, member approval notifications, and moderation escalation notifications to a separate platform admin.
- Updated API, data model, roadmap, and status docs for the notification slice.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 89% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 31% complete.
- Phase 5 remains roughly 80% complete.
- Phase 6 feed/moderation is now roughly 49% complete because moderation events now create operational notifications. Attachments, pinned posts, mentions, edit history, richer formatting, audit exports, and global feed aggregation remain open.
- Phase 7 messaging/notifications is now roughly 12% complete: a persisted notification center and community event hooks exist, but direct messaging, WebSocket/realtime fanout, read receipts, blocks, notification preferences, and email/push delivery remain open.
- Overall 24-week MVP implementation is roughly 48% complete.

Implemented now:

- Native landing page.
- Monorepo foundation, CI, docs, Docker Compose.
- FastAPI health/status and request middleware.
- Identity auth, refresh sessions, account recovery, email verification, protected platform owner, role-gated admin overview, session management, admin 2FA policy gate, secure cookie-backed web sessions, CSRF protection, and MVP-local rate limiting.
- Local-only test-account seeding for role and directory QA.
- Protected dashboard/admin route behavior.
- Alumni current-user profile model/API/UI with profile photo upload/display/delete.
- Shared local/S3 upload storage adapter for profile photos and verification evidence.
- Program affiliation model/API/UI.
- Verification request submission, member status history, admin queue, review actions, alumni-member role grant, and evidence upload/review.
- Verified member directory search/profile detail with privacy-aware serializers and authenticated profile-photo display.
- Dedicated admin audit log viewer backed by `security_events`.
- Community discovery, creation, detail pages, active rosters, open/request joins, pending review, manager roles, role updates, non-owner member removal, owner/admin settings editing, invitations, ownership transfer, gated community posts, comments, likes, reports, manager-visible report counts, per-community report queues, removed post/comment queues, restore actions, cross-community admin moderation queues, moderation review metadata, notification inbox, and community workflow notification hooks.

Main gaps now:

- Community feed still needs attachments/media, pinned posts, mentions, richer formatting, edit history, notification preferences, realtime fanout, audit export tooling, and global feed aggregation.
- Notification delivery is currently in-app only; email, push, WebSocket delivery, batching, digest preferences, and suppression rules are not implemented.
- Real email provider/templates are not wired, so invitation delivery is still local/dev-token based.
- S3 adapter exists, but production still needs real bucket credentials, bucket policy validation, malware scanning, image processing, lifecycle/retention policy, and CDN/signed URL decisions.
- Directory search is database-backed MVP search, not Meilisearch/OpenSearch.
- Public profile pages, saved searches, recommendations, and richer dedicated search indexing are not implemented.
- Test accounts are local/dev seed data only; there is no production-safe demo identity lifecycle yet.
- Skills are stored as MVP JSON rather than normalized skill tables.
- Audit data is viewable through `security_events`, but richer immutable compliance audit tables and export tooling are not implemented.
- Redis-backed rate limiting, background jobs, realtime messaging, events, initiatives, contributions, and elections are not wired yet.
- Communities still need chapter analytics and richer notification preferences.

Next possible implementation slices:

- Feed media attachments with storage validation and moderation review.
- Realtime notification delivery with WebSocket/SSE channel and unread count refresh.
- Production email delivery for account recovery, invitations, notification digests, and moderation escalations.
- Global feed aggregation from community posts and future public posts.
- Moderator audit exports and immutable compliance event tables.

## Current V1.5 Implementation Update: 2026-05-07 Moderation Review Metadata Slice

Completed after cross-community admin moderation:

- Added persisted moderation review metadata to reports, removed posts, and removed comments: internal moderator notes, severity, escalation status, escalation actor, and escalation timestamp.
- Added Alembic migration `20260507_0012_moderation_review_metadata`.
- Added review update APIs for report review, removed-post review, and removed-comment review.
- Added severity and escalation filters to community-scoped queues and cross-community admin moderation queues.
- Admin queue payloads now include moderation notes, severity, escalation status, escalation actor, and escalation timestamp while ordinary member feed/comment/report responses keep internal review fields hidden.
- Added admin-console review controls for reported posts, removed posts, and removed comments with save actions beside existing resolve/restore actions.
- Added API coverage for member denial, admin review saves, severity/escalation normalization, escalated queue filtering, and reviewed content queue payloads.
- Updated API, data model, roadmap, and status docs for the review metadata slice.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 89% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 is now roughly 31% complete because the admin console now includes operational moderation review metadata, not only queue actions.
- Phase 5 remains roughly 80% complete.
- Phase 6 feed/moderation is now roughly 47% complete: community-scoped posts/comments/likes/reports, per-community queues, removed-content queues, restore actions, cross-community admin queues, and moderation notes/escalation are implemented. Attachments, pinned posts, mentions, notification fanout, audit exports, and global feed aggregation remain open.
- Overall 24-week MVP implementation is roughly 47% complete.

Implemented now:

- Native landing page.
- Monorepo foundation, CI, docs, Docker Compose.
- FastAPI health/status and request middleware.
- Identity auth, refresh sessions, account recovery, email verification, protected platform owner, role-gated admin overview, session management, admin 2FA policy gate, secure cookie-backed web sessions, CSRF protection, and MVP-local rate limiting.
- Local-only test-account seeding for role and directory QA.
- Protected dashboard/admin route behavior.
- Alumni current-user profile model/API/UI with profile photo upload/display/delete.
- Shared local/S3 upload storage adapter for profile photos and verification evidence.
- Program affiliation model/API/UI.
- Verification request submission, member status history, admin queue, review actions, alumni-member role grant, and evidence upload/review.
- Verified member directory search/profile detail with privacy-aware serializers and authenticated profile-photo display.
- Dedicated admin audit log viewer backed by `security_events`.
- Community discovery, creation, detail pages, active rosters, open/request joins, pending review, manager roles, role updates, non-owner member removal, owner/admin settings editing, invitations, ownership transfer, gated community posts, comments, likes, reports, manager-visible report counts, per-community report queues, removed post/comment queues, restore actions, cross-community admin moderation queues, and moderation review metadata.

Main gaps now:

- Community feed still needs attachments/media, pinned posts, mentions, richer formatting, edit history, notification fanout, audit export tooling, and global feed aggregation.
- Real email provider/templates are not wired, so invitation delivery is still local/dev-token based.
- S3 adapter exists, but production still needs real bucket credentials, bucket policy validation, malware scanning, image processing, lifecycle/retention policy, and CDN/signed URL decisions.
- Directory search is database-backed MVP search, not Meilisearch/OpenSearch.
- Public profile pages, saved searches, recommendations, and richer dedicated search indexing are not implemented.
- Test accounts are local/dev seed data only; there is no production-safe demo identity lifecycle yet.
- Skills are stored as MVP JSON rather than normalized skill tables.
- Audit data is viewable through `security_events`, but richer immutable compliance audit tables and export tooling are not implemented.
- Redis-backed rate limiting, background jobs, realtime notifications, messaging, events, initiatives, contributions, and elections are not wired yet.
- Communities still need chapter analytics and notification delivery.

Next possible implementation slices:

- Notification/event hooks for community posts, comments, reports, invitations, join requests, settings updates, role changes, ownership transfers, and moderation escalations.
- Feed media attachments with storage validation and moderation review.
- Production email delivery for account recovery and invitations.
- Global feed aggregation from community posts and future public posts.
- Moderator audit exports and immutable compliance event tables.

## Current V1.5 Implementation Update: 2026-05-07 Cross-Community Admin Moderation Slice

Completed after removed-content moderation:

- Added global admin moderation queues at `GET /api/v1/communities/admin/moderation/post-reports`, `GET /api/v1/communities/admin/moderation/removed-posts`, and `GET /api/v1/communities/admin/moderation/removed-comments`.
- Global queue payloads include community ID, community name, community slug, content excerpts, reporter/remover context, author context, status, reason, and timestamps.
- Added filters for global queues: community ID and search query for all queues, plus report status and report reason for reported posts.
- Added API coverage proving non-admin denial, cross-community queue aggregation, filtering, report resolution, post restoration, comment restoration, and queue empty states after action.
- Added a platform moderation panel to the admin console with metrics, filters, pagination, open-community links, report resolution, removed-post restoration, and removed-comment restoration.
- Updated API, roadmap, data model, and status docs for the new global moderation slice.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 89% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 is now roughly 28% complete because the admin console now includes cross-community trust and moderation operations, not only verification/audit views.
- Phase 5 remains roughly 80% complete.
- Phase 6 feed/moderation is now roughly 42% complete: community-scoped posts/comments/likes/reports, per-community queues, removed-content queues, restore actions, and cross-community admin moderation exist, but attachments, pinned posts, mentions, notification fanout, moderation notes/escalations, audit exports, and global feed aggregation remain open.
- Overall 24-week MVP implementation is roughly 46% complete.

Implemented now:

- Native landing page.
- Monorepo foundation, CI, docs, Docker Compose.
- FastAPI health/status and request middleware.
- Identity auth, refresh sessions, account recovery, email verification, protected platform owner, role-gated admin overview, session management, admin 2FA policy gate, secure cookie-backed web sessions, CSRF protection, and MVP-local rate limiting.
- Local-only test-account seeding for role and directory QA.
- Protected dashboard/admin route behavior.
- Alumni current-user profile model/API/UI with profile photo upload/display/delete.
- Shared local/S3 upload storage adapter for profile photos and verification evidence.
- Program affiliation model/API/UI.
- Verification request submission, member status history, admin queue, review actions, alumni-member role grant, and evidence upload/review.
- Verified member directory search/profile detail with privacy-aware serializers and authenticated profile-photo display.
- Dedicated admin audit log viewer backed by `security_events`.
- Community discovery, creation, detail pages, active rosters, open/request joins, pending review, manager roles, role updates, non-owner member removal, owner/admin settings editing, invitations, ownership transfer, gated community posts, comments, likes, reports, manager-visible report counts, per-community report queues, removed post/comment queues, restore actions, and cross-community admin moderation queues.

Main gaps now:

- Community feed still needs attachments/media, pinned posts, mentions, richer formatting, edit history, notification fanout, moderation notes, escalation labels, and audit export tooling.
- Real email provider/templates are not wired, so invitation delivery is still local/dev-token based.
- S3 adapter exists, but production still needs real bucket credentials, bucket policy validation, malware scanning, image processing, lifecycle/retention policy, and CDN/signed URL decisions.
- Directory search is database-backed MVP search, not Meilisearch/OpenSearch.
- Public profile pages, saved searches, recommendations, and richer dedicated search indexing are not implemented.
- Test accounts are local/dev seed data only; there is no production-safe demo identity lifecycle yet.
- Skills are stored as MVP JSON rather than normalized skill tables.
- Audit data is viewable through `security_events`, but richer immutable compliance audit tables and export tooling are not implemented.
- Redis-backed rate limiting, background jobs, realtime notifications, messaging, events, initiatives, contributions, and elections are not wired yet.
- Communities still need chapter analytics and notification delivery.

Next possible implementation slices:

- Moderation notes, severity, and escalation states for reports and removed content.
- Notification/event hooks for community posts, comments, reports, invitations, join requests, settings updates, role changes, and ownership transfers.
- Feed media attachments with storage validation and moderation.
- Production email delivery for account recovery and invitations.
- Global feed aggregation from community posts and future public posts.

## Current V1.5 Implementation Update: 2026-05-07 Removed Content Moderation Slice

Completed after the community moderation queue:

- Added manager/owner/admin removed-post and removed-comment queues at `GET /api/v1/communities/{community_id}/removed-posts` and `GET /api/v1/communities/{community_id}/removed-comments`.
- Added post and comment restore actions at `POST /api/v1/communities/{community_id}/posts/{post_id}/restore` and `POST /api/v1/communities/{community_id}/posts/{post_id}/comments/{comment_id}/restore`.
- Removed-content queue responses include remover names, removed timestamps, author context, post excerpts, and parent-post context for comments.
- Added API coverage for ordinary-member denial, manager queue visibility, restoration, restored active visibility, queue empty states, and duplicate restore conflicts.
- Added web API helpers and a community moderation UI for removed posts/comments with restore buttons and independent pagination.
- Updated API, data model, roadmap, and status docs for the new moderation slice.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 89% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 22% complete.
- Phase 5 is now roughly 80% complete because communities now include discovery, membership, manager roles, settings, invitations, ownership transfer, private posts, engagement, reports, report queues, and removed-content restoration.
- Phase 6 feed/moderation is roughly 36% complete: community-scoped posts/comments/likes/reports, open-report queues, removed-content queues, and restore actions exist, but global aggregation, attachments, pinned posts, mentions, notification fanout, audit exports, and cross-community admin moderation remain open.
- Overall 24-week MVP implementation is roughly 44% complete.

Implemented now:

- Native landing page.
- Monorepo foundation, CI, docs, Docker Compose.
- FastAPI health/status and request middleware.
- Identity auth, refresh sessions, account recovery, email verification, protected platform owner, role-gated admin overview, session management, admin 2FA policy gate, secure cookie-backed web sessions, CSRF protection, and MVP-local rate limiting.
- Local-only test-account seeding for role and directory QA.
- Protected dashboard/admin route behavior.
- Alumni current-user profile model/API/UI with profile photo upload/display/delete.
- Shared local/S3 upload storage adapter for profile photos and verification evidence.
- Program affiliation model/API/UI.
- Verification request submission, member status history, admin queue, review actions, alumni-member role grant, and evidence upload/review.
- Verified member directory search/profile detail with privacy-aware serializers and authenticated profile-photo display.
- Dedicated admin audit log viewer backed by `security_events`.
- Community discovery, creation, detail pages, active rosters, open/request joins, pending review, manager roles, role updates, non-owner member removal, owner/admin settings editing, invitations, ownership transfer, gated community posts, comments, likes, reports, manager-visible report counts, report queue resolution, removed post/comment queues, and restore actions.

Main gaps now:

- Community feed still needs attachments/media, pinned posts, mentions, richer formatting, edit history, notification fanout, moderation notes, escalation labels, and cross-community moderation.
- Real email provider/templates are not wired, so invitation delivery is still local/dev-token based.
- S3 adapter exists, but production still needs real bucket credentials, bucket policy validation, malware scanning, image processing, lifecycle/retention policy, and CDN/signed URL decisions.
- Directory search is database-backed MVP search, not Meilisearch/OpenSearch.
- Public profile pages, saved searches, recommendations, and richer dedicated search indexing are not implemented.
- Test accounts are local/dev seed data only; there is no production-safe demo identity lifecycle yet.
- Skills are stored as MVP JSON rather than normalized skill tables.
- Audit data is viewable through `security_events`, but richer immutable compliance audit tables and export tooling are not implemented.
- Redis-backed rate limiting, background jobs, realtime notifications, messaging, events, initiatives, contributions, and elections are not wired yet.
- Communities still need chapter analytics, notification delivery, and consolidated admin moderation.

Next possible implementation slices:

- Cross-community admin moderation console with filters by community, reason, reporter, status, content type, and age.
- Moderation notes/escalation states for reports and removed content.
- Notification/event hooks for community posts, comments, reports, invitations, join requests, settings updates, role changes, and ownership transfers.
- Feed media attachments with storage validation and moderation.
- Production email delivery for account recovery and invitations.

## Current V1.5 Implementation Update: 2026-05-07 Community Moderation Queue Slice

Completed after community post engagement:

- Added a manager/owner/admin community-level post report queue at `GET /api/v1/communities/{community_id}/post-reports`.
- The queue supports `status=OPEN|RESOLVED|ALL`, pagination, reporter context, post author context, post body excerpts, post status, and post timestamps.
- Added API coverage proving ordinary members cannot access the report queue, managers can review open reports, resolved reports leave the open queue, and `status=ALL` retains history.
- Added API client types/helpers for the community report queue.
- Added a community detail moderation panel that shows open reports to managers, owners, and admins with reason, note, reporter, reported post context, and one-click resolution.
- Queue pagination now works independently from member, invitation, pending-member, and feed pagination.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 89% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 22% complete.
- Phase 5 is now roughly 78% complete because community creation, discovery, detail rosters, joins, pending review, manager roles, member management, settings editing, invitations, owner succession, private posts, comments, reactions, reports, and community-scoped report review are implemented.
- Phase 6 feed/moderation is roughly 32% complete: community-scoped posts/comments/likes/reports and a community-level open report queue exist, but global aggregation, attachments, pinned posts, mentions, notification fanout, removed-content queues, and a cross-community admin moderation console are still open.
- Overall 24-week MVP implementation is roughly 43% complete.

Implemented now:

- Native landing page.
- Monorepo foundation, CI, docs, Docker Compose.
- FastAPI health/status and request middleware.
- Identity auth, refresh sessions, account recovery, email verification, protected platform owner, role-gated admin overview, session management, admin 2FA policy gate, secure cookie-backed web sessions, CSRF protection, and MVP-local rate limiting.
- Local-only test-account seeding for role and directory QA.
- Protected dashboard/admin route behavior.
- Alumni current-user profile model/API/UI with profile photo upload/display/delete.
- Shared local/S3 upload storage adapter for profile photos and verification evidence.
- Program affiliation model/API/UI.
- Verification request submission, member status history, admin queue, review actions, alumni-member role grant, and evidence upload/review.
- Verified member directory search/profile detail with privacy-aware serializers and authenticated profile-photo display.
- Dedicated admin audit log viewer backed by `security_events`.
- Community discovery, creation, detail pages, active rosters, open/request joins, pending review, manager roles, role updates, non-owner member removal, owner/admin settings editing, invitations, ownership transfer, gated community posts, comments, likes, reports, manager-visible report counts, and community report queue resolution.

Main gaps now:

- Community feed still needs attachments/media, pinned posts, mentions, richer formatting, edit history, notification fanout, removed-content review queues, and cross-community moderation.
- Real email provider/templates are not wired, so invitation delivery is still local/dev-token based.
- S3 adapter exists, but production still needs real bucket credentials, bucket policy validation, malware scanning, image processing, lifecycle/retention policy, and CDN/signed URL decisions.
- Directory search is database-backed MVP search, not Meilisearch/OpenSearch.
- Public profile pages, saved searches, recommendations, and richer dedicated search indexing are not implemented.
- Test accounts are local/dev seed data only; there is no production-safe demo identity lifecycle yet.
- Skills are stored as MVP JSON rather than normalized skill tables.
- Audit data is viewable through `security_events`, but richer immutable compliance audit tables and export tooling are not implemented.
- Redis-backed rate limiting, background jobs, realtime notifications, messaging, events, initiatives, contributions, and elections are not wired yet.
- Communities still need chapter analytics, notification delivery, and consolidated admin moderation.

Next possible implementation slices:

- Removed-content moderation queue for removed posts/comments with restore/escalate actions.
- Cross-community admin moderation queue with filtering by community, reason, status, reporter, and age.
- Notification/event hooks for community posts, comments, reports, invitations, join requests, settings updates, role changes, and ownership transfers.
- Feed media attachments with storage validation and moderation.
- Production email delivery for account recovery and invitations.

## Current V1.5 Implementation Update: 2026-05-07 Community Post Engagement Slice

Completed after private community posts:

- Added `community_post_comments`, `community_post_reactions`, and `community_post_reports` with scoped indexes and active/removed/open/resolved states.
- Added Alembic migration `20260507_0011_community_post_engagement`.
- Added community post comment listing, creation, and removal APIs under `/api/v1/communities/{community_id}/posts/{post_id}/comments`.
- Added current-user `LIKE` reaction toggling with feed counts and viewer state.
- Added post reports with one open report per reporter/post, manager/owner/admin report listing, and report resolution.
- Post list responses now include `comment_count`, `reaction_count`, `viewer_reacted`, and manager-only `open_report_count`.
- Community detail pages now expose like buttons, expandable comments with pagination/removal, report submission, and manager-visible open-report badges.
- API tests cover outsider denial, comment create/list/remove, reaction toggle and validation, report duplication, manager report review, open-report visibility, report resolution, and removed-comment visibility.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 89% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 22% complete.
- Phase 5 is now roughly 76% complete because community creation, discovery, detail rosters, joins, pending review, manager roles, member management, settings editing, invitations, owner succession, private posts, comments, reactions, reports, and scoped moderation are implemented.
- Phase 6 feed/moderation is roughly 28% complete: community-scoped posts/comments/likes/reports exist, but global aggregation, attachments, pinned posts, mentions, notification fanout, and a dedicated moderation queue are still open.
- Overall 24-week MVP implementation is roughly 42% complete.

Implemented now:

- Native landing page.
- Monorepo foundation, CI, docs, Docker Compose.
- FastAPI health/status and request middleware.
- Identity auth, refresh sessions, account recovery, email verification, protected platform owner, role-gated admin overview, session management, admin 2FA policy gate, secure cookie-backed web sessions, CSRF protection, and MVP-local rate limiting.
- Local-only test-account seeding for role and directory QA.
- Protected dashboard/admin route behavior.
- Alumni current-user profile model/API/UI with profile photo upload/display/delete.
- Shared local/S3 upload storage adapter for profile photos and verification evidence.
- Program affiliation model/API/UI.
- Verification request submission, member status history, admin queue, review actions, alumni-member role grant, and evidence upload/review.
- Verified member directory search/profile detail with privacy-aware serializers and authenticated profile-photo display.
- Dedicated admin audit log viewer backed by `security_events`.
- Community discovery, creation, detail pages, active rosters, open/request joins, pending review, manager roles, role updates, non-owner member removal, owner/admin settings editing, invitations, ownership transfer, gated community posts, comments, likes, reports, and scoped moderation.

Main gaps now:

- Community feed still needs attachments/media, pinned posts, mentions, richer formatting, edit history, notification fanout, and a dedicated moderation queue UI.
- Real email provider/templates are not wired, so invitation delivery is still local/dev-token based.
- S3 adapter exists, but production still needs real bucket credentials, bucket policy validation, malware scanning, image processing, lifecycle/retention policy, and CDN/signed URL decisions.
- Directory search is database-backed MVP search, not Meilisearch/OpenSearch.
- Public profile pages, saved searches, recommendations, and richer dedicated search indexing are not implemented.
- Test accounts are local/dev seed data only; there is no production-safe demo identity lifecycle yet.
- Skills are stored as MVP JSON rather than normalized skill tables.
- Audit data is viewable through `security_events`, but richer immutable compliance audit tables and export tooling are not implemented.
- Redis-backed rate limiting, background jobs, realtime notifications, messaging, events, initiatives, contributions, and elections are not wired yet.
- Communities still need chapter analytics, cross-community moderation surfaces, and notification delivery.

Next possible implementation slices:

- Community moderation queue UI for open reports, removed posts, and removed comments.
- Notification/event hooks for community posts, comments, reports, invitations, join requests, settings updates, role changes, and ownership transfers.
- Feed media attachments with storage validation and moderation.
- Production email delivery for account recovery and invitations.
- Global feed aggregation from community posts and future public posts.

## Current V1.5 Implementation Update: 2026-05-06 Private Community Feed Slice

Completed after community ownership transfer:

- Added `community_posts` with author, body, active/removed status, remover, removal timestamp, and indexes for community/status and author timelines.
- Added Alembic migration `20260506_0010_community_posts`.
- Added gated community post listing, creation, and removal APIs under `/api/v1/communities/{community_id}/posts`.
- Active members and platform admins can read/create community posts; non-members and pending members cannot.
- Post authors can remove their own active posts, and active community managers/owners plus platform admins can remove active posts for moderation.
- Removed posts are hidden from ordinary members, while managers/owners/admins can query removed/all posts for moderation review.
- Community detail pages now include a gated member-update feed with post creation, active post list, removal controls, and pagination.
- API tests cover non-member denial, active-member access, post body normalization, manager moderation, duplicate removal protection, removed-post visibility, and active-feed filtering.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 89% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 22% complete.
- Phase 5 is now roughly 70% complete because community creation, discovery, detail rosters, joins, pending review, manager roles, member management, settings editing, invitations, owner succession, and private community posts are implemented.
- Overall 24-week MVP implementation is roughly 40% complete.

Implemented now:

- Native landing page.
- Monorepo foundation, CI, docs, Docker Compose.
- FastAPI health/status and request middleware.
- Identity auth, refresh sessions, account recovery, email verification, protected platform owner, role-gated admin overview, session management, admin 2FA policy gate, secure cookie-backed web sessions, CSRF protection, and MVP-local rate limiting.
- Local-only test-account seeding for role and directory QA.
- Protected dashboard/admin route behavior.
- Alumni current-user profile model/API/UI with profile photo upload/display/delete.
- Shared local/S3 upload storage adapter for profile photos and verification evidence.
- Program affiliation model/API/UI.
- Verification request submission, member status history, admin queue, review actions, alumni-member role grant, and evidence upload/review.
- Verified member directory search/profile detail with privacy-aware serializers and authenticated profile-photo display.
- Dedicated admin audit log viewer backed by `security_events`.
- Community discovery, creation, detail pages, active rosters, open/request joins, pending review, manager roles, role updates, non-owner member removal, owner/admin settings editing, invitations, ownership transfer, and gated community posts.

Main gaps now:

- Community feed is post-only; comments, reactions, reports, attachments, pinned posts, mentions, and notification fanout are not implemented.
- Real email provider/templates are not wired, so invitation delivery is still local/dev-token based.
- S3 adapter exists, but production still needs real bucket credentials, bucket policy validation, malware scanning, image processing, lifecycle/retention policy, and CDN/signed URL decisions.
- Directory search is database-backed MVP search, not Meilisearch/OpenSearch.
- Public profile pages, saved searches, recommendations, and richer dedicated search indexing are not implemented.
- Test accounts are local/dev seed data only; there is no production-safe demo identity lifecycle yet.
- Skills are stored as MVP JSON rather than normalized skill tables.
- Audit data is viewable through `security_events`, but richer immutable compliance audit tables and export tooling are not implemented.
- Redis-backed rate limiting, background jobs, realtime notifications, messaging, events, initiatives, contributions, and elections are not wired yet.
- Communities still need content scopes beyond posts, chapter analytics, richer moderation hooks, and notification delivery.

Next possible implementation slices:

- Community comments/reactions/reports on the private post feed.
- Notification/event hooks for community posts, invitations, join requests, settings updates, role changes, and ownership transfers.
- Production email delivery for account recovery and invitations.
- Redis-backed jobs/rate limiting.
- Global feed aggregation from community posts and future public posts.

## Current V1.5 Implementation Update: 2026-05-06 Community Ownership Transfer Slice

Completed after community invitations:

- Added owner/admin-only ownership transfer through `POST /api/v1/communities/{community_id}/ownership-transfer`.
- Ownership can only move to an active non-owner community membership.
- Previous active owners are automatically retained as managers, preserving a management path without leaving the community ownerless.
- Owner role protections remain intact in the generic member-management endpoints; owners still cannot be demoted or removed except through the dedicated transfer workflow.
- Community detail pages now expose a roster-level "Make owner" action for eligible members.
- API tests cover outsider denial, manager denial, already-owner rejection, transfer success, new-owner settings access, owner removal protection, and former-owner leave behavior.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 89% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 22% complete.
- Phase 5 is now roughly 64% complete because community creation, discovery, detail rosters, joins, pending review, manager roles, member management, settings editing, invitations, and owner succession are implemented.
- Overall 24-week MVP implementation is roughly 39% complete.

Implemented now:

- Native landing page.
- Monorepo foundation, CI, docs, Docker Compose.
- FastAPI health/status and request middleware.
- Identity auth, refresh sessions, account recovery, email verification, protected platform owner, role-gated admin overview, session management, admin 2FA policy gate, secure cookie-backed web sessions, CSRF protection, and MVP-local rate limiting.
- Local-only test-account seeding for role and directory QA.
- Protected dashboard/admin route behavior.
- Alumni current-user profile model/API/UI with profile photo upload/display/delete.
- Shared local/S3 upload storage adapter for profile photos and verification evidence.
- Program affiliation model/API/UI.
- Verification request submission, member status history, admin queue, review actions, alumni-member role grant, and evidence upload/review.
- Verified member directory search/profile detail with privacy-aware serializers and authenticated profile-photo display.
- Dedicated admin audit log viewer backed by `security_events`.
- Community discovery, creation, detail pages, active rosters, open/request joins, pending review, manager roles, role updates, non-owner member removal, owner/admin settings editing, invitations, and ownership transfer.

Main gaps now:

- Real email provider/templates are not wired, so invitation delivery is still local/dev-token based.
- S3 adapter exists, but production still needs real bucket credentials, bucket policy validation, malware scanning, image processing, lifecycle/retention policy, and CDN/signed URL decisions.
- Directory search is database-backed MVP search, not Meilisearch/OpenSearch.
- Public profile pages, saved searches, recommendations, and richer dedicated search indexing are not implemented.
- Test accounts are local/dev seed data only; there is no production-safe demo identity lifecycle yet.
- Skills are stored as MVP JSON rather than normalized skill tables.
- Audit data is viewable through `security_events`, but richer immutable compliance audit tables and export tooling are not implemented.
- Redis-backed rate limiting, background jobs, realtime notifications, messaging, feed, events, initiatives, contributions, and elections are not wired yet.
- Communities still need private content gates, content scopes, chapter analytics, moderation hooks, and notification delivery.

Next possible implementation slices:

- Private community content/feed gate.
- Feed/posts/comments/reactions foundation.
- Notification/event hooks for community invitations, join requests, settings updates, role changes, and ownership transfers.
- Production email delivery for account recovery and invitations.
- Redis-backed jobs/rate limiting.

## Current V1.5 Implementation Update: 2026-05-05 Community Invitations Slice

Completed after community settings editing:

- Added `community_invitations` with hashed invitation tokens, invited email, invited role, status, expiry, inviter, and acceptance metadata.
- Added Alembic migration `20260505_0009_community_invitations`.
- Added invitation creation, listing, cancellation, and token acceptance APIs.
- Active community managers can invite ordinary members; owners/admins can invite members or managers.
- Invitation acceptance is bound to the invited account email and creates or restores an active community membership.
- Local/dev invitation creation responses include a one-time `dev_invitation_token` for testing until email delivery is wired.
- Community detail pages now include a protected invitation panel with invite creation, pending invite list, cancel actions, and local accept link generation.
- Added a protected invitation acceptance page at `/communities/invitations/accept`.
- API tests cover manager-created member invitations, owner-created manager invitations, cancellation, duplicate invite prevention, wrong-email denial, accepted invitation status, and active-member duplicate protection.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 89% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 22% complete.
- Phase 5 is now roughly 60% complete because community creation, discovery, detail rosters, joins, pending review, manager roles, member management, settings editing, and invitations are implemented.
- Overall 24-week MVP implementation is roughly 38% complete.

Implemented now:

- Native landing page.
- Monorepo foundation, CI, docs, Docker Compose.
- FastAPI health/status and request middleware.
- Identity auth, refresh sessions, account recovery, email verification, protected platform owner, role-gated admin overview, session management, admin 2FA policy gate, secure cookie-backed web sessions, CSRF protection, and MVP-local rate limiting.
- Local-only test-account seeding for role and directory QA.
- Protected dashboard/admin route behavior.
- Alumni current-user profile model/API/UI with profile photo upload/display/delete.
- Shared local/S3 upload storage adapter for profile photos and verification evidence.
- Program affiliation model/API/UI.
- Verification request submission, member status history, admin queue, review actions, alumni-member role grant, and evidence upload/review.
- Verified member directory search/profile detail with privacy-aware serializers and authenticated profile-photo display.
- Dedicated admin audit log viewer backed by `security_events`.
- Community discovery, creation, detail pages, active rosters, open/request joins, pending review, manager roles, role updates, non-owner member removal, owner/admin settings editing, and invitations.

Main gaps now:

- Real email provider/templates are not wired, so invitation delivery is still local/dev-token based.
- S3 adapter exists, but production still needs real bucket credentials, bucket policy validation, malware scanning, image processing, lifecycle/retention policy, and CDN/signed URL decisions.
- Directory search is database-backed MVP search, not Meilisearch/OpenSearch.
- Public profile pages, saved searches, recommendations, and richer dedicated search indexing are not implemented.
- Test accounts are local/dev seed data only; there is no production-safe demo identity lifecycle yet.
- Skills are stored as MVP JSON rather than normalized skill tables.
- Audit data is viewable through `security_events`, but richer immutable compliance audit tables and export tooling are not implemented.
- Redis-backed rate limiting, background jobs, realtime notifications, messaging, feed, events, initiatives, contributions, and elections are not wired yet.
- Communities still need ownership transfer, privacy gates, content scopes, chapter analytics, and moderation hooks.

Next possible implementation slices:

- Ownership transfer and owner succession safeguards.
- Private community content/feed gate.
- Feed/posts/comments/reactions foundation.
- Notification/event hooks for community invitations, join requests, settings updates, and role changes.
- Production email delivery for account recovery and invitations.
- Redis-backed jobs/rate limiting.

## Current V1.5 Implementation Update: 2026-05-05 Community Settings Slice

Completed after community member management:

- Added owner/admin-only community settings updates through `PATCH /api/v1/communities/{community_id}`.
- Editable settings now include community name, type, description, country, city, sector, program, cohort year, visibility, and join policy.
- Community slugs remain stable after rename so existing links continue to work.
- Active community managers remain able to review and manage ordinary members, but cannot edit community settings.
- Community setting changes are recorded in `security_events` as `community.updated` with changed fields and previous/next values.
- Community detail pages now expose an owner/admin settings editor with typed controls for type, visibility, and join policy.
- API tests cover owner/admin update, manager denial, filtering after updates, invalid enum rejection, and slug stability.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 89% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 22% complete.
- Phase 5 is now roughly 52% complete because community creation, discovery, detail rosters, joins, pending review, manager roles, member management, and settings editing are implemented.
- Overall 24-week MVP implementation is roughly 37% complete.

Implemented now:

- Native landing page.
- Monorepo foundation, CI, docs, Docker Compose.
- FastAPI health/status and request middleware.
- Identity auth, refresh sessions, account recovery, email verification, protected platform owner, role-gated admin overview, session management, admin 2FA policy gate, secure cookie-backed web sessions, CSRF protection, and MVP-local rate limiting.
- Local-only test-account seeding for role and directory QA.
- Protected dashboard/admin route behavior.
- Alumni current-user profile model/API/UI with profile photo upload/display/delete.
- Shared local/S3 upload storage adapter for profile photos and verification evidence.
- Program affiliation model/API/UI.
- Verification request submission, member status history, admin queue, review actions, alumni-member role grant, and evidence upload/review.
- Verified member directory search/profile detail with privacy-aware serializers and authenticated profile-photo display.
- Dedicated admin audit log viewer backed by `security_events`.
- Community discovery, creation, detail pages, active rosters, open/request joins, pending review, manager roles, role updates, non-owner member removal, and owner/admin settings editing.

Main gaps now:

- Real email provider/templates are not wired.
- S3 adapter exists, but production still needs real bucket credentials, bucket policy validation, malware scanning, image processing, lifecycle/retention policy, and CDN/signed URL decisions.
- Directory search is database-backed MVP search, not Meilisearch/OpenSearch.
- Public profile pages, saved searches, recommendations, and richer dedicated search indexing are not implemented.
- Test accounts are local/dev seed data only; there is no production-safe demo identity lifecycle yet.
- Skills are stored as MVP JSON rather than normalized skill tables.
- Audit data is viewable through `security_events`, but richer immutable compliance audit tables and export tooling are not implemented.
- Redis-backed rate limiting, background jobs, realtime notifications, messaging, feed, events, initiatives, contributions, and elections are not wired yet.
- Communities still need invitations, ownership transfer, privacy gates, content scopes, chapter analytics, and moderation hooks.

Next possible implementation slices:

- Community invitations and invite acceptance.
- Ownership transfer and owner succession safeguards.
- Private community content/feed gate.
- Feed/posts/comments/reactions foundation.
- Notification/event hooks for community join requests, settings updates, and role changes.
- Redis-backed jobs/rate limiting and production email delivery.

## Current V1.5 Implementation Update: 2026-05-05 Community Member Management Slice

Completed after community membership review:

- Added `MANAGER` as an active community-level management role.
- Community owners and platform admins can promote active ordinary members to manager and demote managers back to member.
- Active community managers can review pending join requests and manage ordinary members without being able to demote/remove peer managers or owners.
- Active non-owner memberships can now be removed by authorized admins, owners, or eligible managers.
- Community owners remain protected from demotion/removal through member-management endpoints; ownership transfer remains a separate planned workflow.
- New audit events record member role changes and removals through `security_events`.
- Community detail pages now expose roster management controls with manager promotion, demotion, and removal actions.
- API tests cover regular-member denial, owner lock protection, manager-only boundaries, manager removal of ordinary members, and manager approval of pending requests.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 89% complete.
- Phase 3 remains roughly 52% complete.
- Phase 4 remains roughly 22% complete.
- Phase 5 is now roughly 46% complete because community model, discovery, detail rosters, joins, pending review, manager roles, and basic member management are implemented.
- Overall 24-week MVP implementation is roughly 36% complete.

Implemented now:

- Native landing page.
- Monorepo foundation, CI, docs, Docker Compose.
- FastAPI health/status and request middleware.
- Identity auth, refresh sessions, account recovery, email verification, protected platform owner, role-gated admin overview, session management, admin 2FA policy gate, secure cookie-backed web sessions, CSRF protection, and MVP-local rate limiting.
- Local-only test-account seeding for role and directory QA.
- Protected dashboard/admin route behavior.
- Alumni current-user profile model/API/UI with profile photo upload/display/delete.
- Shared local/S3 upload storage adapter for profile photos and verification evidence.
- Program affiliation model/API/UI.
- Verification request submission, member status history, admin queue, review actions, alumni-member role grant, and evidence upload/review.
- Verified member directory search/profile detail with privacy-aware serializers and authenticated profile-photo display.
- Dedicated admin audit log viewer backed by `security_events`.
- Community discovery, creation, detail pages, active rosters, open/request joins, pending review, manager roles, role updates, and non-owner member removal.

Main gaps now:

- Real email provider/templates are not wired.
- S3 adapter exists, but production still needs real bucket credentials, bucket policy validation, malware scanning, image processing, lifecycle/retention policy, and CDN/signed URL decisions.
- Directory search is database-backed MVP search, not Meilisearch/OpenSearch.
- Public profile pages, saved searches, recommendations, and richer dedicated search indexing are not implemented.
- Test accounts are local/dev seed data only; there is no production-safe demo identity lifecycle yet.
- Skills are stored as MVP JSON rather than normalized skill tables.
- Audit data is viewable through `security_events`, but richer immutable compliance audit tables and export tooling are not implemented.
- Redis-backed rate limiting, background jobs, realtime notifications, messaging, feed, events, initiatives, contributions, and elections are not wired yet.
- Communities still need edit settings, invitations, ownership transfer, privacy gates, content scopes, chapter analytics, and moderation hooks.

Next possible implementation slices:

- Community settings edit API/UI.
- Community invitations and invite acceptance.
- Ownership transfer and owner succession safeguards.
- Private community content/feed gate.
- Feed/posts/comments/reactions foundation.
- Notification/event hooks for community join requests and role changes.
- Redis-backed jobs/rate limiting and production email delivery.

## Legacy Repository State

Source path:

```text
C:\xampp\htdocs\yalumni-v0
```

Observed branch:

```text
devLocalBuid...origin/devLocalBuid
```

Observed working tree notes:

- `resources/lang/en.json` is modified in the legacy repo.
- `Yalumni_rebuild_docs/` is untracked in the legacy repo.
- The new V1.5 project is intentionally outside the legacy repo at `D:\YALUMNI-V1.5`.

Current stack:

- Laravel 9 and PHP 8.
- Blade templates.
- Laravel Mix, Bootstrap, Sass.
- React exists, but only as a partial UI island layer.
- MySQL-style Laravel migrations.
- Pusher package for realtime.
- Sanctum, Socialite, Spatie permissions, Stancl tenancy.
- Many payment provider packages.

## Legacy Functional Inventory

### Existing Public Surface

The legacy app exposes public routes for:

- Landing/home page.
- Public alumni list.
- Public events and event details.
- Public news and news details.
- Public notices and notice details.
- Membership plans.
- Jobs and job details.
- Stories and story details.
- Contact page.
- Ticket verification.
- Content pages.

### Existing Member Surface

Authenticated alumni routes include:

- Home feed/dashboard.
- Profile and settings.
- Institution/profile update.
- Public alumni profile view.
- Event creation, editing, details, tickets, and attendee history.
- Job post creation and management.
- Story creation and management.
- Posts, likes, comments, and media.
- Membership package checkout.
- Transactions and printable/downloadable transaction views.
- Direct chat.
- News and notice pages.
- Notifications.

### Existing Admin Surface

Admin routes include:

- Admin dashboard.
- Alumni approval and advanced filtering.
- Event category and pending event management.
- Membership management.
- Job moderation.
- Story moderation.
- Moderator and role management.
- Application settings.
- Website content settings.
- Currency, language, department, batch, passing year settings.
- Gateway and payment settings.
- Newsletter and subscription email templates.
- News and notice management.
- Transaction review.
- Version and add-on update controls.

### Existing Data Model Signals

Legacy models include:

- Identity: `User`, `Alumni`, `UserInstitution`, `UserMembershipPlan`, `UserPackage`.
- Content: `Post`, `PostMedia`, `PostComment`, `News`, `Notice`, `Story`, `PhotoGallery`.
- Events: `Event`, `EventCategory`, `EventTicket`.
- Messaging: `Chat`, `ChatMedia`.
- Payments: `Payment`, `Transaction`, `Gateway`, `GatewayCurrency`, `Bank`.
- Memberships and SaaS: `Membership`, `Package`, `Tenant`, `CustomDomainRequest`.
- Governance add-ons: `CommitteeElection`, `CommitteeCandidate`, `CommitteeVote`, `CommitteeNominationForm`, `CommitteeBoardMember`.
- Donation add-ons: `Campaign`, `CampaignDonation`, `CampaignComment`, `CampaignCategory`.
- Settings and operations: `Setting`, `Language`, `Currency`, `EmailTemplate`, `Notification`.

## Legacy Strengths

- It provides a working domain reference for alumni workflows.
- It already contains public, member, and admin route separation.
- It includes many payment provider integrations.
- It includes roles and permissions.
- It includes approval flows for alumni, jobs, events, and stories.
- It has multi-tenant concepts that can inspire country or chapter boundaries.
- It has database migrations that can become a migration mapping source.

## Legacy Limitations

- The monolithic Laravel/Blade architecture does not match the requested modern stack.
- React is not the main application framework.
- Current concepts like departments, batches, and passing years are school-oriented and need YALI-specific modeling.
- The API surface is thin and payment callbacks are the main API routes.
- Chat and realtime authorization need a more explicit per-conversation security model.
- Financial transactions are not enough for transparent contributions, pledges, receipts, disbursements, and append-only ledgers.
- Committee/election add-ons do not fully satisfy privacy-preserving ballot handling, voter roll freezing, or audit reporting.
- The current admin UI is broad but template-like; the rebuild needs task queues and governance-aware workflows.
- The current data model likely mixes tenant, membership, admin, alumni, and payment concerns in ways that should be normalized.

## Rebuild Documentation Inventory

The planning packet at `Yalumni_rebuild_docs` contains:

- Detailed technical specification.
- Detailed product specification.
- Detailed implementation plan.
- Master implementation prompt.
- UI/UX design document.
- Design system tokens.
- Dozens of exported screen PNGs and HTML references.
- Logo variants and app icons.

Important note from the packet:

Official YALI terminology, URLs, brand permissions, logo usage, visual identity rules, and public claims must be validated before public launch. The platform should not imply official endorsement until the owner confirms that status.

## Target Product Direction

The target is a verified alumni operating system, not only a directory.

Primary capabilities:

- Verified alumni identity.
- Alumni profiles and privacy controls.
- Alumni directory and search.
- Country, city, cohort, sector, program, and custom communities.
- Feed, posts, comments, reactions, and moderation.
- Direct and group messaging.
- Event creation, RSVP, tickets, agenda, speakers, check-in, and reports.
- Initiative proposal, teams, milestones, tasks, documents, updates, impact reports.
- Opportunity marketplace.
- Mentorship and introduction flows.
- Contribution campaigns, pledges, receipts, append-only ledger, disbursements, and treasurer tools.
- Elections with nominations, voter roll freeze, ballots, duplicate vote prevention, audit logs, results, and disputes.
- Admin dashboards, chapter consoles, verification queues, moderation queues, reports, and audit logs.

## Recommended Architecture

Use a modular monorepo:

```text
apps/
  web/
  api/
  workers/
packages/
  ui/
  types/
  config/
infra/
scripts/
docs/
```

Runtime:

- Next.js web app for public, member, and admin surfaces.
- FastAPI backend with versioned REST APIs.
- PostgreSQL primary database.
- Redis for queues, cache, rate limits, and realtime presence.
- Object storage for profile images, verification documents, receipts, and event assets.
- Meilisearch first for directory/search MVP, with OpenSearch as a later scale option.
- WebSockets for messaging and notifications.

## Current V1.5 Implementation Status

Created in `D:\YALUMNI-V1.5`:

- Monorepo folder structure.
- Root `README.md`, `.env.example`, `.gitignore`, `docker-compose.yml`, `Makefile`, and `CONTRIBUTING.md`.
- FastAPI app with `/health` and `/api/v1/system/status`.
- Request ID middleware.
- CORS settings.
- Basic password hashing utility.
- Permission enum baseline.
- Pagination and error helpers.
- Alembic baseline wiring.
- Backend tests for health/status.
- Next.js app shell with landing, login, register, dashboard, and admin routes.
- Tailwind design tokens based on provided design system.
- YALUMNI logo and landing reference assets copied into web public assets.
- Shared `packages/ui` and `packages/types` placeholders.
- GitHub Actions CI workflow.
- Documentation files.

## MVP Priority Order

1. Auth and sessions.
2. Email verification.
3. User model, roles, and protected routes.
4. Alumni profile and program affiliation schema.
5. Profile onboarding and privacy settings.
6. Verification request workflow.
7. Admin verification queue.
8. Alumni directory and profile detail.
9. Communities and membership.
10. Feed, comments, reactions, and reports.
11. Direct messaging and notifications.
12. Events and RSVP.
13. Admin hardening and audit log viewer.

## Post-MVP Priority Order

1. Initiative hub.
2. Opportunity marketplace.
3. Mentorship and introduction requests.
4. Contribution campaigns and append-only ledger.
5. Treasurer dashboard and disbursement approvals.
6. Election workflows and audit reports.
7. Chapter analytics.
8. Public success stories and impact reporting.
9. Search and recommendation tuning.
10. PWA hardening and optional native wrapper.

## Migration Strategy

The legacy Laravel database should be used as a migration source, not as the new schema design.

Rules:

- Preserve legacy IDs in `legacy_id` fields or `legacy_metadata`.
- Do not import demo credentials.
- Do not expose private contact data by default.
- Map school-centric fields to YALI-specific fields only when reliable.
- Keep ambiguous values in JSON metadata for manual review.
- Build dry-run scripts before writing to any real target database.
- Produce row counts, warnings, skipped rows, and error reports.

High-value migration sources:

- `users`
- `alumnus`
- `user_institutions`
- `posts`, comments, likes, media
- `events`, tickets, categories
- `chats`, chat media
- `membership_plans`
- `transactions`, payments
- `roles`, permissions
- public content such as news, notices, stories, and galleries where still useful

## Key Risks

- Brand/legal ambiguity around official YALI usage.
- Verification policy not yet finalized.
- Overbuilding elections and payments before trust and community loops are stable.
- Payment provider selection varies by country.
- Legacy data quality may be uneven.
- Admin workload could become high without chapter-level delegation.
- Privacy leakage in directory/search is a major risk.
- Realtime messaging must avoid IDOR and cross-conversation leaks.

## Current V1.5 Implementation Update: 2026-05-02 Auth Slice

Completed after the foundation:

- Native public landing page implementation replaced the temporary landing reference screenshot.
- API identity tables were added for `users`, `sessions`, `roles`, `role_assignments`, and `security_events`.
- Auth endpoints were added for registration, login, token refresh, logout, and current user lookup.
- Password hashing, JWT access tokens, hashed rotating refresh tokens, and security event logging now exist.
- The web login and registration pages now submit to the API and store local development tokens.
- The member dashboard now reads the access token and calls `/api/v1/auth/me`.
- API tests cover registration, duplicate registration, login, current user lookup, refresh rotation, logout, invalid login, and missing bearer token denial.

Current plan position:

- Phase 1 is functionally complete for local foundation work, with remaining hardening around one-command Docker ergonomics and pre-commit hooks.
- Phase 2 has started and is roughly 35% complete.
- Overall 24-week MVP implementation is roughly 8% complete. This is a foundation-plus-auth estimate, not a production readiness claim.

Remaining Phase 2 gaps:

- Email verification flow.
- Password reset flow.
- Admin 2FA requirement or placeholder policy.
- Persistent frontend auth storage strategy using secure cookies instead of local development storage.
- Route guards and role-aware admin access.
- Session/device management UI.
- Rate limits for login and password reset.

## Current V1.5 Implementation Update: 2026-05-04 Account Recovery Slice

Completed after the auth foundation:

- One-time account token storage was added through `account_tokens`.
- Email verification endpoint and web confirmation panel were added.
- Forgot-password and reset-password endpoints were added.
- Local development reset and verification links are exposed only through dev-token responses until an email provider is wired.
- Password reset now changes the password hash and revokes active sessions.
- Login/register UI now links into the recovery and verification flows.
- API tests cover email verification, token reuse prevention, password reset, old-password rejection, new-password login, and unknown-email privacy.

Current plan position:

- Phase 1 remains functionally complete for the local foundation.
- Phase 2 is now roughly 60% complete.
- Overall 24-week MVP implementation is roughly 11% complete.

Remaining Phase 2 gaps:

- Secure HttpOnly cookie auth strategy.
- Full route guards for dashboard/admin surfaces.
- Role-aware admin access and initial admin seeding.
- Session/device management UI and API.
- Admin 2FA requirement or placeholder policy.
- Login/password-reset rate limiting.
- Real email provider integration and branded email templates.

## Current V1.5 Implementation Update: 2026-05-04 Access Control Slice

Completed after account recovery:

- Reusable API role guard dependency was added for role-protected endpoints.
- Local-only admin bootstrap endpoint was added so development users can seed `SUPER_ADMIN`.
- Role-protected admin overview endpoint now returns user/session/admin/audit summary data.
- Dashboard route now performs a client-side session gate before showing member workspace content.
- Admin route now performs a client-side admin-role gate before showing privileged console data.
- Admin console now loads live API overview metrics and recent security events.
- API tests cover admin denial, local admin bootstrap, and successful protected admin overview access.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 is now roughly 72% complete.
- Overall 24-week MVP implementation is roughly 13% complete.

Remaining Phase 2 gaps:

- Secure HttpOnly cookie auth strategy and SSR/middleware enforcement.
- Session/device management UI and API.
- Admin 2FA requirement or placeholder policy.
- Rate limiting for login, password reset, and admin-sensitive actions.
- Real email provider integration and branded templates.
- Production-safe admin seeding procedure outside local development.

## Current V1.5 Implementation Update: 2026-05-04 Session Management Slice

Completed after access control:

- Current-user session listing endpoint was added.
- Session revocation endpoint was added with ownership checks.
- Current session detection now works in local development by comparing the stored refresh token through an explicit request header.
- Revoking the current session invalidates refresh-token rotation and clears the dashboard session state.
- Dashboard now includes a sessions and devices panel with active/revoked status, IP, device summary, created time, expiry time, and revoke actions.
- Dashboard sign-out now updates the protected route parent state instead of only clearing local storage.
- API tests cover session listing, current-session marking, non-current revocation, current-session revocation, refresh denial after revocation, and missing-session denial.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 is now roughly 80% complete.
- Overall 24-week MVP implementation is roughly 14% complete.

Remaining Phase 2 gaps:

- Secure HttpOnly cookie auth strategy and SSR/middleware enforcement.
- Admin 2FA requirement or placeholder policy.
- Rate limiting for login, password reset, and admin-sensitive actions.
- Real email provider integration and branded templates.
- Production-safe admin seeding procedure outside local development.

## Current V1.5 Implementation Update: 2026-05-04 Rate Limiting Slice

Completed after session management:

- In-process windowed rate limiter was added for local/MVP auth hardening.
- Login attempts are now rate-limited by client and normalized email.
- Password reset request and reset-completion attempts are now rate-limited by client and email/token.
- Local admin bootstrap is now rate-limited by client, user, and action.
- Rate-limit responses return HTTP 429 with `Retry-After`.
- Rate-limit settings were added to the environment template.
- API tests cover login throttling, password-reset throttling, and local admin bootstrap throttling.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 is now roughly 85% complete.
- Overall 24-week MVP implementation is roughly 15% complete.

Remaining Phase 2 gaps:

- Secure HttpOnly cookie auth strategy and SSR/middleware enforcement.
- Admin 2FA requirement or placeholder policy.
- Real email provider integration and branded templates.
- Production-safe admin seeding procedure outside local development.
- Redis-backed distributed rate limiting for multi-instance production deployments.

## Immediate Next Implementations

The next engineering task should move from verification workflow foundation into directory readiness while keeping identity hardening visible:

- Decide secure-cookie auth migration and middleware strategy.
- Add privileged-role 2FA policy placeholder before deeper admin work.
- Add public/private alumni profile serializers before directory search.
- Add profile photo/object-storage strategy before document uploads.
- Add verification document upload metadata and object storage.
- Start alumni directory list/search with privacy-aware fields.

After profile visibility and directory serializers land, move directly into alumni directory search. That sequence gives the platform a trustworthy spine before social, community, payment, or election features are added.

## Current V1.5 Implementation Update: 2026-05-04 Alumni Profile Slice

Completed after rate limiting:

- Alumni profile and program affiliation SQLAlchemy models were added.
- Alembic migration `20260504_0003` now creates `alumni_profiles` and `program_affiliations`.
- Authenticated current-user alumni endpoints were added for reading/updating profile data and adding/removing program affiliations.
- Profile completion percentage is calculated from headline, bio, country, sector, organization, role, skills, and program affiliation.
- Dashboard now includes a real profile completion panel with editable alumni fields and a program affiliation form.
- Web API client types were added for alumni profile and program affiliation responses.
- API tests cover profile auto-creation, profile completion, skill normalization, visibility merge behavior, program affiliation completion, and unauthenticated denial.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 85% complete; the remaining work is production hardening, not core MVP-local flow.
- Phase 3 has started and is roughly 18% complete.
- Overall 24-week MVP implementation is roughly 17% complete.

Implemented now:

- Native landing page.
- Monorepo foundation, CI, docs, Docker Compose.
- FastAPI health/status and request middleware.
- Identity auth, refresh sessions, account recovery, email verification, role-gated admin overview, session management, and MVP-local rate limiting.
- Protected dashboard/admin route behavior.
- Alumni current-user profile model/API/UI.
- Program affiliation model/API/UI.

Main gaps now:

- Auth still uses local-storage bearer tokens in the web app; production should move to HttpOnly cookies and SSR/middleware guards.
- Admin 2FA is still not implemented.
- Email verification and password reset still expose local dev tokens instead of a real provider and branded templates.
- Alumni profile images, document uploads, and object storage are not implemented.
- Verification requests, verification documents, and admin verification queue are not implemented.
- Public alumni directory/search and privacy-aware profile serialization are not implemented.
- Skills are stored as MVP JSON rather than normalized skill tables.
- Redis-backed rate limiting and job queues are not wired yet.

Next possible implementation slices:

- Secure cookie auth migration and route middleware.
- Public/private alumni profile serializers and directory search.
- Profile photo upload and object storage abstraction.
- Dedicated audit log viewer for admin verification activity.

## Current V1.5 Implementation Update: 2026-05-04 Verification Workflow Slice

Completed after alumni profiles:

- Verification request model and Alembic migration `20260504_0004` were added.
- Members can submit completed profiles to `/api/v1/alumni/me/verification-requests`.
- Members can list their verification request history and see the latest review status on the dashboard.
- Incomplete profiles are blocked from verification submission until profile completion reaches 100%.
- Duplicate pending verification submissions are blocked.
- Verification admins can list pending requests and approve, reject, or request more information.
- Approving a verification request grants the `ALUMNI_MEMBER` role.
- Admin review actions create security events for audit visibility.
- Admin console now includes a live verification queue instead of only placeholder queue cards.
- API tests now cover submission rules, admin role gates, approval, role grant, duplicate review denial, and request-more-information.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 85% complete; remaining items are production-grade auth hardening.
- Phase 3 is now roughly 34% complete.
- Overall 24-week MVP implementation is roughly 19% complete.

Implemented now:

- Native landing page.
- Monorepo foundation, CI, docs, Docker Compose.
- FastAPI health/status and request middleware.
- Identity auth, refresh sessions, account recovery, email verification, role-gated admin overview, session management, and MVP-local rate limiting.
- Protected dashboard/admin route behavior.
- Alumni current-user profile model/API/UI.
- Program affiliation model/API/UI.
- Verification request submission, member status history, admin queue, review actions, and alumni-member role grant.

Main gaps now:

- Auth still uses local-storage bearer tokens in the web app; production should move to HttpOnly cookies and SSR/middleware guards.
- Admin 2FA is still not implemented.
- Email verification and password reset still expose local dev tokens instead of a real provider and branded templates.
- Verification document upload, object storage, and evidence review attachments are not implemented.
- Public alumni directory/search and privacy-aware profile serialization are not implemented.
- Profile photo upload is not implemented.
- Skills are stored as MVP JSON rather than normalized skill tables.
- Dedicated audit log viewer is not implemented; audit data currently lands in `security_events`.
- Redis-backed rate limiting and background jobs are not wired yet.

Next possible implementation slices:

- Public/private alumni profile serializers and member directory search.
- Verification document upload metadata plus object-storage abstraction.
- Secure cookie auth migration and route middleware.
- Profile photo upload and media pipeline foundation.
- Dedicated admin audit log viewer.
- Admin 2FA policy placeholder and enforcement gate.

## Current V1.5 Implementation Update: 2026-05-05 Community Membership Review Slice

Completed after the community detail and roster slice:

- Manager-only community membership approval API was added at `/api/v1/communities/{community_id}/members/{membership_id}/approve`.
- Manager-only community membership rejection API was added at `/api/v1/communities/{community_id}/members/{membership_id}/reject`.
- Community admins and community owners can approve or reject pending membership requests.
- Approved members become active community members with a join timestamp.
- Rejected members are removed from pending review and recorded as `REJECTED`.
- Community member roster filtering now supports `REJECTED`.
- Approval and rejection events now land in the existing security audit stream.
- Community detail pages now show a pending requests review section to admins and community owners.
- Pending request review UI supports approve/reject actions and refreshes active/pending rosters after each decision.
- Backend tests cover approval, rejection, active roster transition, rejected roster visibility, and non-manager denial.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 97% complete.
- Phase 3 remains roughly 53% complete.
- Phase 4 remains roughly 42% complete.
- Phase 5 is now roughly 35% complete because request-only community membership is reviewable end to end.
- Overall 24-week MVP implementation is roughly 35% complete.

Implemented now:

- Native landing page.
- Monorepo foundation, CI, docs, Docker Compose.
- FastAPI health/status and request middleware.
- Identity auth, refresh sessions, account recovery, email verification, protected platform owner, local test accounts, role-gated admin overview, session management, MVP-local rate limiting, HttpOnly cookie-backed web sessions, CSRF-protected web mutations, and TOTP 2FA enrollment.
- Config-gated admin 2FA enforcement for privileged API routes.
- Protected dashboard/admin/directory/community route behavior with a Next route-entry proxy and server-side backend API proxy.
- Alumni current-user profile model/API/UI with profile photo upload/display/delete.
- Program affiliation model/API/UI.
- Verification request submission, member status history, admin queue, review actions, alumni-member role grant, and local/S3-ready evidence upload/review.
- Verified member directory search/profile detail with privacy-aware serializers, authenticated profile-photo display, advanced filters, sort options, pagination, and a dedicated web profile page.
- Community list/create/detail APIs, open/request join policies, member leave flow, dashboard communities panel, protected community detail page, active/pending/rejected roster APIs, pending request review UI, and basic community audit events.
- Admin audit event API and admin audit log viewer.

Main gaps now:

- Scoped community manager roles beyond owner/admin are not implemented.
- Invitations, member removal, role changes, and ownership transfer are not implemented.
- Community content gates and private feed/event association are not implemented.
- Directory search is still database-backed MVP search, not Meilisearch/OpenSearch.
- Saved searches, recommended alumni, normalized skill taxonomy, and directory facets/counts are not implemented.
- Profile-to-profile contact/introduction workflows are not implemented.
- 2FA backup codes, forced enrollment grace period, and support recovery workflows are not implemented.
- Real email provider/templates are not wired.
- Production cookie/domain/SameSite review and per-session CSRF rotation policy are still pending.
- Production object storage needs real bucket credentials, bucket policy validation, malware scanning, signed URL policy, image processing, CDN policy, and retention policy.
- Redis-backed rate limiting and background jobs are not wired yet.

Next possible implementation slices:

- Community manager roles and member management.
- Feed module foundation with community-scoped posts.
- Community invitations and ownership transfer.
- Profile-to-profile introduction/contact request flow.
- 2FA backup/recovery codes and forced-enrollment rollout workflow.
- Real email provider/template integration.

## Current V1.5 Implementation Update: 2026-05-05 Community Detail And Roster Slice

Completed after the communities foundation slice:

- Community member roster API was added at `/api/v1/communities/{community_id}/members`.
- Active rosters are visible to authenticated members.
- Pending and left roster status views are protected for admins and community owners.
- Roster responses include member identity, role, status, join timestamp, pagination metadata, and `has_more`.
- The route-entry proxy now protects `/communities/*`.
- Dashboard community cards now link to a protected community detail route.
- Protected web community detail pages were added at `/communities/{community_id}`.
- Community detail pages load community summary and active roster data in parallel through the cookie-session backend proxy.
- Detail pages support join, pending join state, owner state, leave, and paginated active member rosters.
- Backend tests now cover active roster visibility and pending roster permission checks.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 97% complete.
- Phase 3 remains roughly 53% complete.
- Phase 4 remains roughly 42% complete.
- Phase 5 is now roughly 28% complete because communities have models, membership lifecycle basics, discovery, detail pages, and active rosters.
- Overall 24-week MVP implementation is roughly 34% complete.

Implemented now:

- Native landing page.
- Monorepo foundation, CI, docs, Docker Compose.
- FastAPI health/status and request middleware.
- Identity auth, refresh sessions, account recovery, email verification, protected platform owner, local test accounts, role-gated admin overview, session management, MVP-local rate limiting, HttpOnly cookie-backed web sessions, CSRF-protected web mutations, and TOTP 2FA enrollment.
- Config-gated admin 2FA enforcement for privileged API routes.
- Protected dashboard/admin/directory/community route behavior with a Next route-entry proxy and server-side backend API proxy.
- Alumni current-user profile model/API/UI with profile photo upload/display/delete.
- Program affiliation model/API/UI.
- Verification request submission, member status history, admin queue, review actions, alumni-member role grant, and local/S3-ready evidence upload/review.
- Verified member directory search/profile detail with privacy-aware serializers, authenticated profile-photo display, advanced filters, sort options, pagination, and a dedicated web profile page.
- Community list/create/detail APIs, open/request join policies, member leave flow, dashboard communities panel, protected community detail page, active member roster API/UI, and basic community audit events.
- Admin audit event API and admin audit log viewer.

Main gaps now:

- Community membership request approval/rejection is not implemented yet.
- Scoped community manager roles, invitations, member removal, and role changes are not implemented.
- Community content gates and private feed/event association are not implemented.
- Directory search is still database-backed MVP search, not Meilisearch/OpenSearch.
- Saved searches, recommended alumni, normalized skill taxonomy, and directory facets/counts are not implemented.
- Profile-to-profile contact/introduction workflows are not implemented.
- 2FA backup codes, forced enrollment grace period, and support recovery workflows are not implemented.
- Real email provider/templates are not wired.
- Production cookie/domain/SameSite review and per-session CSRF rotation policy are still pending.
- Production object storage needs real bucket credentials, bucket policy validation, malware scanning, signed URL policy, image processing, CDN policy, and retention policy.
- Redis-backed rate limiting and background jobs are not wired yet.

Next possible implementation slices:

- Community membership request review for admins/managers.
- Community manager roles and member management.
- Feed module foundation with community-scoped posts.
- Profile-to-profile introduction/contact request flow.
- 2FA backup/recovery codes and forced-enrollment rollout workflow.
- Real email provider/template integration.

## Current V1.5 Implementation Update: 2026-05-05 Communities Foundation Slice

Completed after the directory profile detail page slice:

- Community and community membership models were added.
- Alembic migration `20260505_0008` creates `communities` and `community_memberships`.
- Authenticated community listing API was added with query, type, country, sector, membership, limit, and offset filters.
- Admin-gated community creation API was added.
- Community detail API was added.
- Authenticated join and leave APIs were added.
- Open communities activate members immediately; request-only communities create pending memberships.
- Community create/join/request/leave events now land in the existing security audit stream.
- Dashboard now includes a Communities panel with filters, pagination, member join/leave actions, and admin-only community creation.
- Backend tests cover admin-only creation, open join/leave, request-only pending memberships, filters, and pagination.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 97% complete.
- Phase 3 remains roughly 53% complete.
- Phase 4 remains roughly 42% complete.
- Phase 5 has started and is roughly 18% complete because community models, membership lifecycle basics, list/create APIs, and dashboard browse/join UI are implemented.
- Overall 24-week MVP implementation is roughly 33% complete.

Implemented now:

- Native landing page.
- Monorepo foundation, CI, docs, Docker Compose.
- FastAPI health/status and request middleware.
- Identity auth, refresh sessions, account recovery, email verification, protected platform owner, local test accounts, role-gated admin overview, session management, MVP-local rate limiting, HttpOnly cookie-backed web sessions, CSRF-protected web mutations, and TOTP 2FA enrollment.
- Config-gated admin 2FA enforcement for privileged API routes.
- Protected dashboard/admin/directory route behavior with a Next route-entry proxy and server-side backend API proxy.
- Alumni current-user profile model/API/UI with profile photo upload/display/delete.
- Program affiliation model/API/UI.
- Verification request submission, member status history, admin queue, review actions, alumni-member role grant, and local/S3-ready evidence upload/review.
- Verified member directory search/profile detail with privacy-aware serializers, authenticated profile-photo display, advanced filters, sort options, pagination, and a dedicated web profile page.
- Community list/create/detail APIs, open/request join policies, member leave flow, dashboard communities panel, and basic community audit events.
- Admin audit event API and admin audit log viewer.

Main gaps now:

- Community detail pages are not implemented yet.
- Community member roster APIs, manager roles, invitations, request approval/rejection, and scoped chapter admin permissions are not implemented.
- Community content gates and private feed/event association are not implemented.
- Directory search is still database-backed MVP search, not Meilisearch/OpenSearch.
- Saved searches, recommended alumni, normalized skill taxonomy, and directory facets/counts are not implemented.
- Profile-to-profile contact/introduction workflows are not implemented.
- 2FA backup codes, forced enrollment grace period, and support recovery workflows are not implemented.
- Real email provider/templates are not wired.
- Production cookie/domain/SameSite review and per-session CSRF rotation policy are still pending.
- Production object storage needs real bucket credentials, bucket policy validation, malware scanning, signed URL policy, image processing, CDN policy, and retention policy.
- Redis-backed rate limiting and background jobs are not wired yet.

Next possible implementation slices:

- Community detail page and member roster surface.
- Community membership request review for admins/managers.
- Profile-to-profile introduction/contact request flow.
- Feed module foundation with community-scoped posts.
- 2FA backup/recovery codes and forced-enrollment rollout workflow.
- Real email provider/template integration.

## Current V1.5 Implementation Update: 2026-05-05 Directory Profile Detail Page Slice

Completed after the directory advanced search slice:

- A protected web profile route was added at `/directory/{user_id}`.
- Dashboard directory cards now link to the member profile detail route.
- Directory profile detail pages load the existing privacy-aware directory profile API through the cookie-session backend proxy.
- The route-entry proxy now protects `/directory/*` in addition to dashboard and admin routes.
- Profile detail pages show the verified member identity, profile photo, headline, location, current work, program history, skills/focus, and shared email only when visibility allows it.
- Loading and error states were added for profile detail fetches.
- The web API client now exposes `getAlumniDirectoryProfile`.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 97% complete.
- Phase 3 remains roughly 53% complete.
- Phase 4 is now roughly 42% complete because the directory now supports list, search, pagination, and a real member profile detail experience.
- Overall 24-week MVP implementation is roughly 31% complete.

Implemented now:

- Native landing page.
- Monorepo foundation, CI, docs, Docker Compose.
- FastAPI health/status and request middleware.
- Identity auth, refresh sessions, account recovery, email verification, protected platform owner, local test accounts, role-gated admin overview, session management, MVP-local rate limiting, HttpOnly cookie-backed web sessions, CSRF-protected web mutations, and TOTP 2FA enrollment.
- Config-gated admin 2FA enforcement for privileged API routes.
- Protected dashboard/admin/directory route behavior with a Next route-entry proxy and server-side backend API proxy.
- Alumni current-user profile model/API/UI with profile photo upload/display/delete.
- Program affiliation model/API/UI.
- Verification request submission, member status history, admin queue, review actions, alumni-member role grant, and local/S3-ready evidence upload/review.
- Verified member directory search/profile detail with privacy-aware serializers, authenticated profile-photo display, advanced filters, sort options, pagination, and a dedicated web profile page.
- Admin audit event API and admin audit log viewer.

Main gaps now:

- Directory search is still database-backed MVP search, not Meilisearch/OpenSearch.
- Saved searches, recommended alumni, normalized skill taxonomy, and directory facets/counts are not implemented.
- Profile-to-profile contact/introduction workflows are not implemented; shared email is display-only when the member exposes it.
- 2FA backup codes, forced enrollment grace period, and support recovery workflows are not implemented.
- Real email provider/templates are not wired.
- Production cookie/domain/SameSite review and per-session CSRF rotation policy are still pending.
- Production object storage needs real bucket credentials, bucket policy validation, malware scanning, signed URL policy, image processing, CDN policy, and retention policy.
- Test accounts are local/dev seed data only; there is no production-safe demo identity lifecycle yet.
- Redis-backed rate limiting and background jobs are not wired yet.

Next possible implementation slices:

- Communities module foundation.
- Profile-to-profile introduction/contact request flow.
- 2FA backup/recovery codes and forced-enrollment rollout workflow.
- Real email provider/template integration.
- Redis-backed rate limits and background jobs.
- Directory facets/saved searches and Meilisearch/OpenSearch indexing plan.

## Current V1.5 Implementation Update: 2026-05-05 Directory Advanced Search Slice

Completed after the admin 2FA slice:

- Directory search responses now return `limit`, `offset`, and `has_more` metadata.
- Directory API filtering now supports query, country, city, sector, program name, cohort year, and skill.
- Directory API sorting now supports name, recently verified, country, and sector ordering.
- Search now checks display name, headline, organization, role, sector, location, skills, and program affiliation names.
- Country and sector filters now support partial matching instead of exact-only matching.
- Dashboard directory UI now includes advanced filters, sort selection, reset, and previous/next pagination controls.
- Web API client types were updated for the expanded directory contract.
- Backend tests cover advanced filters and paginated result metadata.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 97% complete.
- Phase 3 remains roughly 53% complete.
- Phase 4 is now roughly 35% complete because member directory discovery now has usable paging, filtering, and sorting.
- Overall 24-week MVP implementation is roughly 30% complete.

Implemented now:

- Native landing page.
- Monorepo foundation, CI, docs, Docker Compose.
- FastAPI health/status and request middleware.
- Identity auth, refresh sessions, account recovery, email verification, protected platform owner, local test accounts, role-gated admin overview, session management, MVP-local rate limiting, HttpOnly cookie-backed web sessions, CSRF-protected web mutations, and TOTP 2FA enrollment.
- Config-gated admin 2FA enforcement for privileged API routes.
- Protected dashboard/admin route behavior with a Next route-entry proxy and server-side backend API proxy.
- Alumni current-user profile model/API/UI with profile photo upload/display/delete.
- Program affiliation model/API/UI.
- Verification request submission, member status history, admin queue, review actions, alumni-member role grant, and local/S3-ready evidence upload/review.
- Verified member directory search/profile detail with privacy-aware serializers, authenticated profile-photo display, advanced filters, sort options, and pagination.
- Admin audit event API and admin audit log viewer.

Main gaps now:

- Directory search is still database-backed MVP search, not Meilisearch/OpenSearch.
- Directory profile detail exists as an API, but a dedicated rich web profile detail page is not implemented.
- Saved searches, recommended alumni, normalized skill taxonomy, and directory facets/counts are not implemented.
- 2FA backup codes, forced enrollment grace period, and support recovery workflows are not implemented.
- Real email provider/templates are not wired.
- Production cookie/domain/SameSite review and per-session CSRF rotation policy are still pending.
- Production object storage needs real bucket credentials, bucket policy validation, malware scanning, signed URL policy, image processing, CDN policy, and retention policy.
- Test accounts are local/dev seed data only; there is no production-safe demo identity lifecycle yet.
- Redis-backed rate limiting and background jobs are not wired yet.

Next possible implementation slices:

- Dedicated web directory profile detail page.
- Communities module foundation.
- 2FA backup/recovery codes and forced-enrollment rollout workflow.
- Real email provider/template integration.
- Redis-backed rate limits and background jobs.
- Directory facets/saved searches and Meilisearch/OpenSearch indexing plan.

## Current V1.5 Implementation Update: 2026-05-05 Admin 2FA Slice

Completed after the CSRF protection slice:

- TOTP generation and verification utilities were added using standard 30-second, 6-digit codes.
- User records now support encrypted two-factor shared secrets and enabled timestamps.
- Alembic migration `20260505_0007` adds the two-factor fields to `users`.
- New authenticated API endpoints support 2FA status, setup, confirmation, and disable flows.
- Admin role dependencies can enforce enabled 2FA when `ADMIN_TWO_FACTOR_REQUIRED=true`.
- The member dashboard now has an Account Security panel for starting setup, confirming a code, and disabling 2FA.
- `AuthUser` responses now include `two_factor_enabled`.
- Backend tests cover setup/confirm/disable and policy-gated admin blocking until 2FA is enabled.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 is now roughly 97% complete because TOTP enrollment and config-gated admin enforcement are implemented.
- Phase 3 remains roughly 53% complete.
- Phase 4 remains roughly 18% complete.
- Overall 24-week MVP implementation is roughly 29% complete.

Implemented now:

- Native landing page.
- Monorepo foundation, CI, docs, Docker Compose.
- FastAPI health/status and request middleware.
- Identity auth, refresh sessions, account recovery, email verification, protected platform owner, local test accounts, role-gated admin overview, session management, MVP-local rate limiting, HttpOnly cookie-backed web sessions, CSRF-protected web mutations, and TOTP 2FA enrollment.
- Config-gated admin 2FA enforcement for privileged API routes.
- Protected dashboard/admin route behavior with a Next route-entry proxy and server-side backend API proxy.
- Alumni current-user profile model/API/UI with profile photo upload/display/delete.
- Program affiliation model/API/UI.
- Verification request submission, member status history, admin queue, review actions, alumni-member role grant, and local/S3-ready evidence upload/review.
- Verified member directory search/profile detail with privacy-aware serializers and authenticated profile-photo display.
- Admin audit event API and admin audit log viewer.

Main gaps now:

- 2FA backup codes, forced enrollment grace period, and support recovery workflows are not implemented.
- Real email provider/templates are not wired.
- Production cookie/domain/SameSite review and per-session CSRF rotation policy are still pending.
- Production object storage needs real bucket credentials, bucket policy validation, malware scanning, signed URL policy, image processing, CDN policy, and retention policy.
- Directory search is database-backed MVP search, not Meilisearch/OpenSearch.
- Public profile pages, saved searches, pagination UI, and advanced filters are not implemented.
- Test accounts are local/dev seed data only; there is no production-safe demo identity lifecycle yet.
- Skills are stored as MVP JSON rather than normalized skill tables.
- Redis-backed rate limiting and background jobs are not wired yet.

Next possible implementation slices:

- Directory pagination/advanced filters and profile detail page.
- 2FA backup/recovery codes and forced-enrollment rollout workflow.
- Communities module foundation.
- Real email provider/template integration.
- Redis-backed rate limits and background jobs.
- Production cookie/domain hardening and end-to-end browser tests.

## Current V1.5 Implementation Update: 2026-05-05 CSRF Protection Slice

Completed after the secure web session proxy slice:

- A CSRF endpoint was added at `/api/session/csrf`.
- The web app now issues a same-site `yalumni_csrf_token` cookie for browser mutations.
- Cookie-authenticated session and backend proxy mutations now require a matching `X-CSRF-Token` header.
- The shared web API wrapper automatically attaches CSRF tokens for POST, PATCH, PUT, and DELETE requests.
- JSON requests, form-data uploads, and session revocation all use the same CSRF enforcement path.
- Logout clears access, refresh, and CSRF cookies.
- Anonymous GET access remains unaffected, while anonymous protected routes still redirect to login.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 is now roughly 95% complete because cookie-session transport and CSRF protection are implemented for MVP-local use.
- Phase 3 remains roughly 53% complete.
- Phase 4 remains roughly 18% complete.
- Overall 24-week MVP implementation is roughly 28% complete.

Implemented now:

- Native landing page.
- Monorepo foundation, CI, docs, Docker Compose.
- FastAPI health/status and request middleware.
- Identity auth, refresh sessions, account recovery, email verification, protected platform owner, local test accounts, role-gated admin overview, session management, MVP-local rate limiting, HttpOnly cookie-backed web sessions, and CSRF-protected web mutations.
- Protected dashboard/admin route behavior with a Next route-entry proxy and server-side backend API proxy.
- Alumni current-user profile model/API/UI with profile photo upload/display/delete.
- Program affiliation model/API/UI.
- Verification request submission, member status history, admin queue, review actions, alumni-member role grant, and local/S3-ready evidence upload/review.
- Verified member directory search/profile detail with privacy-aware serializers and authenticated profile-photo display.
- Admin audit event API and admin audit log viewer.

Main gaps now:

- Admin 2FA is still not implemented.
- Real email provider/templates are not wired.
- Production cookie/domain/SameSite review and per-session CSRF rotation policy are still pending.
- Production object storage needs real bucket credentials, bucket policy validation, malware scanning, signed URL policy, image processing, CDN policy, and retention policy.
- Directory search is database-backed MVP search, not Meilisearch/OpenSearch.
- Public profile pages, saved searches, pagination UI, and advanced filters are not implemented.
- Test accounts are local/dev seed data only; there is no production-safe demo identity lifecycle yet.
- Skills are stored as MVP JSON rather than normalized skill tables.
- Redis-backed rate limiting and background jobs are not wired yet.

Next possible implementation slices:

- Admin 2FA policy placeholder and enforcement gate.
- Directory pagination/advanced filters and profile detail page.
- Communities module foundation.
- Real email provider/template integration.
- Redis-backed rate limits and background jobs.
- Production cookie/domain hardening and end-to-end browser tests.

## Current V1.5 Implementation Update: 2026-05-05 Secure Web Session Slice

Completed after the admin audit log, shared upload storage, profile photo, and verification evidence slices:

- Next.js web session endpoints were added for login, register, logout, and refresh.
- The web app now stores access and refresh tokens in HttpOnly cookies instead of browser local storage.
- A protected `/api/backend/*` proxy forwards authenticated web requests to FastAPI with server-side bearer headers.
- The backend proxy supports JSON requests, form-data uploads, binary downloads, and one refresh retry on access-token expiry.
- Dashboard and admin routes are guarded by the Next `proxy.ts` route entry guard before client rendering.
- Client auth forms now remove legacy local-storage token keys and keep only the local development email verification token when present.
- Protected dashboard/admin components keep their current `accessToken` prop compatibility, but the value is now a non-secret cookie-session marker.
- Session revocation clears web cookies when the current session is revoked.
- Login redirects respect a safe relative `next` path from the route guard.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 is now roughly 93% complete because secure web-session transport is implemented for MVP-local use.
- Phase 3 remains roughly 53% complete.
- Phase 4 remains roughly 18% complete.
- Overall 24-week MVP implementation is roughly 27% complete.

Implemented now:

- Native landing page.
- Monorepo foundation, CI, docs, Docker Compose.
- FastAPI health/status and request middleware.
- Identity auth, refresh sessions, account recovery, email verification, protected platform owner, local test accounts, role-gated admin overview, session management, MVP-local rate limiting, and HttpOnly cookie-backed web sessions.
- Protected dashboard/admin route behavior with a Next route-entry proxy and server-side backend API proxy.
- Alumni current-user profile model/API/UI with profile photo upload/display/delete.
- Program affiliation model/API/UI.
- Verification request submission, member status history, admin queue, review actions, alumni-member role grant, and local/S3-ready evidence upload/review.
- Verified member directory search/profile detail with privacy-aware serializers and authenticated profile-photo display.
- Admin audit event API and admin audit log viewer.

Main gaps now:

- Admin 2FA is still not implemented.
- Real email provider/templates are not wired.
- Production object storage needs real bucket credentials, bucket policy validation, malware scanning, signed URL policy, image processing, CDN policy, and retention policy.
- Directory search is database-backed MVP search, not Meilisearch/OpenSearch.
- Public profile pages, saved searches, pagination UI, and advanced filters are not implemented.
- Test accounts are local/dev seed data only; there is no production-safe demo identity lifecycle yet.
- Skills are stored as MVP JSON rather than normalized skill tables.
- Redis-backed rate limiting and background jobs are not wired yet.

Next possible implementation slices:

- CSRF protection for cookie-session state-changing requests.
- Admin 2FA policy placeholder and enforcement gate.
- Directory pagination/advanced filters and profile detail page.
- Communities module foundation.
- Real email provider/template integration.
- Redis-backed rate limits and background jobs.

## Current V1.5 Implementation Update: 2026-05-05 Admin Audit Log Slice

Completed after shared upload storage:

- Added role-gated audit log API at `/api/v1/auth/admin/audit-events`.
- Audit event responses now include event type, actor user ID, actor email/display name, IP address, user agent, metadata, timestamp, total count, limit, and offset.
- Added filtering by partial event type and exact user ID.
- Added pagination controls with configurable limit/offset.
- Admin console now includes a dedicated audit log panel beneath the verification queue.
- Admin audit UI supports event type and user ID filters, clear action, previous/next paging, and compact event detail rows.
- API tests now cover audit endpoint role gating, event-type filtering, user filtering, pagination metadata, and actor enrichment.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 90% complete because admin visibility into auth/session/security events is now implemented.
- Phase 3 remains roughly 52% complete.
- Phase 4 is now roughly 24% complete because admin audit visibility has moved from placeholder to usable tooling.
- Overall 24-week MVP implementation is roughly 27% complete.

Implemented now:

- Native landing page.
- Monorepo foundation, CI, docs, Docker Compose.
- FastAPI health/status and request middleware.
- Identity auth, refresh sessions, account recovery, email verification, protected platform owner, role-gated admin overview, session management, MVP-local rate limiting, and audit log viewer.
- Local-only test-account seeding for role and directory QA.
- Protected dashboard/admin route behavior.
- Alumni current-user profile model/API/UI with profile photo upload/display/delete.
- Shared local/S3 upload storage adapter for profile photos and verification evidence.
- Program affiliation model/API/UI.
- Verification request submission, member status history, admin queue, review actions, alumni-member role grant, and evidence upload/review.
- Verified member directory search/profile detail with privacy-aware serializers and authenticated profile-photo display.

Main gaps now:

- Auth still uses local-storage bearer tokens in the web app; production should move to HttpOnly cookies and SSR/middleware guards.
- Admin 2FA is still not implemented.
- Real email provider/templates are not wired.
- Current audit viewer is based on `security_events`; richer immutable compliance audit tables and export tooling are not implemented.
- S3 adapter exists, but production still needs real bucket credentials, bucket policy validation, malware scanning, image processing, lifecycle/retention policy, and CDN/signed URL decisions.
- Directory search is database-backed MVP search, not Meilisearch/OpenSearch.
- Public profile pages, saved searches, pagination UI, and advanced filters are not implemented.
- Test accounts are local/dev seed data only; there is no production-safe demo identity lifecycle yet.
- Skills are stored as MVP JSON rather than normalized skill tables.
- Redis-backed rate limiting and background jobs are not wired yet.

Next possible implementation slices:

- Secure cookie auth migration and route middleware.
- Admin 2FA policy placeholder and enforcement gate.
- Directory pagination/advanced filters and profile detail page.
- Malware scanning hook for verification evidence.
- Immutable audit export/compliance log model.
- Communities module foundation.

## Current V1.5 Implementation Update: 2026-05-05 Shared Upload Storage Slice

Completed after profile photos:

- Added `app.core.storage`, a shared upload storage adapter used by profile photos and verification evidence.
- Local storage remains the default through `UPLOAD_STORAGE_PROVIDER=LOCAL`.
- Added S3-compatible storage support through `UPLOAD_STORAGE_PROVIDER=S3`, `UPLOAD_STORAGE_PREFIX`, `S3_ENDPOINT_URL`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`, and `S3_REGION`.
- Verification evidence uploads now write through the shared adapter while preserving authenticated member/admin download checks.
- Profile photo uploads now write through the same adapter while preserving authenticated owner/admin/verified-directory download checks.
- Existing local records remain compatible because stored provider values continue to drive download/delete behavior.
- Added storage unit tests for local key behavior, S3 key prefixing, and local put/delete behavior.
- Added `docs/storage.md` to document local and S3-compatible upload configuration.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 89% complete.
- Phase 3 is now roughly 52% complete because the media/evidence pipeline has a production-oriented storage abstraction.
- Phase 4 remains roughly 18% complete.
- Overall 24-week MVP implementation is roughly 26% complete.

Implemented now:

- Native landing page.
- Monorepo foundation, CI, docs, Docker Compose.
- FastAPI health/status and request middleware.
- Identity auth, refresh sessions, account recovery, email verification, protected platform owner, role-gated admin overview, session management, and MVP-local rate limiting.
- Local-only test-account seeding for role and directory QA.
- Protected dashboard/admin route behavior.
- Alumni current-user profile model/API/UI with profile photo upload/display/delete.
- Shared local/S3 upload storage adapter for profile photos and verification evidence.
- Program affiliation model/API/UI.
- Verification request submission, member status history, admin queue, review actions, alumni-member role grant, and evidence upload/review.
- Verified member directory search/profile detail with privacy-aware serializers and authenticated profile-photo display.

Main gaps now:

- Auth still uses local-storage bearer tokens in the web app; production should move to HttpOnly cookies and SSR/middleware guards.
- Admin 2FA is still not implemented.
- Real email provider/templates are not wired.
- S3 adapter exists, but production still needs real bucket credentials, bucket policy validation, malware scanning, image processing, lifecycle/retention policy, and CDN/signed URL decisions.
- Directory search is database-backed MVP search, not Meilisearch/OpenSearch.
- Public profile pages, saved searches, pagination UI, and advanced filters are not implemented.
- Test accounts are local/dev seed data only; there is no production-safe demo identity lifecycle yet.
- Skills are stored as MVP JSON rather than normalized skill tables.
- Dedicated audit log viewer is not implemented; audit data currently lands in `security_events`.
- Redis-backed rate limiting and background jobs are not wired yet.

Next possible implementation slices:

- Dedicated admin audit log viewer.
- Secure cookie auth migration and route middleware.
- Directory pagination/advanced filters and profile detail page.
- Admin 2FA policy placeholder and enforcement gate.
- Malware scanning hook for verification evidence.
- Communities module foundation.

## Current V1.5 Implementation Update: 2026-05-05 Profile Photo Slice

Completed after verification evidence uploads:

- Alumni profile photo metadata columns and Alembic migration `20260505_0006` were added.
- Member profile photo upload API was added at `/api/v1/alumni/me/profile-photo`.
- Member profile photo deletion API was added at `/api/v1/alumni/me/profile-photo`.
- Authenticated profile photo download API was added at `/api/v1/alumni/{user_id}/photo`.
- Upload validation now allows JPEG, PNG, and WebP profile photos with a configurable 2 MB MVP limit.
- Profile photo storage is local-only through `PROFILE_PHOTO_UPLOAD_DIR`; this should later use the same private object-storage adapter planned for verification evidence.
- Current-user profile responses and directory profile responses now expose profile photo metadata/URL when available.
- Dashboard profile panel now supports uploading, viewing, and removing the current member photo.
- Directory cards now show authenticated member photos using bearer-token blob fetching.
- API tests cover upload, invalid content-type rejection, authenticated download, delete, profile serialization, directory serialization, and admin download.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 89% complete.
- Phase 3 is now roughly 49% complete because profile media is implemented alongside profile, verification, and directory basics.
- Phase 4 remains roughly 18% complete.
- Overall 24-week MVP implementation is roughly 25% complete.

Implemented now:

- Native landing page.
- Monorepo foundation, CI, docs, Docker Compose.
- FastAPI health/status and request middleware.
- Identity auth, refresh sessions, account recovery, email verification, protected platform owner, role-gated admin overview, session management, and MVP-local rate limiting.
- Local-only test-account seeding for role and directory QA.
- Protected dashboard/admin route behavior.
- Alumni current-user profile model/API/UI with profile photo upload/display/delete.
- Program affiliation model/API/UI.
- Verification request submission, member status history, admin queue, review actions, alumni-member role grant, and local evidence upload/review.
- Verified member directory search/profile detail with privacy-aware serializers and authenticated profile-photo display.

Main gaps now:

- Auth still uses local-storage bearer tokens in the web app; production should move to HttpOnly cookies and SSR/middleware guards.
- Admin 2FA is still not implemented.
- Real email provider/templates are not wired.
- Upload storage is local-only; production object storage, malware scanning, signed URLs, image processing, CDN policy, and retention policy are still missing.
- Directory search is database-backed MVP search, not Meilisearch/OpenSearch.
- Public profile pages, saved searches, pagination UI, and advanced filters are not implemented.
- Test accounts are local/dev seed data only; there is no production-safe demo identity lifecycle yet.
- Skills are stored as MVP JSON rather than normalized skill tables.
- Dedicated audit log viewer is not implemented; audit data currently lands in `security_events`.
- Redis-backed rate limiting and background jobs are not wired yet.

Next possible implementation slices:

- Private object-storage adapter shared by profile photos and verification evidence.
- Secure cookie auth migration and route middleware.
- Directory pagination/advanced filters and profile detail page.
- Dedicated admin audit log viewer.
- Admin 2FA policy placeholder and enforcement gate.
- Communities module foundation.

## Current V1.5 Implementation Update: 2026-05-05 Verification Evidence Slice

Completed after platform owner and directory search:

- Verification evidence SQLAlchemy model and Alembic migration `20260505_0005` were added.
- Member upload API was added at `/api/v1/alumni/me/verification-requests/{request_id}/evidence`.
- Evidence download API was added at `/api/v1/alumni/verification-requests/{request_id}/evidence/{evidence_id}/download`.
- Upload validation now allows PDF, JPEG, PNG, and WebP evidence files with a configurable 5 MB MVP limit.
- Local storage is configured through `VERIFICATION_UPLOAD_DIR`; this is an abstraction point for future private object storage.
- Verification request responses now include attached evidence metadata.
- Dashboard verification panel now lets members upload and view attached evidence metadata.
- Admin verification queue now displays evidence counts and metadata and can open authenticated evidence files.
- Evidence uploads to `MORE_INFO_REQUESTED` requests now re-queue the request for admin review.
- API tests cover member evidence upload, invalid content-type rejection, member download, admin download, and the more-info requeue loop.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 remains roughly 89% complete.
- Phase 3 is now roughly 44% complete because evidence upload/review has started.
- Phase 4 remains roughly 18% complete.
- Overall 24-week MVP implementation is roughly 24% complete.

Implemented now:

- Native landing page.
- Monorepo foundation, CI, docs, Docker Compose.
- FastAPI health/status and request middleware.
- Identity auth, refresh sessions, account recovery, email verification, protected platform owner, role-gated admin overview, session management, and MVP-local rate limiting.
- Local-only test-account seeding for role and directory QA.
- Protected dashboard/admin route behavior.
- Alumni current-user profile model/API/UI.
- Program affiliation model/API/UI.
- Verification request submission, member status history, admin queue, review actions, alumni-member role grant, and local evidence upload/review.
- Verified member directory search and profile detail with privacy-aware serializers.

Main gaps now:

- Auth still uses local-storage bearer tokens in the web app; production should move to HttpOnly cookies and SSR/middleware guards.
- Admin 2FA is still not implemented.
- Real email provider/templates are not wired.
- Evidence storage is local-only; production object storage, malware scanning, signed URLs, and retention policy are still missing.
- Directory search is database-backed MVP search, not Meilisearch/OpenSearch.
- Public profile pages, saved searches, pagination UI, and advanced filters are not implemented.
- Test accounts are local/dev seed data only; there is no production-safe demo identity lifecycle yet.
- Profile photo upload is not implemented.
- Skills are stored as MVP JSON rather than normalized skill tables.
- Dedicated audit log viewer is not implemented; audit data currently lands in `security_events`.
- Redis-backed rate limiting and background jobs are not wired yet.

Next possible implementation slices:

- Profile photo upload and media pipeline foundation.
- Secure cookie auth migration and route middleware.
- Directory pagination/advanced filters and profile detail page.
- Dedicated admin audit log viewer.
- Production object-storage adapter for verification evidence.
- Admin 2FA policy placeholder and enforcement gate.

## Current V1.5 Implementation Update: 2026-05-04 Platform Owner And Directory Slice

Completed after verification workflow:

- A protected platform owner seed/invariant was added for the configured owner email.
- The canonical owner email is now configurable with optional owner aliases for typo-safe continuity.
- The owner account is restored to active, email-verified, `SUPER_ADMIN`, all admin roles, and `ALUMNI_MEMBER` whenever the seed or auth guards touch the account.
- Owner login can recreate the protected account when it has been deleted while the API still has `PLATFORM_OWNER_PASSWORD` configured.
- The owner password is supplied through `PLATFORM_OWNER_PASSWORD`; it is not committed to the repository or rendered in public UI.
- Local SQLite was seeded with the provided platform owner credentials.
- Local-only development test accounts were added for super admin, verification admin, moderator, verified alumni, and unverified applicant QA.
- A seeded verified alumni profile/program affiliation gives the dashboard directory search a stable local QA result.
- Verified alumni directory search API was added at `/api/v1/alumni/search`.
- Verified alumni profile detail API was added at `/api/v1/alumni/{user_id}`.
- Directory serializers now respect profile visibility settings for email, location, organization, skills, and program affiliations.
- Dashboard now includes a verified alumni directory search panel with query, country, and sector filters.
- API tests cover owner restoration/recreation, local test-account seeding, and directory search/detail after approval.

Current plan position:

- Phase 1 remains functionally complete for local foundation.
- Phase 2 is now roughly 89% complete because the permanent owner seed/restoration guard and local test-account seed are implemented.
- Phase 3 remains roughly 34% complete.
- Phase 4 has started and is roughly 18% complete.
- Overall 24-week MVP implementation is roughly 22% complete.

Implemented now:

- Native landing page.
- Monorepo foundation, CI, docs, Docker Compose.
- FastAPI health/status and request middleware.
- Identity auth, refresh sessions, account recovery, email verification, protected platform owner, role-gated admin overview, session management, and MVP-local rate limiting.
- Local-only test-account seeding for role and directory QA.
- Protected dashboard/admin route behavior.
- Alumni current-user profile model/API/UI.
- Program affiliation model/API/UI.
- Verification request submission, member status history, admin queue, review actions, and alumni-member role grant.
- Verified member directory search and profile detail with privacy-aware serializers.

Main gaps now:

- Auth still uses local-storage bearer tokens in the web app; production should move to HttpOnly cookies and SSR/middleware guards.
- Admin 2FA is still not implemented.
- Real email provider/templates are not wired.
- Verification document upload, object storage, and evidence review attachments are not implemented.
- Directory search is database-backed MVP search, not Meilisearch/OpenSearch.
- Public profile pages, saved searches, pagination UI, and advanced filters are not implemented.
- Test accounts are local/dev seed data only; there is no production-safe demo identity lifecycle yet.
- Profile photo upload is not implemented.
- Skills are stored as MVP JSON rather than normalized skill tables.
- Dedicated audit log viewer is not implemented; audit data currently lands in `security_events`.
- Redis-backed rate limiting and background jobs are not wired yet.

Next possible implementation slices:

- Verification document upload metadata plus object-storage abstraction.
- Profile photo upload and media pipeline foundation.
- Secure cookie auth migration and route middleware.
- Directory pagination/advanced filters and profile detail page.
- Dedicated admin audit log viewer.
- Admin 2FA policy placeholder and enforcement gate.
