import { useState, useCallback, useRef } from "react";
import { streamMessage, stopGeneration, type StreamDonePayload } from "../lib/api.js";

export interface Message {
  role: "user" | "assistant";
  content: string;
  imageDataUrl?: string;
  streaming?: boolean;
  tokenDirection?: "upstream" | "downstream";
  tokenCount?: number;
}

export function useChat(sessionId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [generating, setGenerating] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);
  const tokenQueueRef = useRef("");
  const tokenDrainTimerRef = useRef<number | null>(null);

  const appendAssistantDelta = useCallback((delta: string) => {
    if (!delta) return;
    setMessages((prev) => {
      const updated = [...prev];
      for (let i = updated.length - 1; i >= 0; i -= 1) {
        const current = updated[i];
        if (current?.role === "assistant") {
          updated[i] = { ...current, content: current.content + delta };
          break;
        }
      }
      return updated;
    });
  }, []);

  const clearTokenDrainTimer = useCallback(() => {
    if (tokenDrainTimerRef.current === null) return;
    window.clearInterval(tokenDrainTimerRef.current);
    tokenDrainTimerRef.current = null;
  }, []);

  const flushTokenQueue = useCallback(() => {
    clearTokenDrainTimer();
    const pending = tokenQueueRef.current;
    tokenQueueRef.current = "";
    if (pending) appendAssistantDelta(pending);
  }, [appendAssistantDelta, clearTokenDrainTimer]);

  const ensureTokenDrain = useCallback(() => {
    if (tokenDrainTimerRef.current !== null) return;
    tokenDrainTimerRef.current = window.setInterval(() => {
      if (!tokenQueueRef.current) {
        clearTokenDrainTimer();
        return;
      }

      const next = tokenQueueRef.current.slice(0, 16);
      tokenQueueRef.current = tokenQueueRef.current.slice(next.length);
      appendAssistantDelta(next);

      if (!tokenQueueRef.current) {
        clearTokenDrainTimer();
      }
    }, 20);
  }, [appendAssistantDelta, clearTokenDrainTimer]);

  const annotateTurnTokens = useCallback((payload: StreamDonePayload) => {
    setMessages((prev) => {
      const updated = [...prev];

      let assistantIndex = -1;
      for (let i = updated.length - 1; i >= 0; i -= 1) {
        if (updated[i]?.role === "assistant") {
          assistantIndex = i;
          break;
        }
      }

      if (assistantIndex === -1) return updated;

      const assistant = updated[assistantIndex]!;
      updated[assistantIndex] = {
        ...assistant,
        content: payload.fullResponse || assistant.content,
        streaming: false,
        tokenDirection: "downstream",
        tokenCount: payload.usedOutputTokens,
      };

      for (let i = assistantIndex - 1; i >= 0; i -= 1) {
        if (updated[i]?.role === "user") {
          const user = updated[i]!;
          updated[i] = {
            ...user,
            tokenDirection: "upstream",
            tokenCount: payload.usedInputTokens,
          };
          break;
        }
      }

      return updated;
    });
  }, []);

  const send = useCallback(
    async (content: string, imageDataUrl?: string) => {
      if (!sessionId || generating) return;

      flushTokenQueue();
      setMessages((prev) => [...prev, { role: "user", content, imageDataUrl }]);
      setGenerating(true);
      setMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }]);

      const cancel = streamMessage(
        sessionId,
        content,
        (delta) => {
          tokenQueueRef.current += delta;
          ensureTokenDrain();
        },
        (payload) => {
          flushTokenQueue();
          annotateTurnTokens(payload);
          setGenerating(false);
          cancelRef.current = null;
        },
        (err) => {
          flushTokenQueue();
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                content: last.content || `Error: ${err}`,
                streaming: false,
              };
            }
            return updated;
          });
          setGenerating(false);
          cancelRef.current = null;
        }
      );

      cancelRef.current = cancel;
    },
    [sessionId, generating, ensureTokenDrain, annotateTurnTokens, flushTokenQueue]
  );

  const stop = useCallback(async () => {
    if (!sessionId) return;
    cancelRef.current?.();
    cancelRef.current = null;
    flushTokenQueue();
    await stopGeneration(sessionId);
    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last?.streaming) updated[updated.length - 1] = { ...last, streaming: false };
      return updated;
    });
    setGenerating(false);
  }, [sessionId, flushTokenQueue]);

  const reset = useCallback(() => {
    flushTokenQueue();
    setMessages([]);
    setGenerating(false);
    cancelRef.current = null;
  }, [flushTokenQueue]);

  const loadHistory = useCallback((history: Array<{ role: "user" | "assistant"; content: string }>) => {
    flushTokenQueue();
    setMessages(history);
    setGenerating(false);
    cancelRef.current = null;
  }, [flushTokenQueue]);

  return { messages, generating, send, stop, reset, loadHistory };
}
