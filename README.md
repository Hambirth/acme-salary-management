# ACME Compensation

A salary management workspace for ACME's HR team: manage 10,000 employees across six countries and understand annual base compensation with explicit local-currency and approximate USD reporting.

Live assessment demo: https://acme-salary-management-ten.vercel.app/ .

## Run locally

Requires Node.js 24.19 or later and pnpm 11.25. Local SQLite is accessed through the official libSQL client; no external database service is required for local development.

```sh
pnpm install
pnpm seed
pnpm build
pnpm start
```

Open http://localhost:4000 . For development, `pnpm dev` runs the API on port 4000 and Vite on port 5173. The Vite proxy keeps API requests on the same browser origin. `pnpm seed` refuses to overwrite a populated database. Environment variables can be provided by the shell or host; `.env.example` documents them, but `.env` is not automatically loaded.

| Demo role  | Email               | Password          |
| ---------- | ------------------- | ----------------- |
| HR manager | hr@acme.example     | AssessmentDemo42! |
| Viewer     | viewer@acme.example | AssessmentDemo42! |

These are intentionally public demo accounts and all employee records are synthetic. The published synthetic assessment demo intentionally uses these public credentials. For any deployment containing non-demo data, provision private accounts and use a different `DEMO_PASSWORD`; enter that password in the login form. Never load real employee data into a publicly accessible demo.

## Included

- Responsive React overview with headcount, budget, average/median salary, grouped comparisons, workforce mix, salary distribution and peer outlier review.
- Server-side directory search, country/department/job-title/currency filters, validated sorting, pagination, employee creation/editing/deletion and filtered CSV export.
- Cookie sessions with server-side revocation, scrypt password hashing, login rate limiting, request protection header and secure headers.
- API-enforced HR/viewer permissions. Viewer responses omit individual salaries; salary sorting and writes are rejected. Viewer analytics suppress groups below five and omit extremes, distributions and outliers.
- Exact salary storage in integer minor units, optimistic concurrency checks and transactional audit records.
- Deterministic seed with 10,000 employees. Tests use in-memory SQLite and actual HTTP requests, without external services.

## Extended reference coverage

- Full grouped salary table: count, minimum, p25, median, average, p75 and maximum; viewers never receive minimum/maximum.
- Pay versus completed years of tenure, with a fixed, explicitly returned assessment date of 2026-10-14.
- Approximate USD view using illustrative static rates, labeled in the UI/API. Local-currency reporting remains the default. Peer detection always uses original-currency groups.
- Job-title and currency directory filters; job-title dashboard filter; country, department, job title and employment-type grouping.
- Demo registration at `/register`, defaulting to Viewer with an optional HR role. Only synthetic demo data is permitted; real deployments must replace open HR registration with invitations/approval.
- URL-based protected navigation, direct-link refresh, browser back/forward, 403 and 404 screens.
- OpenAPI 3.0 specification at `/api/openapi.json` and self-hosted Swagger UI at `/api/docs/` after sign-in.
- Structured allowlisted logs, correlation IDs on errors and transactional audit records, asynchronous database logs with console fallback and an HR log viewer. Defaults: console info+, database warn+; use `LOG_DB_MIN_LEVEL=info` to persist all requests.
- Ordered committed SQL migrations and indexes; ESLint, Prettier, test-location guard, frontend tests and desktop/mobile Playwright flows.

## Verification

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm test:web
pnpm exec playwright install chromium
pnpm test:e2e
pnpm format:check
pnpm build
pnpm smoke:production
```

The core suite has 31 backend tests plus 5 frontend tests and 6 desktop/mobile browser scenarios covering salary validation and precision, quantiles, CSV escaping, search safety, authentication, viewer redaction, access control, currency totals, CRUD, audit records, conflict handling and logout. Browser verification is recorded in `docs/verification.md`; do not interpret a documented deployment recipe as a completed public deployment.

## Deployment

For your requested free Vercel deployment, follow [the GitHub + Vercel + Turso workflow](docs/deployment.md). The hosted database keeps edits durable across function restarts; local SQLite remains available for development.

The production server serves the built React application and API from one origin. Build with `pnpm install --frozen-lockfile && pnpm build`, then start with `node server/bootstrap.ts`. Configure `NODE_ENV=production`, `DATABASE_PATH=/data/acme.sqlite`, `PORT` as assigned by the host, and `DEMO_PASSWORD`. A persistent writable disk mounted at `/data` is essential. `bootstrap.ts` initializes only an empty database and otherwise preserves existing records. TLS must terminate at the host. Set `TRUST_PROXY=1` only for a known single-hop reverse proxy; this makes client-IP rate limits accurate.

`Dockerfile` provides an alternative container deployment. SQLite requires a persistent disk and one application instance; an ephemeral serverless function is unsuitable. For multiple instances, migrate to PostgreSQL and shared rate limiting.

The source and incremental history are published at https://github.com/Hambirth/acme-salary-management . GitHub Actions runs lint, type checks, backend/frontend tests, formatting, build and Chromium tests on desktop and mobile. The public app is deployed and verified at https://acme-salary-management-ten.vercel.app/ using Vercel Hobby and Turso Starter (free; no payment method configured). The live URL is ready. The [2m36s captioned demo walkthrough](docs/demo.mp4) covers the expanded reports, registration, salary CRUD, privacy, audit/logging and Swagger. It has no voiceover. See `docs/demo-script.md` for the walkthrough.

## Documentation

- [Requirements written before code](docs/requirements.md)
- [Architecture and trade-offs](docs/architecture.md)
- [AI workflow](docs/ai-workflow.md)
- [Reference review](docs/reference-review.md)
- [Complete reference coverage](docs/reference-coverage.md)
- [Verification and limits](docs/verification.md)
- [Demo walkthrough](docs/demo-script.md)

## Deliberate limits

This is a single-organization compensation application, not a payroll engine. It has no taxes, payment execution, bonuses, live FX, SSO or password reset. Joining dates and salaries are synthetic; pay differences are descriptive and must not be used as automatic employment decisions. Audit records retain prior employee values, so real deployments need retention and privacy policies. Minimum-group suppression reduces direct disclosure but is not formal protection against inference across overlapping analytics queries. The database API is asynchronous and supports local SQLite or remote libSQL; scrypt still runs synchronously. The login rate limiter is per instance. These are not claims of unlimited concurrent traffic.
