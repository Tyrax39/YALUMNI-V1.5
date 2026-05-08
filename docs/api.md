# API Plan

Base path:

```text
/api/v1
```

## Implemented

```text
GET /health
GET /api/v1/system/status
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
GET  /api/v1/auth/sessions
DELETE /api/v1/auth/sessions/{session_id}
POST /api/v1/auth/password/forgot
POST /api/v1/auth/password/reset
POST /api/v1/auth/email/verify
POST /api/v1/auth/dev/bootstrap-admin
GET  /api/v1/auth/admin/overview
GET  /api/v1/auth/admin/audit-events
GET  /api/v1/auth/me/security
POST /api/v1/auth/me/2fa/setup
POST /api/v1/auth/me/2fa/confirm
POST /api/v1/auth/me/2fa/disable
GET  /api/v1/alumni/me/profile
PATCH /api/v1/alumni/me/profile
POST /api/v1/alumni/me/profile-photo
DELETE /api/v1/alumni/me/profile-photo
POST /api/v1/alumni/me/program-affiliations
DELETE /api/v1/alumni/me/program-affiliations/{affiliation_id}
GET  /api/v1/alumni/me/verification-requests
POST /api/v1/alumni/me/verification-requests
POST /api/v1/alumni/me/verification-requests/{request_id}/evidence
GET  /api/v1/alumni/verification-requests/{request_id}/evidence/{evidence_id}/download
GET  /api/v1/alumni/admin/verification-requests
POST /api/v1/alumni/admin/verification-requests/{request_id}/approve
POST /api/v1/alumni/admin/verification-requests/{request_id}/reject
POST /api/v1/alumni/admin/verification-requests/{request_id}/request-info
GET  /api/v1/alumni/search
GET  /api/v1/alumni/{user_id}/photo
GET  /api/v1/alumni/{user_id}
GET  /api/v1/communities
POST /api/v1/communities
GET  /api/v1/communities/{community_id}
PATCH /api/v1/communities/{community_id}
GET  /api/v1/communities/{community_id}/members
POST /api/v1/communities/{community_id}/members/{membership_id}/approve
POST /api/v1/communities/{community_id}/members/{membership_id}/reject
PATCH /api/v1/communities/{community_id}/members/{membership_id}
POST /api/v1/communities/{community_id}/members/{membership_id}/remove
GET  /api/v1/communities/{community_id}/invitations
POST /api/v1/communities/{community_id}/invitations
POST /api/v1/communities/{community_id}/invitations/{invitation_id}/cancel
POST /api/v1/communities/invitations/accept
POST /api/v1/communities/{community_id}/join
POST /api/v1/communities/{community_id}/leave
POST /api/v1/communities/{community_id}/ownership-transfer
GET  /api/v1/communities/{community_id}/posts
POST /api/v1/communities/{community_id}/posts
POST /api/v1/communities/{community_id}/posts/{post_id}/remove
POST /api/v1/communities/{community_id}/posts/{post_id}/restore
POST /api/v1/communities/{community_id}/posts/{post_id}/media
GET  /api/v1/communities/{community_id}/posts/{post_id}/media/{media_id}/download
POST /api/v1/communities/{community_id}/posts/{post_id}/media/{media_id}/remove
POST /api/v1/communities/{community_id}/posts/{post_id}/media/{media_id}/restore
GET  /api/v1/communities/{community_id}/posts/{post_id}/comments
POST /api/v1/communities/{community_id}/posts/{post_id}/comments
POST /api/v1/communities/{community_id}/posts/{post_id}/comments/{comment_id}/remove
POST /api/v1/communities/{community_id}/posts/{post_id}/comments/{comment_id}/restore
POST /api/v1/communities/{community_id}/posts/{post_id}/reaction
POST /api/v1/communities/{community_id}/posts/{post_id}/reports
GET  /api/v1/communities/{community_id}/posts/{post_id}/reports
POST /api/v1/communities/{community_id}/posts/{post_id}/reports/{report_id}/resolve
PATCH /api/v1/communities/{community_id}/posts/{post_id}/reports/{report_id}/review
PATCH /api/v1/communities/{community_id}/posts/{post_id}/moderation-review
PATCH /api/v1/communities/{community_id}/posts/{post_id}/comments/{comment_id}/moderation-review
GET  /api/v1/communities/{community_id}/post-reports
GET  /api/v1/communities/{community_id}/removed-posts
GET  /api/v1/communities/{community_id}/removed-comments
GET  /api/v1/communities/admin/moderation/post-reports
GET  /api/v1/communities/admin/moderation/removed-posts
GET  /api/v1/communities/admin/moderation/removed-comments
GET  /api/v1/notifications
GET  /api/v1/notifications/stream
GET  /api/v1/notifications/preferences
PATCH /api/v1/notifications/preferences
POST /api/v1/notifications/admin/email-digests/run
POST /api/v1/notifications/{notification_id}/read
POST /api/v1/notifications/read-all
GET  /api/v1/messages/conversations
POST /api/v1/messages/conversations
GET  /api/v1/messages/conversations/{conversation_id}
GET  /api/v1/messages/conversations/{conversation_id}/messages
POST /api/v1/messages/conversations/{conversation_id}/messages
POST /api/v1/messages/conversations/{conversation_id}/read
GET  /api/v1/messages/blocks
POST /api/v1/messages/blocks
DELETE /api/v1/messages/blocks/{blocked_user_id}
```

