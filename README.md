# Quick Loan Uganda pilot

Customer PWA and owner-only lender dashboard. Customer routes: `/`, `/account`, `/apply`, `/status`, `/calculator`, `/privacy`, `/help`. Lender routes: `/admin`, `/admin/login`.

This pilot accepts review requests, not loan agreements. It does not disburse money, collect payments, verify identity or guarantee repayment. See [reference comparison and launch controls](docs/REFERENCE-COMPARISON.md).

## Development and verification

`npm ci --include=dev`, `npm run check`, `npx tsc -p tsconfig.server.json`, `npm test`, `npm run build`.

## Deployment

Render Node build: `npm ci --include=dev && npm run build`; start: `npm run start`. Docker builds from source. Never deploy an old prebuilt bundle. Keep secrets in the hosting environment, not GitHub. Existing environment values APP_ID, APP_SECRET (at least 24 characters), DATABASE_URL (MySQL/TiDB with strict TLS), KIMI_AUTH_URL, KIMI_OPEN_URL, OWNER_UNION_ID and LENDER_PIN remain required by the existing server/auth library. OAuth callbacks are not exposed by this pilot.

Startup applies additive, idempotent schema changes. Back up the database and preserve APP_SECRET; encrypted record access depends on that key. Legacy applications are not reassigned to a phone-based account. Do not cancel Railway until final data synchronization, backup restoration and dependent-client checks are complete.

Free Render services can sleep when idle. The pilot uses a single-instance in-memory attempt limiter; replace it with a shared durable limiter before scaling or real lending. Production SMS verification/recovery, stronger lender authentication, KYC, approved pricing/agreements, a reconciliation ledger, payment integration and independent review remain required.
