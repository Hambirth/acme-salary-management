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
