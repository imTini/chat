import { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { MessageList } from "./components/MessageList";
import { Composer } from "./components/Composer";
import { ModelHeader } from "./components/ModelHeader";
import { Toast } from "./components/Toast";
import { useSessions } from "./hooks/useSessions";
import { useChat } from "./hooks/useChat";
import { useModels } from "./hooks/useModels";
import { useToast } from "./hooks/useToast";

export default function App() {
  const { sessions, load: loadSessions, create, remove } = useSessions();
  const { models, loading: modelLoading, currentModel, load: loadModels, switchModel } = useModels();
  const [activeId, setActiveId] = useState<string | null>(null);
  const { messages, generating, send, stop, reset } = useChat(activeId);
  const { toasts, addToast, dismiss: dismissToast } = useToast();

  useEffect(() => {
    loadSessions();
    loadModels();
  }, [loadSessions, loadModels]);

  const handleSelect = (id: string) => {
    setActiveId(id);
    reset();
  };

  const handleCreate = async (name: string) => {
    try {
      const meta = await create(name);
      setActiveId(meta.id);
      reset();
    } catch (e) {
      alert(`Failed to create session: ${e}`);
    }
  };

  const handleDelete = async (id: string) => {
    await remove(id);
    if (id === activeId) {
      setActiveId(null);
      reset();
    }
  };

  const handleModelSwitch = async (filename: string) => {
    try {
      await switchModel(filename);
      // sessions are cleared on model switch, reload
      await loadSessions();
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
          disabled={!activeId}
          hasVision={hasVision}
        />
      </div>
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
