import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import Database from "better-sqlite3";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import * as schema from "./schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQLITE_PATH = path.resolve(__dirname, "../../../../data/chat.db");

// Use `any` to avoid TypeScript union-type conflicts between SQLite and Postgres
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _db: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getDb(): any {
  if (!_db) throw new Error("DB not initialized. Call initDb() first.");
  return _db;
}

export async function initDb(): Promise<void> {
  if (_db) return;

  if (process.env.NODE_ENV === "production") {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL env var required in production.");
    const pool = new pg.Pool({ connectionString: url });
    _db = drizzlePg(pool, { schema });
  } else {
    const sqlite = new Database(SQLITE_PATH);
    sqlite.pragma("journal_mode = WAL");
    _db = drizzleSqlite(sqlite, { schema });
  }
}
