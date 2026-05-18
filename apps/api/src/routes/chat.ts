import type { FastifyInstance } from "fastify";
import type { ChatHistoryItem, ChatModelResponse } from "node-llama-cpp";
import {
  getSession,
  setAbortController,
  clearAbortController,
  getAbortController,
  persistSession,
} from "../services/llama/session-manager.js";
import { incrementTokenCount } from "../services/auth/auth-service.js";
import { createStreamChunkSmoother } from "../services/llama/stream-smoother.js";

interface ApiChatMessage {
  role: "user" | "assistant";
  content: string;
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function flattenModelResponse(response: ChatModelResponse["response"]): string {
  return response
    .map((part) => {
      if (typeof part === "string") return part;
      if (part.type === "segment") return part.text;
      if (part.type === "functionCall") {
        const params = safeJson(part.params);
        const result = safeJson(part.result);
        return `${part.name}(${params}) => ${result}`;
      }
      return "";
    })
    .join("");
}

function toApiMessages(history: ChatHistoryItem[]): ApiChatMessage[] {
  const messages: ApiChatMessage[] = [];

  for (const item of history) {
    if (item.type === "user") {
      messages.push({ role: "user", content: item.text });
      continue;
    }
    if (item.type === "model") {
      messages.push({ role: "assistant", content: flattenModelResponse(item.response) });
    }
  }

  return messages;
}

export async function chatRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { id: string } }>("/api/sessions/:id/messages", async (req, reply) => {
    const { id } = req.params;
    const active = await getSession(id);
    if (!active) return reply.status(404).send({ error: "session not found" });

    if (active.meta.userId !== req.user!.id) {
      return reply.status(403).send({ error: "forbidden" });
    }

    return toApiMessages(active.session.getChatHistory());
  });

  app.post<{ Params: { id: string }; Body: { content: string } }>(
    "/api/sessions/:id/messages",
    async (req, reply) => {
      const { id } = req.params;
      const { content } = req.body;

      if (!content) return reply.status(400).send({ error: "content required" });

      const active = await getSession(id);
      if (!active) return reply.status(404).send({ error: "session not found" });

      if (active.meta.userId !== req.user!.id) {
        return reply.status(403).send({ error: "forbidden" });
      }

      const abortController = new AbortController();
      setAbortController(id, abortController);

      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });

      let fullResponse = "";
      const tokensBefore = active.contextSequence.tokenMeter.getState();
      const smoother = createStreamChunkSmoother((chunk) => {
        fullResponse += chunk;
        reply.raw.write(`data: ${JSON.stringify({ delta: chunk, type: "token" })}\n\n`);
      });

      try {
        await active.session.prompt(content, {
          signal: abortController.signal,
          stopOnAbortSignal: true,
          onTextChunk(chunk: string) {
            smoother.push(chunk);
          },
        });
      } catch (err: unknown) {
        const isAbort =
          err instanceof Error && (err.name === "AbortError" || err.message.includes("abort"));
        if (!isAbort) {
          reply.raw.write(`data: ${JSON.stringify({ type: "error", message: String(err) })}\n\n`);
        }
      } finally {
        smoother.flush();
        smoother.stop();
        clearAbortController(id);
        await persistSession(id);

        // Track token usage
        const diff = active.contextSequence.tokenMeter.diff(tokensBefore);
        const usedInputTokens = diff.usedInputTokens;
        const usedOutputTokens = diff.usedOutputTokens;
        const totalTokens = usedInputTokens + usedOutputTokens;
        if (totalTokens > 0) {
          await incrementTokenCount(req.user!.id, totalTokens).catch(() => {/* non-fatal */});
        }

        reply.raw.write(
          `event: done\ndata: ${JSON.stringify({
            fullResponse,
            usedInputTokens,
            usedOutputTokens,
            totalTokens,
          })}\n\n`
        );
        reply.raw.end();
      }
    }
  );

  app.post<{ Params: { id: string } }>("/api/sessions/:id/stop", async (req, reply) => {
    const { id } = req.params;
    const controller = getAbortController(id);
    if (controller) {
      controller.abort();
      return { ok: true };
    }
    return reply.status(404).send({ error: "no active generation" });
  });
}
