import type { FastifyInstance } from "fastify";
import {
  findUserByUsername,
  verifyPassword,
  createUserSession,
  deleteUserSession,
  validateSession,
} from "../services/auth/auth-service.js";

const COOKIE_NAME = "session";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { username: string; password: string } }>(
    "/api/auth/login",
    async (req, reply) => {
      const { username, password } = req.body ?? {};
      if (!username || !password) {
        return reply.status(400).send({ error: "username and password required" });
      }

      const user = await findUserByUsername(username);
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        return reply.status(401).send({ error: "Invalid credentials" });
      }

      const token = await createUserSession(user.id);

      reply.setCookie(COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
        maxAge: COOKIE_MAX_AGE,
        secure: process.env.NODE_ENV === "production",
      });

      return { id: user.id, username: user.username, tokenCount: user.tokenCount };
    }
  );

  app.post("/api/auth/logout", async (req, reply) => {
    const token = req.cookies?.[COOKIE_NAME];
    if (token) {
      await deleteUserSession(token);
    }
    reply.clearCookie(COOKIE_NAME, { path: "/" });
    return { ok: true };
  });

  app.get("/api/auth/me", async (req, reply) => {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return reply.status(401).send({ error: "Unauthorized" });

    const user = await validateSession(token);
    if (!user) return reply.status(401).send({ error: "Unauthorized" });

    return { id: user.id, username: user.username, tokenCount: user.tokenCount };
  });
}
