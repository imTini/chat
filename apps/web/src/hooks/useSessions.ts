import { useState, useCallback } from "react";
import { fetchSessions, createSession, deleteSession, SessionMeta } from "../lib/api.js";

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

  return { sessions, loading, load, create, remove };
}
