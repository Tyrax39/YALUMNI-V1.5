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
- `community_posts` - implemented with active/removed status, author, body, remover, removal timestamp, and restoration support for private community feeds.
- `community_post_comments` - implemented with active/removed status, post-scoped author comments, remover, removal timestamp, and restoration support.
- `community_post_reactions` - implemented with one current `LIKE` reaction per user/post.
- `community_post_reports` - implemented with reporter, reason, optional note, open/resolved status, resolver, resolution timestamp, community-level queue support, and cross-community admin queue support through post/community joins.
- `community_settings` - folded into `communities` for MVP settings editing.

### Feed

- `posts` - global/cross-community feed still planned; current MVP feed work starts with `community_posts` plus scoped comments/reactions/reports.
- `post_media`
- `comments` - global feed equivalent still planned.
- `reactions` - global feed equivalent still planned.
- `post_reports` - global feed equivalent still planned; admin moderation for community feed reports currently uses `community_post_reports`.
- `post_topics`

### Messaging

- `conversations`
- `conversation_members`
- `messages`
- `message_attachments`
- `message_read_receipts`
- `message_reactions`
- `user_blocks`

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
