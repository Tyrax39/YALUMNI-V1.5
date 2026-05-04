# Development Test Accounts

These accounts are for local development and QA only. They are seeded through the API scripts or by setting `SEED_TEST_ACCOUNTS=true` in a local environment.

The shared local test password defaults to `YalumniTest@12345!` and can be changed with `TEST_ACCOUNTS_PASSWORD`.

| Username | Email | Role coverage |
| --- | --- | --- |
| Test Super Admin | `test.superadmin@yalumni.local` | Super admin, platform admin, verification admin |
| Test Verification Admin | `test.verifier@yalumni.local` | Verification review/admin workflows |
| Test Moderator | `test.moderator@yalumni.local` | Moderation role checks |
| Test Verified Alumni | `test.alumni@yalumni.local` | Verified member dashboard and directory search |
| Test Applicant | `test.applicant@yalumni.local` | Unverified applicant/member onboarding |

Seed them manually:

```powershell
cd D:\YALUMNI-V1.5\apps\api
$env:DATABASE_URL="sqlite+pysqlite:///D:/YALUMNI-V1.5/.local/yalumni.sqlite3"
python scripts/seed_test_accounts.py
```

The protected platform owner account is configured separately with `PLATFORM_OWNER_EMAIL`, `PLATFORM_OWNER_DISPLAY_NAME`, and `PLATFORM_OWNER_PASSWORD`. Keep the actual owner password in local environment variables only.
