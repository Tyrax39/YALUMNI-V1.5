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
POST /api/v1/auth/password/forgot
POST /api/v1/auth/password/reset
POST /api/v1/auth/email/verify
POST /api/v1/auth/dev/bootstrap-admin
GET  /api/v1/auth/admin/overview
```

## Phase 2: Auth

Remaining auth endpoints:

```text
POST /api/v1/auth/2fa/setup
POST /api/v1/auth/2fa/verify
GET  /api/v1/auth/sessions
DELETE /api/v1/auth/sessions/{session_id}
```

## Phase 3: Alumni

```text
GET    /api/v1/alumni
GET    /api/v1/alumni/search
GET    /api/v1/alumni/{user_id}
GET    /api/v1/alumni/me/profile
PATCH  /api/v1/alumni/me/profile
PATCH  /api/v1/alumni/me/visibility
POST   /api/v1/alumni/me/program-affiliations
POST   /api/v1/alumni/me/verification-requests
GET    /api/v1/alumni/me/verification-requests
```

## Phase 4: Communities

```text
GET    /api/v1/communities
POST   /api/v1/communities
GET    /api/v1/communities/{community_id}
PATCH  /api/v1/communities/{community_id}
POST   /api/v1/communities/{community_id}/join
POST   /api/v1/communities/{community_id}/leave
GET    /api/v1/communities/{community_id}/members
PATCH  /api/v1/communities/{community_id}/members/{user_id}
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

Started through the role-protected auth admin overview endpoint. Planned dedicated admin module:

```text
GET  /api/v1/admin/users
GET  /api/v1/admin/verification-requests
POST /api/v1/admin/verification-requests/{request_id}/approve
POST /api/v1/admin/verification-requests/{request_id}/reject
POST /api/v1/admin/verification-requests/{request_id}/request-info
GET  /api/v1/admin/reports
POST /api/v1/admin/reports/{report_id}/resolve
GET  /api/v1/admin/audit-logs
```

## API Standards

- JSON request and response bodies.
- UUID public IDs.
- Cursor pagination for feeds, messages, and activity.
- Explicit permission dependencies for protected routes.
- Structured errors with request IDs.
- No hidden profile fields in API responses.
