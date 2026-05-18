import { useEffect, useRef } from "react";
import type { Message } from "../hooks/useChat.js";

interface Props {
  messages: Message[];
}

export function MessageList({ messages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">💬</div>
        <p>Send a message to start the conversation.</p>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((msg, i) => (
        <div key={i} className={`message ${msg.role}`}>
          <div className="message-role">{msg.role === "user" ? "You" : "Assistant"}</div>
          {msg.tokenCount !== undefined && (() => {
            const direction = msg.tokenDirection ?? (msg.role === "user" ? "upstream" : "downstream");
            return (
              <div className={`message-token-direction ${direction}`}>
                {direction === "upstream" ? "↑" : "↓"} {msg.tokenCount.toLocaleString()} {direction}
              </div>
            );
          })()}
          {msg.imageDataUrl && (
            <div className="message-image">
              <img src={msg.imageDataUrl} alt="attached" />
            </div>
          )}
          {msg.content && (
            <div className="message-content">
              {msg.content}
              {msg.streaming && <span className="cursor" />}
            </div>
          )}
          {!msg.content && msg.streaming && (
            <div className="message-content thinking">
              <span className="thinking-dot" />
              <span className="thinking-dot" />
              <span className="thinking-dot" />
            </div>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
