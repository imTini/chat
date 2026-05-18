import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import Database from "better-sqlite3";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import * as schema from "./schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SQLITE_PATH = path.resolve(__dirname, "../../../../data/chat.db");
type DbBackend = "sqlite" | "postgres";

// Use `any` to avoid TypeScript union-type conflicts between SQLite and Postgres
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _db: any = null;
let _backend: DbBackend | null = null;

function isPostgresUrl(url: string): boolean {
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

function shouldUsePostgres(): boolean {
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (process.env.NODE_ENV === "production" && !dbUrl) {
    throw new Error("DATABASE_URL env var required in production.");
  }
  return Boolean(dbUrl && isPostgresUrl(dbUrl));
}

function getSqlitePath(): string {
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (dbUrl && !isPostgresUrl(dbUrl)) return dbUrl;
  return DEFAULT_SQLITE_PATH;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getDb(): any {
  if (!_db) throw new Error("DB not initialized. Call initDb() first.");
  return _db;
}

export function getDbBackend(): DbBackend {
  if (!_backend) throw new Error("DB not initialized. Call initDb() first.");
  return _backend;
}

export async function initDb(): Promise<void> {
  if (_db) return;

  if (shouldUsePostgres()) {
    const url = process.env.DATABASE_URL!;
    const pool = new pg.Pool({ connectionString: url });
    _db = drizzlePg(pool, { schema });
    _backend = "postgres";
  } else {
    const sqlite = new Database(getSqlitePath());
    sqlite.pragma("journal_mode = WAL");
    _db = drizzleSqlite(sqlite, { schema });
    _backend = "sqlite";
  }
}
