import type { ChatHistoryItem } from "node-llama-cpp";
import type { SessionMeta } from "../llama/session-manager.js";
export declare function saveSession(id: string, meta: SessionMeta, history: ChatHistoryItem[]): Promise<void>;
export declare function listSessions(): Promise<Array<{
    meta: SessionMeta;
    history: ChatHistoryItem[];
}>>;
export declare function listSessionMetas(): Promise<SessionMeta[]>;
export declare function loadSessionById(id: string): Promise<{
    meta: SessionMeta;
    history: ChatHistoryItem[];
} | null>;
export declare function deleteSessionFile(id: string): Promise<void>;
