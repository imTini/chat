my-chat-app/
├─ apps/
│  ├─ api/
│  │  ├─ src/
│  │  │  ├─ server.ts
│  │  │  ├─ routes/
│  │  │  │  ├─ chat.ts
│  │  │  │  ├─ sessions.ts
│  │  │  │  └─ models.ts
│  │  │  ├─ services/
│  │  │  │  ├─ llama/
│  │  │  │  │  ├─ client.ts
│  │  │  │  │  ├─ session-manager.ts
│  │  │  │  │  ├─ prompt.ts
│  │  │  │  │  └─ stream.ts
│  │  │  │  ├─ persistence/
│  │  │  │  │  ├─ chat-store.ts
│  │  │  │  │  └─ session-store.ts
│  │  │  │  └─ tools/
│  │  │  │     ├─ schema.ts
│  │  │  │     └─ functions.ts
│  │  │  ├─ types/
│  │  │  │  ├─ chat.ts
│  │  │  │  └─ session.ts
│  │  │  └─ config/
│  │  │     ├─ env.ts
│  │  │     └─ model.ts
│  │  └─ package.json
│  │
│  └─ web/
│     ├─ src/
│     │  ├─ app/
│     │  ├─ components/
│     │  │  ├─ ChatLayout/
│     │  │  ├─ MessageList/
│     │  │  ├─ MessageBubble/
│     │  │  ├─ Composer/
│     │  │  ├─ TypingIndicator/
│     │  │  └─ Sidebar/
│     │  ├─ hooks/
│     │  │  ├─ useChat.ts
│     │  │  ├─ useSessions.ts
│     │  │  └─ useStream.ts
│     │  ├─ lib/
│     │  │  ├─ api.ts
│     │  │  ├─ event-stream.ts
│     │  │  └─ store.ts
│     │  └─ styles/
│     └─ package.json
│
├─ packages/
│  ├─ shared/
│  │  ├─ src/
│  │  │  ├─ chat-types.ts
│  │  │  ├─ message-schemas.ts
│  │  │  └─ constants.ts
│  │  └─ package.json
│  └─ ui-kit/
│     ├─ src/
│     │  ├─ tokens/
│     │  ├─ primitives/
│     │  └─ chat/
│     └─ package.json
│
├─ models/
│  └─ gemma-4-E4B-it-Q3_K_S.gguf
├─ data/
│  ├─ sessions/
│  └─ chat-history/
├─ package.json
├─ turbo.json
└─ tsconfig.json