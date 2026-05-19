import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { streamMessage } from "./api.js";

function makeSSEStream(...blocks: string[]) {
  const text = blocks.join("\n\n") + "\n\n";
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(ctrl) {
      ctrl.enqueue(encoder.encode(text));
      ctrl.close();
    },
  });
}

describe("streamMessage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends imageDataUrl in request body when provided", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(
      new Response(makeSSEStream('event: done\ndata: {"fullResponse":"ok","usedInputTokens":1,"usedOutputTokens":2,"totalTokens":3}'), {
        status: 200,
      })
    );

    await new Promise<void>((resolve) => {
      streamMessage("sess1", "hello", "data:image/png;base64,ABC", () => {}, () => resolve(), () => {});
    });

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(opts.body as string);
    expect(body.content).toBe("hello");
    expect(body.imageDataUrl).toBe("data:image/png;base64,ABC");
  });

  it("omits imageDataUrl from body when not provided", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(
      new Response(makeSSEStream('event: done\ndata: {"fullResponse":"ok","usedInputTokens":1,"usedOutputTokens":2,"totalTokens":3}'), {
        status: 200,
      })
    );

    await new Promise<void>((resolve) => {
      streamMessage("sess1", "hello", undefined, () => {}, () => resolve(), () => {});
    });

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(opts.body as string);
    expect(body.content).toBe("hello");
    expect(body).not.toHaveProperty("imageDataUrl");
  });

  it("calls onToken for each token event", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(
      new Response(
        makeSSEStream(
          'data: {"type":"token","delta":"Hello"}',
          'data: {"type":"token","delta":" world"}',
          'event: done\ndata: {"fullResponse":"Hello world","usedInputTokens":1,"usedOutputTokens":2,"totalTokens":3}'
        ),
        { status: 200 }
      )
    );

    const tokens: string[] = [];
    await new Promise<void>((resolve) => {
      streamMessage("sess1", "hi", undefined, (d) => tokens.push(d), () => resolve(), () => {});
    });

    expect(tokens).toEqual(["Hello", " world"]);
  });

  it("calls onDone with parsed payload", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(
      new Response(
        makeSSEStream('event: done\ndata: {"fullResponse":"done text","usedInputTokens":5,"usedOutputTokens":10,"totalTokens":15}'),
        { status: 200 }
      )
    );

    const payload = await new Promise<Parameters<Parameters<typeof streamMessage>[4]>[0]>((resolve) => {
      streamMessage("sess1", "hi", undefined, () => {}, resolve, () => {});
    });

    expect(payload.fullResponse).toBe("done text");
    expect(payload.usedInputTokens).toBe(5);
    expect(payload.usedOutputTokens).toBe(10);
    expect(payload.totalTokens).toBe(15);
  });

  it("calls onError on non-ok HTTP response", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(new Response("bad", { status: 500 }));

    const err = await new Promise<string>((resolve) => {
      streamMessage("sess1", "hi", undefined, () => {}, () => {}, resolve);
    });

    expect(err).toBe("HTTP 500");
  });

  it("calls onError on fetch network failure", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network down"));

    const err = await new Promise<string>((resolve) => {
      streamMessage("sess1", "hi", undefined, () => {}, () => {}, resolve);
    });

    expect(err).toContain("network down");
  });
});
