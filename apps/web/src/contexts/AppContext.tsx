import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSessions } from "@/hooks/useSessions";
import { useModels } from "@/hooks/useModels";
import { useToast } from "@/hooks/useToast";
import type { UserInfo, SessionMeta, ModelInfo } from "@/lib/api";

interface AppContextValue {
  // Auth
  user: UserInfo | null;
  authLoading: boolean;
  login: (username: string, password: string) => Promise<UserInfo>;
  logout: () => Promise<void>;

  // Sessions
  sessions: SessionMeta[];
  sessionsLoading: boolean;
  createSession: (name: string) => Promise<SessionMeta>;
  deleteSession: (id: string) => Promise<void>;
  renameSession: (id: string, name: string) => Promise<SessionMeta>;
  refreshSessions: () => Promise<void>;

  // Models
  models: ModelInfo[];
  modelsLoading: boolean;
  currentModel: ModelInfo | null;
  switchModel: (filename: string) => Promise<void>;

  // Toast
  toasts: Array<{ id: string; message: string; type: "info" | "success" | "error" }>;
  addToast: (message: string, type?: "info" | "success" | "error") => void;
  dismissToast: (id: string) => void;

  // UI state
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (v: boolean) => void;

  // Ref to track active chat navigation (for model switch clearing)
  onModelSwitch: (navigateHome: () => void) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, login, logout } = useAuth();
  const { sessions, loading: sessionsLoading, load: loadSessions, create, remove, rename } = useSessions();
  const { models, loading: modelsLoading, currentModel, load: loadModels, switchModel: doSwitchModel } = useModels();
  const { toasts, addToast, dismiss: dismissToast } = useToast();

  const [sidebarCollapsed, setSidebarCollapsedState] = useState(() => {
    try { return localStorage.getItem("sidebar-collapsed") === "true"; } catch { return false; }
  });
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const setSidebarCollapsed = useCallback((v: boolean) => {
    setSidebarCollapsedState(v);
    try { localStorage.setItem("sidebar-collapsed", String(v)); } catch {}
  }, []);

  useEffect(() => {
    if (user) {
      loadSessions();
      loadModels();
    }
  }, [user, loadSessions, loadModels]);

  const createSession = useCallback(async (name: string) => {
    const meta = await create(name);
    return meta;
  }, [create]);

  const deleteSession = useCallback(async (id: string) => {
    await remove(id);
  }, [remove]);

  const renameSession = useCallback(async (id: string, name: string) => {
    return rename(id, name);
  }, [rename]);

  const onModelSwitch = useCallback(async (navigateHome: () => void) => {
    try {
      // Model switch itself is handled in ChatPage or wherever triggered
      await loadSessions();
      navigateHome();
    } catch {
      addToast("Failed to reload sessions after model switch", "error");
    }
  }, [loadSessions, addToast]);

  return (
    <AppContext.Provider value={{
      user,
      authLoading,
      login,
      logout,
      sessions,
      sessionsLoading,
      createSession,
      deleteSession,
      renameSession,
      refreshSessions: loadSessions,
      models,
      modelsLoading,
      currentModel,
      switchModel: doSwitchModel,
      toasts,
      addToast,
      dismissToast,
      sidebarCollapsed,
      setSidebarCollapsed,
      commandPaletteOpen,
      setCommandPaletteOpen,
      onModelSwitch,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
