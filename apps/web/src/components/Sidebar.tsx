import { useState } from "react";
import type { SessionMeta } from "../lib/api.js";

interface Props {
  sessions: SessionMeta[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onDelete: (id: string) => void;
}

export function Sidebar({ sessions, activeId, onSelect, onCreate, onDelete }: Props) {
  const [newName, setNewName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreate = () => {
    const name = newName.trim() || `Chat ${sessions.length + 1}`;
    onCreate(name);
    setNewName("");
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    setTimeout(() => {
      onDelete(id);
      setDeletingId(null);
    }, 180);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Sessions</h2>
      </div>
      <div className="new-session">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="New session name..."
        />
        <button onClick={handleCreate} title="Create session">+</button>
      </div>
      <div className="session-list">
        {sessions.map((s) => (
          <div
            key={s.id}
            className={`session-item${s.id === activeId ? " active" : ""}${deletingId === s.id ? " deleting" : ""}`}
            onClick={() => deletingId !== s.id && onSelect(s.id)}
          >
            <span className="session-name">{s.name}</span>
            <button
              className="delete-btn"
              onClick={(e) => handleDelete(e, s.id)}
              title="Delete session"
            >
              ×
            </button>
          </div>
        ))}
        {sessions.length === 0 && (
          <p className="no-sessions">No sessions yet. Create one above.</p>
        )}
      </div>
    </div>
  );
}
