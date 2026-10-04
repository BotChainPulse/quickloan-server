# QuickLoan pilot

Uganda-focused application review prototype. New applications and disbursement are
closed. This is not a production lending platform.

Public information: `/`. Lender dashboard: `/dashboard`. MFA sign-in: `/login`.
Process health: `/api/health`.

See [pilot hardening and migration gates](docs/PILOT-MIGRATION.md) before deploying.
Supabase Auth and lender MFA enrollment are mandatory; shared PIN sign-in is disabled.
The database still uses MySQL/TiDB, not PostgreSQL.

Development: `npm ci`, `npm run dev`. Verify with `npm run check`, `npm test`,
`npm run build`. Docker builds source rather than running a pre-committed bundle.
