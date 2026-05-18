const API = "";

export interface SessionMeta {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string;
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

export async function fetchSessions(): Promise<SessionMeta[]> {
  const res = await fetch(`${API}/api/sessions`);
  return res.json();
}

export async function createSession(name: string): Promise<SessionMeta> {
  const res = await fetch(`${API}/api/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteSession(id: string): Promise<void> {
  await fetch(`${API}/api/sessions/${id}`, { method: "DELETE" });
}

export async function stopGeneration(id: string): Promise<void> {
  await fetch(`${API}/api/sessions/${id}/stop`, { method: "POST" });
}

export async function fetchModels(): Promise<ModelInfo[]> {
  const res = await fetch(`${API}/api/models`);
  return res.json();
}

export async function loadModel(filename: string): Promise<void> {
  const res = await fetch(`${API}/api/models/load`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
  onDone: (fullResponse: string) => void,
  onError: (err: string) => void
): () => void {
  let aborted = false;

  fetch(`${API}/api/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
              onDone(payload.fullResponse ?? "");
            } catch {
              onDone("");
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
