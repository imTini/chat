import type { ChatHistoryItem } from "node-llama-cpp";
import { eq } from "drizzle-orm";
import { getDb } from "../../db/index.js";
import { sessions, type Session } from "../../db/schema.js";
import type { SessionMeta } from "../llama/session-manager.js";

export async function saveSession(
  id: string,
  meta: SessionMeta,
  history: ChatHistoryItem[]
): Promise<void> {
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

export async function listSessions(): Promise<Array<{ meta: SessionMeta; history: ChatHistoryItem[] }>> {
  const db = getDb();
  const rows = await db.select().from(sessions);
  return rows.map((row: Session) => ({
    meta: {
      id: row.id,
      name: row.name,
      userId: row.userId,
      createdAt: row.createdAt,
      lastUsedAt: row.lastUsedAt,
    },
    history: (() => {
      try {
        return JSON.parse(row.history) as ChatHistoryItem[];
      } catch {
        return [];
      }
    })(),
  }));
}

export async function deleteSessionFile(id: string): Promise<void> {
  const db = getDb();
  await db.delete(sessions).where(eq(sessions.id, id));
}
