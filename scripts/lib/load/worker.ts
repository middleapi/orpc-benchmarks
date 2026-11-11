/**
 * Load generator worker. Each connection runs a closed loop — send one request, wait for the
 * complete response, send the next — like autocannon without pipelining. Latency is recorded with
 * `performance.now()` (sub-microsecond resolution), every response is validated and every request
 * must be answered, so a server answering with errors or dropping requests can never look fast.
 */
import net from "node:net";
import { parentPort, workerData } from "node:worker_threads";
import { WebSocket } from "ws";
import { DRAIN_TIMEOUT_MS, type WorkerConfig, type WorkerReport } from "./types.ts";

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
/** Requests sent and not answered yet, over all connections. */
let inFlight = 0;
/** Requests whose connection was closed during the final drain before they were answered. */
let unansweredOnClose = 0;
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

function containsMarkers(body: Buffer): boolean {
  return markers.every((marker) => body.includes(marker));
}

let openConnections = 0;
let resolveDrained: (() => void) | undefined;

function connectionClosed(): void {
  openConnections--;
  if (openConnections === 0) resolveDrained?.();
}

/** The one request a connection may have in flight (closed loop). */
class RequestSlot {
  #waiting = false;

  get waiting(): boolean {
    return this.#waiting;
  }

  sent(): void {
    this.#waiting = true;
    inFlight++;
  }

  answered(): void {
    if (!this.#waiting) return;
    this.#waiting = false;
    inFlight--;
  }

  /** The connection closed; a request still waiting for its answer will never get one. */
  closed(): void {
    if (!this.#waiting) return;
    this.answered();
    // While running, the close itself is already counted as a connection error.
    if (!running) unansweredOnClose++;
  }
}

// ---------------------------------------------------------------------------------------------
// HTTP/1.1 (keep-alive, raw sockets)
// ---------------------------------------------------------------------------------------------

const CRLF = Buffer.from("\r\n");
const HEADER_END = Buffer.from("\r\n\r\n");

type ParsedResponse =
  | {
      status: number;
      /** The response body (de-chunked for `Transfer-Encoding: chunked`). */
      body: Buffer;
      /** Offset right after the response in the buffer. */
      end: number;
    }
  | { malformed: string };

/**
 * Parses one complete HTTP response at the start of `buffer`. Returns `undefined` while it is
 * incomplete, and `{ malformed }` for framing that can never become a valid response.
 */
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
      // chunk-size [ chunk-ext ] CRLF
      const line = buffer.toString("latin1", position, lineEnd);
      const hex = /^[\da-f]{1,8}/i.exec(line)?.[0];
      if (!hex)
        return { malformed: `invalid chunk size line ${JSON.stringify(line.slice(0, 40))}` };
      const size = Number.parseInt(hex, 16);
      const dataStart = lineEnd + 2;

      if (size === 0) {
        // Last chunk, optionally followed by trailers, terminated by an empty line.
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

function startHttpConnection(target: Extract<WorkerConfig["target"], { kind: "http" }>): void {
  const { method, path, headers, body } = target.request;
  let head = `${method} ${path} HTTP/1.1\r\nHost: ${target.host}:${target.port}\r\n`;
  for (const [name, value] of Object.entries(headers)) head += `${name}: ${value}\r\n`;
  if (body !== undefined) head += `Content-Length: ${Buffer.byteLength(body)}\r\n`;
  const request = Buffer.from(`${head}\r\n${body ?? ""}`);

  const socket = net.connect({ host: target.host, port: target.port, noDelay: true });
  const slot = new RequestSlot();
  let pending: Buffer | undefined;
  let sentAt = 0;
  let ready = false;
  /** Set when this side drops the connection after an invalid response (not a server close). */
  let discarded = false;
  openConnections++;

  const discard = () => {
    discarded = true;
    socket.destroy();
  };

  const send = () => {
    if (!running) {
      socket.end();
      return;
    }
    sentAt = performance.now();
    slot.sent();
    socket.write(request);
  };

  socket.on("connect", send);

  socket.on("data", (chunk: Buffer) => {
    if (!slot.waiting) {
      fail(`received data with no request in flight: ${chunk.toString("utf8", 0, 300)}`);
      discard();
      return;
    }

    const buffer = pending ? Buffer.concat([pending, chunk]) : chunk;
    const response = parseResponse(buffer);
    if (!response) {
      pending = buffer;
      return;
    }
    pending = undefined;
    slot.answered();

    if ("malformed" in response) {
      // The byte stream cannot be resynchronised: count the response as invalid and reconnect.
      fail(`malformed response (${response.malformed}): ${buffer.toString("latin1", 0, 300)}`);
      discard();
      return;
    }

    if (response.end !== buffer.length) {
      fail("received more bytes than one response");
    } else if (response.status !== 200) {
      fail(`HTTP ${response.status}: ${response.body.toString("utf8", 0, 300)}`);
    } else if (!containsMarkers(response.body)) {
      fail(`unexpected body: ${response.body.toString("utf8", 0, 300)}`);
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
    slot.closed();
    connectionClosed();
    if (!running) return;
    if (!discarded) {
      errors++;
      firstFailure ??= "connection closed by server";
    }
    startHttpConnection(target);
  });
}

// ---------------------------------------------------------------------------------------------
// WebSocket (raw frames, captured from the official client)
// ---------------------------------------------------------------------------------------------

function startWsConnection(target: Extract<WorkerConfig["target"], { kind: "ws" }>): void {
  const { prefix, suffix } = target.message;
  const ws = new WebSocket(target.url, { perMessageDeflate: false });
  const slot = new RequestSlot();
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
    slot.sent();
    ws.send(prefix + id + suffix);
  };

  ws.on("open", send);

  ws.on("message", (data: Buffer, isBinary: boolean) => {
    if (!slot.waiting) {
      // Answering it would put a second request in flight on this connection.
      fail(`received a message with no request in flight: ${data.toString("utf8", 0, 300)}`);
      return;
    }
    slot.answered();

    if (isBinary || !containsMarkers(data)) {
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
    slot.closed();
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
  let drainTimer: NodeJS.Timeout | undefined;
  await Promise.race([
    new Promise<void>((resolve) => {
      resolveDrained = resolve;
      if (openConnections === 0) resolve();
    }),
    new Promise<void>((resolve) => {
      drainTimer = setTimeout(resolve, DRAIN_TIMEOUT_MS);
    }),
  ]);
  clearTimeout(drainTimer);

  // A closed loop never gives up on a request, so a request still waiting now stalled its
  // connection (possibly since the warm-up), silently lowering the load below the stated concurrency.
  const unanswered = inFlight + unansweredOnClose;
  if (unanswered > 0) firstFailure ??= `${unanswered} request(s) never got a response`;

  const elapsedMs = measureEnd - measureStart;
  // Timers can fire a fraction of a millisecond early: round, so a 9,999.6 ms window has 10 slices.
  // Every slice is reported, including empty ones.
  const seconds = Math.round(elapsedMs / 1000);
  const latencies = samples.slice(0, sampleCount);
  const report: WorkerReport = {
    type: "result",
    completed,
    elapsedMs,
    latencies,
    perSecond: Array.from({ length: seconds }, (_, index) => perSecond[index] ?? 0),
    invalid,
    errors,
    unanswered,
    firstFailure,
    cpuUtilization: threadCpu / (elapsedMs * 1000),
  };
  port.postMessage(report, [latencies.buffer]);
});

for (let i = 0; i < config.connections; i++) {
  if (config.target.kind === "http") startHttpConnection(config.target);
  else startWsConnection(config.target);
}
