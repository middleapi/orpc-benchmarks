/** Load generator thread: closed-loop connections; every response is validated, every request must be answered. */
import net from "node:net";
import { setTimeout as sleep } from "node:timers/promises";
import { parentPort, workerData } from "node:worker_threads";
import { WebSocket } from "ws";
import {
  DRAIN_TIMEOUT_MS,
  type HttpRequestSpec,
  type WorkerConfig,
  type WorkerMessage,
  type WsMessageTemplate,
  frame,
} from "./types.ts";

const config = workerData as WorkerConfig;
const markers = config.expect.map((marker) => Buffer.from(marker));
const post = (message: WorkerMessage) => parentPort!.postMessage(message);
const text = (data: Buffer) => data.toString("utf8", 0, 300);

let running = true;
let recording = false;
let measureStart = 0;
let inFlight = 0;
let drained: (() => void) | undefined;
let failed = false;
let sample: string | undefined;
const latencies: number[] = [];
const perSecond: number[] = [];

/** Reports the first failure; the runner then aborts the run. */
function fail(reason: string): void {
  if (failed) return;
  failed = true;
  post({ type: "failed", reason });
}

/** One connection with at most one request in flight: the next is sent when the last is answered. */
class ClosedLoop {
  waiting = false;
  sentAt = 0;
  readonly transport: { send(): void; close(): void };

  constructor(transport: ClosedLoop["transport"]) {
    this.transport = transport;
  }

  next(): void {
    if (!running) return this.transport.close();
    this.waiting = true;
    inFlight++;
    this.sentAt = performance.now();
    this.transport.send();
  }

  /** Handles a complete response; `problem` is set when its framing or status is wrong. */
  answered(body: Buffer, problem?: string): void {
    if (!this.waiting) return fail(`response with no request in flight: ${text(body)}`);
    this.waiting = false;
    inFlight--;
    if (problem) return fail(problem);
    if (!markers.every((marker) => body.includes(marker))) {
      return fail(`unexpected response: ${text(body)}`);
    }

    sample ??= body.toString("utf8");
    if (recording) {
      const now = performance.now();
      latencies.push(now - this.sentAt);
      const second = Math.floor((now - measureStart) / 1000);
      perSecond[second] = (perSecond[second] ?? 0) + 1;
    }
    if (!running && inFlight === 0) drained?.();
    this.next();
  }
}

// ---------------------------------------------------------------------------------------------
// HTTP/1.1 (keep-alive, raw sockets)
// ---------------------------------------------------------------------------------------------

const CRLF = Buffer.from("\r\n");
const HEADER_END = Buffer.from("\r\n\r\n");

type ParsedResponse = { status: number; body: Buffer; end: number } | { malformed: string };

/** Parses the HTTP response at the start of `buffer`; `undefined` while it is incomplete. */
function parseResponse(buffer: Buffer): ParsedResponse | undefined {
  const headerEnd = buffer.indexOf(HEADER_END);
  if (headerEnd === -1) return undefined;

  const status = (buffer[9]! - 48) * 100 + (buffer[10]! - 48) * 10 + (buffer[11]! - 48);
  const head = buffer.toString("latin1", 0, headerEnd);
  const bodyStart = headerEnd + 4;

  const contentLength = /\r\ncontent-length:[ \t]*(\d+)/i.exec(head);
  if (contentLength) {
    const end = bodyStart + Number(contentLength[1]);
    return buffer.length >= end
      ? { status, body: buffer.subarray(bodyStart, end), end }
      : undefined;
  }

  if (/\r\ntransfer-encoding:[ \t]*chunked/i.test(head)) {
    const chunks: Buffer[] = [];
    let position = bodyStart;
    for (;;) {
      const lineEnd = buffer.indexOf(CRLF, position);
      if (lineEnd === -1) return undefined;
      const line = buffer.toString("latin1", position, lineEnd); // chunk-size [ chunk-ext ]
      const hex = /^[\da-f]{1,8}/i.exec(line)?.[0];
      if (!hex)
        return { malformed: `invalid chunk size line ${JSON.stringify(line.slice(0, 40))}` };
      const size = Number.parseInt(hex, 16);
      const dataStart = lineEnd + 2;

      if (size === 0) {
        // Last chunk, then optional trailers and an empty line.
        if (buffer.length < dataStart + 2) return undefined;
        const body = chunks.length === 1 ? chunks[0]! : Buffer.concat(chunks);
        if (buffer[dataStart] === 13 && buffer[dataStart + 1] === 10) {
          return { status, body, end: dataStart + 2 };
        }
        const trailersEnd = buffer.indexOf(HEADER_END, dataStart);
        return trailersEnd === -1 ? undefined : { status, body, end: trailersEnd + 4 };
      }

      const dataEnd = dataStart + size;
      if (buffer.length < dataEnd + 2) return undefined;
      if (buffer[dataEnd] !== 13 || buffer[dataEnd + 1] !== 10) {
        return { malformed: `chunk of ${size} bytes is not followed by CRLF` };
      }
      chunks.push(buffer.subarray(dataStart, dataEnd));
      position = dataEnd + 2;
    }
  }

  return { status, body: buffer.subarray(bodyStart, bodyStart), end: bodyStart };
}

