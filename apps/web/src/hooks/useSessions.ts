import { useState, useCallback } from "react";
import { fetchSessions, createSession, deleteSession, renameSession, type SessionMeta } from "../lib/api.js";

export function useSessions() {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSessions(await fetchSessions());
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (name: string): Promise<SessionMeta> => {
    const meta = await createSession(name);
    setSessions((prev) => [meta, ...prev]);
    return meta;
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const rename = useCallback(async (id: string, name: string) => {
    const updated = await renameSession(id, name);
    setSessions((prev) => prev.map((s) => (s.id === id ? updated : s)));
    return updated;
  }, []);

  return { sessions, loading, load, create, remove, rename };
}
