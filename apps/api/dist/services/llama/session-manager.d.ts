import { LlamaChatSession, LlamaContextSequence } from "node-llama-cpp";
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
export declare function createSession(name: string, userId: string): Promise<SessionMeta>;
/** Returns the active session, hydrating from DB if necessary. */
export declare function getSession(id: string): Promise<ActiveSession | null>;
export declare function getAbortController(id: string): AbortController | undefined;
export declare function setAbortController(id: string, controller: AbortController): void;
export declare function clearAbortController(id: string): void;
export declare function persistSession(id: string): Promise<void>;
/** Load only metadata at startup — contexts are hydrated lazily. */
export declare function loadAllSessions(): Promise<void>;
export declare function getAllSessionMetas(): SessionMeta[];
export declare function getSessionMetasByUser(userId: string): SessionMeta[];
export declare function deleteSession(id: string): Promise<boolean>;
/** Dispose all in-memory contexts (e.g. before a model switch). */
export declare function clearAllSessions(): Promise<void>;
export {};
