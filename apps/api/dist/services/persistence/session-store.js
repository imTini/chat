import { eq } from "drizzle-orm";
import { getDb } from "../../db/index.js";
import { sessions } from "../../db/schema.js";
export async function saveSession(id, meta, history) {
    const db = getDb();
    await db
        .insert(sessions)
        .values({
        id,
        name: meta.name,
        userId: meta.userId,
        history: JSON.stringify(history),
        createdAt: meta.createdAt,
        lastUsedAt: meta.lastUsedAt,
    })
        .onConflictDoUpdate({
        target: sessions.id,
        set: {
            history: JSON.stringify(history),
            lastUsedAt: meta.lastUsedAt,
            name: meta.name,
        },
    });
}
export async function listSessions() {
    const db = getDb();
    const rows = await db.select().from(sessions);
    return rows.map((row) => ({
        meta: {
            id: row.id,
            name: row.name,
            userId: row.userId,
            createdAt: row.createdAt,
            lastUsedAt: row.lastUsedAt,
        },
        history: (() => {
            try {
                return JSON.parse(row.history);
            }
            catch {
                return [];
            }
        })(),
    }));
}
export async function deleteSessionFile(id) {
    const db = getDb();
    await db.delete(sessions).where(eq(sessions.id, id));
}
