import { isModelLoaded } from "../services/llama/client.js";
export async function healthRoutes(app) {
    app.get("/health", async () => {
        return { modelLoaded: isModelLoaded() };
    });
}
