# Operations Recovery Runbook

Use this runbook for staging and pilot operations. All administrative API actions
require an authenticated role with the documented permission; system probes are
restricted to `SUPER_ADMIN`.

## Runtime Readiness Gate

Use the readiness endpoint to distinguish process liveness from deployable
runtime health. It verifies database connectivity, the applied Alembic head,
and Redis reachability when Redis is required by the environment or worker
lock policy.

```powershell
$env:RELEASE_API_URL="https://yalumni-v15-api-954095.azurewebsites.net"
$env:RELEASE_EXPECTED_ENVIRONMENT="staging"
npm run verify:runtime-readiness
```

`/health` remains the liveness check. A `503` from
`/api/v1/system/readiness` must block promotion until migrations or required
Redis connectivity are repaired.

## First Response

1. Confirm `/health` and `/api/v1/system/status` return `200`.
2. In the super-admin `/system` view, confirm release identity matches the other
   three services and review worker execution recency.
3. Run **Check storage connectivity**. A failed probe records
   `system.storage_probe` in the security audit log without exposing credentials.
4. Inspect application logs before restarting a service. Preserve the failing
   request ID, worker status, and release SHA.

## MWF Cache Recovery

- Review cache state and recent runs with:
  - `GET /api/v1/alumni/admin/mwf-sync`
  - `GET /api/v1/alumni/admin/mwf-sync/runs`
- Trigger one controlled refresh with `POST /api/v1/alumni/admin/mwf-sync` or the
  existing super-admin MWF cache control.
- For a dedicated worker runtime, run:
  `python -m app.workers.mwf_alumni_sync --once`
- Every polling cycle records `alumni.mwf_sync_worker_cycle`, including cycles
  that correctly skip because the cache is fresh.
- Do not loop manual refreshes. Capture the latest run error and verify the
  official source URLs and user agent before retrying.

## Notification Digest Recovery

- Run a dry preview first:
  `python -m app.workers.notification_digests --once --dry-run`
- Run one normal cycle only after email transport and digest settings are ready:
  `python -m app.workers.notification_digests --once`
- Worker outcomes are recorded under the
  `notifications.email_digest_worker.*` security-event prefix.
- Every poll also records `notifications.email_digest_worker_cycle`, including
  cadence skips, so owner diagnostics can distinguish an idle worker from a
  stopped worker.
- Repeated failures require email transport validation before another retry.

## Expense Evidence Retention Recovery

- Preview candidates through
  `GET /api/v1/contributions/admin/expense-evidence-retention`.
- Run a worker dry preview with:
  `python -m app.workers.contribution_expense_retention --once --dry-run`
- Run cleanup only after checking the retention window, storage connectivity,
  and distributed lock readiness:
  `python -m app.workers.contribution_expense_retention --once`
- Confirm the `contributions.expense_evidence_retention_worker_run` audit event
  records a successful result and expected deletion count.

## Storage Recovery

- `LOCAL`: verify every configured upload directory exists and is readable and
  writable by the API process.
- `S3`: verify bucket, region, endpoint, access key, and secret are supplied via
  deployment settings, then rerun the owner-only storage probe.
- Confirm positive `S3_CONNECT_TIMEOUT_SECONDS`, `S3_READ_TIMEOUT_SECONDS`, and
  `S3_MAX_ATTEMPTS` values before enabling S3 in staging.
- Never print storage credentials or return provider exception details through
  diagnostics. Rotate credentials if logs or handoff artifacts expose them.
- Do not delete evidence manually. Use the retention workflow so database state
  and audit events remain consistent.

## Closure

Record the release SHA, affected worker/storage provider, observed status,
recovery action, audit event, and final verification result. Run the four-service
release parity gate before accepting a restarted or promoted staging release.

## Local Worker Deployment Check

`docker compose up --build` now starts the API and three dedicated worker
services. Workers wait for the API health check, which confirms database
migrations and API startup have completed. The expense-retention service uses a
Redis lock in Compose to prevent concurrent cleanup cycles.
