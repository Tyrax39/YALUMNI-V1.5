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
- Add tests for auth denial and basic IDOR prevention.
