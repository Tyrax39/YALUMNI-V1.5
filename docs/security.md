# Security Plan

## Principles

- Trust-first identity.
- Privacy-by-default data exposure.
- Explicit permission checks at API and UI boundaries.
- Audit sensitive admin and governance actions.
- Avoid storing raw secrets, payment card data, or private document URLs.

## Auth Requirements

- Password hashing with Argon2id.
- Short-lived JWT access tokens.
- Rotating refresh tokens stored as sessions.
- Email verification before sensitive member features.
- Optional 2FA for users, required for privileged roles.
- Rate limits for login, password reset, search, messaging, and vote submission.
- Verification evidence downloads require the submitting member or a privileged admin role.
- Profile photo downloads require authentication and are limited to the owner, admins, or verified-member directory visibility.

## Privacy Requirements

Users must control visibility of:

- Email.
- Phone.
- City and full location.
- Social links.
- Organization and title.
- Events attended.
- Initiative participation.
- Contribution visibility.
- Profile visibility to non-verified users.

## API Security Requirements

- Unauthenticated users cannot access protected routes.
- Unverified users cannot access verified-only actions.
- Users cannot access private community content without membership.
- Users cannot read conversations they are not part of.
- Hidden phone/email fields are not returned by API serializers.
- Admin routes require privileged roles.

## Financial Controls

- Payment webhooks must verify signatures.
- Webhooks must be idempotent.
- Settled ledger entries must never be mutated.
- Corrections must be new adjustment entries.
- Treasurer disbursement requests should support dual approval.

## Election Controls

- Voter roll freezes before voting opens.
- Eligibility checks are separated from vote choice storage.
- A voter can submit one accepted ballot per election.
- Vote choice is not exposed to admins after submission.
- Status changes and vote receipts are audit logged.

## Immediate Security Work

- Implement JWT utilities. Done for local auth.
- Add refresh token rotation. Done.
- Add `current_user` dependency. Done.
- Add role guard dependency. Done.
- Add protected platform owner seed and role restoration. Done without committing a password.
- Add local-only seeded test accounts for QA role coverage. Done; production use should keep `SEED_TEST_ACCOUNTS=false`.
- Add security event table. Done.
- Add role-protected admin overview. Done.
- Add session/device management. Done for refresh-token sessions.
- Add auth rate limits. Done in-process for login, password reset, and local admin bootstrap.
- Add verification evidence upload/download authorization. Done for local MVP storage.
- Add profile photo upload/download authorization. Done for local MVP storage.
- Add shared local/S3 upload storage adapter. Done; production still needs real bucket credentials and bucket policy validation.
- Add admin audit log viewer. Done for recorded `security_events`.
- Move web auth transport out of browser local storage. Done with HttpOnly access/refresh cookies, web session routes, protected backend proxy routes, and Next proxy guards for dashboard/admin entry points.
- Add tests for auth denial and basic IDOR prevention.

## File Storage Controls

- Current verification evidence and profile photo storage use the shared upload storage adapter.
- Local development uses `UPLOAD_STORAGE_PROVIDER=LOCAL`.
- Production can use `UPLOAD_STORAGE_PROVIDER=S3` with a private bucket and S3-compatible endpoint configuration.
- Evidence and profile photo URLs should be short-lived, permission checked, and never public bucket URLs.
- Production still needs malware scanning, retention policy, image processing, and explicit bucket policy review.

## Web Session Controls

- Browser JavaScript no longer receives or stores access and refresh tokens after login/register.
- `/api/session/login`, `/api/session/register`, `/api/session/logout`, and `/api/session/refresh` manage HttpOnly cookies.
- `/api/backend/*` forwards authenticated web requests to FastAPI with server-side bearer headers.
- The proxy refreshes access tokens once on protected 401 responses when a valid refresh cookie is available.
- Dashboard and admin routes are guarded by the Next `proxy.ts` entry guard before client rendering.
- Legacy local-storage token keys are removed during auth transitions for migration cleanup.
- Remaining production work: CSRF tokens for state-changing web API calls, role-aware server guards, stricter cookie domain/SameSite review, and end-to-end browser tests.
