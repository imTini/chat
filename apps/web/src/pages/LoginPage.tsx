import { useState, type FormEvent } from "react";

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<unknown>;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onLogin(username, password);
    } catch {
      setError("Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex h-full items-center justify-center"
      style={{ background: "var(--bg)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8 shadow-xl"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
      >
        <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>
          Chat
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Sign in to continue
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }} htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              disabled={loading}
              className="rounded-lg px-3 py-2 text-sm outline-none transition-colors"
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={loading}
              className="rounded-lg px-3 py-2 text-sm outline-none transition-colors"
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            />
          </div>
          {error && (
            <p className="text-xs" style={{ color: "var(--destructive)" }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity disabled:opacity-50 hover:opacity-90"
            style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
