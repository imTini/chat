import { useState, useCallback, useEffect } from "react";
import { fetchMe, login as apiLogin, logout as apiLogout, type UserInfo } from "../lib/api.js";

export function useAuth() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const u = await apiLogin(username, password);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  return { user, loading, login, logout };
}
