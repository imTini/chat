/**
 * Creates tables if they don't exist. Safe to call on every startup.
 * SQLite uses synchronous db.run(); Postgres uses async db.execute() with proper column types.
 */
export declare function migrate(): Promise<void>;
