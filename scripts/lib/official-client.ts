/**
 * Helpers for `benchmarks/<name>/scripts/client.ts`: each of those scripts calls the server once
 * (twice for WebSocket) through the library's official client and prints what went over the wire.
 * The runner replays exactly that payload under load, so the benchmark always uses what a real
 * client of the installed version sends, and the call doubles as an end-to-end correctness check.
 */

export interface CapturedRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export interface CaptureReport {
  result: unknown;
  requests?: CapturedRequest[];
  frames?: string[];
}

/** Address of the server under test, provided by the runner. */
export const ORIGIN = process.env.ORIGIN ?? "http://127.0.0.1:3000";
export const WS_URL = ORIGIN.replace(/^http/, "ws");

/** A `fetch` that records every request before sending it to the real server. */
export function recordingFetch() {
  const requests: CapturedRequest[] = [];

  const recording = async (input: string | URL | Request, init?: RequestInit) => {
    const request = new Request(input, init);
    requests.push({
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers),
      body: request.body ? await request.clone().text() : undefined,
    });
    return fetch(request);
  };

  return { fetch: recording, requests };
}

/** A WebSocket class (standard `WebSocket` API) that records every frame it sends. */
export function recordingWebSocket() {
  const frames: string[] = [];

  class RecordingWebSocket extends WebSocket {
    override send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
      if (typeof data !== "string") throw new Error("Only text frames are supported");
      frames.push(data);
      super.send(data);
    }
  }

  return { WebSocket: RecordingWebSocket, frames };
}

/** Asserts the result of `nested.procedure_1("hello world")`, prints the capture and exits. */
export function report(capture: CaptureReport): void {
  const result = capture.result as { name?: unknown; date?: unknown; input?: unknown };

  if (
    result?.name !== "nested/procedure_1" ||
    result.input !== "hello world" ||
    !(result.date instanceof Date)
  ) {
    throw new Error(`Unexpected result from the official client: ${JSON.stringify(result)}`);
  }

  // Open WebSocket connections would keep the process alive, so exit once the report is flushed.
  process.stdout.write(`${JSON.stringify(capture)}\n`, () => process.exit(0));
}