function httpRequest({ method, path, headers, body }: HttpRequestSpec): Buffer {
  let head = `${method} ${path} HTTP/1.1\r\nhost: 127.0.0.1:${config.port}\r\n`;
  for (const [name, value] of Object.entries(headers)) head += `${name}: ${value}\r\n`;
  if (body !== undefined) head += `content-length: ${Buffer.byteLength(body)}\r\n`;
  return Buffer.from(`${head}\r\n${body ?? ""}`);
}

function httpConnection(request: Buffer): void {
  const socket = net.connect({ host: "127.0.0.1", port: config.port, noDelay: true });
  const loop = new ClosedLoop({ send: () => socket.write(request), close: () => socket.end() });
  let pending: Buffer | undefined;

  socket.on("connect", () => loop.next());
  socket.on("data", (chunk: Buffer) => {
    const buffer = pending ? Buffer.concat([pending, chunk]) : chunk;
    const response = parseResponse(buffer);
    pending = response ? undefined : buffer;
    if (!response) return;

    if ("malformed" in response) {
      loop.answered(
        buffer,
        `malformed response (${response.malformed}): ${buffer.toString("latin1", 0, 300)}`,
      );
    } else if (response.end !== buffer.length) {
      loop.answered(response.body, "received more bytes than one response");
    } else {
      loop.answered(
        response.body,
        response.status === 200 ? undefined : `HTTP ${response.status}: ${text(response.body)}`,
      );
    }
  });
  socket.on("error", (error) => {
    if (running) fail(`socket error: ${error.message}`);
  });
  socket.on("close", () => {
    if (running) fail("connection closed by the server");
  });
}

// ---------------------------------------------------------------------------------------------
// WebSocket (the official client's frames)
// ---------------------------------------------------------------------------------------------

function wsConnection(message: WsMessageTemplate): void {
  const ws = new WebSocket(`ws://127.0.0.1:${config.port}`, { perMessageDeflate: false });
  let id = 0;
  const loop = new ClosedLoop({
    send: () => ws.send(frame(message, ++id)),
    close: () => ws.close(),
  });

  ws.on("open", () => loop.next());
  ws.on("message", (data: Buffer, isBinary: boolean) =>
    loop.answered(data, isBinary ? `binary message: ${text(data)}` : undefined),
  );
  ws.on("error", (error) => {
    if (running) fail(`websocket error: ${error.message}`);
  });
  ws.on("close", () => {
    if (running) fail("websocket closed by the server");
  });
}

// ---------------------------------------------------------------------------------------------

const threadCpu = () => {
  const { user, system } = process.threadCpuUsage();
  return user + system;
};
let cpuStart = 0;

parentPort!.on("message", async (message: "measure" | "stop") => {
  if (message === "measure") {
    latencies.length = 0;
    perSecond.length = 0;
    cpuStart = threadCpu();
    measureStart = performance.now();
    recording = true;
    return;
  }

  const elapsedMs = performance.now() - measureStart;
  recording = false;
  const cpu = threadCpu() - cpuStart;
  running = false;

  // A request still unanswered stalled its connection, silently lowering the concurrency.
  if (inFlight > 0) {
    await Promise.race([
      new Promise<void>((resolve) => (drained = resolve)),
      sleep(DRAIN_TIMEOUT_MS),
    ]);
  }
  if (inFlight > 0) return fail(`${inFlight} request(s) never got a response`);

  post({
    type: "result",
    latencies,
    // Timers can fire slightly early: round, so 9,999.6 ms gives 10 one-second slices.
    perSecond: Array.from({ length: Math.round(elapsedMs / 1000) }, (_, i) => perSecond[i] ?? 0),
    elapsedMs,
    cpuUtilization: cpu / (elapsedMs * 1000),
    sample: sample ?? "",
  });
});

const { target } = config;
const request = target.kind === "http" ? httpRequest(target.request) : undefined;
for (let i = 0; i < config.connections; i++) {
  if (target.kind === "http") httpConnection(request!);
  else wsConnection(target.message);
}
