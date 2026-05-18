import { listModels } from "../services/llama/model-info.js";
import { loadModel, getCurrentModelPath, isModelLoaded } from "../services/llama/client.js";
import { clearAllSessions, loadAllSessions } from "../services/llama/session-manager.js";
import path from "path";
export async function modelRoutes(app) {
    app.get("/api/models", async () => {
        return listModels();
    });
    app.get("/api/models/current", async () => {
        const modelPath = getCurrentModelPath();
        if (!modelPath)
            return { loaded: false };
        return {
            loaded: isModelLoaded(),
            filename: path.basename(modelPath),
        };
    });
    app.post("/api/models/load", async (req, reply) => {
        const { filename } = req.body;
        if (!filename)
            return reply.status(400).send({ error: "filename required" });
        try {
            clearAllSessions();
            await loadModel(filename);
            await loadAllSessions();
            return { ok: true, filename };
        }
        catch (err) {
            return reply.status(500).send({ error: String(err) });
        }
    });
}
