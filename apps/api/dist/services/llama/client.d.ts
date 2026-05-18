import { LlamaModel, Llama } from "node-llama-cpp";
export declare const MODELS_DIR: string;
export declare const LLAMA_THREADS: number;
export declare function initLlama(): Promise<void>;
export declare function loadModel(modelPath?: string): Promise<void>;
export declare function getLlamaInstance(): Llama;
export declare function getModel(): LlamaModel;
export declare function getCurrentModelPath(): string | null;
export declare function isModelLoaded(): boolean;
