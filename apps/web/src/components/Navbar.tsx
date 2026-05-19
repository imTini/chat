import { useState, useRef, useEffect } from "react";
import { Check, Pencil, ChevronDown, Loader2 } from "lucide-react";
import { useApp } from "@/contexts/AppContext";

interface NavbarProps {
  sessionId: string;
  sessionName: string;
  generating: boolean;
  onRename: (name: string) => void;
}

export function Navbar({ sessionId, sessionName, generating, onRename }: NavbarProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(sessionName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(sessionName);
  }, [sessionName]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== sessionName) onRename(trimmed);
    setEditing(false);
  };

  return (
    <div
      className="flex items-center gap-2 px-4 h-12 shrink-0"
      style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}
    >
      {/* Title */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0 group">
        {editing ? (
          <input
            ref={inputRef}
            className="flex-1 min-w-0 rounded-md px-2 py-0.5 text-sm outline-none"
            style={{
              background: "var(--bg-panel)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") { setDraft(sessionName); setEditing(false); }
            }}
            onBlur={commit}
          />
        ) : (
          <>
            <span
              className="text-sm font-medium truncate cursor-pointer hover:opacity-70 transition-opacity"
              style={{ color: "var(--text)" }}
              onClick={() => setEditing(true)}
            >
              {sessionName}
            </span>
            <button
              className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-5 h-5 rounded transition-opacity"
              style={{ color: "var(--text-muted)" }}
              onClick={() => setEditing(true)}
              title="Rename chat"
            >
              <Pencil size={11} />
            </button>
          </>
        )}
      </div>

      {/* Generating badge */}
      {generating && (
        <div
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
          style={{ background: "var(--bg-panel)", color: "var(--text-muted)" }}
        >
          <Loader2 size={11} className="animate-spin" />
          Generating
        </div>
      )}

      {/* Model selector */}
      <NavbarModelSelector />
    </div>
  );
}

function NavbarModelSelector() {
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
        className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-70"
        style={{
          color: "var(--text-muted)",
          background: "var(--bg-panel)",
          border: "1px solid var(--border)",
        }}
        onClick={() => setOpen((v) => !v)}
        title="Select model"
      >
        <span className="max-w-36 truncate">{currentModel?.name ?? "No model"}</span>
        <ChevronDown size={11} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-20 rounded-lg py-1 min-w-52 shadow-lg text-sm"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
        >
          {models.map((m) => (
            <button
              key={m.filename}
              className="flex items-center justify-between w-full px-3 py-2 hover:opacity-80 transition-opacity text-left gap-2"
              onClick={() => handleSwitch(m.filename)}
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-xs font-medium truncate" style={{ color: m.isLoaded ? "var(--primary)" : "var(--text)" }}>
                  {m.name}
                </span>
                {m.parameterCount && (
                  <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {m.parameterCount} · {m.architecture}
                  </span>
                )}
              </div>
              {m.isLoaded && <Check size={13} style={{ color: "var(--primary)", flexShrink: 0 }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
