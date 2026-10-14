import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeRows } from "../server/db.ts";

test("hosted SDK array-like rows become named JSON fields even with non-enumerable values", () => {
  const providerRow = { length: 3 };
  Object.defineProperties(providerRow, {
    0: { value: "India" },
    1: { value: "Engineering" },
    2: { value: 180000029 },
  });
  const result = normalizeRows({
    columns: ["country", "department", "salaryMinor"],
    rows: [providerRow],
  });
  assert.deepEqual(JSON.parse(JSON.stringify(result)), [
    { country: "India", department: "Engineering", salaryMinor: 180000029 },
  ]);
});
