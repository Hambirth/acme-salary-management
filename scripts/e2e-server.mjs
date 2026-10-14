import { openDatabase } from "../server/db.ts";
import { createApp } from "../server/app.ts";
import { seed } from "../server/seed.ts";
const db = await openDatabase(":memory:");
await seed(db);
const app = createApp(db);
const server = app.listen(4100, "127.0.0.1");
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () =>
    server.close(async () => {
      await app.locals.flushLogs();
      db.close();
      process.exit(0);
    }),
  );
