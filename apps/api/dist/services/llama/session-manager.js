import { LlamaChatSession } from "node-llama-cpp";
import { getModel } from "./client.js";
import { saveSession, listSessions, deleteSessionFile } from "../persistence/session-store.js";
import { v4 as uuidv4 } from "uuid";
const sessions = new Map();
const abortControllers = new Map();
export async function createSession(name) {
    const id = uuidv4();
    const now = new Date().toISOString();
    const meta = { id, name, createdAt: now, lastUsedAt: now };
    const model = getModel();
    const context = await model.createContext();
    const session = new LlamaChatSession({ contextSequence: context.getSequence() });
    sessions.set(id, { meta, session });
    await saveSession(id, meta, session.getChatHistory());
    return meta;
}
export async function getSession(id) {
    return sessions.get(id) ?? null;
}
export function getAbortController(id) {
    return abortControllers.get(id);
}
export function setAbortController(id, controller) {
    abortControllers.set(id, controller);
}
export function clearAbortController(id) {
    abortControllers.delete(id);
}
export async function persistSession(id) {
    const active = sessions.get(id);
    if (!active)
        return;
    active.meta.lastUsedAt = new Date().toISOString();
    await saveSession(id, active.meta, active.session.getChatHistory());
}
export async function loadAllSessions() {
    const stored = await listSessions();
    const model = getModel();
    for (const { meta, history } of stored) {
        const context = await model.createContext();
        const session = new LlamaChatSession({ contextSequence: context.getSequence() });
        if (history && history.length > 0) {
            await session.setChatHistory(history);
        }
        sessions.set(meta.id, { meta, session });
    }
}
export function getAllSessionMetas() {
    return Array.from(sessions.values()).map((s) => s.meta);
}
export async function deleteSession(id) {
    if (!sessions.has(id))
        return false;
    sessions.delete(id);
    abortControllers.delete(id);
    await deleteSessionFile(id);
    return true;
}
export function clearAllSessions() {
    sessions.clear();
    abortControllers.clear();
}
