import { LlamaChatSession } from "node-llama-cpp";
import { getModel, LLAMA_THREADS } from "./client.js";
import { saveSession, listSessionMetas, loadSessionById, deleteSessionFile, } from "../persistence/session-store.js";
import { v4 as uuidv4 } from "uuid";
// Maximum number of LlamaContexts kept in memory simultaneously.
// Tune via env var. 4 active contexts × ~450 MB each ≈ 1.8 GB (fits on 8 GB after model).
const MAX_ACTIVE_SESSIONS = process.env.MAX_ACTIVE_SESSIONS
    ? Math.max(1, parseInt(process.env.MAX_ACTIVE_SESSIONS, 10))
    : 4;
// Max tokens each session context may use.
const MAX_CONTEXT_SIZE = process.env.MAX_CONTEXT_SIZE
    ? Math.max(512, parseInt(process.env.MAX_CONTEXT_SIZE, 10))
    : 4096;
// Metadata for ALL known sessions (lightweight — no context allocated).
const sessionMetas = new Map();
// Hydrated (in-memory context) sessions — bounded to MAX_ACTIVE_SESSIONS.
const sessions = new Map();
const abortControllers = new Map();
// ── Context helpers ────────────────────────────────────────────────────────────
async function createContextForSession() {
    const model = getModel();
    const context = await model.createContext({
        // Cap per-session token budget to keep RAM predictable.
        contextSize: { max: MAX_CONTEXT_SIZE },
        // Flash attention reduces KV-cache memory and speeds up long sequences.
        // Silently ignored when the model doesn't support it.
        flashAttention: true,
        // Share the global thread budget across concurrent sessions gracefully.
        threads: { ideal: LLAMA_THREADS, min: 1 },
        // Smaller batch suits single-user CPU sessions; default 512 is over-provisioned.
        batchSize: 256,
        // On OOM, retry with a 25% smaller context before throwing.
        failedCreationRemedy: { retries: 3, autoContextSizeShrink: 0.25 },
    });
    return context.getSequence();
}
/** Evict the least-recently-used active session (persist + dispose). */
async function evictLruSession() {
    let lruId = null;
    let lruTime = Infinity;
    for (const [id, active] of sessions) {
        const t = new Date(active.meta.lastUsedAt).getTime();
        if (t < lruTime) {
            lruTime = t;
            lruId = id;
        }
    }
    if (!lruId)
        return;
    const active = sessions.get(lruId);
    await saveSession(lruId, active.meta, active.session.getChatHistory());
    await active.contextSequence.context.dispose().catch(() => { });
    sessions.delete(lruId);
}
/**
 * Ensure a session has an active in-memory context, hydrating from DB if needed.
 * Returns null when the session id is not known at all.
 */
async function ensureContext(id) {
    if (sessions.has(id))
        return sessions.get(id);
    const meta = sessionMetas.get(id);
    if (!meta)
        return null;
    if (sessions.size >= MAX_ACTIVE_SESSIONS)
        await evictLruSession();
    const stored = await loadSessionById(id);
    const contextSequence = await createContextForSession();
    const session = new LlamaChatSession({ contextSequence });
    if (stored?.history && stored.history.length > 0) {
        await session.setChatHistory(stored.history);
    }
    const active = { meta, session, contextSequence };
    sessions.set(id, active);
    return active;
}
// ── Public API ────────────────────────────────────────────────────────────────
export async function createSession(name, userId) {
    const id = uuidv4();
    const now = new Date().toISOString();
    const meta = { id, name, userId, createdAt: now, lastUsedAt: now };
    // Register metadata immediately.
    sessionMetas.set(id, meta);
    // Pre-warm the context so the user's first message isn't slow.
    // If we're at capacity, evict first.
    if (sessions.size >= MAX_ACTIVE_SESSIONS)
        await evictLruSession();
    const contextSequence = await createContextForSession();
    const session = new LlamaChatSession({ contextSequence });
    sessions.set(id, { meta, session, contextSequence });
    await saveSession(id, meta, session.getChatHistory());
    return meta;
}
/** Returns the active session, hydrating from DB if necessary. */
export async function getSession(id) {
    return ensureContext(id);
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
    sessionMetas.set(id, active.meta);
    await saveSession(id, active.meta, active.session.getChatHistory());
}
/** Load only metadata at startup — contexts are hydrated lazily. */
export async function loadAllSessions() {
    const metas = await listSessionMetas();
    for (const meta of metas) {
        sessionMetas.set(meta.id, meta);
    }
}
export function getAllSessionMetas() {
    return Array.from(sessionMetas.values());
}
export function getSessionMetasByUser(userId) {
    return Array.from(sessionMetas.values()).filter((m) => m.userId === userId);
}
export async function deleteSession(id) {
    if (!sessionMetas.has(id))
        return false;
    // Dispose the context if it's currently hydrated.
    const active = sessions.get(id);
    if (active) {
        await active.contextSequence.context.dispose().catch(() => { });
        sessions.delete(id);
    }
    abortControllers.delete(id);
    sessionMetas.delete(id);
    await deleteSessionFile(id);
    return true;
}
/** Dispose all in-memory contexts (e.g. before a model switch). */
export async function clearAllSessions() {
    for (const active of sessions.values()) {
        await active.contextSequence.context.dispose().catch(() => { });
    }
    sessions.clear();
    sessionMetas.clear();
    abortControllers.clear();
}
