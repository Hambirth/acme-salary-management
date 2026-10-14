import assert from "node:assert/strict";

const base = process.argv[2]?.replace(/\/$/, "");
if (!base)
  throw new Error(
    "Usage: node scripts/smoke-live.mjs https://your-deployment.vercel.app",
  );
const password = process.env.DEMO_PASSWORD ?? "AssessmentDemo42!";
async function request(path, { method = "GET", body, cookie = "" } = {}) {
  return fetch(base + "/api" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Acme-Request": "1",
      Origin: base,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
async function login(email) {
  const r = await request("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  assert.equal(r.status, 200, "login");
  const cookie = r.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie, "session cookie");
  return cookie;
}
assert.equal((await request("/health")).status, 200, "health");
const hr = await login("hr@acme.example");
const viewer = await login("viewer@acme.example");
let created;
try {
  const directory = await (
    await request("/employees?pageSize=20", { cookie: hr })
  ).json();
  assert.equal(directory.total, 10000, "seeded headcount");
  assert.equal(directory.items.length, 20, "pagination");
  const filtered = await (
    await request("/employees?country=India&department=Engineering", {
      cookie: hr,
    })
  ).json();
  assert.ok(filtered.items.length > 0);
  assert.ok(
    filtered.items.every(
      (e) => e.country === "India" && e.department === "Engineering",
    ),
  );
  const report = await (
    await request("/insights?currency=INR", { cookie: hr })
  ).json();
  assert.equal(report.summary.count, 1657, "deterministic INR population");
  assert.equal(report.organizationHeadcount, 10000);
  assert.ok(report.tenure.length > 0);
  assert.equal(report.tenureAsOf, "2026-10-14");
  assert.ok(report.groups.every((g) => "p25" in g.stats && "min" in g.stats));
  const usd = await (
    await request("/insights?view=usd&groupBy=employmentType", { cookie: hr })
  ).json();
  assert.equal(usd.summary.count, 10000);
  assert.equal(usd.currency, "USD");
  assert.equal(usd.approximate, true);
  const specification = await (
    await request("/openapi.json", { cookie: hr })
  ).json();
  assert.equal(specification.info.version, "2.0.0");
  assert.equal((await request("/docs/", { cookie: hr })).status, 200);
  assert.equal((await request("/logs", { cookie: viewer })).status, 403);
  assert.equal((await request("/logs", { cookie: hr })).status, 200);
  const csv = await request(
    "/employees/export?country=India&department=Engineering",
    { cookie: hr },
  );
  assert.equal(csv.status, 200);
  assert.ok((await csv.text()).includes("annualSalary"));
  const input = {
    name: "Deployment Verification",
    email: `deployment-check-${Date.now()}@acme.example`,
    country: "India",
    department: "Engineering",
    jobTitle: "Software Engineer",
    employmentType: "Full-time",
    salary: "1800000.29",
    joiningDate: "2020-01-15",
  };
  const create = await request("/employees", {
    method: "POST",
    body: input,
    cookie: hr,
  });
  assert.equal(create.status, 201, "create employee");
  created = await create.json();
  assert.equal(created.salaryMinor, 180000029);
  const update = await request("/employees/" + created.id, {
    method: "PUT",
    body: { ...input, salary: "1900000.29", version: created.version },
    cookie: hr,
  });
  assert.equal(update.status, 200, "update employee");
  created = await update.json();
  assert.equal(created.salaryMinor, 190000029);
  assert.equal(created.version, 2);
  assert.equal(
    (
      await request("/employees/" + created.id, {
        method: "PUT",
        body: { ...input, version: 1 },
        cookie: hr,
      })
    ).status,
    409,
    "stale update",
  );
  const audit = await (await request("/audit", { cookie: hr })).json();
  assert.ok(
    audit.some(
      (a) =>
        a.employeeId === created.id &&
        a.action === "Updated" &&
        a.requestId === update.headers.get("x-request-id"),
    ),
  );
  const viewerList = await (
    await request("/employees", { cookie: viewer })
  ).json();
  assert.ok(viewerList.items.every((e) => !("salaryMinor" in e)));
  assert.equal(
    (
      await request("/employees", {
        method: "POST",
        body: input,
        cookie: viewer,
      })
    ).status,
    403,
    "viewer write rejection",
  );
  assert.equal(
    (await request("/audit", { cookie: viewer })).status,
    403,
    "viewer audit rejection",
  );
  const aggregates = await (
    await request("/insights?currency=USD", { cookie: viewer })
  ).json();
  assert.ok(!("min" in aggregates.summary));
  assert.equal(aggregates.outliers.length, 0);
  console.log(
    "PASS: live health, HR/viewer login, 10,000 employees, filters, pagination, currency/approximate USD/tenure insights, Swagger, logs, CSV, exact salary CRUD, stale-write rejection, audit and viewer restrictions.",
  );
} finally {
  if (created) {
    const deletion = await request("/employees/" + created.id, {
      method: "DELETE",
      body: { version: created.version },
      cookie: hr,
    });
    assert.equal(deletion.status, 204, "verification record cleanup");
    console.log(
      "PASS: temporary verification employee removed; headcount restored.",
    );
  }
  await request("/auth/logout", { method: "POST", cookie: hr });
  await request("/auth/logout", { method: "POST", cookie: viewer });
}
