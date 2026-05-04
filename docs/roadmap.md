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

Status: started.

- User/session models. Implemented.
- JWT access and refresh tokens. Implemented.
- Register/login/logout. Implemented.
- Email verification. Implemented API and local web flow.
- Password reset. Implemented API and local web flow.
- Role baseline. Started with global `UNVERIFIED_USER` plus local `SUPER_ADMIN` bootstrap.
- Protected web route behavior. Implemented client-side dashboard/admin guards for current token storage.
- Role-aware admin overview. Implemented API guard and web console summary.
- Session/device management. Implemented API and dashboard UI for refresh-token sessions.
- Secure cookie auth hardening.
- Admin 2FA requirement.

## Phase 3: Alumni Profiles And Verification

- Profile model.
- Program affiliation model.
- Visibility settings.
- Verification requests and documents.
- Admin verification queue.
- Audit logs.

## Phase 4: Directory And Search

- Alumni listing.
- Search and filters.
- Profile detail.
- Privacy-aware serializers.
- Saved searches later.

## Phase 5: Communities

- Community model.
- Membership and join requests.
- Chapter admin roles.
- Community detail pages.
- Private content gates.

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