Evidence uploads accept PDF, JPEG, PNG, and WebP files. Uploading evidence to a
`MORE_INFO_REQUESTED` verification request returns it to `PENDING_REVIEW` so
admins can continue the review loop.

Profile photo uploads accept JPEG, PNG, and WebP files with authenticated
download through the profile photo endpoint.

Email delivery support:

- `EMAIL_PROVIDER=console` queues verification, password reset, and invitation
  messages in the local console/outbox path used by tests.
- `EMAIL_PROVIDER=smtp` sends the same messages through `SMTP_HOST`,
  `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_USE_TLS`.
- `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME`, and `WEB_BASE_URL` control sender
  identity and generated account/invitation links.
- The same delivery abstraction now supports admin-run notification digest
  emails for users with `DAILY` or `WEEKLY` digest preferences.
- Notification digests can also be processed by the background worker entrypoint
  `python -m app.workers.notification_digests` from `apps/api`, or with
  `npm run worker:api:notification-digests -- --once` from the monorepo root.
- Local/dev auth and invitation responses still include one-time `dev_*` tokens
  for QA. Production responses suppress those tokens and rely on email links.

Directory search supports:

- `q`
- `country`
- `city`
- `sector`
- `program_name`
- `cohort_year`
- `skill`
- `limit`
- `offset`
- `sort=name|recent|country|sector`

Community listing supports:

- `q`
- `community_type`
- `country`
- `sector`
- `membership=all|mine|not_joined`
- `limit`
- `offset`

Community member rosters support:

- `status=ACTIVE|PENDING|LEFT|REJECTED|ALL`
- `limit`
- `offset`

Active rosters are visible to signed-in members. Pending, left, and all-status
rosters are restricted to admins, community owners, and active community
managers. Pending membership approval/rejection is restricted to the same
manager set.

Community member management supports:

- `PATCH /api/v1/communities/{community_id}/members/{membership_id}` with
  `role=MEMBER|MANAGER` for active non-owner memberships.
- `POST /api/v1/communities/{community_id}/members/{membership_id}/remove` for
  active non-owner memberships.

Admins and community owners can manage non-owner members and managers. Active
community managers can manage ordinary members only. Community owners cannot be
demoted or removed through these endpoints; ownership transfer remains a
separate workflow.

Community settings management supports:

- `PATCH /api/v1/communities/{community_id}` for owner/admin updates to name,
  type, description, location/focus metadata, visibility, and join policy.
- Community slugs remain stable after rename so existing links do not break.
- Active community managers can review/member-manage, but cannot edit
  community settings.

Community invitations support:

- `GET /api/v1/communities/{community_id}/invitations` with
  `status=PENDING|ACCEPTED|CANCELED|EXPIRED|ALL`.
- `POST /api/v1/communities/{community_id}/invitations` for manager/owner/admin
  invitation creation. Managers can invite ordinary members. Owners/admins can
  invite members or managers.
- `POST /api/v1/communities/{community_id}/invitations/{invitation_id}/cancel`
  for canceling pending invitations.
