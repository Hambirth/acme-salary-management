import { openDatabase } from "./db.ts";
import { createApp } from "./app.ts";
const db = await openDatabase();
const port = Number(process.env.PORT ?? 4000);
const server = createApp(db).listen(port, "0.0.0.0", () =>
  console.log(`ACME API listening on http://localhost:${port}`),
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    server.close(() => {
      db.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  });
