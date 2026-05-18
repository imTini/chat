# Copilot Instructions

## Project Overview

Local LLM chat app — Node.js/TypeScript backend (Fastify + node-llama-cpp) serving REST + SSE, React SPA frontend consuming the API. GGUF models are loaded from `./models/`. Chat history is persisted as JSON files in `./data/sessions/`.

## Commands

```bash
# Development (runs api + web concurrently via npm workspaces)
npm run dev

# Individual workspaces
npm run dev:api      # tsx watch on apps/api/src/server.ts → http://localhost:3001
npm run dev:web      # Vite dev server → http://localhost:5173

# Build all
npm run build

# Run API production build
npm run start --workspace=apps/api
```

All scripts use **npm workspaces** (not pnpm, despite claude.md mentioning pnpm — the root `package.json` uses npm).

## Architecture

```
apps/api/src/
  server.ts                         ← Fastify bootstrap: init llama → load model → load sessions → listen
  routes/                           ← health, sessions, chat (SSE), models
  services/llama/
    client.ts                       ← Singleton: getLlama(), loadModel(), getModel()
    session-manager.ts              ← In-memory Map of LlamaChatSession + AbortController per session
    model-info.ts                   ← Reads GGUF metadata via readGgufFileInfo()
  services/persistence/
    session-store.ts                ← Reads/writes ./data/sessions/{uuid}.json (meta + chat history)

apps/web/src/
  App.tsx                           ← Root: wires useSessions, useChat, useModels
  hooks/useChat.ts                  ← Calls streamMessage(), manages messages[] state
  lib/api.ts                        ← All fetch calls + SSE stream parser (fetch + ReadableStream)
```

**Startup sequence (critical):** `initLlama()` → `loadModel()` → `loadAllSessions()` → `app.listen()`. All three must succeed or the process exits.

**Model switching** (`POST /api/models/load`): clears all in-memory sessions, loads the new model, then reloads all sessions from disk against the new model context.

## Key Conventions

### SSE Streaming
The chat endpoint (`POST /api/sessions/:id/messages`) responds with `Content-Type: text/event-stream` using `reply.raw` directly — Fastify's normal `reply.send()` is bypassed. Token events:
```
data: {"delta":"text chunk","type":"token"}\n\n
event: done\ndata: {"fullResponse":"..."}\n\n
```
The frontend uses `fetch` + `ReadableStream` (not `EventSource`) to support POST requests. SSE parsing is done manually in `lib/api.ts#parseSSEChunk`.

### Session Lifecycle
- Each session = one `LlamaContext` + one `LlamaChatSession` (held in memory).
- Persisted immediately after `createSession()` and after every completed/aborted generation (`persistSession()`).
- On server restart, `loadAllSessions()` reconstructs each session via `session.setChatHistory(history)`.
- Model switch invalidates all sessions — `clearAllSessions()` disposes in-memory state; disk files are preserved and reloaded against the new model.

### Abort / Stop
A per-session `AbortController` is stored in `session-manager.ts`. `POST /api/sessions/:id/stop` calls `controller.abort()`. The `session.prompt()` call uses `{ signal, stopOnAbortSignal: true }`. The `finally` block always runs `persistSession()` and sends the `done` event regardless of abort.

### API Base URL
`apps/web/src/lib/api.ts` sets `const API = ""` — all requests go to the same origin. Vite proxies `/api` and `/health` to `http://localhost:3001` in dev.

### TypeScript
- `"module": "NodeNext"` — all imports in `apps/api` must use `.js` extensions even for `.ts` source files (e.g. `import { foo } from "./bar.js"`).
- Strict mode enabled everywhere.

### Model Files
GGUF models live in `./models/` (repo root level). `client.ts` resolves paths relative to `MODELS_DIR`. The default model loaded at startup is `gemma-4-E4B-it-Q3_K_S.gguf`. Vision capability is detected by keywords in filename/architecture (`llava`, `vl`, `vision`, etc.).

### No Shared Package in Use
`packages/shared/` exists in the architecture diagram but is not yet implemented. Types are duplicated between `apps/api` (e.g. `SessionMeta`, `ModelInfo`) and `apps/web/src/lib/api.ts`.
