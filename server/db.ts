import {
  createClient as createRemoteClient,
  type Client as RemoteClient,
  type Transaction as RemoteTransaction,
} from "@tursodatabase/serverless/compat";
import {
  createClient,
  type Client,
  type Transaction,
  type InValue,
  type InStatement,
} from "@libsql/client";
import { readFile } from "node:fs/promises";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
export type Row = Record<string, unknown>;
export function normalizeRows(result: {
  columns: string[];
  rows: readonly ArrayLike<unknown>[];
}): Row[] {
  return result.rows.map((row) =>
    Object.fromEntries(
      result.columns.map((column, index) => [column, row[index]]),
    ),
  );
}
export type DB = {
  prepare(sql: string): {
    get(...args: InValue[]): Promise<Row | undefined>;
    all(...args: InValue[]): Promise<Row[]>;
    run(
      ...args: InValue[]
    ): Promise<{ changes: number; lastInsertRowid: bigint | undefined }>;
  };
  exec(sql: string): Promise<void>;
  batch(statements: InStatement[]): Promise<void>;
  transaction(): Promise<{
    db: DB;
    commit(): Promise<void>;
    rollback(): Promise<void>;
  }>;
  close(): void;
};
function wrap(
  client: Client | Transaction | RemoteClient | RemoteTransaction,
): DB {
  return {
    prepare(sql) {
      return {
        async get(...args) {
          return normalizeRows(await client.execute({ sql, args }))[0];
        },
        async all(...args) {
          return normalizeRows(await client.execute({ sql, args }));
        },
        async run(...args) {
          const result = await client.execute({ sql, args });
          return {
            changes: result.rowsAffected,
            lastInsertRowid: result.lastInsertRowid,
          };
        },
      };
    },
    exec: (sql) => client.executeMultiple(sql),
    async batch(statements) {
      await client.batch(statements);
    },
    async transaction() {
      if (!("transaction" in client))
        throw new Error("Nested transactions are unsupported");
      const tx = await client.transaction("write");
      return {
        db: wrap(tx),
        commit: () => tx.commit(),
        rollback: () => tx.rollback(),
      };
    },
    close: () => client.close(),
  };
}
export async function openDatabase(
  path = process.env.DATABASE_PATH ?? "./data/acme.sqlite",
): Promise<DB> {
  const remote =
    path !== ":memory:" ? process.env.TURSO_DATABASE_URL : undefined;
  if (process.env.VERCEL && !remote)
    throw new Error(
      "TURSO_DATABASE_URL is required on Vercel. Temporary SQLite files cannot persist changes.",
    );
  if (remote && !process.env.TURSO_AUTH_TOKEN)
    throw new Error("TURSO_AUTH_TOKEN is required for the hosted database.");
  if (!remote && path !== ":memory:")
    mkdirSync(dirname(path), { recursive: true });
  const client = remote
    ? createRemoteClient({
        url: remote,
        authToken: process.env.TURSO_AUTH_TOKEN,
      })
    : createClient({
        url:
          remote ??
          (path === ":memory:"
            ? "file::memory:"
            : "file:" + resolve(path).replaceAll("\\", "/")),
        authToken: remote ? process.env.TURSO_AUTH_TOKEN : undefined,
        intMode: "number",
      });
  const db = wrap(client);
  if (!remote)
    await db.exec(
      "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;",
    );
  await migrate(db);
  return db;
}

export async function migrate(db: DB) {
  await db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY)",
  );
  for (const [version, name] of [
    [1, "001-initial.sql"],
    [2, "002-observability.sql"],
  ] as const) {
    if (
      await db
        .prepare("SELECT version FROM schema_migrations WHERE version=?")
        .get(version)
    )
      continue;
    const sql = await readFile(
      new URL(`./migrations/${name}`, import.meta.url),
      "utf8",
    );
    await db.batch([
      ...sql
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((sql) => ({ sql, args: [] })),
      {
        sql: "INSERT OR IGNORE INTO schema_migrations(version) VALUES(?)",
        args: [version],
      },
    ]);
  }
}
