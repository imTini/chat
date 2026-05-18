import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyCookie from "@fastify/cookie";
import { initLlama, loadModel } from "./services/llama/client.js";
import { loadAllSessions } from "./services/llama/session-manager.js";
import { healthRoutes } from "./routes/health.js";
import { sessionRoutes } from "./routes/sessions.js";
import { chatRoutes } from "./routes/chat.js";
import { modelRoutes } from "./routes/models.js";
import { authRoutes } from "./routes/auth.js";
import { authPlugin } from "./plugins/auth.js";
import { initDb } from "./db/index.js";
import { migrate } from "./db/migrate.js";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// In production: dist/server.js → ../../web/dist = apps/web/dist
const WEB_DIST = path.resolve(__dirname, "../../web/dist");
const app = Fastify({ logger: true });
app.addHook("onRequest", async (req, reply) => {
    reply.header("Access-Control-Allow-Origin", req.headers.origin ?? "*");
    reply.header("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
    reply.header("Access-Control-Allow-Headers", "Content-Type");
    reply.header("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") {
        reply.status(204).send();
    }
});
await app.register(fastifyCookie);
await app.register(authPlugin);
app.register(authRoutes);
app.register(healthRoutes);
app.register(sessionRoutes);
app.register(chatRoutes);
app.register(modelRoutes);
// Serve React SPA from apps/web/dist in production
if (fs.existsSync(WEB_DIST)) {
    app.register(fastifyStatic, {
        root: WEB_DIST,
        prefix: "/",
        decorateReply: false,
    });
    // SPA fallback: unmatched routes serve index.html
    app.setNotFoundHandler((_req, reply) => {
        reply.sendFile("index.html");
    });
}
const start = async () => {
    try {
        console.log("Initializing database...");
        await initDb();
        await migrate();
        console.log("Database ready.");
    }
    catch (err) {
        app.log.error({ err }, "Database initialization failed.");
        process.exit(1);
    }
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
        app.log.info("API running on http://localhost:3001");
        if (fs.existsSync(WEB_DIST)) {
            app.log.info("Frontend (apps/web/dist) served at http://0.0.0.0:3001/");
        }
        else {
            app.log.warn("apps/web/dist not found — run `npm run build` first to serve the frontend. Dev: http://localhost:5173");
        }
    }
    catch (err) {
        app.log.error({ err }, "Failed to start API server.");
        process.exit(1);
    }
};
start();
