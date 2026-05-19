import { useState } from "react";
import { Copy, Check, ThumbsUp, ThumbsDown, RefreshCw, Pencil } from "lucide-react";
import type { Message } from "@/hooks/useChat";

interface AssistantActionsProps {
  message: Message;
  onCopy: () => void;
  onRegenerate?: () => void;
  onVote?: (up: boolean) => void;
}

interface UserActionsProps {
  message: Message;
  onEdit?: (newText: string) => void;
}

export function AssistantMessageActions({ message, onCopy, onRegenerate, onVote }: AssistantActionsProps) {
  const [copied, setCopied] = useState(false);
  const [vote, setVote] = useState<boolean | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content).catch(() => {});
    setCopied(true);
    onCopy();
    setTimeout(() => setCopied(false), 1500);
  };

  const handleVote = (up: boolean) => {
    setVote((prev) => (prev === up ? null : up));
    onVote?.(up);
  };

  return (
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
      <ActionBtn title="Copy" onClick={handleCopy}>
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </ActionBtn>
      <ActionBtn title="Thumbs up" onClick={() => handleVote(true)} active={vote === true}>
        <ThumbsUp size={13} />
      </ActionBtn>
      <ActionBtn title="Thumbs down" onClick={() => handleVote(false)} active={vote === false}>
        <ThumbsDown size={13} />
      </ActionBtn>
      {onRegenerate && (
        <ActionBtn title="Regenerate" onClick={onRegenerate}>
          <RefreshCw size={13} />
        </ActionBtn>
      )}
    </div>
  );
}

export function UserMessageActions({ message, onEdit }: UserActionsProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);

  if (!onEdit) return null;

  if (editing) {
    return (
      <div className="w-full flex flex-col gap-2 mt-1">
        <textarea
          className="w-full rounded-lg px-3 py-2 text-sm resize-none outline-none"
          style={{
            background: "var(--bg-panel)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            minHeight: "80px",
          }}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onEdit(draft.trim());
              setEditing(false);
            }
            if (e.key === "Escape") {
              setDraft(message.content);
              setEditing(false);
            }
          }}
          autoFocus
        />
        <div className="flex items-center gap-2">
          <button
            className="rounded-md px-3 py-1 text-xs font-medium"
            style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
            onClick={() => { onEdit(draft.trim()); setEditing(false); }}
          >
            Save & regenerate
          </button>
          <button
            className="rounded-md px-3 py-1 text-xs"
            style={{ color: "var(--text-muted)" }}
            onClick={() => { setDraft(message.content); setEditing(false); }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
      <ActionBtn title="Edit" onClick={() => { setDraft(message.content); setEditing(true); }}>
        <Pencil size={13} />
      </ActionBtn>
    </div>
  );
}

function ActionBtn({
  children,
  title,
  onClick,
  active,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex items-center justify-center w-6 h-6 rounded-md transition-colors"
      style={{
        color: active ? "var(--primary)" : "var(--text-muted)",
        background: active ? "var(--bg-panel)" : "transparent",
      }}
    >
      {children}
    </button>
  );
}
