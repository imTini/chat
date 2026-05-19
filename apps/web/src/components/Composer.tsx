import { useState, useRef, KeyboardEvent, useEffect, useCallback, DragEvent, ChangeEvent } from "react";
import { Send, Square, Paperclip, X } from "lucide-react";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [text]);

  const readImageFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAttachedImage((ev.target?.result as string) ?? null);
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
    if (!hasVision) { setAttachedImage(null); setDragOver(false); }
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

  const handleFileInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (!hasVision) return;
      const file = e.target.files?.[0];
      if (file) readImageFile(file);
      e.target.value = "";
    },
    [hasVision, readImageFile]
  );

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    if (!hasFilePayload(event)) return;
    event.preventDefault();
    setDragOver(false);
    if (!hasVision || disabled || generating) return;
    const imageFile = Array.from(event.dataTransfer.files).find((f) => f.type.startsWith("image/"));
    if (imageFile) readImageFile(imageFile);
  };

  const canSend = (text.trim() || attachedImage) && !generating && !disabled;

  return (
    <div
      className="px-5 py-4"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className={`rounded-xl overflow-hidden transition-colors ${dragOver ? "ring-2" : ""}`}
        style={{
          background: "var(--bg-elevated)",
          border: `1px solid ${dragOver ? "var(--primary)" : "var(--border)"}`,
        }}
      >
        {dragOver && hasVision && (
          <div
            className="px-4 py-2 text-sm text-center"
            style={{ color: "var(--primary)", background: "var(--bg-panel)" }}
          >
            Drop image to attach
          </div>
        )}

        {/* Attached image preview */}
        {attachedImage && (
          <div className="px-4 pt-3 flex items-start gap-2">
            <div className="relative inline-block">
              <img src={attachedImage} alt="attached" className="h-20 w-auto rounded-lg object-cover" />
              <button
                className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full text-xs"
                style={{ background: "var(--destructive)", color: "#fff" }}
                onClick={() => setAttachedImage(null)}
              >
                <X size={10} />
              </button>
            </div>
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder={
            disabled
              ? "No session selected"
              : hasVision
              ? "Type a message… (paste or drop image)"
              : "Type a message… (Enter to send)"
          }
          disabled={disabled || generating}
          rows={1}
          className="w-full resize-none bg-transparent px-4 pt-4 pb-2.5 text-sm outline-none"
          style={{ color: "var(--text)", minHeight: "52px" }}
        />

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 pb-4">
          {hasVision && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileInput}
                disabled={disabled || generating}
              />
              <button
                className="flex items-center justify-center w-7 h-7 rounded-lg transition-opacity hover:opacity-70"
                style={{ color: "var(--text-muted)" }}
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || generating}
                title="Attach image"
                type="button"
              >
                <Paperclip size={15} />
              </button>
            </>
          )}

          <span className="ml-auto flex items-center gap-1">
            {generating ? (
              <button
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
                style={{ background: "var(--destructive)", color: "#fff" }}
                onClick={onStop}
              >
                <Square size={11} fill="currentColor" /> Stop
              </button>
            ) : (
              <button
                className="flex items-center justify-center w-8 h-8 rounded-lg transition-opacity disabled:opacity-40"
                style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
                onClick={handleSend}
                disabled={!canSend}
                title="Send (Enter)"
              >
                <Send size={14} />
              </button>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
