import { createSession, getSession, getAllSessionMetas, deleteSession, } from "../services/llama/session-manager.js";
export async function sessionRoutes(app) {
    app.post("/api/sessions", async (req, reply) => {
        const { name } = req.body;
        if (!name)
            return reply.status(400).send({ error: "name required" });
        const meta = await createSession(name);
        return reply.status(201).send(meta);
    });
    app.get("/api/sessions", async () => {
        return getAllSessionMetas().sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime());
    });
    app.get("/api/sessions/:id", async (req, reply) => {
        const session = await getSession(req.params.id);
        if (!session)
            return reply.status(404).send({ error: "session not found" });
        return session.meta;
    });
    app.delete("/api/sessions/:id", async (req, reply) => {
        const deleted = await deleteSession(req.params.id);
        if (!deleted)
            return reply.status(404).send({ error: "session not found" });
        return { ok: true };
    });
}
