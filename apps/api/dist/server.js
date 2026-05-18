import Fastify from "fastify";
import { initLlama, loadModel } from "./services/llama/client.js";
import { loadAllSessions } from "./services/llama/session-manager.js";
import { healthRoutes } from "./routes/health.js";
import { sessionRoutes } from "./routes/sessions.js";
import { chatRoutes } from "./routes/chat.js";
import { modelRoutes } from "./routes/models.js";
const app = Fastify({ logger: true });
app.addHook("onRequest", async (req, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    reply.header("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
    reply.header("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
        reply.status(204).send();
    }
});
app.register(healthRoutes);
app.register(sessionRoutes);
app.register(chatRoutes);
app.register(modelRoutes);
const start = async () => {
    try {
        console.log("Initializing llama...");
        await initLlama();
        console.log("Loading model...");
        await loadModel();
        console.log("Model loaded. Loading sessions...");
        await loadAllSessions();
        console.log("Sessions loaded.");
    }
    catch (err) {
        app.log.error({ err }, "Model startup failed.");
        app.log.warn("Starting API without a loaded model. Model-dependent endpoints may fail until a model is loaded.");
    }
    try {
        await app.listen({ port: 3001, host: "0.0.0.0" });
        console.log("API running on http://localhost:3001");
    }
    catch (err) {
        app.log.error({ err }, "Failed to start API server.");
        process.exit(1);
    }
};
start();
