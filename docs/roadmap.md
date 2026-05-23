# Implementation Roadmap

## Phase 1: Foundation

Status: implemented foundation, CI passing.

- Monorepo.
- FastAPI health/status.
- Next.js public/member/admin shell.
- Docker Compose.
- CI.
- Docs.

## Phase 2: Identity

Status: mostly implemented for MVP-local identity, with production hardening still open.

- User/session models. Implemented.
- Protected platform owner seed and role restoration. Implemented.
- Local-only development test-account seeds. Implemented.
- JWT access and refresh tokens. Implemented.
- Register/login/logout. Implemented.
- Email verification. Implemented API, local web flow, and console/SMTP delivery foundation.
- Password reset. Implemented API, local web flow, and console/SMTP delivery foundation.
- Role baseline. Started with global `UNVERIFIED_USER` plus local `SUPER_ADMIN` bootstrap.
- Protected web route behavior. Implemented with HttpOnly cookie-backed web sessions, Next proxy guards, and a backend API proxy.
- Role-aware admin overview. Implemented API guard and web console summary.
- Session/device management. Implemented API and dashboard UI for refresh-token sessions.
- Login/reset/admin action rate limiting. Implemented in-process API guard for MVP hardening.
- Secure cookie auth hardening. Implemented for the web app foundation with CSRF protection; remaining hardening includes SSR role checks and production cookie/domain review.
- Admin 2FA requirement. Implemented as TOTP enrollment plus config-gated admin enforcement; backup codes and rollout policy remain.

## Phase 3: Alumni Profiles And Verification

- Profile model. Implemented.
- Profile photo upload/display. Implemented with shared local/S3 authenticated upload storage.
- Program affiliation model. Implemented.
- Current-user profile edit API. Implemented.
- Dashboard profile completion UI. Implemented.
- Visibility settings. Started as profile-level JSON settings.
- Verification request model and current-user submission. Implemented.
- Admin verification queue and approve/reject/request-info actions. Implemented.
- Audit events. Implemented through `security_events` with an admin audit log viewer.
- Verification documents and uploads. Started with shared local/S3 evidence storage and authenticated admin/member downloads.
- Dedicated audit log viewer. Implemented for current security events.

## Phase 4: Directory And Search

- Alumni listing. Implemented for verified members.
- Search and filters. Implemented for query, country, city, sector, program, cohort year, and skill.
- Pagination metadata and previous/next dashboard controls. Implemented.
- Sort controls. Implemented for name, recently verified, country, and sector.
- Profile detail API and protected web detail page. Implemented for verified member profiles.
- Privacy-aware serializers. Started using profile visibility settings.
- Dashboard directory search UI. Implemented.
- MWF Alumni hybrid cache. Implemented as member-only directory tab backed by public Mandela Washington Fellowship alumni records, local cache tables, cache status metadata, scheduled worker CLI, sync history, and super-admin refresh controls.
- Saved searches, facets, recommendations, profile-to-profile contact, and dedicated search indexing later.

## Phase 5: Communities

- Community model. Implemented.
- Membership and join requests. Implemented for open joins, request-only pending status, and member leave.
- Dashboard community discovery panel. Implemented with filters, pagination, join/leave, and admin create.
- Community detail pages and active rosters. Implemented.
- Membership request review. Implemented for admins, community owners, and active community managers.
- Chapter admin roles. Started with active `MANAGER` memberships.
- Member management. Started with manager promotion/demotion and active non-owner member removal.
- Community settings editing. Implemented for admins and community owners.
- Invitations. Implemented for manager/owner/admin creation, email delivery, cancellation, and token acceptance.
- Ownership transfer. Implemented for owner/admin succession to active non-owner members.
- Private content gates. Implemented for active-member community posts, comments,
  likes, post reports, moderation removal/resolution, and removed-content restoration.

## Phase 6: Feed And Moderation

- Community-scoped posts. Implemented for active community members with gated reads/creates.
- Media attachments. Implemented for community posts with authenticated local/S3 storage, type and size validation, active attachment limits, secure downloads, and remove/restore moderation.
- Community comments. Implemented for active members with author/moderator removal.
- Reactions. Implemented as a current-user `LIKE` toggle with feed counts.
- Reports. Implemented as one open report per reporter/post with moderator review and resolution APIs.
- Community moderation queue. Implemented as a manager/owner/admin open-report review surface on community detail pages.
- Removed-content queues. Implemented for manager/owner/admin review and restoration of removed posts/comments inside communities.
- Moderator actions. Started with manager/owner/admin post/comment removal, report resolution, and restoration inside communities.
- Cross-community admin moderation queue. Implemented in the admin console with platform-wide report, removed-post, and removed-comment queues plus filters and action buttons.
- Moderation review metadata. Implemented for reports, removed posts, and removed comments with internal notes, severity, escalation state, API filters, and admin-console save controls.

## Phase 7: Messaging And Notifications

- Notification center. Started with persisted current-user notifications,
  unread/read APIs, dashboard inbox, and community workflow hooks for
  moderation escalations, reports, membership actions, invitations, and content
  removal/restoration.
