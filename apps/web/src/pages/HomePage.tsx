import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Paperclip, X, ChevronDown } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useShortcuts } from "@/hooks/useShortcuts";

const QUICK_CHATS = [
  { label: "Explain this code to me", emoji: "💻" },
  { label: "Write a unit test for a function", emoji: "🧪" },
  { label: "Summarize this text", emoji: "📝" },
  { label: "Debug my code", emoji: "🐛" },
  { label: "Write a shell script that…", emoji: "⚡" },
  { label: "Explain a concept simply", emoji: "🎓" },
  { label: "Refactor this function", emoji: "🔧" },
];

function getGreeting(username?: string): string {
  const hour = new Date().getHours();
  const time =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return username ? `${time}, ${username}` : time;
}

export function HomePage() {
  useShortcuts();
  const navigate = useNavigate();
  const { user, createSession, currentModel, models, addToast } = useApp();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasVision = currentModel?.capabilities.vision ?? false;

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [input]);

  const handleSubmit = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    try {
      // Create session with first 60 chars of message as name
      const name = trimmed.length > 60 ? trimmed.slice(0, 57) + "…" : trimmed;
      const session = await createSession(name);
      // Navigate immediately; ChatPage will send the first message
      navigate(`/chat/${session.id}`, { state: { initialMessage: trimmed, initialImage: attachedImage } });
    } catch {
      addToast("Failed to create chat", "error");
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(input);
    }
  };

  const readImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAttachedImage((ev.target?.result as string) ?? null);
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        {/* Greeting */}
        <h1 className="text-3xl font-bold" style={{ color: "var(--text)" }}>
          {getGreeting(user?.username)}
        </h1>

        {/* Prompt box */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
        >
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
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask anything…"
            disabled={loading}
            rows={1}
            className="w-full resize-none bg-transparent px-4 pt-4 pb-3 text-sm outline-none"
            style={{ color: "var(--text)", minHeight: "56px" }}
          />

          {/* Footer toolbar */}
          <div className="flex items-center gap-2 px-3 pb-3">
            {/* File attach */}
            {hasVision && (
              <>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) readImageFile(f); e.target.value = ""; }} />
                <button
                  className="flex items-center justify-center w-8 h-8 rounded-lg hover:opacity-70 transition-opacity"
                  style={{ color: "var(--text-muted)" }}
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach image"
                  type="button"
                >
                  <Paperclip size={15} />
                </button>
              </>
            )}

            {/* Model selector */}
            <ModelSelector />

            {/* Send button */}
            <button
              className="flex items-center justify-center w-8 h-8 rounded-lg ml-auto transition-opacity disabled:opacity-40"
              style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
              disabled={!input.trim() || loading}
              onClick={() => handleSubmit(input)}
              title="Send (Enter)"
            >
              <Send size={14} />
            </button>
          </div>
        </div>

        {/* Quick chat pills */}
        <div className="flex flex-wrap gap-2">
          {QUICK_CHATS.map((q) => (
            <button
              key={q.label}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors hover:opacity-80"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
              }}
              onClick={() => handleSubmit(q.label)}
              disabled={loading}
            >
              <span>{q.emoji}</span> {q.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ModelSelector() {
  const { models, currentModel, switchModel, addToast } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!currentModel && models.length === 0) return null;

  const handleSwitch = async (filename: string) => {
    setOpen(false);
    if (filename === currentModel?.filename) return;
    try {
      await switchModel(filename);
      const m = models.find((m) => m.filename === filename);
      addToast(`Loaded ${m?.name ?? filename}`, "success");
    } catch {
      addToast("Failed to load model", "error");
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-opacity hover:opacity-70"
        style={{ color: "var(--text-muted)", background: "var(--bg-panel)" }}
        onClick={() => setOpen((v) => !v)}
        title="Select model"
      >
        <span className="max-w-32 truncate">{currentModel?.name ?? "No model"}</span>
        <ChevronDown size={11} />
      </button>
      {open && (
        <div
          className="absolute bottom-full left-0 mb-1 z-20 rounded-lg py-1 min-w-48 shadow-lg text-sm"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
        >
          {models.map((m) => (
            <button
              key={m.filename}
              className="flex flex-col w-full px-3 py-2 hover:opacity-80 transition-opacity text-left gap-0.5"
              style={{ color: m.isLoaded ? "var(--primary)" : "var(--text)" }}
              onClick={() => handleSwitch(m.filename)}
            >
              <span className="font-medium text-xs">{m.name}</span>
              {m.parameterCount && (
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {m.parameterCount} · {m.architecture}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
