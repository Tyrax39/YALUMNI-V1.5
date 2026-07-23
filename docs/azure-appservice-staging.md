# Azure App Service Staging Deployment

This runbook describes the first YALUMNI V1.5 staging deployment on Azure App
Service using four Linux custom-container Web Apps.

## Resources

- Subscription: `954095cf-f38e-40b7-9d73-fa05d4f9e104`
- Resource group: `rg-yalumni-v15-staging-eus`
- Region: `eastus`
- Azure Container Registry: `acryalumniv15954095`
- App Service plan: `asp-yalumni-v15-staging-eus`
- PostgreSQL Flexible Server: `psql-yalumni-v15-954095`
- PostgreSQL database: `yalumni`
- Redis: `redis-yalumni-v15-954095`
- API Web App: `yalumni-v15-api-954095`
- Member Web App: `yalumni-v15-member-954095`
- Admin Web App: `yalumni-v15-admin-954095`
- Super-admin Web App: `yalumni-v15-superadmin-954095`

## Images

Images are built from the repository root and tagged with the current git SHA:

```powershell
az acr build --registry acryalumniv15954095 --image yalumni-api:<sha> --file apps/api/Dockerfile .
az acr build --registry acryalumniv15954095 --image yalumni-member:<sha> --file apps/web/Dockerfile .
az acr build --registry acryalumniv15954095 --image yalumni-admin:<sha> --file apps/admin-console/Dockerfile .
az acr build --registry acryalumniv15954095 --image yalumni-superadmin:<sha> --file apps/super-admin-console/Dockerfile .
```

## Required App Settings

The API app requires:

- `APP_ENV=staging`
- `API_BASE_URL=https://yalumni-v15-api-954095.azurewebsites.net`
- `WEB_BASE_URL=https://yalumni-v15-member-954095.azurewebsites.net`
- `ADMIN_CONSOLE_BASE_URL=https://yalumni-v15-admin-954095.azurewebsites.net`
- `SUPER_ADMIN_CONSOLE_BASE_URL=https://yalumni-v15-superadmin-954095.azurewebsites.net`
- `DATABASE_URL` for Azure PostgreSQL with `sslmode=require`
- `REDIS_URL` for Azure Cache for Redis using TLS
- `JWT_SECRET_KEY`
- `PLATFORM_OWNER_PASSWORD`
- `CONTRIBUTION_WEBHOOK_SECRET`
- `CORS_ORIGINS` for the three frontend App Service origins
- `UPLOAD_STORAGE_PROVIDER=LOCAL`
- Upload directories under `/home/uploads/...`
- `PORT=8000`
- `WEBSITES_PORT=8000`

Each frontend app requires:

- `APP_ENV=staging`
- `API_BASE_URL=https://yalumni-v15-api-954095.azurewebsites.net`
- `NEXT_PUBLIC_API_BASE_URL=https://yalumni-v15-api-954095.azurewebsites.net`
- `YALUMNI_RELEASE_SHA=<git-sha>`
- `YALUMNI_RELEASE_VERSION=<release-version>`
- `PORT=3000`
- `WEBSITES_PORT=3000`

The API app also requires the same `YALUMNI_RELEASE_SHA` and
`YALUMNI_RELEASE_VERSION` values. Set both values on all four Web Apps before
restarting them.

Generated secret values must stay out of git. Store local deployment handoff
metadata only under `.local/`.

Run the non-secret payment handoff check before adding gateway secrets:

```powershell
npm run verify:payment-readiness
```

After Stripe and Flutterwave App Settings are supplied from the gateway
dashboards, run the same check in strict mode from a protected shell:

```powershell
$env:PAYMENT_REQUIRE_PROVIDER_SECRETS="true"
npm run verify:payment-readiness
```

This check validates provider selection, return URLs, webhook-secret presence,
API-key presence, and request timeout shape without printing secret values.

Run the storage and worker handoff check before promoting a staging build:

```powershell
npm run verify:ops-readiness
```

After S3 and Redis worker-lock App Settings are supplied, run the strict version:

```powershell
$env:OPS_REQUIRE_PRODUCTION_TARGETS="true"
npm run verify:ops-readiness
```

