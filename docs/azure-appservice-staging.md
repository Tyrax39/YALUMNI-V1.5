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
- `CORS_ORIGINS` for the three frontend App Service origins
- `UPLOAD_STORAGE_PROVIDER=LOCAL`
- Upload directories under `/home/uploads/...`
- `PORT=8000`
- `WEBSITES_PORT=8000`

Each frontend app requires:

- `API_BASE_URL=https://yalumni-v15-api-954095.azurewebsites.net`
- `NEXT_PUBLIC_API_BASE_URL=https://yalumni-v15-api-954095.azurewebsites.net`
- `PORT=3000`
- `WEBSITES_PORT=3000`

Generated secret values must stay out of git. Store local deployment handoff
metadata only under `.local/`.

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
- Member app: `https://yalumni-v15-member-954095.azurewebsites.net`
- Admin app: `https://yalumni-v15-admin-954095.azurewebsites.net/login`
- Super-admin app: `https://yalumni-v15-superadmin-954095.azurewebsites.net/login`
- Route smokes against Azure base URLs.

## Staging Limitations

This staging deployment intentionally does not add custom domains, Key Vault,
private networking, CDN, or production-grade object storage. App Service
persistent `/home/uploads` storage is acceptable only for this staging slice.
