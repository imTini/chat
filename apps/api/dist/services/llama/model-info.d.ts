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
export declare function listModels(): Promise<ModelInfo[]>;
