# Free deployment with GitHub Vercel and Turso

The application is prepared for Vercel's Hobby plan and a Turso free libSQL database. Pricing was checked on 14 October 2026. Free tiers have quotas; this is a personal assessment demo, not a promise of unlimited production hosting. Do not enable paid upgrades or usage overages.

1. Push this Git repository to your GitHub account. Keep incremental history. Review the source for secrets; database files, local environment files and dependencies are ignored.
2. Create a **libSQL-compatible** database in Turso's free plan. The hosted adapter uses the official `@tursodatabase/serverless/compat` driver; local SQLite uses `@libsql/client`. Neither uses a temporary filesystem database on Vercel. Obtain its URL and auth token in the provider dashboard and keep the token secret.
3. Seed the hosted database once by running `pnpm seed` with `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, and `DEMO_PASSWORD` supplied through secure shell environment variables. Do not commit tokens or put them in screenshots. Seeding is an explicit administrative step and refuses to overwrite existing employees.
4. Import the GitHub repository into Vercel. Select Hobby, Node.js 24 and pnpm. The tracked `vercel.json` builds the React UI into `dist` and routes `/api/*` to the Express handler. Add `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `NODE_ENV=production`, and `TRUST_PROXY=1` as server-side environment variables. Never prefix database secrets with `VITE_`.
5. Deploy. Enter the password chosen during seeding in the demo login form. Its prefilled local-demo password will not work if you changed the seed password.
6. Verify login, directory totals, filters, currency changes, CRUD, CSV export, viewer restrictions and audit entries on the actual public URL. Confirm writes persist after a fresh deployment. Check Vercel function logs and database quotas. Record the video walkthrough only after these checks pass.

Vercel does not provide persistent local SQLite storage. `openDatabase` fails clearly when running on Vercel without a hosted database URL, rather than silently losing salary edits. The API's schema creation is idempotent on cold starts; the 10,000-row seed is never run inside a function request.

Local use remains self-contained: absent hosted database variables, the libSQL client opens `data/acme.sqlite`. Tests always request their own in-memory database even if remote variables are present.

The current login limiter is in-memory per server instance. On Vercel that is a best-effort limiter, not a shared global cap. A production deployment should replace it with a shared database/Redis limiter and review analytics inference protection, retention, backups and audit access.

Public publication is not complete until the deployed URL has been returned and checked. No paid plan or payment is required by this prepared workflow.

Sources: https://vercel.com/docs/plans/hobby , https://vercel.com/docs/functions/runtimes/node-js , https://vercel.com/kb/guide/is-sqlite-supported-in-vercel , https://turso.tech/pricing?frequency=monthly , https://docs.turso.tech/sdk/ts/reference .
