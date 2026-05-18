const API = "";

export interface SessionMeta {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  lastUsedAt: string;
}

export interface UserInfo {
  id: string;
  username: string;
  tokenCount: number;
}

export interface ModelCapabilities {
  vision: boolean;
  imageGeneration: boolean;
  embedding: boolean;
}

export interface ModelInfo {
  filename: string;
  name: string;
  architecture: string;
  parameterCount?: string;
  contextLength?: number;
  sizeMB: number;
  capabilities: ModelCapabilities;
  isLoaded: boolean;
}

export interface StreamDonePayload {
  fullResponse: string;
  usedInputTokens: number;
  usedOutputTokens: number;
  totalTokens: number;
}

// Auth
export async function login(username: string, password: string): Promise<UserInfo> {
  const res = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error("Invalid credentials");
  return res.json();
}

export async function logout(): Promise<void> {
  await fetch(`${API}/api/auth/logout`, { method: "POST", credentials: "include" });
}

export async function fetchMe(): Promise<UserInfo | null> {
  const res = await fetch(`${API}/api/auth/me`, { credentials: "include" });
  if (res.status === 401) return null;
  return res.json();
}

export async function fetchSessions(): Promise<SessionMeta[]> {
  const res = await fetch(`${API}/api/sessions`, { credentials: "include" });
  return res.json();
}

export async function createSession(name: string): Promise<SessionMeta> {
  const res = await fetch(`${API}/api/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteSession(id: string): Promise<void> {
  await fetch(`${API}/api/sessions/${id}`, { method: "DELETE", credentials: "include" });
}

export async function stopGeneration(id: string): Promise<void> {
  await fetch(`${API}/api/sessions/${id}/stop`, { method: "POST", credentials: "include" });
}

export async function fetchModels(): Promise<ModelInfo[]> {
  const res = await fetch(`${API}/api/models`, { credentials: "include" });
  return res.json();
}

export async function loadModel(filename: string): Promise<void> {
  const res = await fetch(`${API}/api/models/load`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ filename }),
  });
  if (!res.ok) throw new Error(await res.text());
}

// Parse raw SSE text into events: [{event?, data}]
function parseSSEChunk(text: string): Array<{ event?: string; data: string }> {
  const events: Array<{ event?: string; data: string }> = [];
  const blocks = text.split("\n\n");
  for (const block of blocks) {
    if (!block.trim()) continue;
    let event: string | undefined;
    const dataLines: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event: ")) event = line.slice(7).trim();
      else if (line.startsWith("data: ")) dataLines.push(line.slice(6));
    }
    if (dataLines.length > 0) events.push({ event, data: dataLines.join("\n") });
  }
  return events;
}

export function streamMessage(
  sessionId: string,
  content: string,
  onToken: (delta: string) => void,
  onDone: (payload: StreamDonePayload) => void,
  onError: (err: string) => void
): () => void {
  let aborted = false;

  fetch(`${API}/api/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ content }),
  })
    .then(async (res) => {
      if (!res.ok || !res.body) {
        onError(`HTTP ${res.status}`);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (!aborted) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lastDouble = buffer.lastIndexOf("\n\n");
        if (lastDouble === -1) continue;

        const toProcess = buffer.slice(0, lastDouble + 2);
        buffer = buffer.slice(lastDouble + 2);

        for (const { event, data } of parseSSEChunk(toProcess)) {
          if (event === "done") {
            try {
              const payload = JSON.parse(data);
              onDone({
                fullResponse: String(payload.fullResponse ?? ""),
                usedInputTokens: Number(payload.usedInputTokens ?? 0),
                usedOutputTokens: Number(payload.usedOutputTokens ?? 0),
                totalTokens: Number(payload.totalTokens ?? 0),
              });
            } catch {
              onDone({
                fullResponse: "",
                usedInputTokens: 0,
                usedOutputTokens: 0,
                totalTokens: 0,
              });
            }
            return;
          }
          try {
            const payload = JSON.parse(data);
            if (payload.type === "token") onToken(payload.delta);
            if (payload.type === "error") onError(payload.message);
          } catch {}
        }
      }
    })
    .catch((err) => {
      if (!aborted) onError(String(err));
    });

  return () => {
    aborted = true;
  };
}
