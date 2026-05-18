import { useState, useCallback, useRef } from "react";
import { streamMessage, stopGeneration } from "../lib/api.js";

export interface Message {
  role: "user" | "assistant";
  content: string;
  imageDataUrl?: string;
  streaming?: boolean;
}

export function useChat(sessionId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [generating, setGenerating] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);

  const send = useCallback(
    async (content: string, imageDataUrl?: string) => {
      if (!sessionId || generating) return;

      setMessages((prev) => [...prev, { role: "user", content, imageDataUrl }]);
      setGenerating(true);
      setMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }]);

      const cancel = streamMessage(
        sessionId,
        content,
        (delta) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant") {
              updated[updated.length - 1] = { ...last, content: last.content + delta };
            }
            return updated;
          });
        },
        (_fullResponse) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant") {
              updated[updated.length - 1] = { ...last, streaming: false };
            }
            return updated;
          });
          setGenerating(false);
          cancelRef.current = null;
        },
        (err) => {
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
    [sessionId, generating]
  );

  const stop = useCallback(async () => {
    if (!sessionId) return;
    cancelRef.current?.();
    cancelRef.current = null;
    await stopGeneration(sessionId);
    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last?.streaming) updated[updated.length - 1] = { ...last, streaming: false };
      return updated;
    });
    setGenerating(false);
  }, [sessionId]);

  const reset = useCallback(() => {
    setMessages([]);
    setGenerating(false);
    cancelRef.current = null;
  }, []);

  return { messages, generating, send, stop, reset };
}
