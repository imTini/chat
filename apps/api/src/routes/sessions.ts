import type { FastifyInstance } from "fastify";
import {
  createSession,
  getSession,
  getSessionMetasByUser,
  deleteSession,
} from "../services/llama/session-manager.js";

export async function sessionRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { name: string } }>("/api/sessions", async (req, reply) => {
    const { name } = req.body;
    if (!name) return reply.status(400).send({ error: "name required" });
    const userId = req.user!.id;
    const meta = await createSession(name, userId);
    return reply.status(201).send(meta);
  });

  app.get("/api/sessions", async (req) => {
    const userId = req.user!.id;
    return getSessionMetasByUser(userId).sort(
      (a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()
    );
  });

  app.get<{ Params: { id: string } }>("/api/sessions/:id", async (req, reply) => {
    const session = await getSession(req.params.id);
    if (!session) return reply.status(404).send({ error: "session not found" });
    if (session.meta.userId !== req.user!.id) {
      return reply.status(403).send({ error: "forbidden" });
    }
    return session.meta;
  });

  app.delete<{ Params: { id: string } }>("/api/sessions/:id", async (req, reply) => {
    const session = await getSession(req.params.id);
    if (!session) return reply.status(404).send({ error: "session not found" });
    if (session.meta.userId !== req.user!.id) {
      return reply.status(403).send({ error: "forbidden" });
    }
    const deleted = await deleteSession(req.params.id);
    if (!deleted) return reply.status(404).send({ error: "session not found" });
    return { ok: true };
  });
}
