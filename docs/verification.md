# Verification record

14 October 2026, local Windows development workspace.

- `node --test tests/*.test.ts`: 20/20 passed against isolated in-memory SQLite and HTTP servers.
- TypeScript strict type checking: passed.
- Vite production build: passed; approximately 248 kB JavaScript before gzip in the initial build.
- Seed: exactly 10,000 employees; existing database overwrite refused.
- Browser: HR login, populated INR overview and paginated directory verified. Responsive layout is being reviewed on mobile and desktop.

The initial Windows sandbox blocked Vite's directory access; running the same build with approved filesystem access succeeded. The native Node TypeScript runtime is used for backend scripts to avoid an unnecessary transpiler runtime.

Not yet verified: public hosting, remote repository access, video recording, sustained concurrent-load capacity, backup/restore and multi-instance operation. There is no claim of browser E2E automation in CI; core API workflows are automated through HTTP integration tests.
