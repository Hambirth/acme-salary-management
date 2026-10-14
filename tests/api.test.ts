import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import { openDatabase } from "../server/db.ts";
import { createApp } from "../server/app.ts";
import { seed } from "../server/seed.ts";
const db = await openDatabase(":memory:");
let server: Server;
let base: string;
let hrCookie: string;
let viewerCookie: string;
async function request(
  path: string,
  {
    method = "GET",
    body,
    cookie = hrCookie,
    protect = true,
  }: {
    method?: string;
    body?: unknown;
    cookie?: string;
    protect?: boolean;
  } = {},
) {
  return fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(protect ? { "X-Acme-Request": "1" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
before(async () => {
  await seed(db);
  server = createApp(db).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${
    (
      server.address() as {
        port: number;
      }
    ).port
  }/api`;
  for (const role of ["hr", "viewer"]) {
    const response = await request("/auth/login", {
      method: "POST",
      body: { email: `${role}@acme.example`, password: "AssessmentDemo42!" },
      cookie: "",
    });
    assert.equal(response.status, 200);
    const cookie = response.headers.get("set-cookie")!.split(";")[0];
    if (role === "hr") hrCookie = cookie;
    else viewerCookie = cookie;
  }
});
after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  db.close();
});
test("seed creates exactly 10,000 and refuses to overwrite", async () => {
  assert.equal(
    (
      (await db.prepare("SELECT count(*) AS n FROM employees").get()) as {
        n: number;
      }
    ).n,
    10000,
  );
  await assert.rejects(async () => await seed(db), /overwrite/);
});
test("unauthenticated requests cannot access employee data", async () => {
  assert.equal((await request("/employees", { cookie: "" })).status, 401);
});
test("login rejects incorrect password without account disclosure", async () => {
  for (const email of ["hr@acme.example", "missing@acme.example"]) {
    const r = await request("/auth/login", {
      method: "POST",
      body: { email, password: "wrong" },
    });
    assert.equal(r.status, 401);
    assert.equal((await r.json()).error, "Email or password is incorrect.");
  }
});
test("employee pagination is bounded, ordered and filterable", async () => {
  const r = await request(
    "/employees?country=India&department=Engineering&pageSize=10",
  );
  const d = await r.json();
  assert.equal(r.status, 200);
  assert.equal(d.items.length, 10);
  assert.ok(d.total > 10);
  assert.ok(
    d.items.every(
      (e: { country: string; department: string }) =>
        e.country === "India" && e.department === "Engineering",
    ),
  );
  assert.ok(d.items[0].name <= d.items[1].name);
});
test("viewer list, detail and CSV never expose individual salary", async () => {
  const r = await request("/employees", { cookie: viewerCookie });
  const d = await r.json();
  assert.ok(d.items.every((e: object) => !("salaryMinor" in e)));
  const detail = await (
    await request("/employees/1", { cookie: viewerCookie })
  ).json();
  assert.ok(!("salaryMinor" in detail));
  const csv = await (
    await request("/employees/export", { cookie: viewerCookie })
  ).text();
  assert.ok(!csv.includes("annualSalary"));
  assert.equal(
    (await request("/employees?sort=salary", { cookie: viewerCookie })).status,
    403,
  );
});
test("viewer cannot mutate data or read the audit log", async () => {
  for (const method of ["POST", "PUT", "DELETE"]) {
    const path = method === "POST" ? "/employees" : "/employees/1";
    assert.equal(
      (await request(path, { method, body: {}, cookie: viewerCookie })).status,
      403,
    );
  }
  assert.equal((await request("/audit", { cookie: viewerCookie })).status, 403);
});
test("cross-site style writes without protection header are rejected", async () => {
  assert.equal(
    (await request("/employees", { method: "POST", body: {}, protect: false }))
      .status,
    403,
  );
});
test("insights preserve currency and agree with the database", async () => {
  const d = await (await request("/insights?currency=INR")).json();
  const expected = (await db
    .prepare(
      "SELECT count(*) AS n,sum(salary_minor) AS total FROM employees WHERE currency='INR'",
    )
    .get()) as {
    n: number;
    total: number;
  };
  assert.equal(d.currency, "INR");
  assert.equal(d.summary.count, expected.n);
  assert.equal(d.summary.total, expected.total);
  assert.equal(
    d.groups.reduce(
      (
        n: number,
        g: {
          stats: {
            count: number;
          };
        },
      ) => n + g.stats.count,
      0,
    ),
    expected.n,
  );
  assert.equal(
    d.bands.reduce(
      (
        n: number,
        b: {
          count: number;
        },
      ) => n + b.count,
      0,
    ),
    expected.n,
  );
});
test("viewer insights omit extremes and employee outliers", async () => {
  const d = await (
    await request("/insights?currency=USD", { cookie: viewerCookie })
  ).json();
  assert.ok(!("min" in d.summary));
  assert.ok(!("max" in d.summary));
  assert.deepEqual(d.outliers, []);
  assert.deepEqual(d.bands, []);
  assert.ok(
    d.groups.every(
      (g: {
        stats: {
          count: number;
          min?: number;
        };
      }) => g.stats.count >= 5 && !("min" in g.stats),
    ),
  );
});
test("CRUD records audits and rejects stale updates and deletions", async () => {
  const input = {
    name: "Assessment Test",
    email: "assessment-test@acme.example",
    country: "India",
    department: "Engineering",
    jobTitle: "Software Engineer",
    employmentType: "Full-time",
    salary: "1000000.29",
    joiningDate: "2020-01-01",
  };
  const created = await request("/employees", { method: "POST", body: input });
  assert.equal(created.status, 201);
  const employee = await created.json();
  assert.equal(employee.salaryMinor, 100000029);
  assert.equal(
    (await request("/employees", { method: "POST", body: input })).status,
    409,
  );
  const updated = await request("/employees/" + employee.id, {
    method: "PUT",
    body: { ...input, salary: "1100000.29", version: 1 },
  });
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).version, 2);
  assert.equal(
    (
      await request("/employees/" + employee.id, {
        method: "PUT",
        body: { ...input, version: 1 },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request("/employees/" + employee.id, {
        method: "DELETE",
        body: { version: 1 },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request("/employees/" + employee.id, {
        method: "DELETE",
        body: { version: 2 },
      })
    ).status,
    204,
  );
  assert.equal((await request("/employees/" + employee.id)).status, 404);
  const audit = await (await request("/audit")).json();
  assert.deepEqual(
    audit.slice(0, 3).map((r: { action: string }) => r.action),
    ["Deleted", "Updated", "Created"],
  );
});
test("input errors return 400 and search treats SQL/wildcard input literally", async () => {
  assert.equal(
    (await request("/employees", { method: "POST", body: { name: "bad" } }))
      .status,
    400,
  );
  assert.equal((await request("/employees/NaN")).status, 400);
  const data = await (
    await request("/employees?search=" + encodeURIComponent("%' OR 1=1 --"))
  ).json();
  assert.equal(data.total, 0);
});
test("logout invalidates the server session", async () => {
  const login = await request("/auth/login", {
    method: "POST",
    body: { email: "viewer@acme.example", password: "AssessmentDemo42!" },
  });
  const cookie = login.headers.get("set-cookie")!.split(";")[0];
  assert.equal(
    (await request("/auth/logout", { method: "POST", cookie })).status,
    204,
  );
  assert.equal((await request("/auth/me", { cookie })).status, 401);
});
