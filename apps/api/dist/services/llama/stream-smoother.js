const SOFT_BOUNDARY_CHARS = new Set([" ", "\n", "\t", ",", ".", ";", ":", "!", "?"]);
function takeNextChunk(buffer, maxChunkSize) {
    if (buffer.length <= maxChunkSize)
        return buffer;
    const window = buffer.slice(0, maxChunkSize);
    const minBoundaryIndex = Math.floor(maxChunkSize * 0.5);
    for (let i = window.length - 1; i >= minBoundaryIndex; i -= 1) {
        if (SOFT_BOUNDARY_CHARS.has(window[i])) {
            return buffer.slice(0, i + 1);
        }
    }
    return buffer.slice(0, maxChunkSize);
}
export function createStreamChunkSmoother(emitChunk, options = {}) {
    const maxChunkSize = options.maxChunkSize ?? 24;
    const flushIntervalMs = options.flushIntervalMs ?? 18;
    let buffer = "";
    let flushTimer = null;
    const flushOne = () => {
        if (!buffer)
            return;
        const next = takeNextChunk(buffer, maxChunkSize);
        buffer = buffer.slice(next.length);
        emitChunk(next);
    };
    const stopTimer = () => {
        if (!flushTimer)
            return;
        clearInterval(flushTimer);
        flushTimer = null;
    };
    const ensureTimer = () => {
        if (flushTimer)
            return;
        flushTimer = setInterval(() => {
            flushOne();
            if (!buffer)
                stopTimer();
        }, flushIntervalMs);
    };
    return {
        push(chunk) {
            if (!chunk)
                return;
            buffer += chunk;
            flushOne();
            if (buffer)
                ensureTimer();
        },
        flush() {
            while (buffer)
                flushOne();
        },
        stop() {
            stopTimer();
        },
    };
}
