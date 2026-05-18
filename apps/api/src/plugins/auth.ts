import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fastifyPlugin from "fastify-plugin";
import { validateSession } from "../services/auth/auth-service.js";
import type { User } from "../db/schema.js";

declare module "fastify" {
  interface FastifyRequest {
    user: User | null;
  }
}

export const authPlugin = fastifyPlugin(async (app: FastifyInstance) => {
  app.decorateRequest("user", null);

  app.addHook("preHandler", async (req: FastifyRequest, reply: FastifyReply) => {
    // Skip auth for login, logout, me, and health
    const path = req.routeOptions?.url ?? req.url;
    if (
      path === "/api/auth/login" ||
      path === "/api/auth/logout" ||
      path === "/api/auth/me" ||
      path === "/health"
    ) {
      return;
    }

    // Skip non-API routes (static files, SPA)
    if (!req.url.startsWith("/api/")) return;

    const token = req.cookies?.session;
    if (!token) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const user = await validateSession(token);
    if (!user) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    req.user = user;
  });
});
