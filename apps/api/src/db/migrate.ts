import { getDb } from "./index.js";
import { sql } from "drizzle-orm";

/**
 * Creates tables if they don't exist. Safe to call on every startup.
 * For SQLite, uses `db.run()` (synchronous). For Postgres, uses `db.execute()` (async).
 */
export async function migrate(): Promise<void> {
  const db = getDb();
  const isPg = process.env.NODE_ENV === "production";

  const createUsers = sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      token_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `;

  const createSessions = sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      history TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_used_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `;

  const createUserSessions = sql`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    )
  `;

  if (isPg) {
    await db.execute(createUsers);
    await db.execute(createSessions);
    await db.execute(createUserSessions);
  } else {
    db.run(createUsers);
    db.run(createSessions);
    db.run(createUserSessions);
  }

  console.log("DB migrations applied.");
}
