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
let open = 0;
let inFlight = 0;
let allClosed: (() => void) | undefined;
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

  opened(): void {
    open++;
    this.next();
  }

  closed(what: string): void {
    open--;
    if (running) fail(`${what} closed by the server`);
    else if (open === 0) allClosed?.();
  }

  next(): void {
    if (!running) return this.transport.close();
    this.waiting = true;
    inFlight++;
    this.sentAt = performance.now();
    this.transport.send();
  }

  answered(body: Buffer): void {
    if (!this.waiting) return fail(`response with no request in flight: ${text(body)}`);
    if (!markers.every((marker) => body.includes(marker))) {
      return fail(`unexpected response: ${text(body)}`);
    }
    this.waiting = false;
    inFlight--;

    sample ??= body.toString("utf8");
    if (recording) {
      const now = performance.now();
      latencies.push(now - this.sentAt);
      const second = Math.floor((now - measureStart) / 1000);
      perSecond[second] = (perSecond[second] ?? 0) + 1;
    }
    this.next();
  }
}

// ---------------------------------------------------------------------------------------------
// HTTP/1.1 (keep-alive, raw sockets)
// ---------------------------------------------------------------------------------------------

const CRLF = Buffer.from("\r\n");
const HEADER_END = Buffer.from("\r\n\r\n");

type ParsedResponse = { status: string; body: Buffer; end: number } | { malformed: string };

/** Parses the HTTP response at the start of `buffer`; `undefined` while it is incomplete. */
function parseResponse(buffer: Buffer): ParsedResponse | undefined {
  const headerEnd = buffer.indexOf(HEADER_END);
  if (headerEnd === -1) return undefined;

  const head = buffer.toString("latin1", 0, headerEnd);
  const status = head.slice(9, 12);
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

      if (size === 0) {
        // The empty line after the last chunk and any trailers.
        const end = buffer.indexOf(HEADER_END, lineEnd);
        const body = chunks.length === 1 ? chunks[0]! : Buffer.concat(chunks);
        return end === -1 ? undefined : { status, body, end: end + 4 };
      }

      const dataStart = lineEnd + 2;
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

  socket.on("connect", () => loop.opened());
  socket.on("data", (chunk: Buffer) => {
    const buffer = pending ? Buffer.concat([pending, chunk]) : chunk;
    const response = parseResponse(buffer);
    pending = response ? undefined : buffer;
    if (!response) return;

    if ("malformed" in response) {
      fail(`malformed response (${response.malformed}): ${buffer.toString("latin1", 0, 300)}`);
    } else if (response.end !== buffer.length) {
      fail("received more bytes than one response");
    } else if (response.status !== "200") {
      fail(`HTTP ${response.status}: ${text(response.body)}`);
    } else {
      loop.answered(response.body);
    }
  });
  socket.on("error", (error) => {
    if (running) fail(`socket error: ${error.message}`);
  });
  socket.on("close", () => loop.closed("connection"));
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

  ws.on("open", () => loop.opened());
  ws.on("message", (data: Buffer, isBinary: boolean) =>
    isBinary ? fail(`binary message: ${text(data)}`) : loop.answered(data),
  );
  ws.on("error", (error) => {
    if (running) fail(`websocket error: ${error.message}`);
  });
  ws.on("close", () => loop.closed("websocket"));
}

// ---------------------------------------------------------------------------------------------

const threadCpu = () => {
  const { user, system } = process.threadCpuUsage();
  return user + system;
};
let cpuStart = 0;

parentPort!.on("message", async (message: "measure" | "stop") => {
  if (message === "measure") {
    if (open < config.connections) {
      return fail(`${config.connections - open} connection(s) did not open during the warm-up`);
    }
    cpuStart = threadCpu();
    measureStart = performance.now();
    recording = true;
    return;
  }

  const elapsedMs = performance.now() - measureStart;
  recording = false;
  const cpu = threadCpu() - cpuStart;
  running = false;

  // Each connection closes after its last response, so waiting for that still catches an extra
  // response; a request never answered keeps its connection open.
  await Promise.race([
    new Promise<void>((resolve) => (allClosed = resolve)),
    sleep(DRAIN_TIMEOUT_MS),
  ]);
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
