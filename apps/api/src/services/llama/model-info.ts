import fs from "fs/promises";
import path from "path";
import { readGgufFileInfo } from "node-llama-cpp";
import { MODELS_DIR, getCurrentModelPath } from "./client.js";

export interface ModelCapabilities {
  vision: boolean;
  imageGeneration: boolean;
  embedding: boolean;
}

export interface ModelInfo {
  filename: string;
  name: string;
  architecture: string;
  parameterCount?: string;
  contextLength?: number;
  sizeMB: number;
  capabilities: ModelCapabilities;
  isLoaded: boolean;
}

function detectVision(filename: string, architecture: string): boolean {
  const lower = (filename + " " + architecture).toLowerCase();
  return ["llava", "vision", "vl", "clip", "multimodal", "mmproj", "bakllava"].some((k) =>
    lower.includes(k)
  );
}

function detectImageGeneration(filename: string, architecture: string, name: string): boolean {
  const lower = `${filename} ${architecture} ${name}`.toLowerCase();
  return [
    /\bsdxl\b/,
    /\bsd3\b/,
    /\bstable[-_ ]?diffusion\b/,
    /\bdiffusion\b/,
    /\bflux\b/,
    /\bpixart\b/,
    /\bhunyuan\b/,
    /\bimage[-_ ]?gen\b/,
    /\btext[-_ ]?to[-_ ]?image\b/,
    /\bt2i\b/,
  ].some((pattern) => pattern.test(lower));
}

function detectEmbedding(filename: string, architecture: string, name: string): boolean {
  const lower = `${filename} ${architecture} ${name}`.toLowerCase();
  return ["bert", "embed", "embedding", "bge", "e5", "gte"].some((k) => lower.includes(k));
}

function humanParamCount(count: number | bigint | undefined): string | undefined {
  if (count == null) return undefined;
  const n = typeof count === "bigint" ? Number(count) : count;
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  return `${n}`;
}

export async function listModels(): Promise<ModelInfo[]> {
  let files: string[];
  try {
    files = await fs.readdir(MODELS_DIR);
  } catch {
    return [];
  }

  const ggufFiles = files.filter((f) => f.endsWith(".gguf"));
  const loadedPath = getCurrentModelPath();

  const results = await Promise.allSettled(
    ggufFiles.map(async (filename): Promise<ModelInfo> => {
      const fullPath = path.join(MODELS_DIR, filename);
      const stat = await fs.stat(fullPath);
      const sizeMB = Math.round(stat.size / (1024 * 1024));

      let name = filename.replace(".gguf", "");
      let architecture = "unknown";
      let contextLength: number | undefined;
      let parameterCount: string | undefined;

      try {
        const info = await readGgufFileInfo(fullPath, {
          readTensorInfo: false,
          logWarnings: false,
        });
        const meta = info.metadata;
        architecture = meta.general?.architecture ?? "unknown";
        name = (meta.general as { name?: string })?.name ?? name;
        const archMeta = (info.architectureMetadata as Record<string, unknown>) ?? {};
        const rawCtx = archMeta["context_length"];
        if (rawCtx != null) {
          contextLength =
            typeof rawCtx === "bigint" ? Number(rawCtx) : (rawCtx as number);
        }
        // Try to get parameter count from metadata (general.parameter_count)
        const generalMeta = meta.general as Record<string, unknown>;
        const rawParams = generalMeta?.["parameter_count"] ?? generalMeta?.["parameterCount"];
        if (rawParams != null) {
          parameterCount = humanParamCount(rawParams as number | bigint);
        } else {
          // Fall back to extracting from filename: match patterns like 4B, 7B, E4B, 13B, 70B
          const match = filename.match(/[_\-E](\d+(?:\.\d+)?)(B|M|K)(?:[_\-]|\.gguf)/i);
          if (match) {
            const val = parseFloat(match[1]);
            const unit = match[2].toUpperCase();
            parameterCount = `${val}${unit}`;
          }
        }
      } catch {
        // metadata read failed — use filename-derived values
      }

      const capabilities: ModelCapabilities = {
        vision: detectVision(filename, architecture),
        imageGeneration: detectImageGeneration(filename, architecture, name),
        embedding: detectEmbedding(filename, architecture, name),
      };

      return {
        filename,
        name,
        architecture,
        parameterCount,
        contextLength,
        sizeMB,
        capabilities,
        isLoaded: loadedPath ? path.basename(loadedPath) === filename : false,
      };
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<ModelInfo> => r.status === "fulfilled")
    .map((r) => r.value);
}
