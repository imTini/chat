import { useState, useRef, KeyboardEvent, useEffect, useCallback, DragEvent } from "react";

interface Props {
  onSend: (content: string, imageDataUrl?: string) => void;
  onStop: () => void;
  generating: boolean;
  disabled: boolean;
  hasVision: boolean;
}

export function Composer({ onSend, onStop, generating, disabled, hasVision }: Props) {
  const [text, setText] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const readImageFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAttachedImage((ev.target?.result as string) ?? null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSend = () => {
    const trimmed = text.trim();
    if ((!trimmed && !attachedImage) || generating || disabled) return;
    onSend(trimmed, attachedImage ?? undefined);
    setText("");
    setAttachedImage(null);
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
          readImageFile(file);
          e.preventDefault();
          break;
        }
      }
    },
    [hasVision, readImageFile]
  );

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.addEventListener("paste", handlePaste);
    return () => ta.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  useEffect(() => {
    if (!hasVision) {
      setAttachedImage(null);
      setDragOver(false);
    }
  }, [hasVision]);

  const hasFilePayload = (event: DragEvent<HTMLElement>) =>
    Array.from(event.dataTransfer.types).includes("Files");

  const handleDragEnter = (event: DragEvent<HTMLElement>) => {
    if (!hasFilePayload(event)) return;
    event.preventDefault();
    if (hasVision && !disabled && !generating) setDragOver(true);
  };

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    if (!hasFilePayload(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = hasVision && !disabled && !generating ? "copy" : "none";
    if (hasVision && !disabled && !generating) setDragOver(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    if (!hasVision) return;
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && event.currentTarget.contains(nextTarget)) return;
    setDragOver(false);
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    if (!hasFilePayload(event)) return;
    event.preventDefault();
    setDragOver(false);
    if (!hasVision || disabled || generating) return;
    const imageFile = Array.from(event.dataTransfer.files).find((file) =>
      file.type.startsWith("image/")
    );
    if (imageFile) readImageFile(imageFile);
  };

  return (
    <div
      className={`composer ${dragOver ? "drag-over" : ""}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {hasVision && dragOver && <div className="composer-drop-hint">Drop an image to attach</div>}
      {attachedImage && (
        <div className="composer-image-preview">
          <img src={attachedImage} alt="attached" />
          <button
            className="remove-image-btn"
            onClick={() => setAttachedImage(null)}
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
            ? "Type a message… (paste or drop an image)"
            : "Type a message… (Enter to send, Shift+Enter for newline)"
        }
        disabled={disabled || generating}
        rows={3}
      />
      <div className="composer-actions">
        {generating ? (
          <button key="stop" className="stop-btn btn-animated" onClick={onStop}>
            <span className="btn-stop-icon">■</span> Stop
          </button>
        ) : (
          <button
            key="send"
            className="send-btn btn-animated"
            onClick={handleSend}
            disabled={disabled || (!text.trim() && !attachedImage)}
          >
            Send
          </button>
        )}
      </div>
    </div>
  );
}