- `POST /api/v1/communities/invitations/accept` for token-based invitation
  acceptance by the invited account email.
- Invitation creation now sends an email link to every invited address. Existing
  platform users also receive in-app notifications when their preferences allow
  the event.

Local/dev invitation creation responses include `dev_invitation_token` for QA.
List responses do not repeat invitation tokens.

Community ownership transfer support:

- `POST /api/v1/communities/{community_id}/ownership-transfer` with
  `new_owner_membership_id`.
- Only platform admins and the current active community owner can transfer
  ownership.
- The target membership must be active and non-owner.
- Previous active owners are retained as managers so the community keeps a
  management chain after succession.

Private community posts support:

- `GET /api/v1/communities/{community_id}/posts` with
  `status=ACTIVE|REMOVED|ALL`.
- `POST /api/v1/communities/{community_id}/posts` for active community members
  and platform admins.
- `POST /api/v1/communities/{community_id}/posts/{post_id}/remove` for post
  authors, active community managers/owners, and platform admins.
- `POST /api/v1/communities/{community_id}/posts/{post_id}/restore` for
  manager/owner/admin restoration of removed posts.
- Non-members and pending members cannot read or create community posts.
- Removed posts are hidden from ordinary members; managers/owners/admins can
  query removed or all posts for moderation review.
- Post list responses include active `comment_count`, `reaction_count`,
  current-user `viewer_reacted`, manager-only `open_report_count`, and active
  media attachment metadata. Managers/owners/admins can also see removed media
  metadata for moderation.
- `POST /api/v1/communities/{community_id}/posts/{post_id}/media` attaches
  JPEG, PNG, WebP, or PDF files to active posts by the post author or a
  manager/owner/admin. Posts are limited to four active attachments by default.
- Media downloads are authenticated through
  `GET /api/v1/communities/{community_id}/posts/{post_id}/media/{media_id}/download`.
  Removed media is hidden from ordinary members and remains visible to
  managers/owners/admins for review.
- Media removal is available to the uploader, post author, managers, owners,
  and admins. Media restore is restricted to managers, owners, and admins.
- `GET /api/v1/communities/{community_id}/posts/{post_id}/comments` lists
  active comments for members. Removed/all comment review is restricted to
  managers, owners, and admins.
- `POST /api/v1/communities/{community_id}/posts/{post_id}/comments` creates
  member comments, and
  `POST /api/v1/communities/{community_id}/posts/{post_id}/comments/{comment_id}/remove`
  lets comment authors or moderators remove them.
- `POST /api/v1/communities/{community_id}/posts/{post_id}/comments/{comment_id}/restore`
  lets managers/owners/admins restore removed comments.
- `POST /api/v1/communities/{community_id}/posts/{post_id}/reaction` toggles a
  current-user `LIKE` reaction and returns the updated reaction count.
- `POST /api/v1/communities/{community_id}/posts/{post_id}/reports` creates
  one open report per reporter/post. Report listing and resolving are
  restricted to community managers/owners and platform admins.
- `GET /api/v1/communities/{community_id}/post-reports` gives the same
  manager set a paginated community-level report queue with post context.
  It supports `status=OPEN|RESOLVED|ALL`, `severity`, `escalation_status`,
  `limit`, and `offset`.
- `GET /api/v1/communities/{community_id}/removed-posts` and
  `GET /api/v1/communities/{community_id}/removed-comments` give managers,
  owners, and admins paginated removed-content queues with remover and parent
  post context. They support `severity`, `escalation_status`, `limit`, and
  `offset`.
- `PATCH /api/v1/communities/{community_id}/posts/{post_id}/reports/{report_id}/review`,
  `PATCH /api/v1/communities/{community_id}/posts/{post_id}/moderation-review`,
  and
  `PATCH /api/v1/communities/{community_id}/posts/{post_id}/comments/{comment_id}/moderation-review`
  let managers, owners, and admins save internal moderation notes, assign
  `LOW|MEDIUM|HIGH|CRITICAL` severity, and mark review escalation as
  `NONE|ESCALATED`.
