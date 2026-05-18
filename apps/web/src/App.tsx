import { useState, useEffect, useRef } from "react";
import { Sidebar } from "./components/Sidebar";
import { MessageList } from "./components/MessageList";
import { Composer } from "./components/Composer";
import { ModelHeader } from "./components/ModelHeader";
import { Toast } from "./components/Toast";
import { LoginPage } from "./pages/LoginPage";
import { useSessions } from "./hooks/useSessions";
import { useChat } from "./hooks/useChat";
import { useModels } from "./hooks/useModels";
import { useToast } from "./hooks/useToast";
import { useAuth } from "./hooks/useAuth";
import { fetchSessionMessages } from "./lib/api.js";

export default function App() {
  const { user, loading: authLoading, login, logout } = useAuth();
  const { sessions, load: loadSessions, create, remove } = useSessions();
  const { models, loading: modelLoading, currentModel, load: loadModels, switchModel } = useModels();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const historyRequestRef = useRef(0);
  const { messages, generating, send, stop, reset, loadHistory } = useChat(activeId);
  const { toasts, addToast, dismiss: dismissToast } = useToast();

  useEffect(() => {
    if (user) {
      loadSessions();
      loadModels();
    }
  }, [user, loadSessions, loadModels]);

  if (authLoading) {
    return <div className="auth-loading">Loading…</div>;
  }

  if (!user) {
    return <LoginPage onLogin={login} />;
  }

  const handleSelect = async (id: string) => {
    const requestId = historyRequestRef.current + 1;
    historyRequestRef.current = requestId;
    setHistoryLoading(true);
    setActiveId(id);
    reset();
    try {
      const history = await fetchSessionMessages(id);
      if (historyRequestRef.current !== requestId) return;
      loadHistory(history);
    } catch {
      if (historyRequestRef.current !== requestId) return;
      addToast("Failed to load session history", "error");
    } finally {
      if (historyRequestRef.current === requestId) {
        setHistoryLoading(false);
      }
    }
  };

  const handleCreate = async (name: string) => {
    try {
      const meta = await create(name);
      historyRequestRef.current += 1;
      setHistoryLoading(false);
      setActiveId(meta.id);
      reset();
    } catch (e) {
      alert(`Failed to create session: ${e}`);
    }
  };

  const handleDelete = async (id: string) => {
    await remove(id);
    if (id === activeId) {
      historyRequestRef.current += 1;
      setHistoryLoading(false);
      setActiveId(null);
      reset();
    }
  };

  const handleModelSwitch = async (filename: string) => {
    try {
      await switchModel(filename);
      // sessions are cleared on model switch, reload
      await loadSessions();
      historyRequestRef.current += 1;
      setHistoryLoading(false);
      setActiveId(null);
      reset();
      const loaded = models.find((m) => m.filename === filename);
      addToast(`Loaded ${loaded?.name ?? filename}`, "success");
    } catch {
      addToast(`Failed to load model`, "error");
    }
  };

  const activeSession = sessions.find((s) => s.id === activeId);
  const hasVision = currentModel?.capabilities.vision ?? false;

  return (
    <div className="app">
      <Sidebar
        sessions={sessions}
        activeId={activeId}
        onSelect={handleSelect}
        onCreate={handleCreate}
        onDelete={handleDelete}
        user={user}
        onLogout={logout}
      />
      <div className="chat-area">
        <div className="top-bar">
          <ModelHeader
            models={models}
            loading={modelLoading}
            onLoad={handleModelSwitch}
          />
          {activeSession && (
            <div className="session-title">
              <span>{activeSession.name}</span>
              {generating && <span className="generating-badge">Generating…</span>}
            </div>
          )}
        </div>
        <MessageList messages={messages} />
        <Composer
          onSend={send}
          onStop={stop}
          generating={generating}
          disabled={!activeId || historyLoading}
          hasVision={hasVision}
        />
      </div>
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
