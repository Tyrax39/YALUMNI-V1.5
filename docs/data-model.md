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
- `mwf_alumni_profiles` - implemented as a separate local cache of public Mandela Washington Fellowship alumni directory records. These are not YALUMNI login users.
- `mwf_alumni_sync_runs` - implemented for source URL, status, timestamps, fetched/imported/updated/deactivated counts, and refresh errors.
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
- `notification_preferences` - implemented as current-user notification controls with in-app master toggle, digest frequency, muted event type list, and one record per user. Admin-run and worker-run digest delivery both consume these preferences.
- `security_events` - also records notification digest worker dry-run, success, and failure events using `notifications.email_digest_worker.*` event types so the worker has lightweight cadence and audit state without adding a dedicated job table yet.

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
- `direct_messages` - implemented for participant-scoped message history with sender, body, active/deleted status, sent timestamp, edit/delete placeholders, moderation notes, severity, escalation state, remover, and removal timestamp.
- `direct_message_reports` - implemented with reporter, reason, reporter note, open/resolved status, moderator note, severity, escalation state, resolver, resolution timestamp, and admin report queue support.
- `message_attachments`
- `message_read_receipts` - not split yet; MVP read state is stored as `conversation_participants.last_read_at`.
- `message_reactions`
- `user_blocks` - implemented for current-user contact blocking with unique blocker/blocked pairs and optional reason.

### Events

- `events` - implemented for member-created published events with type, mode, location, date window, capacity, creator, status, and registration URL metadata.
- `event_agenda_items` - implemented for event session/agenda rows with speaker, description, sort order, and optional start/end times.
- `event_attendees` - implemented for member RSVP registration with unique event/user pairs and active registration status.
- `event_tickets`
- `event_checkins`
- `event_assets`

## Post-MVP Tables

### Initiatives

- `initiatives` - implemented for member-created initiatives with title, summary, description, focus area, stage, country/city, partner organization, target beneficiaries, impact goal, support needed, date window, creator, and status metadata.
- `initiative_members`
- `initiative_milestones` - implemented for planned/in-progress/completed/blocked initiative milestones with title, description, due date, and sort order.
- `initiative_tasks`
- `initiative_updates`
- `initiative_documents`
- `initiative_impact_metrics`

### Mentorship

- `mentor_profiles` - implemented for member mentor availability, headline, bio, expertise areas, sectors, countries, meeting format, capacity, and active/request visibility.
- `mentorship_requests` - implemented for requester, mentor profile, focus area, goals, message, pending/accepted/declined/cancelled status, and reviewer note.
- `mentorship_sessions`
- `mentorship_feedback`
- `mentorship_reports`

### Contributions

- `contribution_campaigns` - implemented for finance-admin-created campaigns
  with goal amount, currency, country/chapter metadata,
  draft/pending-approval/approved/published/closed status, funding window,
  creator, and publish/close timestamps.
- `contributions` - implemented for member contribution records with amount,
  currency, payment method/reference, contributor, status, paid timestamp,
  anonymous flag, and campaign link.
- `contribution_payment_intents` - implemented as a local payment-provider
  intent foundation with campaign, contributor, amount, method, provider intent
  reference, status, anonymous flag, and note metadata. Local confirmation moves
  an eligible intent to `CONFIRMED` and records the matching contribution,
  receipt, and ledger credit entry. Signed provider webhook success events now
  reconcile the same eligible intent path, while provider failure/cancel events
  mark the intent without creating contribution, receipt, or ledger rows.
- `contribution_webhook_events` - implemented for signed provider webhook
  diagnostics with provider event IDs, provider intent references, normalized
  event type, processing status, delivery count, payment intent/contribution
  links, payload snapshot, processed timestamp, and error metadata.
- `contribution_payment_attempts` - implemented as the provider-neutral checkout
  attempt record tied to each local payment intent, including provider
  reference, local client secret, optional checkout URL, request/response
  metadata, lifecycle status, and error message. Checkout creation now uses a
  provider adapter boundary with `LOCAL_TEST` implemented and other providers
  rejected until their adapters exist. Finance-admin diagnostics can now list
  attempts without exposing stored client secrets. Failed or canceled local
  payment intents can now create a new checkout attempt while preserving the
  original payment intent record.
- `contribution_receipts` - implemented for one issued receipt per contribution
  with receipt number, issued-to details, amount, currency, status, and tax note.
- `contribution_ledger_entries` - implemented for foundation credit entries,
  negative refund reversals, local provider-refund fallback reversals,
  zero-value void markers tied to recorded contributions, and expense/reversal
  entries tied directly to approved expense reports without requiring a donor
  contribution row. Provider-refund requests now fail closed unless the
  configured refund provider has an adapter. Member text/PDF receipt downloads,
  finance CSV exports, signed JSON treasury audit packages, certified PDF audit
  reports, per-currency treasury summaries, and admin adjustment controls read
  these live tables directly.
- `contribution_treasury_certifications` - implemented for finance-admin
  immutable treasury certification snapshots, storing the signed audit package,
  canonical SHA-256 digest, HMAC signature metadata, reviewer, scope, summary
  counts, currencies, per-currency summary snapshots, and optional certification
  note.
- `contribution_disbursement_requests` - implemented for finance-admin
  campaign disbursement requests with amount, currency, payee, purpose, requester,
  reviewer, paid-by user, request/approval/rejection/paid status, notes, and
  review/payment timestamps. Requests reserve available received campaign funds
  while in requested/approved/paid states, but they do not yet write treasury
  ledger expense entries.
- `contribution_expense_reports` - implemented for finance-admin expense reports
  tied to paid disbursement requests, with amount, currency, vendor, expense date,
  summary, description, submitter, reviewer, submitted/approved/rejected status,
  notes, and review timestamps. Submitted and approved reports reserve paid
  disbursement funds. Approved reports create negative expense ledger entries;
  rejected approved reports create positive reversal entries.
- `contribution_expense_evidence` - implemented for structured expense report
  evidence rows including evidence type, title, reference URL, receipt number,
  optional amount, issued timestamp, notes, optional private file metadata,
  uploaded-by user, storage provider, and storage key.
- `pledges` - future split from confirmed local contribution recording.
- Provider payment attempts still need real provider authorization details,
  external checkout sessions, and production-grade multi-attempt checkout
  orchestration beyond the current local retry foundation.
- `disbursement_approvals` - may become a separate multi-reviewer table if
  disbursements require quorum-based approvals beyond the current single
  finance-admin review fields.
- `treasury_export_runs` - still planned only if one-off CSV/PDF export history
  needs separate operational tracking beyond stored certification snapshots.

### Elections

- `elections` - implemented for admin-created governance elections with title,
  summary, description, scope, voting window, draft/open/closed status, results
  visibility, privacy mode, quorum, creator, opened timestamp, and closed
  timestamp.
- `election_candidates` - implemented for election-scoped candidates with
  optional linked user, display name, headline, statement, active status, and
  sort order.
- `election_voters` - implemented for explicit voter-roll eligibility with one
  election/user row, status, invitation timestamp, and voted timestamp.
- `election_votes` - implemented for one auditable vote per election/user with
  selected candidate, cast timestamp, and ballot hash.
- `election_positions`
- `candidate_nominations`
- `ballots` - future anonymous ballot envelope hardening.
- `election_audit_logs` - currently represented through election-scoped
  `security_events`; a dedicated immutable export table remains planned.
- `election_results` - computed from `election_votes` for the foundation slice.
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