This confirms production-shaped storage and worker configuration before the
credentialed pilot launch gate performs the live storage probe.

## Verification

Run local checks before deployment:

```powershell
npm run verify
docker build -f apps/api/Dockerfile -t yalumni-api:local .
docker build -f apps/web/Dockerfile -t yalumni-member:local .
docker build -f apps/admin-console/Dockerfile -t yalumni-admin:local .
docker build -f apps/super-admin-console/Dockerfile -t yalumni-superadmin:local .
```

After deployment, verify:

- API health: `https://yalumni-v15-api-954095.azurewebsites.net/health`
- API readiness: `https://yalumni-v15-api-954095.azurewebsites.net/api/v1/system/readiness`
- Member app: `https://yalumni-v15-member-954095.azurewebsites.net`
- Admin app: `https://yalumni-v15-admin-954095.azurewebsites.net/login`
- Super-admin app: `https://yalumni-v15-superadmin-954095.azurewebsites.net/login`
- Route smokes against Azure base URLs.

Verify that all four services report the same deployed artifact identity:

```powershell
$env:RELEASE_API_URL="https://yalumni-v15-api-954095.azurewebsites.net"
$env:RELEASE_MEMBER_URL="https://yalumni-v15-member-954095.azurewebsites.net"
$env:RELEASE_ADMIN_URL="https://yalumni-v15-admin-954095.azurewebsites.net"
$env:RELEASE_SUPERADMIN_URL="https://yalumni-v15-superadmin-954095.azurewebsites.net"
$env:RELEASE_EXPECTED_SHA="<sha>"
$env:RELEASE_EXPECTED_VERSION="<release-version>"
npm run verify:release-parity
$env:RELEASE_EXPECTED_ENVIRONMENT="staging"
npm run verify:runtime-readiness
$env:RELEASE_SUPERADMIN_URL="https://yalumni-v15-superadmin-954095.azurewebsites.net"
$env:PILOT_SUPERADMIN_EMAIL="<protected-super-admin-email>"
$env:PILOT_SUPERADMIN_PASSWORD="<protected-super-admin-password>"
npm run verify:pilot-launch
```

The release is rejected if any endpoint is unavailable, reports the wrong
service identity, omits release metadata, differs from the expected SHA or
version, cannot reach its database, is behind the Alembic head, or cannot reach
required Redis infrastructure. The credentialed pilot gate additionally
requires dual-provider payment readiness, hardened staging auth/session policy,
a reachable S3 storage target, and fresh successful worker heartbeats. Operator
credentials must remain in the process environment and must never be committed.
The authenticated operator must also have two-factor authentication enabled;
configuration alone does not satisfy the security gate.

## Current Verified Staging Release

Verified on July 19, 2026:

- Git SHA: `640dc1f`
- Release version: `v1.5.0-staging-20260719`
- ACR builds: API `cag`, member `cah`, admin `caf`, super-admin `caj`
- API health and migrations: passed
- Four-service release parity: passed
- Member, admin, and super-admin route smokes: passed
- Credentialed super-admin access across all three frontend apps: passed

Stripe and Flutterwave staging credentials are not configured in the current
Azure environment. The protected diagnostics endpoint therefore correctly
reports payment implementation readiness as true while live credential
configuration remains incomplete. Add these App Settings when the gateway
accounts are ready: `CONTRIBUTION_CHECKOUT_PROVIDER`,
`CONTRIBUTION_REFUND_PROVIDER`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`STRIPE_CHECKOUT_SUCCESS_URL`, `STRIPE_CHECKOUT_CANCEL_URL`,
`FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_WEBHOOK_SECRET_HASH`, and
`FLUTTERWAVE_CHECKOUT_REDIRECT_URL`.

Until those secrets are supplied, `npm run verify:payment-readiness` is expected
to pass in default handoff mode and fail only when strict secret mode is enabled.

Similarly, `npm run verify:ops-readiness` is expected to pass in default
handoff mode with local storage, while strict production-target mode requires S3
settings and the Redis retention-worker lock.

## Staging Limitations

This staging deployment intentionally does not add custom domains, Key Vault,
private networking, CDN, or production-grade object storage. App Service
persistent `/home/uploads` storage is acceptable only for this staging slice.
