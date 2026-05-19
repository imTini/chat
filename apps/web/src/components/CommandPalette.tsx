import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MessageSquarePlus, MessageCircle, X } from "lucide-react";
import { useApp } from "@/contexts/AppContext";

interface Props {
  onClose: () => void;
}

export function CommandPalette({ onClose }: Props) {
  const navigate = useNavigate();
  const { sessions } = useApp();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = query.trim()
    ? sessions.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
    : sessions.slice(0, 12);

  const items = [
    { id: "__new__", label: "New chat", icon: <MessageSquarePlus size={15} />, action: () => { navigate("/"); onClose(); } },
    ...filtered.map((s) => ({
      id: s.id,
      label: s.name,
      icon: <MessageCircle size={15} />,
      action: () => { navigate(`/chat/${s.id}`); onClose(); },
    })),
  ];

  // Reset selection on query change
  useEffect(() => { setSelectedIndex(0); }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, items.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { items[selectedIndex]?.action(); }
    else if (e.key === "Escape") { onClose(); }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <Search size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search chats…"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--text)" }}
          />
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}>
            <X size={15} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-1">
          {items.length === 0 ? (
            <div className="px-4 py-3 text-sm" style={{ color: "var(--text-muted)" }}>No results</div>
          ) : (
            items.map((item, idx) => (
              <button
                key={item.id}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left transition-colors"
                style={{
                  background: idx === selectedIndex ? "var(--bg-hover)" : "transparent",
                  color: "var(--text)",
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={item.action}
              >
                <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
