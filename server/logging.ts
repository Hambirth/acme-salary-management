import { waitUntil } from "@vercel/functions";
import type { DB } from "./db.ts";
export type LogLevel = "debug" | "info" | "warn" | "error";
const levels: LogLevel[] = ["debug", "info", "warn", "error"];
export function createLogger(db: DB) {
  const minimum = process.env.LOG_LEVEL ?? "info";
  const persistMinimum = process.env.LOG_DB_MIN_LEVEL ?? "warn";
  if (
    !levels.includes(minimum as LogLevel) ||
    !levels.includes(persistMinimum as LogLevel)
  )
    throw new Error(
      "LOG_LEVEL and LOG_DB_MIN_LEVEL must be debug, info, warn, or error",
    );
  const pending = new Set<Promise<void>>();
  return {
    // Allowlisted fields exclude cookies, headers, bodies, query strings and passwords.
    write(record: {
      requestId: string;
      level: LogLevel;
      method: string;
      path: string;
      status: number;
      durationMs: number;
    }) {
      if (levels.indexOf(record.level) >= levels.indexOf(minimum as LogLevel))
        console.log(
          JSON.stringify({ ...record, time: new Date().toISOString() }),
        );
      if (
        levels.indexOf(record.level) <
        levels.indexOf(persistMinimum as LogLevel)
      )
        return;
      const task = db
        .prepare(
          "INSERT INTO application_logs(request_id,level,method,path,status,duration_ms) VALUES(?,?,?,?,?,?)",
        )
        .run(
          record.requestId,
          record.level,
          record.method,
          record.path,
          record.status,
          record.durationMs,
        )
        .then(() => {})
        .catch(() =>
          console.error(
            JSON.stringify({
              level: "error",
              requestId: record.requestId,
              message:
                "Application log persistence failed; console record retained.",
            }),
          ),
        );
      pending.add(task);
      void task.finally(() => pending.delete(task));
      if (process.env.VERCEL) waitUntil(task);
    },
    async flush() {
      await Promise.all([...pending]);
    },
  };
}
