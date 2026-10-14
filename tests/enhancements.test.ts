import { test } from "node:test";
import assert from "node:assert/strict";
import { openDatabase, migrate } from "../server/db.ts";
import { insights, tenureBand } from "../server/insights.ts";
import { saveEmployee } from "../server/employees.ts";
import { createLogger } from "../server/logging.ts";
import { createApp } from "../server/app.ts";

test("tenure uses calendar anniversaries and explicit boundary bands", () => {
  assert.equal(tenureBand("2025-10-15"), "Under 1 year");
  assert.equal(tenureBand("2025-10-14"), "1–2 years");
  assert.equal(tenureBand("2023-10-14"), "3–4 years");
  assert.equal(tenureBand("2021-10-14"), "5–9 years");
  assert.equal(tenureBand("2016-10-14"), "10+ years");
});
test("USD view converts each source currency, honors filters and protects viewer tenure", async () => {
  const db = await openDatabase(":memory:");
  try {
    for (const [i, country, salary] of [
      [1, "India", "10000"],
      [2, "United States", "100"],
      [3, "United Kingdom", "100"],
    ] as const)
      await saveEmployee(
        db,
        {
          name: "FX Employee",
          email: `fx${i}@acme.example`,
          country,
          department: "Engineering",
          jobTitle: "Engineer",
          employmentType: "Full-time",
          salary,
          joiningDate: "2020-01-01",
        },
        "test",
      );
    const report = await insights(
      db,
      { view: "usd", groupBy: "employmentType" },
      "HR_MANAGER",
    );
    assert.equal(report.summary?.total, 34700);
    assert.equal(report.summary?.count, 3);
    assert.equal(report.currency, "USD");
    assert.equal(report.approximate, true);
    assert.equal(report.tenure[0].name, "5–9 years");
    assert.equal(report.groups[0].name, "Full-time");
    assert.equal(
      (await insights(db, { view: "usd", country: "India" }, "HR_MANAGER"))
        .summary?.total,
      12000,
    );
    const viewer = await insights(db, { view: "usd" }, "VIEWER");
    assert.equal(viewer.summary, null);
    assert.deepEqual(viewer.tenure, []);
    await assert.rejects(() => insights(db, { view: "bogus" }, "HR_MANAGER"));
  } finally {
    db.close();
  }
});
test("versioned migrations are repeatable and create observability indexes", async () => {
  const db = await openDatabase(":memory:");
  try {
    await migrate(db);
    assert.deepEqual(
      (
        await db
          .prepare("SELECT version FROM schema_migrations ORDER BY version")
          .all()
      ).map((r) => r.version),
      [1, 2],
    );
    assert.ok(
      await db
        .prepare(
          "SELECT name FROM sqlite_master WHERE name='idx_employees_job_title'",
        )
        .get(),
    );
  } finally {
    db.close();
  }
});
test("registration defaults to viewer, validates role, persists redacted correlated logs, and serves OpenAPI", async () => {
  const db = await openDatabase(":memory:");
  const app = createApp(db),
    server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;
  const post = (body: object) =>
    fetch(base + "/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Acme-Request": "1" },
      body: JSON.stringify(body),
    });
  try {
    const input = {
      name: "New Viewer",
      email: "new@acme.example",
      password: "StrongExample42!",
    };
    const response = await post(input);
    assert.equal(response.status, 201);
    assert.equal((await response.json()).role, "VIEWER");
    const cookie = response.headers.get("set-cookie")!.split(";")[0];
    assert.equal(
      (await fetch(base + "/audit", { headers: { Cookie: cookie } })).status,
      403,
    );
    const invalid = await post({
      ...input,
      email: "other@acme.example",
      role: "ADMIN",
    });
    assert.equal(invalid.status, 400);
    const error = await invalid.json();
    assert.equal(error.requestId, invalid.headers.get("x-request-id"));
    assert.equal(error.code, "VALIDATION_ERROR");
    await app.locals.flushLogs();
    const logs = await db.prepare("SELECT * FROM application_logs").all();
    assert.ok(logs.some((r) => r.request_id === error.requestId));
    assert.ok(!JSON.stringify(logs).includes(input.password));
    assert.ok(!JSON.stringify(logs).includes(input.email));
    const spec = await fetch(base + "/openapi.json", {
      headers: { Cookie: cookie },
    });
    assert.equal((await spec.json()).openapi, "3.0.3");
    assert.equal((await post(input)).status, 409);
    assert.equal(
      (await post({ ...input, email: "weak@acme.example", password: "short" }))
        .status,
      400,
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await app.locals.flushLogs();
    db.close();
  }
});

test("database logging failure falls back to console without failing the request", async (t) => {
  const db = await openDatabase(":memory:");
  const fallback = t.mock.method(console, "error", () => {});
  try {
    await db.exec(
      "CREATE TRIGGER fail_log BEFORE INSERT ON application_logs BEGIN SELECT RAISE(ABORT,'offline'); END;",
    );
    const logger = createLogger(db);
    logger.write({
      requestId: "fallback-test",
      level: "error",
      method: "GET",
      path: "/api/health",
      status: 500,
      durationMs: 1,
    });
    await logger.flush();
    assert.equal(fallback.mock.callCount(), 1);
    assert.ok(
      String(fallback.mock.calls[0].arguments[0]).includes("fallback-test"),
    );
  } finally {
    db.close();
  }
});

test("cross-origin writes are rejected even with the custom request header", async () => {
  const db = await openDatabase(":memory:");
  const app = createApp(db),
    server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  try {
    const response = await fetch(
      `http://127.0.0.1:${(server.address() as { port: number }).port}/api/auth/register`,
      {
        method: "POST",
        headers: {
          Origin: "https://other.example",
          "X-Acme-Request": "1",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Blocked User",
          email: "blocked@example.com",
          password: "StrongPassword42!",
        }),
      },
    );
    assert.equal(response.status, 403);
    assert.equal((await response.json()).code, "FORBIDDEN");
    assert.equal(
      (await db.prepare("SELECT count(*) AS n FROM users").get())!.n,
      0,
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await app.locals.flushLogs();
    db.close();
  }
});
