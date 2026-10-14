# Verification record

14 October 2026, local Windows development workspace.

- `node --test tests/*.test.ts`: 23/23 passed against isolated in-memory SQLite and HTTP servers.
- TypeScript strict type checking: passed.
- Vite production build: passed; approximately 248 kB JavaScript before gzip in the initial build.
- Seed: exactly 10,000 employees; existing database overwrite refused.
- Browser: HR login, populated overview, search, employee creation, salary editing, deletion confirmation and audit entries verified. The temporary verification employee was deleted, restoring exactly 10,000 employees. Viewer login and directory salary/action restrictions verified. Desktop and narrow responsive layouts were visually inspected.

The initial Windows sandbox blocked Vite's directory access; running the same build with approved filesystem access succeeded. The native Node TypeScript runtime is used for backend scripts to avoid an unnecessary transpiler runtime. The database adaptation for Vercel uses the official asynchronous libSQL client; the full suite passed again after that change. Remote Turso connectivity and Vercel routing are prepared but cannot be verified without account access.

Not yet verified: public hosting, remote repository access, video recording, sustained concurrent-load capacity, backup/restore and multi-instance operation. There is no claim of browser E2E automation in CI; core API workflows are automated through HTTP integration tests.

GitHub publication: https://github.com/Hambirth/acme-salary-management . Commit 11468d4 passed the GitHub Actions verification workflow on Linux: https://github.com/Hambirth/acme-salary-management/actions/runs/38549461192 . Vercel and Turso dashboard sign-in is pending; no public app deployment is claimed.
