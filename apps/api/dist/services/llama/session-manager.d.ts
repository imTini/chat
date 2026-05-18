import { LlamaChatSession } from "node-llama-cpp";
export interface SessionMeta {
    id: string;
    name: string;
    createdAt: string;
    lastUsedAt: string;
}
interface ActiveSession {
    meta: SessionMeta;
    session: LlamaChatSession;
}
export declare function createSession(name: string): Promise<SessionMeta>;
export declare function getSession(id: string): Promise<ActiveSession | null>;
export declare function getAbortController(id: string): AbortController | undefined;
export declare function setAbortController(id: string, controller: AbortController): void;
export declare function clearAbortController(id: string): void;
export declare function persistSession(id: string): Promise<void>;
export declare function loadAllSessions(): Promise<void>;
export declare function getAllSessionMetas(): SessionMeta[];
export declare function deleteSession(id: string): Promise<boolean>;
export declare function clearAllSessions(): void;
export {};
