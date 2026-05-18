import { getLlama, LlamaModel, Llama, LlamaLogLevel } from "node-llama-cpp";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const MODELS_DIR = path.resolve(__dirname, "../../../../../models");

// Leave 1 core for the OS/Node event loop; floor at 1.
export const LLAMA_THREADS = process.env.LLAMA_MAX_THREADS
  ? Math.max(1, parseInt(process.env.LLAMA_MAX_THREADS, 10))
  : Math.max(1, os.cpus().length - 1);

// 1.5 GB RAM headroom (Linux default is only 1 GB).
const RAM_PADDING_BYTES = 1.5 * 1024 * 1024 * 1024;

let llamaInstance: Llama | null = null;
let llamaModel: LlamaModel | null = null;
let currentModelPath: string | null = null;

export async function initLlama(): Promise<void> {
  llamaInstance = await getLlama({
    // Auto-select best backend (CPU on this VPS; picks CUDA/Vulkan automatically if ever added).
    gpu: "auto",
    // Cap threads to avoid starving the Node.js event loop.
    maxThreads: LLAMA_THREADS,
    // Explicit RAM headroom: Linux default is 1 GB; 1.5 GB is safer on an 8 GB host.
    ramPadding: RAM_PADDING_BYTES,
    logLevel: LlamaLogLevel.warn,
  });
}

export async function loadModel(modelPath?: string): Promise<void> {
  if (!llamaInstance) throw new Error("Llama not initialized");

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

export function getLlamaInstance(): Llama {
  if (!llamaInstance) throw new Error("Llama not initialized");
  return llamaInstance;
}

export function getModel(): LlamaModel {
  if (!llamaModel) throw new Error("Model not loaded");
  return llamaModel;
}

export function getCurrentModelPath(): string | null {
  return currentModelPath;
}

export function isModelLoaded(): boolean {
  return llamaModel !== null;
}
