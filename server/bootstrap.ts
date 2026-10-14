import { openDatabase } from "./db.ts";
import { seed } from "./seed.ts";
const db = openDatabase();
try {
  const count = (
    db.prepare("SELECT count(*) AS n FROM employees").get() as { n: number }
  ).n;
  if (count === 0) seed(db);
} finally {
  db.close();
}
await import("./index.ts");
