# Data Model Plan

## Standards

- Use UUID primary keys.
- Use `created_at`, `updated_at`, and `deleted_at` where appropriate.
- Store public IDs as UUIDs, not sequential integers in URLs.
- Store private or uncertain legacy data in metadata fields until reviewed.
- Prefer controlled text enums first, PostgreSQL enums after domain states stabilize.

## MVP Tables

### Identity

- `users`
- `sessions`
- `auth_identities`
- `roles`
- `permissions`
- `role_assignments`
- `security_events`

### Alumni

- `alumni_profiles` - implemented with current-user profile fields, profile photo metadata, skills JSON, visibility JSON, and completion timestamp.
- `program_affiliations` - implemented for YALI program/cohort attachment.
- `profile_visibility_settings` - folded into `alumni_profiles.visibility` for the MVP, likely split later if rules become per-field/per-community.
- `skills`
- `alumni_skills`
- `interests`
- `alumni_interests`
- `verification_requests` - implemented with profile snapshot, status, submitted note, reviewer note, reviewer, and review timestamp.
- `verification_evidence` - implemented as request-scoped local evidence metadata for MVP uploads.

### Communities

- `communities` - implemented with chapter/group metadata, visibility, and join policy.
- `community_memberships` - implemented with active, pending, left, rejected statuses plus owner/member/manager roles.
- `community_invitations` - implemented with invited email, invited role, pending/accepted/canceled/expired status, hashed token, expiry, inviter, and acceptance metadata.
- `community_posts` - implemented with active/removed status, author, body, remover, removal timestamp, restoration support, internal moderation notes, severity, and escalation tracking for private community feeds.
- `community_post_media` - implemented with post-scoped private storage metadata, uploader, original file name, content type, byte size, active/removed moderation status, remover, and removal timestamp for community feed attachments.
- `community_post_comments` - implemented with active/removed status, post-scoped author comments, remover, removal timestamp, restoration support, internal moderation notes, severity, and escalation tracking.
- `community_post_reactions` - implemented with one current `LIKE` reaction per user/post.
- `community_post_reports` - implemented with reporter, reason, reporter note, open/resolved status, moderator note, severity, escalation state, resolver, resolution timestamp, community-level queue support, and cross-community admin queue support through post/community joins.
- `community_settings` - folded into `communities` for MVP settings editing.

### Notifications

- `notifications` - implemented as the user-facing notification inbox with recipient, optional actor, event type, title, body, target URL, metadata, read timestamp, email digest sent timestamp, and created/updated timestamps.
- `notification_preferences` - implemented as current-user notification controls with in-app master toggle, digest frequency, muted event type list, and one record per user. Admin-run digest delivery now consumes these preferences; scheduled worker execution remains a production hardening task.

### Feed

- `posts` - global/cross-community feed still planned; current MVP feed work starts with `community_posts` plus scoped comments/reactions/reports.
- `post_media`
- `comments` - global feed equivalent still planned.
- `reactions` - global feed equivalent still planned.
- `post_reports` - global feed equivalent still planned; admin moderation for community feed reports currently uses `community_post_reports`.
- `post_topics`

### Messaging

- `conversations` - implemented for direct one-to-one conversation records with creator, type, timestamps, and last-message timestamp.
- `conversation_participants` - implemented for conversation membership, current-user read marker, archive/mute placeholders, and one record per conversation user.
- `direct_messages` - implemented for participant-scoped message history with sender, body, active/deleted status, sent timestamp, and edit/delete placeholders.
- `message_attachments`
- `message_read_receipts` - not split yet; MVP read state is stored as `conversation_participants.last_read_at`.
- `message_reactions`
- `user_blocks` - implemented for current-user contact blocking with unique blocker/blocked pairs and optional reason.

### Events

- `events`
- `event_tickets`
- `event_registrations`
- `event_checkins`
- `event_sessions`
- `event_speakers`
- `event_assets`

## Post-MVP Tables

### Initiatives

- `initiatives`
- `initiative_members`
- `initiative_milestones`
- `initiative_tasks`
- `initiative_updates`
- `initiative_documents`
- `initiative_impact_metrics`

### Contributions

- `contribution_campaigns`
- `pledges`
- `contributions`
- `payment_attempts`
- `ledger_entries`
- `receipts`
- `disbursement_requests`
- `disbursement_approvals`
- `expense_reports`

### Elections

- `elections`
- `election_positions`
- `election_voter_rolls`
- `candidate_nominations`
- `candidates`
- `ballots`
- `votes`
- `election_audit_logs`
- `election_results`
- `election_disputes`

## Key Enum Values

Program types:

- `RLC_ALUMNI`
- `MANDELA_WASHINGTON_FELLOW`
- `BOTH`
- `PARTNER`
- `ADMIN`

Verification statuses:

- `UNVERIFIED`
- `SELF_CLAIMED`
- `DOCUMENT_SUBMITTED`
- `CHAPTER_VERIFIED`
- `ADMIN_VERIFIED`
- `OFFICIAL_PARTNER_VERIFIED`
- `REJECTED`

Community types:

- `GLOBAL`
- `COUNTRY_CHAPTER`
- `CITY_CHAPTER`
- `REGIONAL_GROUP`
- `COHORT_GROUP`
- `SECTOR_GROUP`
- `PROGRAM_GROUP`
- `INITIATIVE_GROUP`
- `EVENT_GROUP`
- `CUSTOM`

## Immediate Modeling Task

Completed identity basics:

- `users`
- `sessions`
- `roles`
- `role_assignments`
- `security_events` with a role-gated admin audit viewer

Completed alumni profile basics:

- `alumni_profiles`
- `program_affiliations`
- `verification_requests`

Completed upload storage foundation:

- Private object-storage adapter shared by profile photos and verification evidence

Next add audit depth:

- Dedicated immutable `audit_logs` or scoped verification/governance event tables for richer compliance exports
