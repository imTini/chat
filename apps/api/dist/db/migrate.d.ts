/**
 * Creates tables if they don't exist. Safe to call on every startup.
 * For SQLite, uses `db.run()` (synchronous). For Postgres, uses `db.execute()` (async).
 */
export declare function migrate(): Promise<void>;
