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

  const handleCreate = () => {
    const name = newName.trim() || `Chat ${sessions.length + 1}`;
    onCreate(name);
    setNewName("");
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
        <button onClick={handleCreate}>+</button>
      </div>
      <div className="session-list">
        {sessions.map((s) => (
          <div
            key={s.id}
            className={`session-item ${s.id === activeId ? "active" : ""}`}
            onClick={() => onSelect(s.id)}
          >
            <span className="session-name">{s.name}</span>
            <button
              className="delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(s.id);
              }}
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
