export interface StreamChunkSmoother {
    push(chunk: string): void;
    flush(): void;
    stop(): void;
}
interface CreateStreamChunkSmootherOptions {
    maxChunkSize?: number;
    flushIntervalMs?: number;
}
export declare function createStreamChunkSmoother(emitChunk: (chunk: string) => void, options?: CreateStreamChunkSmootherOptions): StreamChunkSmoother;
export {};
