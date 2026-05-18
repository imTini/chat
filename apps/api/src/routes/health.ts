import type { FastifyInstance } from "fastify";
import { isModelLoaded } from "../services/llama/client.js";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => {
    return { modelLoaded: isModelLoaded() };
  });
}