- `GET /api/v1/communities/admin/moderation/post-reports`,
  `GET /api/v1/communities/admin/moderation/removed-posts`, and
  `GET /api/v1/communities/admin/moderation/removed-comments` give platform
  admins cross-community moderation queues with community context. All three
  support `community_id`, `q`, `severity`, `escalation_status`, `limit`, and
  `offset`; reported posts also support `status=OPEN|RESOLVED|ALL` and
  `reason`.

Notification center support:

- `GET /api/v1/notifications` returns the current user's paginated
  notifications with `status=UNREAD|READ|ALL`, `limit`, `offset`, total, and
  unread count.
- `GET /api/v1/notifications/stream` returns authenticated server-sent event
  snapshots with the current unread count and latest notification metadata. The
  MVP stream uses a configurable polling interval through
  `NOTIFICATION_STREAM_POLL_SECONDS`; Redis/WebSocket fanout remains a later
  production hardening step.
- `GET /api/v1/notifications/preferences` returns the current user's in-app
  notification preference record. A default record is created on first access.
- `PATCH /api/v1/notifications/preferences` updates the in-app master toggle,
  email digest frequency (`NONE|DAILY|WEEKLY`), and muted notification event
  types. Muted in-app event types are suppressed by `notify_users` before
  notifications are written.
- `POST /api/v1/notifications/admin/email-digests/run` lets admin roles run
  a dry-run or delivery pass for daily/weekly email digests. Delivered
  notifications are stamped with `email_digest_sent_at` so later runs do not
  resend them.
- The notification digest worker processes `DAILY` and `WEEKLY` frequencies on
  cadence, records `notifications.email_digest_worker.*` events in
  `security_events`, supports `--dry-run`, `--force`, `--once`,
  `--interval-seconds`, `--limit`, and `--max-items-per-email`, and does not let
  dry runs advance delivery cadence.
- `POST /api/v1/notifications/{notification_id}/read` marks a single current
  user notification as read. Other users' notification IDs return 404.
- `POST /api/v1/notifications/read-all` marks all current-user unread
  notifications as read.
- Community hooks currently create notifications for join requests, membership
  approval/rejection, role changes, ownership transfers, invitations for
  existing users, invitation cancellation/acceptance, post/comment removal and
  restoration, new comments on owned posts, report resolution, new post reports,
  moderation escalations, and received direct messages.
- Email delivery is currently direct console/SMTP sending for auth,
  invitation, admin-run digest emails, and worker-run digest emails.
  Queue/retry behavior, distributed worker locking, bounce tracking, and
  delivery audit exports remain future production work.

Direct messaging support:

- `GET /api/v1/messages/conversations` returns the current user's direct
  conversations with participants, last message, unread count, pagination, and
  total.
- `POST /api/v1/messages/conversations` creates or reuses a direct conversation
  with another active user and can optionally send an initial message.
- `GET /api/v1/messages/conversations/{conversation_id}` returns one
  conversation only if the current user is a participant.
- `GET /api/v1/messages/conversations/{conversation_id}/messages` returns the
  conversation message history for participants only.
- `POST /api/v1/messages/conversations/{conversation_id}/messages` sends a
  direct message, updates `last_message_at`, stamps the sender's read marker,
  and creates received-message notifications for the other participant.
- `POST /api/v1/messages/conversations/{conversation_id}/read` updates the
  current participant's `last_read_at` marker.
- `GET /api/v1/messages/blocks`, `POST /api/v1/messages/blocks`, and
  `DELETE /api/v1/messages/blocks/{blocked_user_id}` manage current-user
  contact blocks. Blocks prevent new conversations and sends in either
  direction.

## Phase 3: Alumni

```text
GET    /api/v1/alumni
PATCH  /api/v1/alumni/me/visibility
```

## Phase 4: Communities

```text
POST   /api/v1/communities/{community_id}/ownership-transfer  # implemented
```

## Phase 5: Feed

