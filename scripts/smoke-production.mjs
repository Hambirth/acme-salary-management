import { spawn } from "node:child_process";
import assert from "node:assert/strict";
const env = {
  ...process.env,
  NODE_ENV: "production",
  DATABASE_PATH: ":memory:",
  PORT: "4201",
  LOG_LEVEL: "error",
};
for (const key of ["VERCEL", "TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN"])
  delete env[key];
const invalid = spawn(process.execPath, ["server/index.ts"], {
  env: { ...env, VERCEL: "1" },
  stdio: ["ignore", "ignore", "pipe"],
});
let diagnostic = "";
invalid.stderr.on("data", (chunk) => {
  diagnostic += chunk;
});
const invalidCode = await new Promise((resolve, reject) => {
  invalid.once("error", reject);
  invalid.once("exit", resolve);
});
assert.notEqual(
  invalidCode,
  0,
  "missing hosted configuration must fail startup",
);
assert.ok(diagnostic.includes("TURSO_DATABASE_URL is required"));
const child = spawn(process.execPath, ["server/index.ts"], {
  env,
  stdio: "ignore",
});
const closed = new Promise((resolve, reject) => {
  child.once("error", reject);
  child.once("exit", (code, signal) => resolve({ code, signal }));
});
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      const response = await fetch("http://127.0.0.1:4201/api/health");
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      /* startup not ready yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, "production server must answer its health check");
  const ui = await fetch("http://127.0.0.1:4201/login");
  assert.equal(ui.status, 200);
  assert.ok((await ui.text()).includes('id="root"'));
} finally {
  child.kill("SIGTERM");
}
const result = await closed;
if (process.platform !== "win32")
  assert.equal(result.code, 0, "production SIGTERM must close cleanly");
console.log(
  "PASS: production start, missing-config guard, database health, built UI and shutdown; isolated in-memory database.",
);
