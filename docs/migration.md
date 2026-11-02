# Migration Plan

## Source

Legacy source:

```text
C:\xampp\htdocs\yalumni-v0
```

The legacy Laravel app should be exported from its database and migrated through dry-run scripts in `scripts/legacy-import`.

## Rules

- Preserve legacy IDs.
- Do not import demo credentials.
- Default imported contact fields to private.
- Do not publish profiles without verification/consent decisions.
- Normalize countries and cities where possible.
- Map school-oriented fields only after review.
- Store ambiguous values in `legacy_metadata`.
- Produce row counts, warnings, skipped records, and errors.

## Initial Mapping

| Legacy concept | V1.5 target |
| --- | --- |
| `users` | `users` |
| `alumnus` | `alumni_profiles` |
| `user_institutions` | `program_affiliations` or `legacy_metadata` |
| `batch`, `passing_year` | `cohort_year` when reliable |
| `department` | `sector_track` when reliable |
| `posts` | `posts` |
| `post_comments` | `comments` |
| `post_media` | `post_media` |
| `chats` | `conversations` and `messages` |
| `events` | `events` |
| `event_tickets` | `event_tickets` and `event_registrations` |
| `transactions` | `payment_attempts`, possible `ledger_entries` after reconciliation |
| `membership_plans` | `dues_plans` or membership tiers after product decision |
| roles and permissions | `roles`, `permissions`, `role_assignments` |

## Migration Phases

1. Export schema and sample data.
2. Build mapping document with field-level decisions.
3. Build dry-run parser.
4. Produce report without writing.
5. Import pilot-approved users only.
6. Validate counts, privacy, roles, and media.
7. Full staging import.
8. Production migration only after sign-off.

## Open Questions

- Which legacy users are approved for pilot import?
- Should old public posts and stories be migrated or archived?
- Which payment records are legally and financially reliable enough to create ledger entries?
- Which countries and chapters launch first?
- What verification evidence is acceptable?

