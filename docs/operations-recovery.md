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

After runtime readiness passes, run the credentialed pilot gate from a secure
operator shell:

```powershell
$env:RELEASE_SUPERADMIN_URL="https://yalumni-v15-superadmin-954095.azurewebsites.net"
$env:PILOT_SUPERADMIN_EMAIL="<protected-super-admin-email>"
$env:PILOT_SUPERADMIN_PASSWORD="<protected-super-admin-password>"
npm run verify:pilot-launch
```

The command performs no payment or destructive storage action. It reads owner
diagnostics and runs the existing audited storage connectivity probe, then
blocks promotion unless payment implementation, security/session policy, S3,
and all three worker families are ready. The signed-in platform owner must have
two-factor authentication enabled before the security gate can pass, and
enrolled admin accounts must complete a TOTP or recovery-code challenge before
access or refresh tokens are issued.

Payment provider code can pass the implementation gate before live secrets are
entered. Use super-admin `/system` payment diagnostics to review
`missing_settings`; after Stripe and Flutterwave credentials are added, repeat
the same gate and verify the live checkout, webhook, receipt, reconciliation,
failure, and refund paths.

Before protected provider secrets are available, verify that all non-secret
payment handoff configuration is present:

```powershell
npm run verify:payment-readiness
```

This check validates supported provider names, positive provider timeouts, and
the required return/redirect URL settings without requiring API keys or webhook
secrets. When Stripe and Flutterwave secrets are supplied in the operator
environment, rerun it in strict mode:

```powershell
$env:PAYMENT_REQUIRE_PROVIDER_SECRETS="true"
npm run verify:payment-readiness
```

The command reports only setting names, never secret values.

Before production storage credentials or worker hosting are finalized, verify
that upload paths, scanner policy, worker cadences, source URLs, and retention
settings are structurally ready:

```powershell
npm run verify:ops-readiness
```

When production S3 settings and the Redis retention-worker lock are supplied,
rerun the same check in strict production-target mode:

```powershell
$env:OPS_REQUIRE_PRODUCTION_TARGETS="true"
npm run verify:ops-readiness
```

This command reports missing setting names only. It does not open network
connections or print object-storage credentials.

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
