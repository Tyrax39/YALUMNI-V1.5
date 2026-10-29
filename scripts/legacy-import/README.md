# Legacy Import

This directory will contain dry-run migration tools for importing approved data from the legacy Laravel/MySQL application into the new PostgreSQL schema.

Rules:

- Preserve legacy IDs in `legacy_id` columns or `legacy_metadata`.
- Do not import demo credentials.
- Keep private contact fields hidden by default.
- Produce row counts, warnings, skipped records, and errors.

