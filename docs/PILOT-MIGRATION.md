# QuickLoan pilot hardening and migration

## Status and deployment impact

This is a restricted pilot preparation release, not a functioning lender.
No public applications, payment fees, disbursements or repayments are enabled.
The public root shows an honest landing page; the lender dashboard is /dashboard.
Health: GET /api/health (process health only, not database readiness).

BREAKING SECURITY CHANGE: shared PIN and legacy Kimi cookies no longer authenticate.
Do not deploy until Supabase Auth and lender MFA are configured. Existing borrower
clients must send Authorization: Bearer <Supabase access token>. Phone-only clients
will receive UNAUTHORIZED. This intentionally closes unauthorised record access.
No existing application or notification rows are deleted or rewritten.

## Managed authentication setup

1. Create a dedicated Supabase project; configure password and phone authentication.
2. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (publishable/anon, never service-role).
3. Invite an individual lender account and securely enroll TOTP MFA before release.
   The login screen can challenge an enrolled factor; initial enrollment is not built here.
4. Put its UUID in LENDER_SUPABASE_USER_IDS. The server checks allowlist AND aal2.
5. Set APP_URL to the exact public HTTPS origin for CSRF protection.
6. Update the separate borrower app to use verified phone sign-in; budget separately
   for the SMS provider. Test two synthetic borrowers to prove isolation.
7. Disable public signups if not needed and configure Auth rate limits and CAPTCHA.
8. Confirm account recovery, lost-MFA recovery and logout/session revocation policies.
   Cookies are one hour or token expiry, whichever first. Supabase token invalidation
   semantics must be reviewed; deleting a local cookie is not global session revocation.

## Hosting choices

- Supabase provides Postgres, Auth, storage and functions. The existing backend
  uses MySQL/Drizzle mysql-core and cannot be pointed at a Postgres URL unchanged.
- Neon provides Postgres; it is not an automatic replacement for the app server.
- Vercel can host a separate frontend/API project after adapter/configuration work.
  Hobby is non-commercial personal use only; do not use it for commercial lending.
- Keeping MySQL/TiDB while using Supabase Auth is a transitional architecture only.
  Set DATABASE_SSL=true for remote database connections. Do not share UGSouq's schema.
- Render Free sleeps and shares 750 instance hours per workspace. Do not promise
  continuous production lending on a free demonstration service.

## Database migration gate (not performed)

1. Export all four tables from the source under authorised credentials without
   writing secrets or customer IDs/photos into logs. Verify backup and test restore.
2. Convert Drizzle definitions, queries, upsert/transaction result handling and SQL
   migrations to Postgres. Preserve IDs, timestamps, status, NIN/phone text and refs.
3. Use a private document bucket with access policies and short-lived signed links.
   Move ID/liveness images out of public responses and establish retention rules.
4. Import into a separate database/schema and compare counts, checksums, foreign
   references and sampled synthetic rows. Do not guess production schema from code.
5. Pause writes during final export/cutover; confirm old/new borrower API URLs.
6. Verify lender MFA, borrower isolation, private media, backups and runtime health
   on the replacement before changing domains or stopping Railway.
7. Retain rollback data securely for an agreed period; remove old hosting only after
   confirmation. Domain renewal is separate from application hosting costs.

## Remaining live-lending gates

Licensing/operator details; identity/age and affordability checks; versioned consent
and accepted agreements; transparent interest/fees and repayment schedules;
private document storage; idempotent disbursement/repayment ledger, verified webhooks
and reconciliation; actual notification delivery/retries; complaints, retention,
audit log and tested recovery. Approval only records a review, never a transfer.

No migration or real financial transaction is performed by this release. Existing
historical notifications may contain old promises; review under a separate approved
data-correction process rather than silently rewriting financial history.
