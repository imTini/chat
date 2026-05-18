## Résumé rapide
MVP : backend Node.js + TypeScript exposant une API REST + SSE pour le streaming, backend qui gère LlamaChatSession via node-llama-cpp, persistance simple en fichiers JSON (sessions + history), et UI React SPA consommant l’API et affichant le stream en temps réel. Priorité maximale sur robustesse du streaming, reprise de session et UX basique mais propre.

Documentation node-llama-cpp : https://node-llama-cpp.withcat.ai/guide/chat-session (browse all pages)

## Critères d'acceptation (MVP)
- Lancer le serveur et charger un modèle GGUF local.
- Créer/charger une session de chat et envoyer un message utilisateur.
- Streaming en temps réel des tokens via SSE vers le client.
- Sauvegarde et restauration de l’historique de chat sur disque.
- UI permettant : sélectionner une session, envoyer un message, voir la réponse token-by-token, stopper la génération, créer/supprimer des sessions.

## Priorités
1. Backend LLM + streaming SSE (haute).  
2. Persistance JSON minimaliste (moyenne).  
3. UI React basique avec Composer et MessageList (haute).  
4. Session Manager en mémoire + reload au boot (moyenne).  
5. Tests basiques et scripts dev (basse).

***

## Étape 0 — Pré-requis et initialisation
Tâches:
- Explorer le repo et faire état des lieux  
- Un modèle est déjà présent dans /models : /Users/martin/apps/chat/models/gemma-4-E4B-it-Q3_K_S.gguf
- Créer monorepo minimal: apps/api, apps/web, packages/shared.

Fichiers:
- package.json racine, pnpm-workspace.yaml, tsconfig.json.

Commandes:
- pnpm init -w
- pnpm add -w -D typescript
- pnpm --filter api add fastify @withcatai/node-llama-cpp zod

Critères:
- pnpm dev lance l’API et le web en mode dev.

***

## Étape 1 — Backend minimal: loader modèle et health check
Tâches:
- Créer apps/api/src/server.ts avec Fastify.  
- Implémenter endpoint GET /health qui retourne modelLoaded: boolean.  
- Implémenter module llama/client.ts qui exporte loadModel() et getModelInstance().

Fichiers:
- apps/api/src/services/llama/client.ts
- apps/api/src/routes/health.ts
- apps/api/src/server.ts

