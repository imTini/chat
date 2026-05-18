import { getLlama } from "node-llama-cpp";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const MODELS_DIR = path.resolve(__dirname, "../../../../../models");
let llamaInstance = null;
let llamaModel = null;
let currentModelPath = null;
export async function initLlama() {
    llamaInstance = await getLlama("lastBuild");
}
export async function loadModel(modelPath) {
    if (!llamaInstance)
        throw new Error("Llama not initialized");
    const defaultModel = process.env.MODEL_PATH ?? path.join(MODELS_DIR, "gemma-4-E4B-it-Q3_K_S.gguf");
    const resolvedPath = modelPath
        ? path.isAbsolute(modelPath)
            ? modelPath
            : path.join(MODELS_DIR, modelPath)
        : defaultModel;
    if (!(await import("fs/promises").then(fs => fs.access(resolvedPath).then(() => true, () => false)))) {
        throw new Error(`Model file not found: ${resolvedPath}`);
    }
    if (llamaModel) {
        await llamaModel.dispose();
        llamaModel = null;
        currentModelPath = null;
    }
    llamaModel = await llamaInstance.loadModel({ modelPath: resolvedPath });
    currentModelPath = resolvedPath;
}
export function getLlamaInstance() {
    if (!llamaInstance)
        throw new Error("Llama not initialized");
    return llamaInstance;
}
export function getModel() {
    if (!llamaModel)
        throw new Error("Model not loaded");
    return llamaModel;
}
export function getCurrentModelPath() {
    return currentModelPath;
}
export function isModelLoaded() {
    return llamaModel !== null;
}
