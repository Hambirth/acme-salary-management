import { openDatabase } from "./db.ts";
import { seed } from "./seed.ts";
const db = await openDatabase();
try {
  const count = (
    (await db.prepare("SELECT count(*) AS n FROM employees").get()) as {
      n: number;
    }
  ).n;
  if (count === 0) await seed(db);
} finally {
  db.close();
}
await import("./index.ts");
