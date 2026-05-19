import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  MessageSquarePlus,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  LogOut,
  Moon,
  Sun,
  MessageCircle,
} from "lucide-react";
import { isToday, isYesterday, isThisWeek, isThisMonth, subMonths, isAfter } from "date-fns";
import { useApp } from "@/contexts/AppContext";
import type { SessionMeta } from "@/lib/api";

function groupSessions(sessions: SessionMeta[]) {
  const groups: Array<{ label: string; items: SessionMeta[] }> = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "This week", items: [] },
    { label: "Last month", items: [] },
    { label: "Older", items: [] },
  ];
  const now = new Date();
  const oneMonthAgo = subMonths(now, 1);
  for (const s of sessions) {
    const d = new Date(s.lastUsedAt);
    if (isToday(d)) groups[0].items.push(s);
    else if (isYesterday(d)) groups[1].items.push(s);
    else if (isThisWeek(d)) groups[2].items.push(s);
    else if (isAfter(d, oneMonthAgo)) groups[3].items.push(s);
    else groups[4].items.push(s);
  }
  return groups.filter((g) => g.items.length > 0);
}

function SessionItem({
  session,
  active,
  collapsed,
  onRename,
  onDelete,
}: {
  session: SessionMeta;
  active: boolean;
  collapsed: boolean;
  onRename: (id: string, current: string) => void;
  onDelete: (id: string) => void;
}) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div
      className="group relative flex items-center rounded-md px-2 py-1.5 cursor-pointer text-sm transition-colors"
      style={{ background: active ? "var(--bg-hover)" : "transparent", color: active ? "var(--text)" : "var(--text-muted)" }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      onClick={() => navigate(`/chat/${session.id}`)}
      title={collapsed ? session.name : undefined}
    >
      <MessageCircle size={14} className="shrink-0 mr-2 opacity-60" />
      {!collapsed && (
        <>
          <span className="flex-1 truncate pr-1" style={{ color: "var(--text)" }}>{session.name}</span>
          <div className="shrink-0 ml-auto opacity-0 group-hover:opacity-100 transition-opacity relative" ref={menuRef}>
            <button
              className="flex items-center justify-center w-5 h-5 rounded"
              style={{ color: "var(--text-muted)" }}
              onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
              title="More actions"
            >
              <MoreHorizontal size={14} />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-6 z-50 w-36 rounded-lg py-1 shadow-lg text-sm"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="flex w-full items-center gap-2 px-3 py-1.5 hover:opacity-80 transition-opacity"
                  onClick={() => { setMenuOpen(false); onRename(session.id, session.name); }}
                >
                  <Pencil size={13} /> Rename
                </button>
                <button
                  className="flex w-full items-center gap-2 px-3 py-1.5 hover:opacity-80 transition-opacity"
                  style={{ color: "var(--destructive)" }}
                  onClick={() => { setMenuOpen(false); onDelete(session.id); }}
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function NavButton({ icon, label, collapsed, kbd, onClick }: {
  icon: React.ReactNode; label: string; collapsed: boolean; kbd?: string; onClick: () => void;
}) {
  return (
    <button
      className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm transition-colors"
      style={{ color: "var(--text-muted)", background: "transparent" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
      onClick={onClick}
      title={collapsed ? label : undefined}
    >
      <span className="shrink-0">{icon}</span>
      {!collapsed && (
        <>
          <span className="flex-1 text-left">{label}</span>
          {kbd && <span className="text-xs opacity-50">{kbd}</span>}
        </>
      )}
    </button>
  );
}

export function Sidebar() {
  const navigate = useNavigate();
  const { id: activeId } = useParams<{ id: string }>();
  const {
    user, sessions, sessionsLoading, deleteSession, renameSession,
    sidebarCollapsed: collapsed, setSidebarCollapsed,
    setCommandPaletteOpen, logout, addToast,
  } = useApp();

  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try { return (localStorage.getItem("theme") as "dark" | "light") ?? "dark"; } catch { return "dark"; }
  });
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch {}
  };

  const handleRename = (id: string, current: string) => {
    setRenamingId(id);
    setRenameValue(current);
    setTimeout(() => renameInputRef.current?.focus(), 50);
  };

  const submitRename = async () => {
    if (!renamingId || !renameValue.trim()) { setRenamingId(null); return; }
    try { await renameSession(renamingId, renameValue.trim()); } catch { addToast("Failed to rename session", "error"); }
    setRenamingId(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSession(id);
      if (id === activeId) navigate("/");
    } catch { addToast("Failed to delete session", "error"); }
  };

  const groups = groupSessions(sessions);

  return (
    <aside
      className={`flex flex-col shrink-0 ${collapsed ? "w-14" : "w-64"} transition-all duration-200 overflow-hidden`}
      style={{ background: "var(--bg-elevated)", borderRight: "1px solid var(--border)" }}
    >
      {/* Header */}
      <div className="flex items-center px-3 py-3 gap-2 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        {!collapsed && <span className="flex-1 font-semibold text-sm" style={{ color: "var(--text)" }}>Chat</span>}
        <button
          className="flex items-center justify-center w-7 h-7 rounded-md hover:opacity-70 transition-opacity ml-auto"
          style={{ color: "var(--text-muted)" }}
          onClick={() => setSidebarCollapsed(!collapsed)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <div className="px-2 pt-2 pb-1 flex flex-col gap-0.5 shrink-0">
        <NavButton icon={<MessageSquarePlus size={16} />} label="New chat" collapsed={collapsed} kbd="⌘O" onClick={() => navigate("/")} />
        <NavButton icon={<Search size={16} />} label="Search" collapsed={collapsed} kbd="⌘K" onClick={() => setCommandPaletteOpen(true)} />
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-0">
        {sessionsLoading ? (
          !collapsed && <div className="px-2 py-4 text-xs" style={{ color: "var(--text-muted)" }}>Loading…</div>
        ) : groups.length === 0 ? (
          !collapsed && <div className="px-2 py-4 text-xs" style={{ color: "var(--text-muted)" }}>No chats yet. Start a new one!</div>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="mb-2">
              {!collapsed && (
                <div className="px-2 py-1 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                  {group.label}
                </div>
              )}
              {group.items.map((s) =>
                renamingId === s.id ? (
                  <div key={s.id} className="px-2 py-1">
                    <input
                      ref={renameInputRef}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") submitRename(); if (e.key === "Escape") setRenamingId(null); }}
                      onBlur={submitRename}
                      className="w-full rounded px-2 py-1 text-sm outline-none"
                      style={{ background: "var(--bg)", border: "1px solid var(--primary)", color: "var(--text)" }}
                    />
                  </div>
                ) : (
                  <SessionItem key={s.id} session={s} active={s.id === activeId} collapsed={collapsed} onRename={handleRename} onDelete={handleDelete} />
                )
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-2 pb-2 pt-2 flex flex-col gap-0.5 shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
        <NavButton icon={theme === "dark" ? <Sun size={16} /> : <Moon size={16} />} label={theme === "dark" ? "Light mode" : "Dark mode"} collapsed={collapsed} onClick={toggleTheme} />
        {!collapsed ? (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm" style={{ color: "var(--text-muted)" }}>
            <div className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 uppercase" style={{ background: "var(--primary)", color: "var(--primary-fg)" }}>
              {user?.username.slice(0, 1)}
            </div>
            <span className="flex-1 truncate" style={{ color: "var(--text)" }}>{user?.username}</span>
            <button onClick={logout} title="Sign out" className="hover:opacity-70 transition-opacity" style={{ color: "var(--text-muted)" }}>
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button className="flex items-center justify-center w-7 h-7 mx-auto rounded-md hover:opacity-70" style={{ color: "var(--text-muted)" }} onClick={logout} title="Sign out">
            <LogOut size={16} />
          </button>
        )}
      </div>
    </aside>
  );
}
