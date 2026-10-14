import { test, after } from "node:test";
import assert from "node:assert/strict";
import { openDatabase } from "../server/db.ts";
import { insights } from "../server/insights.ts";
import { saveEmployee } from "../server/employees.ts";

const db = await openDatabase(":memory:");
after(() => db.close());
const input = {
  name: "Test Employee",
  email: "",
  country: "India",
  department: "Engineering",
  jobTitle: "Software Engineer",
  employmentType: "Full-time",
  salary: "100000",
  joiningDate: "2020-01-01",
};
test("peer outliers use IQR within matching country, title and employment type", async () => {
  for (const [i, salary] of [
    "100000",
    "110000",
    "120000",
    "130000",
    "140000",
    "1000000",
  ].entries())
    await saveEmployee(
      db,
      { ...input, email: `peer${i}@acme.example`, salary },
      "test",
    );
  await saveEmployee(
    db,
    {
      ...input,
      email: "different-peer@acme.example",
      jobTitle: "Director",
      salary: "2000000",
    },
    "test",
  );
  const report = await insights(db, { currency: "INR" }, "HR_MANAGER");
  assert.equal(report.outlierCount, 1);
  assert.equal(report.outliers[0].salary, 100000000);
  assert.equal(report.outliers[0].kind, "Above range");
  assert.equal(report.summary?.count, 7);
});
test("viewer summary and group statistics are suppressed for a single selected person", async () => {
  const report = await insights(
    db,
    { currency: "INR", search: "peer0@acme.example" },
    "VIEWER",
  );
  assert.equal(report.filteredHeadcount, 1);
  assert.equal(report.summary, null);
  assert.deepEqual(report.groups, []);
  assert.deepEqual(report.outliers, []);
});
test("audit failure rolls back the employee mutation atomically", async () => {
  await db.exec(
    "CREATE TRIGGER reject_audit BEFORE INSERT ON audit BEGIN SELECT RAISE(ABORT,'audit unavailable'); END;",
  );
  await assert.rejects(
    () =>
      saveEmployee(db, { ...input, email: "rollback@acme.example" }, "test"),
    /audit unavailable/,
  );
  const employee = await db
    .prepare("SELECT id FROM employees WHERE email=?")
    .get("rollback@acme.example");
  assert.equal(employee, undefined);
  await db.exec("DROP TRIGGER reject_audit");
});