```text
GET    /api/v1/communities/{community_id}/posts                 # implemented
POST   /api/v1/communities/{community_id}/posts                 # implemented
POST   /api/v1/communities/{community_id}/posts/{post_id}/remove # implemented
POST   /api/v1/communities/{community_id}/posts/{post_id}/restore # implemented
POST   /api/v1/communities/{community_id}/posts/{post_id}/media # implemented
GET    /api/v1/communities/{community_id}/posts/{post_id}/media/{media_id}/download # implemented
POST   /api/v1/communities/{community_id}/posts/{post_id}/media/{media_id}/remove # implemented
POST   /api/v1/communities/{community_id}/posts/{post_id}/media/{media_id}/restore # implemented
GET    /api/v1/communities/{community_id}/posts/{post_id}/comments # implemented
POST   /api/v1/communities/{community_id}/posts/{post_id}/comments # implemented
POST   /api/v1/communities/{community_id}/posts/{post_id}/comments/{comment_id}/remove # implemented
POST   /api/v1/communities/{community_id}/posts/{post_id}/comments/{comment_id}/restore # implemented
POST   /api/v1/communities/{community_id}/posts/{post_id}/reaction # implemented
POST   /api/v1/communities/{community_id}/posts/{post_id}/reports # implemented
GET    /api/v1/communities/{community_id}/posts/{post_id}/reports # implemented
POST   /api/v1/communities/{community_id}/posts/{post_id}/reports/{report_id}/resolve # implemented
PATCH  /api/v1/communities/{community_id}/posts/{post_id}/reports/{report_id}/review # implemented
PATCH  /api/v1/communities/{community_id}/posts/{post_id}/moderation-review # implemented
PATCH  /api/v1/communities/{community_id}/posts/{post_id}/comments/{comment_id}/moderation-review # implemented
GET    /api/v1/communities/{community_id}/post-reports # implemented
GET    /api/v1/communities/{community_id}/removed-posts # implemented
GET    /api/v1/communities/{community_id}/removed-comments # implemented
GET    /api/v1/communities/admin/moderation/post-reports # implemented
GET    /api/v1/communities/admin/moderation/removed-posts # implemented
GET    /api/v1/communities/admin/moderation/removed-comments # implemented
GET    /api/v1/feed
POST   /api/v1/posts
GET    /api/v1/posts/{post_id}
PATCH  /api/v1/posts/{post_id}
DELETE /api/v1/posts/{post_id}
POST   /api/v1/posts/{post_id}/comments                         # global feed planned
POST   /api/v1/posts/{post_id}/reactions                        # global feed planned
POST   /api/v1/posts/{post_id}/reports                          # global feed planned
```

## Phase 6: Messaging

```text
GET    /api/v1/messages/conversations                       # implemented
POST   /api/v1/messages/conversations                       # implemented
GET    /api/v1/messages/conversations/{conversation_id}      # implemented
GET    /api/v1/messages/conversations/{conversation_id}/messages # implemented
POST   /api/v1/messages/conversations/{conversation_id}/messages # implemented
POST   /api/v1/messages/conversations/{conversation_id}/read # implemented
GET    /api/v1/messages/blocks                              # implemented
POST   /api/v1/messages/blocks                              # implemented
DELETE /api/v1/messages/blocks/{blocked_user_id}            # implemented
```

## Phase 6b: Notifications

```text
GET    /api/v1/notifications                         # implemented
GET    /api/v1/notifications/stream                  # implemented
GET    /api/v1/notifications/preferences             # implemented
PATCH  /api/v1/notifications/preferences             # implemented
POST   /api/v1/notifications/admin/email-digests/run # implemented
POST   /api/v1/notifications/{notification_id}/read   # implemented
POST   /api/v1/notifications/read-all                 # implemented
```

## Phase 7: Events

```text
GET    /api/v1/events
POST   /api/v1/events
GET    /api/v1/events/{event_id}
PATCH  /api/v1/events/{event_id}
POST   /api/v1/events/{event_id}/publish
POST   /api/v1/events/{event_id}/register
GET    /api/v1/events/{event_id}/registrations
```

## Admin

Started through role-protected auth admin overview, verification queue, and audit-event endpoints.
Planned dedicated admin module:

```text
GET  /api/v1/admin/users
GET  /api/v1/admin/reports
POST /api/v1/admin/reports/{report_id}/resolve
```

## API Standards

- JSON request and response bodies.
- UUID public IDs.
- Cursor pagination for feeds, messages, and activity.
- Explicit permission dependencies for protected routes.
- Structured errors with request IDs.
- No hidden profile fields in API responses.
