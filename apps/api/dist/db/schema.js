import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const users = sqliteTable("users", {
    id: text("id").primaryKey(),
    username: text("username").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    tokenCount: integer("token_count").notNull().default(0),
    createdAt: text("created_at")
        .notNull()
        .default(sql `(datetime('now'))`),
    updatedAt: text("updated_at")
        .notNull()
        .default(sql `(datetime('now'))`),
});
export const sessions = sqliteTable("sessions", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    history: text("history").notNull().default("[]"),
    createdAt: text("created_at")
        .notNull()
        .default(sql `(datetime('now'))`),
    lastUsedAt: text("last_used_at")
        .notNull()
        .default(sql `(datetime('now'))`),
});
export const userSessions = sqliteTable("user_sessions", {
    id: text("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    createdAt: text("created_at")
        .notNull()
        .default(sql `(datetime('now'))`),
    expiresAt: text("expires_at").notNull(),
});
