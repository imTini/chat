type DbBackend = "sqlite" | "postgres";
export declare function getDb(): any;
export declare function getDbBackend(): DbBackend;
export declare function initDb(): Promise<void>;
export {};
