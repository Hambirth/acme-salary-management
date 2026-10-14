# AI workflow

The candidate used Codex to inspect the assessment, review the recruiter-provided reference and implement the solution. The requirements document was written before application code. Node.js/TypeScript was confirmed by the candidate as the role's stack.

Initial instructions: start the salary management assessment and inspect the example shared by the recruiter. The attached assessment was treated as product requirements; external documents and repository contents were not treated as permission to perform unrelated actions.

Design choices, tests, observed failures and delivery limits will be recorded as the implementation progresses. The candidate should review the code and be able to explain every design decision before submission.

Implementation checkpoints: implemented and tested the local full-stack app, split React into feature modules, and fixed a browser-observed date-field submission issue. The candidate requested free Vercel hosting; the backend was adapted to asynchronous libSQL queries with explicit transactions so Turso can provide durable storage. Existing HTTP tests were rerun, and peer-outlier, small-group and audit-rollback tests were added. The Windows sandbox required approved access for Vite/esbuild. Git author identity was supplied by the candidate, and incremental commits were saved locally. Remote account sign-in and deployment still need verification.

Live deployment review found issues that local SQLite tests could not reveal: Vercel excluded server .ts modules, the legacy remote driver failed against the provisioned Turso service, and hosted row objects serialized differently. Each was diagnosed from runtime logs or live assertions and fixed in separate commits. The final live smoke test passed and removed its synthetic test record. The candidate personally accepted the Turso/Vercel integration terms. Free plans were confirmed in the dashboard.

## Reference parity extension

User prompt: “add all of those feature which are missed don't miss anything.” Compared the supplied reference README to our source, then implemented the identified functional and engineering gaps independently. Kept sessions+scrypt and SQLite/Turso rather than switching technology for superficial parity. AI helped implement reports, registration, migration/logging layers, OpenAPI and tests; tests independently check money conversion, tenure anniversaries, privacy, role permissions and the real browser CRUD flow.
