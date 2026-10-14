import { performance } from "node:perf_hooks";
import { openDatabase } from "../server/db.ts";
import { seed } from "../server/seed.ts";
import { insights } from "../server/insights.ts";
import { listEmployees } from "../server/employees.ts";
const db = await openDatabase(":memory:");
try {
  await seed(db);
  const measurements = {};
  for (const [name, run] of Object.entries({
    directory: () =>
      listEmployees(
        db,
        { country: "India", page: 1, pageSize: 20 },
        "HR_MANAGER",
      ),
    localInsights: () => insights(db, { currency: "INR" }, "HR_MANAGER"),
    usdInsights: () => insights(db, { view: "usd" }, "HR_MANAGER"),
  })) {
    await run();
    const values = [];
    for (let i = 0; i < 30; i++) {
      const start = performance.now();
      await run();
      values.push(performance.now() - start);
    }
    values.sort((a, b) => a - b);
    measurements[name] = {
      runs: values.length,
      p50Ms: +values[14].toFixed(2),
      p95Ms: +values[28].toFixed(2),
    };
  }
  console.log(
    JSON.stringify(
      {
        node: process.version,
        platform: process.platform,
        employees: 10000,
        scope:
          "Local in-memory SQLite service calls; excludes HTTP, browser, network and hosted cold-start latency",
        measurements,
      },
      null,
      2,
    ),
  );
} finally {
  db.close();
}
