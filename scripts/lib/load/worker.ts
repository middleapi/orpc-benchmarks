/**
 * Load generator worker. Each connection runs a closed loop — send one request, wait for the
 * complete response, send the next — like autocannon without pipelining. Latency is recorded with
 * `performance.now()` (sub-microsecond resolution) and every response is validated, so a server
 * answering with errors can never look fast.
 */
import net from "node:net";
import { parentPort, workerData } from "node:worker_threads";
import { WebSocket } from "ws";
import type { WorkerConfig, WorkerReport } from "./types.ts";

const config = workerData as WorkerConfig;
const port = parentPort!;
const markers = config.expect.map((marker) => Buffer.from(marker));

let running = true;
let recording = false;
let measureStart = 0;
let measureEnd = 0;
let threadCpuStart = 0;

let completed = 0;
let invalid = 0;
let errors = 0;
let firstFailure: string | undefined;
const perSecond: number[] = [];

let samples = new Float64Array(1 << 18);
let sampleCount = 0;

function threadCpuMicros(): number {
  // `process.threadCpuUsage()` reports this thread only (Node >= 23.9).
  const usage = (process as any).threadCpuUsage?.() ?? process.cpuUsage();
  return usage.user + usage.system;
}

function fail(reason: string): void {
  invalid++;
  firstFailure ??= reason;
}

function record(sentAt: number): void {
  if (!recording) return;
  const now = performance.now();

  if (sampleCount === samples.length) {
    const grown = new Float64Array(samples.length * 2);
    grown.set(samples);
    samples = grown;
  }
  samples[sampleCount++] = (now - sentAt) * 1000;
  completed++;

  const second = Math.floor((now - measureStart) / 1000);
  perSecond[second] = (perSecond[second] ?? 0) + 1;
}

function containsMarkers(buffer: Buffer, start: number, end: number): boolean {
  for (const marker of markers) {
    const index = buffer.indexOf(marker, start);
    if (index === -1 || index + marker.length > end) return false;
  }
  return true;
}

let openConnections = 0;
let resolveDrained: (() => void) | undefined;

function connectionClosed(): void {
  openConnections--;
  if (openConnections === 0) resolveDrained?.();
}

// ---------------------------------------------------------------------------------------------
// HTTP/1.1 (keep-alive, raw sockets)
// ---------------------------------------------------------------------------------------------

const CRLF = Buffer.from("\r\n");
const HEADER_END = Buffer.from("\r\n\r\n");

interface ParsedResponse {
  status: number;
  bodyStart: number;
  end: number;
}

/** Parses one complete HTTP response at the start of `buffer`, or returns `undefined` if incomplete. */
function parseResponse(buffer: Buffer): ParsedResponse | undefined {
  const headerEnd = buffer.indexOf(HEADER_END);
  if (headerEnd === -1) return undefined;

  const status = (buffer[9]! - 48) * 100 + (buffer[10]! - 48) * 10 + (buffer[11]! - 48);
  const head = buffer.toString("latin1", 0, headerEnd);
  const bodyStart = headerEnd + 4;

  const contentLength = /\r\ncontent-length:[ \t]*(\d+)/i.exec(head);
  if (contentLength) {
    const end = bodyStart + Number(contentLength[1]);
    return buffer.length >= end ? { status, bodyStart, end } : undefined;
  }

  if (/\r\ntransfer-encoding:[ \t]*chunked/i.test(head)) {
    let position = bodyStart;
    for (;;) {
      const lineEnd = buffer.indexOf(CRLF, position);
      if (lineEnd === -1) return undefined;
      const size = Number.parseInt(buffer.toString("latin1", position, lineEnd), 16);
      const dataStart = lineEnd + 2;

      if (size === 0) {
        // Last chunk, optionally followed by trailers, terminated by an empty line.
        if (buffer.length < dataStart + 2) return undefined;
        if (buffer[dataStart] === 13 && buffer[dataStart + 1] === 10) {
          return { status, bodyStart, end: dataStart + 2 };
        }
        const trailersEnd = buffer.indexOf(HEADER_END, dataStart);
        return trailersEnd === -1 ? undefined : { status, bodyStart, end: trailersEnd + 4 };
      }

      position = dataStart + size + 2;
      if (buffer.length < position) return undefined;
    }
  }

  return { status, bodyStart, end: bodyStart };
}

