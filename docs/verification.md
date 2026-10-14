# Verification record

14 October 2026, local Windows development workspace.

- `node --test tests/*.test.ts`: 24/24 passed against isolated in-memory SQLite and HTTP servers.
- TypeScript strict type checking: passed.
- Vite production build: passed; approximately 248 kB JavaScript before gzip in the initial build.
- Seed: exactly 10,000 employees; existing database overwrite refused.
- Browser: HR login, populated overview, search, employee creation, salary editing, deletion confirmation and audit entries verified. The temporary verification employee was deleted, restoring exactly 10,000 employees. Viewer login and directory salary/action restrictions verified. Desktop and narrow responsive layouts were visually inspected.

The initial Windows sandbox blocked Vite's directory access; running the same build with approved filesystem access succeeded. The native Node TypeScript runtime is used for backend scripts to avoid an unnecessary transpiler runtime. The database adaptation for Vercel uses the official asynchronous libSQL client; the full suite passed again after that change. Remote Turso connectivity and Vercel routing were subsequently verified against the deployed application.

Not yet verified: video recording, sustained concurrent-load capacity, backup/restore and multi-instance operation. There is no claim of browser E2E automation in CI; core API workflows are automated through HTTP integration tests.

GitHub publication: https://github.com/Hambirth/acme-salary-management . Commit 11468d4 passed the GitHub Actions verification workflow on Linux: https://github.com/Hambirth/acme-salary-management/actions/runs/38549461192 . Vercel and Turso dashboard sign-in was completed by the candidate, who also accepted the integration terms.

Public deployment verified: https://acme-salary-management-ten.vercel.app/ . Vercel Hobby and Turso Starter were confirmed; the integration reports no payment method configured. The hosted database was seeded through its authenticated SQL console with the same deterministic employee generator, using five batches of 2,000 and two salted demo password hashes. Database tokens were not copied into chat or source files.

Live HTTP verification command: node scripts/smoke-live.mjs https://acme-salary-management-ten.vercel.app . Passed health, both roles, 10,000 records, pagination, country/department filters, INR headcount 1,657, CSV, create/update/delete, exact cents, stale updates, audit records and viewer restrictions. Cleanup removed the temporary test record. Data persisted across application redeployments.

Deployment fixes: explicitly included server TypeScript modules in the Vercel function; selected Turso's current serverless compatibility driver for the hosted database; normalized provider array-like rows into named JSON fields. A regression test covers the serialization difference.

## Reference extension verification — 14 October 2026

The expanded suite adds tenure anniversary boundaries, USD conversion/filtering/rounding, minimum-group privacy, migration repeatability, registration/role validation, correlation IDs, safe logging/fallback and cross-origin rejection. Six React Testing Library tests cover report columns/privacy/empty state, registration and authentication errors. Six Playwright scenarios run HR CRUD/CSV/audit/docs, Viewer restrictions and registration/routing on both desktop Chromium and mobile emulation, against a separate in-memory 10,000-employee database. No public database is used by those tests.

A local service benchmark (`node scripts/benchmark.mjs`, Node 24.19, Windows, 30 warmed samples each, 10,000 employees) measured directory p50/p95 2.38/4.08 ms, local insights 35.00/48.46 ms and combined USD insights 215.30/268.11 ms. These figures exclude HTTP/network/browser and hosted cold starts; they do not predict Vercel/Turso latency.

GitHub Actions passed the expanded suite on 26494d4. The first live check exposed Vercel's rewritten internal Host differing from the browser's public Origin. Origin resolution now uses Vercel gateway forwarded host/protocol only inside Vercel, with a regression test that rejects trusting those headers outside the gateway. The backend suite now contains 31 passing tests.

Live verification confirmed durable data and the new analytics/OpenAPI. It also exposed Vercel's trailing-slash directory routing for Swagger. The app now serves the docs index explicitly and uses canonical non-trailing URLs; the platform redirects trailing variants to that endpoint.

Final public verification passed on 29ae926: both demo logins with browser Origin headers, 10,000 employees, filters/pagination, local and combined USD reports, tenure, full salary stats, authenticated Swagger, HR logs, exact salary create/update, stale-write conflict, correlated audit, CSV and Viewer restrictions. The temporary employee was removed and headcount restored. GitHub Actions passed all 31 backend + 6 frontend + 6 desktop/mobile browser scenarios. The expanded 17-scene captioned demo is published at `docs/demo.mp4`; its MP4 fully decodes and every scene was sampled for visual review.

A final browser login received one transient non-JSON hosting error; the next attempt and direct API checks succeeded. The client now converts such platform responses into a readable retry message instead of exposing JSON parser errors. A frontend regression test covers this behavior. Final totals: 31 backend, 6 frontend and 6 desktop/mobile browser scenarios, plus the production-start smoke check.

## Complete fresh demo recording

At the user's request, the latest `docs/demo.mp4` is a fresh 40-section walkthrough of the current live app, including its new title and branding. The verified duration is 6m07s (4,380,980 bytes, H.264 MP4, captions, no voiceover). All video frames decode successfully and all 40 sections were sampled and visually reviewed. Exact timestamps are in `docs/demo-chapters.md`.

The recording shows HR login/reports, local and approximate USD views, group statistics/tenure/outliers, search/filters/sort/pages/CSV, exact-cent employee creation/update/deletion, correlated audit/logs, Swagger HTTP 200, registration options, Viewer salary-free UI/API, audit HTTP 403, protected/unknown pages, logout, AI workflow and passing CI. The temporary fixture was removed; the recorded Viewer API response reports exactly 10,000 employees.