- Realtime notification delivery. Started with an authenticated SSE stream for
  unread-count/latest-notification snapshots and dashboard live refresh.
- Notification preferences. Started with current-user in-app master toggle,
  muted event types, and digest-frequency preference records.
- Email delivery foundation. Started with console/SMTP delivery for account
  verification, password reset, and community invitations.
- Email digest worker foundation. Implemented for admin-run dry-run/delivery
  endpoint, digest sent tracking, admin console controls, console/SMTP
  notification summary emails, and a standalone CLI worker with daily/weekly
  cadence, dry-run, force, loop, and audit-event recording.
- Direct conversations. Implemented for one-to-one conversations, participant
  guards, conversation reuse, dashboard search/start UI, and current-user
  conversation lists.
- Message list/send. Implemented for participant-only history, sends, unread
  counts, dashboard reply UI, and received-message notifications.
- Direct message trust and moderation. Implemented participant reporting,
  admin report queues, internal review notes, severity/escalation metadata,
  removed-message redaction, restore actions, and admin console controls.
- WebSocket events.
- Blocks and read receipts. Started with user block/unblock APIs, dashboard
  block controls, block enforcement, and conversation-level `last_read_at`
  markers. Per-message receipts remain open.
- Redis/WebSocket fanout, production worker supervision, queued delivery, push,
  message attachments, reactions, typing/presence, message search, per-message
  read receipts, group conversations, retention/export tooling, retries,
  bounces, unsubscribe/compliance controls, distributed worker locking, and
  delivery audit exports remain open.

## Phase 8: Events

- Events. Started with member list/create/detail APIs and UI.
- RSVPs and registrations. Started with member RSVP and attendee list APIs/UI.
- Agenda/session planning. Started with agenda item persistence and attendee-facing agenda route.
- Tickets.
- Organizer view.
- Check-in later.

## Post-MVP

- Initiatives. Started with member proposal/list/detail APIs, milestone persistence, and member UI.
- Opportunities.
- Mentorship. Started with mentor profiles/settings, mentor discovery, request creation, incoming/outgoing request management, and accept/decline/cancel workflow.
- Contributions and ledger. Started with finance-admin campaign draft/approval/publish/close,
  local payment intent creation/confirmation, member contribution recording, receipt
  issuance, treasury summary, and ledger credit entries. Added member receipt
  text/PDF downloads, print actions, finance contribution CSV exports, treasury
  ledger CSV exports, signed treasury audit JSON packages, certified treasury
  audit PDF reports, stored treasury certification snapshots, and local
  finance-admin refund/void adjustment controls with ledger reversals/markers.
  Added finance-admin disbursement request records with received-funds
  availability checks and request/approve/reject/mark-paid status transitions.
  Added finance-admin expense reports tied to paid disbursements, with structured
  receipt/evidence rows and submit/approve/reject status transitions.
  Expense reports now carry normalized categories and finance-admin reporting
  filters for category, expense date range, and vendor/summary/description text.
  Treasury reporting now includes expense-category rollups, expense-category
  CSV export, and expense-category columns on ledger/audit rows.
  Finance-admin category policy visibility now exposes the configured taxonomy,
  optional category/currency budgets, current usage, remaining budget, and the
  active open or managed-only category enforcement mode.
  Expense report approvals now write contribution-ledger expense entries without
  requiring a donor contribution row, and rejected approved reports write
  reversal entries.
  Expense report evidence now supports private finance-admin file upload and
  download through the shared upload storage adapter, with finance-admin policy
  visibility, configurable retention days, blocked signature checks, and an
  optional fail-closed HTTP malware scanner adapter before storage.
  Finance-admin retention preview and cleanup can remove stored
  evidence files after the configured retention period while preserving audit
  metadata, and the same cleanup can now run through a backend worker CLI with
  dry-run, limit, and loop controls.
  Treasury summaries, audit packages, certified snapshots, and CSV exports now
  include per-currency accounting summaries without converting currencies.
  Signed provider webhook reconciliation now
  confirms eligible payment intents idempotently and marks failed/canceled
  provider events. Webhook diagnostics now persist provider event deliveries,
  processing status, and replay counts. Local provider-refund fallback now
  records a finance-admin refund reversal when a confirmed contribution has a
  payment reference, with unsupported refund providers failing closed.
  Provider-neutral checkout attempt records now capture the local payment-intent
  client secret and status transitions. Failed or canceled local payment intents
  can now create a retry checkout attempt. Checkout creation now goes through a
  provider adapter boundary with `LOCAL_TEST` implemented, and finance admins
  can inspect checkout attempt lifecycle diagnostics without exposing stored
  client secrets; real provider checkout sessions, provider-specific adapters,
  provider-side refund API calls, and production-grade multi-attempt retry
  orchestration remain.
- Elections. Started with draft setup, candidate creation, voter-roll
  management, open/close lifecycle, one-vote-per-user ballot casting, result
  counts, quorum reporting, and admin audit/privacy summaries.
- Chapter analytics.
- Impact reporting.
