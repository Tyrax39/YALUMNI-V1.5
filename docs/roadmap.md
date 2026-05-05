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
- Email verification. Implemented API and local web flow.
- Password reset. Implemented API and local web flow.
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
- Saved searches, facets, recommendations, profile-to-profile contact, and dedicated search indexing later.

## Phase 5: Communities

- Community model. Implemented.
- Membership and join requests. Started with open joins, request-only pending status, and member leave.
- Dashboard community discovery panel. Implemented with filters, pagination, join/leave, and admin create.
- Community detail pages and active rosters. Implemented.
- Membership request review. Implemented for admins and community owners.
- Chapter admin roles. Planned.
- Member management, invitations, and ownership transfer. Planned.
- Private content gates. Planned.

## Phase 6: Feed And Moderation

- Posts, comments, reactions.
- Reports.
- Moderator actions.
- Admin moderation queue.

## Phase 7: Messaging And Notifications

- Direct conversations.
- Message list/send.
- WebSocket events.
- Blocks and read receipts.
- Notification center.

## Phase 8: Events

- Events.
- RSVPs and registrations.
- Tickets.
- Organizer view.
- Check-in later.

## Post-MVP

- Initiatives.
- Opportunities.
- Mentorship.
- Contributions and ledger.
- Elections and audit reports.
- Chapter analytics.
- Impact reporting.
