import { useState } from "react";
import type { SessionMeta, UserInfo } from "../lib/api.js";

interface Props {
  sessions: SessionMeta[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onDelete: (id: string) => void;
  user: UserInfo;
  onLogout: () => void;
}

export function Sidebar({ sessions, activeId, onSelect, onCreate, onDelete, user, onLogout }: Props) {
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
      <div className="sidebar-footer">
        <div className="user-info">
          <span className="user-name">{user.username}</span>
          <span className="token-count" title="Total tokens used">{user.tokenCount.toLocaleString()} tokens</span>
        </div>
        <button className="logout-btn" onClick={onLogout} title="Sign out">
          Sign out
        </button>
      </div>
    </div>
  );
}
