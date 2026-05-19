import { useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useChat } from "@/hooks/useChat";
import { useApp } from "@/contexts/AppContext";
import { useShortcuts } from "@/hooks/useShortcuts";
import { MessageList } from "@/components/MessageList";
import { Composer } from "@/components/Composer";
import { Navbar } from "@/components/Navbar";
import { fetchSessionMessages } from "@/lib/api";

interface LocationState {
  initialMessage?: string;
  initialImage?: string;
}

export function ChatPage() {
  useShortcuts();
  const { id: sessionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { sessions, renameSession, addToast, currentModel, refreshSessions } = useApp();

  const { messages, generating, send, stop, reset, loadHistory } = useChat(sessionId ?? null);
  const sentInitialRef = useRef(false);
  const loadedIdRef = useRef<string | null>(null);

  // Find current session metadata
  const session = sessions.find((s) => s.id === sessionId);

  // Load history when session changes
  useEffect(() => {
    if (!sessionId || loadedIdRef.current === sessionId) return;
    loadedIdRef.current = sessionId;
    sentInitialRef.current = false;
    reset();
    fetchSessionMessages(sessionId)
      .then((msgs) => {
        if (!sentInitialRef.current) {
          loadHistory(msgs);
        }
      })
      .catch((err) => {
        console.error("Failed to load session history", err);
        addToast("Failed to load chat history", "error");
      });
  }, [sessionId, reset, loadHistory, addToast]);

  // Send initial message from HomePage navigation state
  useEffect(() => {
    const state = location.state as LocationState | null;
    if (!state?.initialMessage || sentInitialRef.current) return;
    if (loadedIdRef.current !== sessionId) return;
    sentInitialRef.current = true;
    const msg = state.initialMessage;
    const img = state.initialImage;
    // Clear state so back/forward doesn't re-send
    window.history.replaceState({}, "");
    send(msg, img || undefined);
  }, [location.state, sessionId, send]);

  // Refresh session list after generation (for last-used ordering)
  useEffect(() => {
    if (!generating) {
      refreshSessions().catch(() => {});
    }
  }, [generating]);

  const handleRename = useCallback(async (name: string) => {
    if (!sessionId) return;
    try {
      await renameSession(sessionId, name);
    } catch {
      addToast("Failed to rename chat", "error");
    }
  }, [sessionId, renameSession, addToast]);

  const hasVision = currentModel?.capabilities.vision ?? false;

  if (!sessionId) {
    navigate("/");
    return null;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Navbar
        sessionId={sessionId}
        sessionName={session?.name ?? "Chat"}
        generating={generating}
        onRename={handleRename}
      />
      <MessageList
        messages={messages}
        onRegenerate={undefined}
        onEdit={undefined}
      />
      <Composer
        onSend={(content, image) => send(content, image)}
        onStop={stop}
        generating={generating}
        disabled={false}
        hasVision={hasVision}
      />
    </div>
  );
}
