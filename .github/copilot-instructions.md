# Copilot Instructions

## Project Overview

Monorepo local LLM chat app:
- `apps/api`: Fastify + TypeScript + `node-llama-cpp` backend, with cookie auth and SSE chat streaming.
- `apps/web`: React + Vite frontend.
- Models are GGUF files under repo-level `./models`.
- Persistence is database-backed (SQLite by default, Postgres when `DATABASE_URL` is set), with chat history stored in the `sessions` table.

## Build, test, and lint commands

```bash
# Install dependencies (postinstall auto-runs model pull)
npm install

# Pull/update GGUF models into ./models manually
npm run models:pull

# Run both API + web in dev
npm run dev

# Run one workspace in dev
npm run dev:api
npm run dev:web

# Build both workspaces
npm run build

# Run production API build
npm run start
# or
npm run start --workspace=apps/api

# Seed first login user (admin/changeme unless env overrides)
npm run seed
```

Test/lint status:
- There are currently no `test` scripts and no `lint` scripts in root, `apps/api`, or `apps/web`.
- Single-test command is not available yet because no test runner is configured.

## High-level architecture

### Backend boot flow (`apps/api/src/server.ts`)
1. Loads `.env` from repo root explicitly via `dotenv`.
2. Initializes DB and runs migrations (`initDb()` + `migrate()`).
3. Registers cookie + auth plugin and routes.
4. Attempts llama startup (`initLlama()` → `loadModel()` → `loadAllSessions()`).
5. Starts Fastify on `:3001`; if `apps/web/dist` exists, serves SPA statically from API.

Important nuance: model startup failures are logged, but API still starts in degraded mode so auth/session endpoints can remain available.

### Data and auth model
- Drizzle ORM with runtime backend selection:
  - SQLite file at `data/chat.db` in local/dev by default.
  - Postgres when `DATABASE_URL` is set (or in production).
- Core tables: `users`, `user_sessions` (auth cookie tokens), `sessions` (chat metadata + serialized history).
- No public registration route; first user is created via `npm run seed`.

### Chat flow (API + web)
- `POST /api/sessions/:id/messages` streams SSE directly with `reply.raw`.
- Server emits token events (`type: "token"`) and a final `event: done` payload including `usedInputTokens`, `usedOutputTokens`, and `totalTokens`.
- Server applies stream chunk smoothing (`stream-smoother.ts`) before emitting.
- Frontend consumes SSE with `fetch` + `ReadableStream` and manual parsing (`parseSSEChunk` in `apps/web/src/lib/api.ts`), then applies additional UI-side token draining in `useChat`.

### Session/model lifecycle
- Active llama sessions are in-memory (`Map`) with per-session `AbortController`.
- Session history is persisted to DB on create and after each generation (including abort paths).
- Model switch (`POST /api/models/load`) clears in-memory sessions, loads selected model, then reloads persisted sessions from DB into new llama contexts.

## Key conventions (project-specific)

- **Auth is enforced in plugin preHandler** (`apps/api/src/plugins/auth.ts`) for `/api/*` routes except `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`; handlers expect `req.user`.
- **Ownership checks are mandatory** on session routes (`session.meta.userId` must match `req.user.id`).
- **Frontend requests always send cookies** (`credentials: "include"` in `apps/web/src/lib/api.ts`).
- **API base URL is same-origin** (`const API = ""`); Vite dev proxy forwards `/api` and `/health` to `http://localhost:3001`.
- **TypeScript NodeNext rules apply in API**: internal imports use `.js` extension in `.ts` source files.
- **Model metadata/capabilities are inferred** from GGUF metadata + filename heuristics (`model-info.ts`), not from a static registry.
