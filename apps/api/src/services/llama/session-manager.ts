import { LlamaChatSession, LlamaContextSequence, type ChatHistoryItem } from "node-llama-cpp";
import { getModel } from "./client.js";
import { saveSession, listSessions, deleteSessionFile } from "../persistence/session-store.js";
import { v4 as uuidv4 } from "uuid";

export interface SessionMeta {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  lastUsedAt: string;
}

interface ActiveSession {
  meta: SessionMeta;
  session: LlamaChatSession;
  contextSequence: LlamaContextSequence;
}

const sessions = new Map<string, ActiveSession>();
const abortControllers = new Map<string, AbortController>();

export async function createSession(name: string, userId: string): Promise<SessionMeta> {
  const id = uuidv4();
  const now = new Date().toISOString();
  const meta: SessionMeta = { id, name, userId, createdAt: now, lastUsedAt: now };

  const model = getModel();
  const context = await model.createContext();
  const contextSequence = context.getSequence();
  const session = new LlamaChatSession({ contextSequence });

  sessions.set(id, { meta, session, contextSequence });
  await saveSession(id, meta, session.getChatHistory());
  return meta;
}

export async function getSession(id: string): Promise<ActiveSession | null> {
  return sessions.get(id) ?? null;
}

export function getAbortController(id: string): AbortController | undefined {
  return abortControllers.get(id);
}

export function setAbortController(id: string, controller: AbortController): void {
  abortControllers.set(id, controller);
}

export function clearAbortController(id: string): void {
  abortControllers.delete(id);
}

export async function persistSession(id: string): Promise<void> {
  const active = sessions.get(id);
  if (!active) return;
  active.meta.lastUsedAt = new Date().toISOString();
  await saveSession(id, active.meta, active.session.getChatHistory());
}

export async function loadAllSessions(): Promise<void> {
  const stored = await listSessions();
  const model = getModel();

  for (const { meta, history } of stored as Array<{ meta: SessionMeta; history: ChatHistoryItem[] }>) {
    const context = await model.createContext();
    const contextSequence = context.getSequence();
    const session = new LlamaChatSession({ contextSequence });
    if (history && history.length > 0) {
      await session.setChatHistory(history);
    }
    sessions.set(meta.id, { meta, session, contextSequence });
  }
}

export function getAllSessionMetas(): SessionMeta[] {
  return Array.from(sessions.values()).map((s) => s.meta);
}

export function getSessionMetasByUser(userId: string): SessionMeta[] {
  return Array.from(sessions.values())
    .filter((s) => s.meta.userId === userId)
    .map((s) => s.meta);
}

export async function deleteSession(id: string): Promise<boolean> {
  if (!sessions.has(id)) return false;
  sessions.delete(id);
  abortControllers.delete(id);
  await deleteSessionFile(id);
  return true;
}

export function clearAllSessions(): void {
  sessions.clear();
  abortControllers.clear();
}