Extrait (pseudo):
- loadModel() -> getLlama({ model: path }), then load context and return model handle  [github](https://github.com/ggml-org/llama.cpp/discussions/16938).

Critères:
- GET /health retourne modelLoaded: true après load.

Sources: comportement de chargement et contexte Llama décrit dans la doc.  [github](https://github.com/ggml-org/llama.cpp/discussions/16938)

***

## Étape 2 — SessionManager et persistance JSON

Utiliser la documentation node-llama-cpp : https://node-llama-cpp.withcat.ai/guide/chat-session

Tâches:
- Implémenter SessionManager (in-memory map) qui crée LlamaChatSession par sessionId.  
- Persister sessions minimalement dans /data/sessions/{id}.json avec chatHistory.  
- Endpoints CRUD sessions: POST /api/sessions, GET /api/sessions, GET /api/sessions/:id.

Fichiers:
- apps/api/src/services/llama/session-manager.ts
- apps/api/src/services/persistence/session-store.ts
- apps/api/src/routes/sessions.ts

Comportement:
- createSession(name) -> instantiate LlamaChatSession, save metadata + empty history; return id.  
- load all sessions at boot, reconstruct chatHistory via session.setChatHistory(history).  [github](https://github.com/ggml-org/llama.cpp/discussions/16938)

Critères:
- Créer une session via API et la retrouver après restart (history rechargé).

Sources: méthodes setChatHistory/getChatHistory mentionnées dans doc.  [github](https://github.com/ggml-org/llama.cpp/discussions/16938)

***

## Étape 3 — Endpoint de message + streaming SSE
Tâches:
- Endpoint POST /api/sessions/:id/messages qui:  
  - ajoute message user à session store,  
  - lance generation via session.generate()/prompt API (utiliser onTextChunk pour token streaming),  
  - expose résultat via SSE (text/event-stream) jusqu’à fin ou abort.  
- Endpoint POST /api/sessions/:id/stop pour abort.

Fichiers:
- apps/api/src/routes/chat.ts
- apps/api/src/services/llama/stream.ts
- apps/api/src/services/llama/abort-controller.ts

Détails techniques:
- Utiliser Fastify's raw reply to set headers for SSE, keep connection open.  
- Dans onTextChunk, reply.write(`data: ${chunk}\n\n`); flush.  
- Sur fin: reply.write(`event: done\ndata: {}\n\n`); reply.raw.end().

Gestion abort:
- Garder un AbortController par session lors de génération, appeler abort() sur /stop.

Critères:
- Client reçoit tokens en SSE, peut appeler /stop et la génération s'arrête.  
- Le backend ajoute la réponse finale au chatHistory et sauvegarde.

Sources: streaming via onTextChunk et stopOnAbortSignal dans doc.  [github](https://github.com/ggml-org/llama.cpp/discussions/16938)

***

## Étape 4 — UI React basique
Tâches:
- Initialiser Vite + React + TypeScript.  
- Pages/Composants: Sidebar (sessions), ChatView (MessageList + Composer), MessageBubble.  
- Hooks: useSessions (list/create/select), useChat (sendMessage via SSE, stop).

Fichiers:
- apps/web/src/hooks/useChat.ts
- apps/web/src/components/Composer.tsx
- apps/web/src/components/MessageList.tsx
- apps/web/src/pages/App.tsx

Flux:
- Composer envoie POST /api/sessions/:id/messages, ouvre EventSource sur la même requête (ou un endpoint SSE dédié).  
- useChat reçoit chunks et met à jour message assistant en temps-réel.

UX:
- Afficher état "Generating..." et bouton Stop.  
- Scroll automatique au fur et à mesure du stream.

Critères:
- Texte de l’assistant s’affiche token-by-token dans l’UI, stop fonctionne.

***

## Étape 5 — Fiabilisation: erreurs, sauvegarde périodique, tests
Tâches:
- Sauvegarde automatique après chaque échange ou toutes les N secondes.  
- Gestion des erreurs du modèle (OOM, invalid model) et fallback messages.  
- Tests end-to-end manuels: create session, send message, stop, reload server, restore history.

Fichiers/tests:
- scripts/dev/seed-sessions.ts
- tests/manual-checklist.md

Critères:
- Pas de crash lors de génération longue; erreurs retournées proprement.

***

## Étape 6 — Extras rapides (optionnels pour MVP+)
- Support WebSocket au lieu SSE.  
- Permettre re-roll (regenerate) de la dernière réponse.  
- UI : export JSON, import session, search dans messages.  
- Auth simple si multi-user (token-based).

***

## API contract (extraits)
- POST /api/sessions { name } -> 201 { id, name, createdAt }  
- GET /api/sessions -> 200 [{ id, name, lastUsedAt }]  
- POST /api/sessions/:id/messages { role: "user", content } -> 200 stream SSE tokens.  
- POST /api/sessions/:id/stop -> 200

Chaque réponse de token SSE: data: {"delta":"text chunk","type":"token"}; fin: event: done.

***

## Extraits de code utiles

1) Exemple SSE server pseudo (Fastify):
- backend writes chunks via onTextChunk -> reply.raw.write; fin -> reply.raw.end().  
(Cette logique correspond à l'usage d'onTextChunk et streaming dans la doc node-llama-cpp).  [github](https://github.com/ggml-org/llama.cpp/discussions/16938)

2) Exemple reconstruction session:
- load history JSON -> llamaChatSession.setChatHistory(history) -> ready.  [github](https://github.com/ggml-org/llama.cpp/discussions/16938)
