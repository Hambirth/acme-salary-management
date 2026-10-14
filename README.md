# ACME Compensation

A salary management workspace for ACME's HR team: manage 10,000 employees across six countries and understand annual base compensation without mixing currencies.

## Run locally

Requires Node.js 24.19 or later and pnpm 11.25. SQLite is built into Node; no external database service is required.

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

These are intentionally public demo accounts and all employee records are synthetic. Use a different `DEMO_PASSWORD` when seeding a hosted environment; enter that password in the login form. Never load real employee data into a publicly accessible demo.

## Included

- Responsive React overview with headcount, budget, average/median salary, grouped comparisons, workforce mix, salary distribution and peer outlier review.
- Server-side directory search, country/department filters, validated sorting, pagination, employee creation/editing/deletion and filtered CSV export.
- Cookie sessions with server-side revocation, scrypt password hashing, login rate limiting, request protection header and secure headers.
- API-enforced HR/viewer permissions. Viewer responses omit individual salaries; salary sorting and writes are rejected. Viewer analytics suppress groups below five and omit extremes, distributions and outliers.
- Exact salary storage in integer minor units, optimistic concurrency checks and transactional audit records.
- Deterministic seed with 10,000 employees. Tests use in-memory SQLite and actual HTTP requests, without external services.

## Verification

```sh
pnpm typecheck
pnpm test
pnpm format:check
pnpm build
```

The initial core suite has 20 passing tests covering salary validation and precision, quantiles, CSV escaping, search safety, authentication, viewer redaction, access control, currency totals, CRUD, audit records, conflict handling and logout. Browser verification is recorded in `docs/verification.md`; do not interpret a documented deployment recipe as a completed public deployment.

## Deployment

The production server serves the built React application and API from one origin. Build with `pnpm install --frozen-lockfile && pnpm build`, then start with `node server/bootstrap.ts`. Configure `NODE_ENV=production`, `DATABASE_PATH=/data/acme.sqlite`, `PORT` as assigned by the host, and `DEMO_PASSWORD`. A persistent writable disk mounted at `/data` is essential. `bootstrap.ts` initializes only an empty database and otherwise preserves existing records. TLS must terminate at the host. Set `TRUST_PROXY=1` only for a known single-hop reverse proxy; this makes client-IP rate limits accurate.

`Dockerfile` provides an alternative container deployment. SQLite requires a persistent disk and one application instance; an ephemeral serverless function is unsuitable. For multiple instances, migrate to PostgreSQL and shared rate limiting.

The repository has not yet been pushed to a remote or deployed to a public hosting account. A public URL and recorded walkthrough remain submission steps. See `docs/demo-script.md` for the walkthrough.

## Documentation

- [Requirements written before code](docs/requirements.md)
- [Architecture and trade-offs](docs/architecture.md)
- [AI workflow](docs/ai-workflow.md)
- [Reference review](docs/reference-review.md)
- [Verification and limits](docs/verification.md)
- [Demo walkthrough](docs/demo-script.md)

## Deliberate limits

This is a single-organization compensation application, not a payroll engine. It has no taxes, payment execution, bonuses, live FX, SSO, self-registration or password reset. Joining dates and salaries are synthetic; pay differences are descriptive and must not be used as automatic employment decisions. Audit records retain prior employee values, so real deployments need retention and privacy policies. Minimum-group suppression reduces direct disclosure but is not formal protection against inference across overlapping analytics queries. Synchronous SQLite and scrypt are pragmatic for this assessment scale, not a claim of unlimited concurrent traffic.
