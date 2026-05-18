import { useState, useRef, KeyboardEvent, useEffect, useCallback } from "react";

interface Props {
  onSend: (content: string, imageDataUrl?: string) => void;
  onStop: () => void;
  generating: boolean;
  disabled: boolean;
  hasVision: boolean;
}

export function Composer({ onSend, onStop, generating, disabled, hasVision }: Props) {
  const [text, setText] = useState("");
  const [pastedImage, setPastedImage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if ((!trimmed && !pastedImage) || generating || disabled) return;
    onSend(trimmed, pastedImage ?? undefined);
    setText("");
    setPastedImage(null);
    textareaRef.current?.focus();
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (!hasVision) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (!file) continue;
          const reader = new FileReader();
          reader.onload = (ev) => {
            setPastedImage(ev.target?.result as string);
          };
          reader.readAsDataURL(file);
          e.preventDefault();
          break;
        }
      }
    },
    [hasVision]
  );

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.addEventListener("paste", handlePaste);
    return () => ta.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  return (
    <div className="composer">
      {pastedImage && (
        <div className="composer-image-preview">
          <img src={pastedImage} alt="pasted" />
          <button
            className="remove-image-btn"
            onClick={() => setPastedImage(null)}
            title="Remove image"
          >
            ×
          </button>
        </div>
      )}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKey}
        placeholder={
          disabled
            ? "Select a session to start chatting"
            : hasVision
            ? "Type a message… (Paste an image with Ctrl+V)"
            : "Type a message… (Enter to send, Shift+Enter for newline)"
        }
        disabled={disabled || generating}
        rows={3}
      />
      <div className="composer-actions">
        {generating ? (
          <button className="stop-btn" onClick={onStop}>
            Stop
          </button>
        ) : (
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={disabled || (!text.trim() && !pastedImage)}
          >
            Send
          </button>
        )}
      </div>
    </div>
  );
}
