import {
  createClient,
  type Client,
  type Transaction,
  type InValue,
  type InStatement,
} from "@libsql/client";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
export type Row = Record<string, unknown>;
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
function wrap(client: Client | Transaction): DB {
  return {
    prepare(sql) {
      return {
        async get(...args) {
          return (await client.execute({ sql, args })).rows[0] as
            Row | undefined;
        },
        async all(...args) {
          return (await client.execute({ sql, args })).rows as Row[];
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
  const client = createClient({
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
  await db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('HR_MANAGER','VIEWER')));
    CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),expires_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
    CREATE TABLE IF NOT EXISTS employees(id INTEGER PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,country TEXT NOT NULL,currency TEXT NOT NULL,department TEXT NOT NULL,job_title TEXT NOT NULL,employment_type TEXT NOT NULL,salary_minor INTEGER NOT NULL CHECK(salary_minor>0),joining_date TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
    CREATE INDEX IF NOT EXISTS idx_employees_country ON employees(country);
    CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
    CREATE INDEX IF NOT EXISTS idx_employees_currency_salary ON employees(currency,salary_minor);
    CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(name,id);
    CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,actor TEXT NOT NULL,action TEXT NOT NULL,employee_id INTEGER NOT NULL,employee_name TEXT NOT NULL,details TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
    INSERT OR IGNORE INTO schema_migrations(version) VALUES(1);`);
  return db;
}
