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
GET  /api/v1/communities/{community_id}/members
POST /api/v1/communities/{community_id}/members/{membership_id}/approve
POST /api/v1/communities/{community_id}/members/{membership_id}/reject
PATCH /api/v1/communities/{community_id}/members/{membership_id}
POST /api/v1/communities/{community_id}/members/{membership_id}/remove
POST /api/v1/communities/{community_id}/join
POST /api/v1/communities/{community_id}/leave
```

Evidence uploads accept PDF, JPEG, PNG, and WebP files. Uploading evidence to a
`MORE_INFO_REQUESTED` verification request returns it to `PENDING_REVIEW` so
admins can continue the review loop.

Profile photo uploads accept JPEG, PNG, and WebP files with authenticated
download through the profile photo endpoint.

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
separate planned workflow.

## Phase 3: Alumni

```text
GET    /api/v1/alumni
PATCH  /api/v1/alumni/me/visibility
```

## Phase 4: Communities

```text
PATCH  /api/v1/communities/{community_id}
POST   /api/v1/communities/{community_id}/invitations
POST   /api/v1/communities/{community_id}/ownership-transfer
```

## Phase 5: Feed

```text
GET    /api/v1/feed
POST   /api/v1/posts
GET    /api/v1/posts/{post_id}
PATCH  /api/v1/posts/{post_id}
DELETE /api/v1/posts/{post_id}
POST   /api/v1/posts/{post_id}/comments
POST   /api/v1/posts/{post_id}/reactions
POST   /api/v1/posts/{post_id}/reports
```

## Phase 6: Messaging

```text
GET    /api/v1/conversations
POST   /api/v1/conversations
GET    /api/v1/conversations/{conversation_id}
GET    /api/v1/conversations/{conversation_id}/messages
POST   /api/v1/conversations/{conversation_id}/messages
POST   /api/v1/conversations/{conversation_id}/read
POST   /api/v1/users/{user_id}/block
DELETE /api/v1/users/{user_id}/block
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