function startHttpConnection(target: Extract<WorkerConfig["target"], { kind: "http" }>): void {
  const { method, path, headers, body } = target.request;
  let head = `${method} ${path} HTTP/1.1\r\nHost: ${target.host}:${target.port}\r\n`;
  for (const [name, value] of Object.entries(headers)) head += `${name}: ${value}\r\n`;
  if (body !== undefined) head += `Content-Length: ${Buffer.byteLength(body)}\r\n`;
  const request = Buffer.from(`${head}\r\n${body ?? ""}`);

  const socket = net.connect({ host: target.host, port: target.port, noDelay: true });
  let pending: Buffer | undefined;
  let sentAt = 0;
  let ready = false;
  openConnections++;

  const send = () => {
    if (!running) {
      socket.end();
      return;
    }
    sentAt = performance.now();
    socket.write(request);
  };

  socket.on("connect", send);

  socket.on("data", (chunk: Buffer) => {
    const buffer = pending ? Buffer.concat([pending, chunk]) : chunk;
    const response = parseResponse(buffer);
    if (!response) {
      pending = buffer;
      return;
    }
    pending = undefined;

    if (response.end !== buffer.length) {
      fail("received more bytes than one response");
    } else if (response.status !== 200) {
      fail(
        `HTTP ${response.status}: ${buffer.toString("utf8", response.bodyStart, response.bodyStart + 300)}`,
      );
    } else if (!containsMarkers(buffer, response.bodyStart, response.end)) {
      fail(
        `unexpected body: ${buffer.toString("utf8", response.bodyStart, response.bodyStart + 300)}`,
      );
    } else {
      record(sentAt);
    }

    if (!ready) {
      ready = true;
      connectionReady();
    }
    send();
  });

  socket.on("error", (error) => {
    if (!running) return;
    errors++;
    firstFailure ??= `socket error: ${error.message}`;
  });

  socket.on("close", () => {
    connectionClosed();
    if (running) {
      errors++;
      firstFailure ??= "connection closed by server";
      startHttpConnection(target);
    }
  });
}

// ---------------------------------------------------------------------------------------------
// WebSocket (raw frames, captured from the official client)
// ---------------------------------------------------------------------------------------------

function startWsConnection(target: Extract<WorkerConfig["target"], { kind: "ws" }>): void {
  const { prefix, suffix } = target.message;
  const ws = new WebSocket(target.url, { perMessageDeflate: false });
  let id = 0;
  let sentAt = 0;
  let ready = false;
  openConnections++;

  const send = () => {
    if (!running) {
      ws.close();
      return;
    }
    id++;
    sentAt = performance.now();
    ws.send(prefix + id + suffix);
  };

  ws.on("open", send);

  ws.on("message", (data: Buffer, isBinary: boolean) => {
    if (isBinary || !containsMarkers(data, 0, data.length)) {
      fail(`unexpected message: ${data.toString("utf8", 0, 300)}`);
    } else {
      record(sentAt);
    }

    if (!ready) {
      ready = true;
      connectionReady();
    }
    send();
  });

  ws.on("error", (error) => {
    if (!running) return;
    errors++;
    firstFailure ??= `websocket error: ${error.message}`;
  });

  ws.on("close", () => {
    connectionClosed();
    if (running) {
      errors++;
      firstFailure ??= "websocket closed by server";
      startWsConnection(target);
    }
  });
}

// ---------------------------------------------------------------------------------------------

let readyConnections = 0;

function connectionReady(): void {
  readyConnections++;
  if (readyConnections === config.connections) port.postMessage({ type: "ready" });
}

port.on("message", async (message: "measure" | "stop") => {
  if (message === "measure") {
    completed = 0;
    sampleCount = 0;
    perSecond.length = 0;
    threadCpuStart = threadCpuMicros();
    measureStart = performance.now();
    recording = true;
    return;
  }

  measureEnd = performance.now();
  recording = false;
  const threadCpu = threadCpuMicros() - threadCpuStart;
  running = false;

  // Let in-flight requests finish so the server sees clean disconnects.
  await Promise.race([
    new Promise<void>((resolve) => {
      resolveDrained = resolve;
      if (openConnections === 0) resolve();
    }),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ]);

  const elapsedMs = measureEnd - measureStart;
  const latencies = samples.slice(0, sampleCount);
  const report: WorkerReport = {
    type: "result",
    completed,
    elapsedMs,
    latencies,
    perSecond: perSecond.slice(0, Math.floor(elapsedMs / 1000)),
    invalid,
    errors,
    firstFailure,
    cpuUtilization: threadCpu / (elapsedMs * 1000),
  };
  port.postMessage(report, [latencies.buffer]);
});

for (let i = 0; i < config.connections; i++) {
  if (config.target.kind === "http") startHttpConnection(config.target);
  else startWsConnection(config.target);
}
