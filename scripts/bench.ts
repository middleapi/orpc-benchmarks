/**
 * Benchmark runner. See the "Methodology" section of the root README for what it does and why.
 *
 *   pnpm bench                      # every group
 *   pnpm bench rpc ws               # some groups
 *   pnpm bench rpc-orpc             # a single benchmark (results are printed, not saved)
 *   pnpm bench rpc --rounds 3       # quicker, noisier
 *   pnpm bench rpc-orpc --profile   # Clinic.js Doctor report under the same load
 */
import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { parseArgs } from "node:util";
import { WebSocket } from "ws";
import {
  DEFAULT_HEADERS,
  type Group,
  type ServerBenchmark,
  type TypecheckBenchmark,
  groups,
} from "./lib/config.ts";
import type { CaptureReport } from "./lib/official-client.ts";
import {
  type HttpRequestSpec,
  type LoadTarget,
  type WsMessageTemplate,
  runLoad,
} from "./lib/load/index.ts";
import { consoleSummary, resultsFile, writeReadmes } from "./lib/report.ts";
import type {
  GroupResult,
  ServerBenchmarkResult,
  ServerRound,
  Settings,
  Spread,
  TypecheckBenchmarkResult,
  TypecheckRound,
} from "./lib/results.ts";
import { mean, median, stdev } from "./lib/stats.ts";
import {
  type CpuLayout,
  allowedCpus,
  canPinCpus,
  cpuTimes,
  defaultCpuLayout,
  environment,
  formatCpuList,
  packageBin,
  parseCpuList,
  physicalCores,
  pinCurrentProcess,
  pinned,
  processCpuSeconds,
  processMemory,
  sharedCores,
} from "./lib/system.ts";

const ROOT = path.resolve(import.meta.dirname, "..");

const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  allowNegative: true,
  options: {
    rounds: { type: "string" },
    warmup: { type: "string" },
    duration: { type: "string", default: "10" },
    connections: { type: "string", default: "10" },
    "load-threads": { type: "string", default: "1" },
    "server-cpus": { type: "string" },
    "client-cpus": { type: "string" },
    "typecheck-cpus": { type: "string" },
    pin: { type: "boolean", default: true },
    save: { type: "boolean", default: true },
    profile: { type: "boolean", default: false },
    "report-only": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (options.help) {
  console.log(`Usage: pnpm bench [group|benchmark ...] [options]

Groups: ${groups.map((g) => g.id).join(", ")} (default: all)

Options:
  --rounds <n>            rounds per benchmark, each with a fresh process (default 10, typecheck 30)
  --warmup <s>            warm-up seconds before each measurement (default 10, ws group 30)
  --duration <s>          measurement seconds per round (default 10)
  --connections <n>       concurrent connections, one request in flight each (default 10)
  --load-threads <n>      load generator threads (default 1)
  --server-cpus <list>    CPUs for the server under test, e.g. "3"
  --client-cpus <list>    CPUs for the runner and load generator, e.g. "1-2"
  --typecheck-cpus <list> CPUs for tsc, e.g. "3"
  --no-pin                do not pin processes to CPUs
  --no-save               do not write results/ and READMEs
  --profile               write a Clinic.js Doctor report for each selected server benchmark
  --report-only           regenerate README results from results/*.json and exit`);
  process.exit(0);
}

if (options["report-only"]) {
  writeReadmes(ROOT);
  console.log("READMEs regenerated from results/*.json");
  process.exit(0);
}

const positiveInt = (name: string, value: string) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0)
    throw new Error(`--${name} must be a positive integer`);
  return parsed;
};

const DEFAULT_ROUNDS = 10;
const ROUNDS_OVERRIDE =
  options.rounds === undefined ? undefined : positiveInt("rounds", options.rounds);
const DEFAULT_WARMUP_SECONDS = 10;
const WARMUP_OVERRIDE =
  options.warmup === undefined ? undefined : positiveInt("warmup", options.warmup);
const DURATION_MS = positiveInt("duration", options.duration) * 1000;
const CONNECTIONS = positiveInt("connections", options.connections);
const LOAD_THREADS = positiveInt("load-threads", options["load-threads"]);

// ---------------------------------------------------------------------------------------------
// CPU layout. The runner pins itself to the load generator CPUs, so every thread it creates
// (including the load generator workers) stays off the server's CPUs.
// ---------------------------------------------------------------------------------------------

function resolveLayout(): CpuLayout {
  const layout = defaultCpuLayout();
  if (!options.pin) return { ...layout, idle: [], pinned: false };
  if (!canPinCpus && (options["server-cpus"] || options["client-cpus"])) {
    throw new Error("CPU pinning needs Linux with `taskset` (util-linux) installed");
  }
  if (!layout.pinned) return layout;

  // tsc runs on the server's CPU unless told otherwise (no server runs while it does).
  if (options["server-cpus"])
    layout.server = layout.typecheck = parseCpuList(options["server-cpus"]);
  if (options["client-cpus"]) layout.client = parseCpuList(options["client-cpus"]);
  if (options["typecheck-cpus"]) layout.typecheck = parseCpuList(options["typecheck-cpus"]);
  if (layout.server.some((cpu) => layout.client.includes(cpu))) {
    throw new Error("--server-cpus and --client-cpus must not overlap");
  }
  // SMT siblings of the server that nothing else uses.
  const used = new Set([...layout.server, ...layout.client]);
  layout.idle = physicalCores(allowedCpus())
    .filter((core) => core.some((cpu) => layout.server.includes(cpu)))
    .flat()
    .filter((cpu) => !used.has(cpu));
  return layout;
}

const layout = resolveLayout();
const layoutWarnings: string[] = [];

if (layout.pinned) {
  pinCurrentProcess(layout.client);
  const shared = sharedCores(layout.client, layout.server);
  if (shared.length) {
    layoutWarnings.push(
      `the load generator CPU(s) ${formatCpuList(shared)} share a physical core (SMT) with the server — results are noisier and biased; use a machine with more cores or --server-cpus / --client-cpus on separate cores`,
    );
  }
} else {
  layoutWarnings.push(
    "CPU pinning is disabled or unavailable: the server and the load generator share CPUs, so results are noisier",
  );
}
for (const warning of layoutWarnings) console.warn(`⚠ ${warning}`);

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------

const log = (message: string) => console.log(message);

/** Why a `spawnSync` call did not succeed: spawn error (e.g. ENOENT, ETIMEDOUT), signal or exit code. */
function failureReason(result: ReturnType<typeof spawnSync>): string {
  if (result.error) return result.error.message;
  if (result.signal) return `killed by ${result.signal}`;
  return `exit code ${result.status}`;
}

function run(command: string, args: string[], cwd: string): string {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", env: process.env });
  if (result.status !== 0) {
    throw new Error(
      `\`${command} ${args.join(" ")}\` failed in ${cwd} (${failureReason(result)}):\n${result.stdout ?? ""}\n${result.stderr ?? ""}`,
    );
  }
  return result.stdout;
}

/** Command for an installed tool: its script, run by this Node.js binary (no shell shim needed). */
function tool(pkg: string, name?: string): [string, string] {
  return [process.execPath, packageBin(ROOT, pkg, name)];
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
  });
}

function versionsOf(packages: string[]): Record<string, string> {
  return Object.fromEntries(
    packages.map((pkg) => {
      const manifest = JSON.parse(
        fs.readFileSync(path.join(ROOT, "node_modules", pkg, "package.json"), "utf8"),
      );
      return [pkg, manifest.version as string];
    }),
  );
}

function spread(values: number[]): Spread {
  return {
    median: median(values),
    min: Math.min(...values),
    max: Math.max(...values),
    cv: stdev(values) / mean(values),
  };
}

function medianOf<T>(items: T[], pick: (item: T) => number | undefined): number | undefined {
  const values = items.map(pick).filter((value): value is number => value !== undefined);
  return values.length ? median(values) : undefined;
}

function roundsFor(group: Group): number {
  return ROUNDS_OVERRIDE ?? group.rounds ?? DEFAULT_ROUNDS;
}

function warmupMs(group: Group): number {
  return (WARMUP_OVERRIDE ?? group.warmupSeconds ?? DEFAULT_WARMUP_SECONDS) * 1000;
}

/** Alternates the run order (A B, B A, A B, ...) so slow drift of the machine affects every library alike. */
function roundOrder<T>(items: T[], round: number): T[] {
  return round % 2 === 0 ? items : [...items].reverse();
}

// ---------------------------------------------------------------------------------------------
// Server lifecycle
// ---------------------------------------------------------------------------------------------

interface RunningServer {
  child: ChildProcess;
  port: number;
  output: string[];
  exited: Promise<number | null>;
  processGroup: boolean;
}

const runningServers = new Set<RunningServer>();
process.on("exit", () => {
  for (const server of runningServers) {
    try {
      if (server.processGroup) process.kill(-server.child.pid!, "SIGKILL");
      else server.child.kill("SIGKILL");
    } catch {
      // already gone
    }
  }
});
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => process.exit(130));
}

async function startServer(
  cwd: string,
  command: string[],
  { processGroup = false, env = {} }: { processGroup?: boolean; env?: Record<string, string> } = {},
): Promise<RunningServer> {
  const port = await freePort();
  const [file, args] = pinned(
    command[0]!,
    command.slice(1),
    layout.pinned ? layout.server : undefined,
  );
  const child = spawn(file, args, {
    cwd,
    env: { ...process.env, ...env, PORT: String(port), NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
    // Own process group, so a wrapper (clinic) and the server it spawned can be killed together.
    detached: processGroup,
  });

  const output: string[] = [];
  child.stdout!.on("data", (data) => output.push(String(data)));
  child.stderr!.on("data", (data) => output.push(String(data)));
  const exited = new Promise<number | null>((resolve) =>
    child.once("exit", (code) => resolve(code)),
  );
  const server: RunningServer = { child, port, output, exited, processGroup };
  runningServers.add(server);

  const deadline = Date.now() + 30_000;
  let exitCode: number | null | undefined;
  void exited.then((code) => (exitCode = code));

  for (;;) {
    if (exitCode !== undefined) {
      throw new Error(`Server exited with code ${exitCode} before listening:\n${output.join("")}`);
    }
    if (Date.now() > deadline)
      throw new Error(`Server did not listen on port ${port}:\n${output.join("")}`);

    const open = await new Promise<boolean>((resolve) => {
      const socket = net.connect(port, "127.0.0.1");
      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.once("error", () => resolve(false));
    });
    if (open) return server;
    await sleep(50);
  }
}

async function stopServer(
  server: RunningServer,
  signal: NodeJS.Signals = "SIGTERM",
  timeoutMs = 10_000,
) {
  if (server.child.exitCode === null && server.child.signalCode === null) {
    server.child.kill(signal);
    const timedOut = await Promise.race([
      server.exited.then(() => false),
      sleep(timeoutMs).then(() => true),
    ]);
    if (timedOut) {
      if (server.processGroup) process.kill(-server.child.pid!, "SIGKILL");
      else server.child.kill("SIGKILL");
      await server.exited;
    }
  }
  runningServers.delete(server);
}

// ---------------------------------------------------------------------------------------------
// Server benchmarks (http + ws)
// ---------------------------------------------------------------------------------------------

interface Payload {
  http?: HttpRequestSpec;
  ws?: WsMessageTemplate;
}

function deriveTemplate(frames: string[]): WsMessageTemplate {
  const [first, second] = frames;
  if (frames.length !== 2 || first === undefined || second === undefined) {
    throw new Error(`Expected the official client to send 2 frames, got ${frames.length}`);
  }

  let prefix = 0;
  while (prefix < first.length && first[prefix] === second[prefix]) prefix++;
  let suffix = 0;
  while (suffix < first.length - prefix && first.at(-1 - suffix) === second.at(-1 - suffix))
    suffix++;
  // Keep the whole id out of the prefix/suffix (e.g. ids 11 and 12 share the leading "1").
  while (prefix > 0 && /\d/.test(first[prefix - 1]!)) prefix--;
  while (suffix > 0 && /\d/.test(first.at(-suffix)!)) suffix--;

  const template = { prefix: first.slice(0, prefix), suffix: first.slice(first.length - suffix) };
  const id = Number(first.slice(prefix, first.length - suffix));
  if (
    !Number.isInteger(id) ||
    `${template.prefix}${id}${template.suffix}` !== first ||
    `${template.prefix}${id + 1}${template.suffix}` !== second
  ) {
    throw new Error(`Cannot find the request id in the captured frames:\n${first}\n${second}`);
  }
  return template;
}

/** The default headers, minus those the client sets itself (header names are case-insensitive). */
function withDefaultHeaders(headers: Record<string, string> = {}): Record<string, string> {
  const own = new Set(Object.keys(headers).map((name) => name.toLowerCase()));
  const defaults = Object.entries(DEFAULT_HEADERS).filter(([name]) => !own.has(name.toLowerCase()));
  return { ...Object.fromEntries(defaults), ...headers };
}

/** Determines the exact payload to replay, using the official client when the benchmark has one. */
function capturePayload(
  group: Group,
  benchmark: ServerBenchmark,
  cwd: string,
  port: number,
): Payload {
  if (!benchmark.client) {
    if (!benchmark.request)
      throw new Error(`${benchmark.name} needs either a client script or a request`);
    return { http: { ...benchmark.request, headers: withDefaultHeaders() } };
  }

  const timeoutMs = 30_000;
  const result = spawnSync(process.execPath, [benchmark.client], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ORIGIN: `http://127.0.0.1:${port}` },
    timeout: timeoutMs,
  });
  if (result.status !== 0) {
    const reason =
      (result.error as NodeJS.ErrnoException | undefined)?.code === "ETIMEDOUT"
        ? `no result within ${timeoutMs / 1000} s`
        : failureReason(result);
    throw new Error(
      `Official client of ${benchmark.name} failed (${reason}):\n${result.stdout ?? ""}\n${result.stderr ?? ""}`,
    );
  }
  const report = JSON.parse(result.stdout.trim().split("\n").at(-1)!) as CaptureReport;

  if (group.kind === "ws") return { ws: deriveTemplate(report.frames ?? []) };

  const [request, ...extra] = report.requests ?? [];
  if (!request || extra.length) {
    throw new Error(
      `Expected the official client to send 1 request, got ${report.requests?.length}`,
    );
  }
  const url = new URL(request.url);
  return {
    http: {
      method: request.method,
      path: url.pathname + url.search,
      headers: withDefaultHeaders(request.headers),
      body: request.body,
    },
  };
}

function loadTarget(payload: Payload, port: number): LoadTarget {
  return payload.ws
    ? { kind: "ws", url: `ws://127.0.0.1:${port}`, message: payload.ws }
    : { kind: "http", host: "127.0.0.1", port, request: payload.http! };
}

/** Sends one request the way the load generator will and returns the raw response body. */
async function sampleResponse(payload: Payload, port: number, expect: string[]): Promise<string> {
  let body: string;

  if (payload.ws) {
    body = await new Promise<string>((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}`);
      ws.once("open", () => ws.send(`${payload.ws!.prefix}1${payload.ws!.suffix}`));
      ws.once("message", (data) => {
        resolve(String(data));
        ws.close();
      });
      ws.once("error", reject);
    });
  } else {
    const { method, path: requestPath, headers, body: requestBody } = payload.http!;
    const response = await fetch(`http://127.0.0.1:${port}${requestPath}`, {
      method,
      headers,
      body: requestBody,
    });
    body = await response.text();
    if (response.status !== 200)
      throw new Error(`Expected HTTP 200, got ${response.status}: ${body}`);
  }

  const missing = expect.filter((marker) => !body.includes(marker));
  if (missing.length) throw new Error(`Response is missing ${missing.join(", ")}:\n${body}`);
  return body;
}

interface PreparedServer {
  benchmark: ServerBenchmark;
  cwd: string;
  payload: Payload;
  sample: string;
  warmupMs: number;
}

async function prepareServer(group: Group, benchmark: ServerBenchmark): Promise<PreparedServer> {
  const cwd = path.join(ROOT, "benchmarks", benchmark.name);
  const [node, tsdown] = tool("tsdown");
  run(node, [tsdown, "src/main.ts"], cwd);

  const server = await startServer(cwd, [process.execPath, "dist/main.mjs"]);
  try {
    const payload = capturePayload(group, benchmark, cwd, server.port);
    const sample = await sampleResponse(payload, server.port, benchmark.expect);
    return { benchmark, cwd, payload, sample, warmupMs: warmupMs(group) };
  } catch (error) {
    throw new Error(
      `Preparing ${benchmark.name} failed: ${(error as Error).message}\nServer output:\n${server.output.join("")}`,
    );
  } finally {
    await stopServer(server);
  }
}

async function runServerRound(prepared: PreparedServer, round: number): Promise<ServerRound> {
  const server = await startServer(prepared.cwd, [process.execPath, "dist/main.mjs"]);
  const pid = server.child.pid!;

  let cpuStart: number | undefined;
  let cpuEnd: number | undefined;
  let stealStart: ReturnType<typeof cpuTimes>;
  let stealEnd: ReturnType<typeof cpuTimes>;
  let wallStart = 0;
  let wallEnd = 0;
  const rssSamples: number[] = [];
  let sampler: NodeJS.Timeout | undefined;

  try {
    const load = await runLoad({
      target: loadTarget(prepared.payload, server.port),
      expect: prepared.benchmark.expect,
      connections: CONNECTIONS,
      workers: LOAD_THREADS,
      warmupMs: prepared.warmupMs,
      durationMs: DURATION_MS,
      onMeasureStart() {
        wallStart = performance.now();
        cpuStart = processCpuSeconds(pid);
        stealStart = cpuTimes(layout.server);
        sampler = setInterval(() => {
          const memory = processMemory(pid);
          if (memory) rssSamples.push(memory.rss);
        }, 250);
      },
      onMeasureEnd() {
        wallEnd = performance.now();
        cpuEnd = processCpuSeconds(pid);
        stealEnd = cpuTimes(layout.server);
        clearInterval(sampler);
      },
    });

    const cpuSeconds =
      cpuStart !== undefined && cpuEnd !== undefined ? cpuEnd - cpuStart : undefined;
    const memory = processMemory(pid);
    const steal =
      stealStart && stealEnd && stealEnd.total > stealStart.total
        ? (stealEnd.steal - stealStart.steal) / (stealEnd.total - stealStart.total)
        : undefined;

    return {
      round,
      throughput: load.throughput,
      requests: load.requests,
      latency: load.latency,
      perSecond: { min: load.perSecond.min, max: load.perSecond.max, stdev: load.perSecond.stdev },
      drift: drift(load.perSecond.series),
      serverCpu: cpuSeconds === undefined ? undefined : cpuSeconds / ((wallEnd - wallStart) / 1000),
      cpuPerRequest: cpuSeconds === undefined ? undefined : (cpuSeconds * 1e6) / load.requests,
      peakRss: memory?.peakRss,
      avgRss: rssSamples.length ? mean(rssSamples) : undefined,
      steal,
      clientCpu: load.clientCpu,
    };
  } catch (error) {
    throw new Error(
      `${prepared.benchmark.name} round ${round} failed: ${(error as Error).message}\nServer output:\n${server.output.join("")}`,
    );
  } finally {
    clearInterval(sampler);
    await stopServer(server);
  }
}

function summarizeServer(rounds: ServerRound[]): ServerBenchmarkResult["summary"] {
  return {
    throughput: spread(rounds.map((r) => r.throughput)),
    latency: {
      mean: median(rounds.map((r) => r.latency.mean)),
      p50: median(rounds.map((r) => r.latency.p50)),
      p90: median(rounds.map((r) => r.latency.p90)),
      p99: median(rounds.map((r) => r.latency.p99)),
      p999: median(rounds.map((r) => r.latency.p999)),
      max: median(rounds.map((r) => r.latency.max)),
    },
    serverCpu: medianOf(rounds, (r) => r.serverCpu),
    cpuPerRequest: medianOf(rounds, (r) => r.cpuPerRequest),
    peakRss: medianOf(rounds, (r) => r.peakRss),
    avgRss: medianOf(rounds, (r) => r.avgRss),
    steal: medianOf(rounds, (r) => r.steal),
    clientCpu: Math.max(...rounds.map((r) => r.clientCpu)),
  };
}

function formatRound(name: string, round: ServerRound): string {
  const parts = [
    `${Math.round(round.throughput).toLocaleString("en-US").padStart(7)} req/s`,
    `p50 ${round.latency.p50.toFixed(2)} ms`,
    `p99 ${round.latency.p99.toFixed(2)} ms`,
    round.serverCpu === undefined ? undefined : `server cpu ${(round.serverCpu * 100).toFixed(0)}%`,
    round.cpuPerRequest === undefined ? undefined : `${round.cpuPerRequest.toFixed(1)} µs/req`,
    round.peakRss === undefined ? undefined : `rss ${Math.round(round.peakRss / 1024 / 1024)} MiB`,
    `load gen cpu ${(round.clientCpu * 100).toFixed(0)}%`,
    round.drift === undefined
      ? undefined
      : `drift ${round.drift >= 0 ? "+" : ""}${(round.drift * 100).toFixed(1)}%`,
  ];
  return `  ${name.padEnd(14)} round ${String(round.round).padStart(2)}: ${parts.filter(Boolean).join(" · ")}`;
}

/**
 * Relative change of throughput from the first to the second half of the measurement window.
 * A server that is still warming up (JIT, heap sizing) shows a clearly positive drift.
 */
function drift(perSecond: number[]): number | undefined {
  const half = Math.floor(perSecond.length / 2);
  if (half === 0) return undefined;
  return mean(perSecond.slice(perSecond.length - half)) / mean(perSecond.slice(0, half)) - 1;
}

function warnings(name: string, rounds: ServerRound[]): string[] {
  const result: string[] = [];
  const serverCpu = medianOf(rounds, (r) => r.serverCpu);
  const clientCpu = Math.max(...rounds.map((r) => r.clientCpu));
  const steal = Math.max(...rounds.map((r) => r.steal ?? 0));
  const medianDrift = medianOf(rounds, (r) => r.drift);

  if (medianDrift !== undefined && medianDrift > 0.03) {
    result.push(
      `${name}: throughput was still rising during the measurement (+${(medianDrift * 100).toFixed(1)}% from the first to the second half, median) — try a longer --warmup`,
    );
  }

  if (layout.pinned && serverCpu !== undefined && serverCpu < 0.9 * layout.server.length) {
    result.push(
      `${name}: the server used only ${(serverCpu * 100).toFixed(0)}% of its CPU — it may not be saturated`,
    );
  }
  if (clientCpu > 0.8) {
    result.push(
      `${name}: a load generator thread used ${(clientCpu * 100).toFixed(0)}% CPU — try --load-threads 2`,
    );
  }
  if (steal > 0.05) {
    result.push(
      `${name}: up to ${(steal * 100).toFixed(1)}% CPU steal — the host is busy, results are noisy`,
    );
  }
  return result;
}

async function runServerGroup(group: Group & { kind: "http" | "ws" }, selected: ServerBenchmark[]) {
  log(
    `\n▶ ${group.id} — ${group.title} (${roundsFor(group)} rounds, ${warmupMs(group) / 1000} s warm-up + ${DURATION_MS / 1000} s measurement each)`,
  );
  const prepared: PreparedServer[] = [];
  for (const benchmark of selected) {
    log(`  preparing ${benchmark.name}...`);
    prepared.push(await prepareServer(group, benchmark));
  }

  const rounds = new Map(prepared.map((p) => [p.benchmark.name, [] as ServerRound[]]));
  for (let round = 1; round <= roundsFor(group); round++) {
    for (const item of roundOrder(prepared, round - 1)) {
      const result = await runServerRound(item, round);
      rounds.get(item.benchmark.name)!.push(result);
      log(formatRound(item.benchmark.name, result));
    }
  }

  return prepared.map((p): ServerBenchmarkResult => {
    const benchmarkRounds = rounds.get(p.benchmark.name)!.sort((a, b) => a.round - b.round);
    const benchmarkWarnings = warnings(p.benchmark.name, benchmarkRounds); // printed with the summary
    return {
      name: p.benchmark.name,
      library: p.benchmark.library,
      versions: versionsOf(p.benchmark.packages),
      payload: p.payload.ws
        ? { ws: `${p.payload.ws.prefix}1${p.payload.ws.suffix}` }
        : { http: p.payload.http },
      sampleResponse: p.sample,
      rounds: benchmarkRounds,
      summary: summarizeServer(benchmarkRounds),
      warnings: benchmarkWarnings,
    };
  });
}

// ---------------------------------------------------------------------------------------------
// Profiling (Clinic.js Doctor) — same build, payload and load; the numbers are not reported
// because the profiler itself slows the server down.
// ---------------------------------------------------------------------------------------------

async function profileServer(group: Group & { kind: "http" | "ws" }, benchmark: ServerBenchmark) {
  if (process.platform === "win32") {
    throw new Error("Profiling needs Linux or macOS: Clinic.js only writes its report on SIGINT");
  }
  log(`\n▶ profiling ${benchmark.name} with Clinic.js Doctor`);
  const prepared = await prepareServer(group, benchmark);
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), "orpc-bench-clinic-"));

  const server = await startServer(
    prepared.cwd,
    [
      ...tool("clinic"),
      "doctor",
      "--dest",
      dest,
      "--name",
      "report",
      "--open=false",
      "--",
      process.execPath,
      "dist/main.mjs",
    ],
    // NO_INSIGHT skips clinic's telemetry prompt, which never resolves on recent Node.js versions.
    { processGroup: true, env: { NO_INSIGHT: "1" } },
  );

  try {
    const load = await runLoad({
      target: loadTarget(prepared.payload, server.port),
      expect: benchmark.expect,
      connections: CONNECTIONS,
      workers: LOAD_THREADS,
      warmupMs: prepared.warmupMs,
      durationMs: DURATION_MS,
    });
    log(
      `  ${Math.round(load.throughput).toLocaleString("en-US")} req/s under the profiler; generating report...`,
    );
  } finally {
    // On SIGINT (Ctrl+C) clinic stops the server, analyses the samples and writes the report.
    await stopServer(server, "SIGINT", 300_000);
  }

  const generated = path.join(dest, "report.clinic-doctor.html");
  if (!fs.existsSync(generated))
    throw new Error(`Clinic did not write a report:\n${server.output.join("")}`);

  if (!options.save) {
    log(`  wrote ${generated} (--no-save: the committed report is unchanged)`);
    return;
  }
  // Only the HTML report is committed (see .gitignore); the raw samples stay in the temp dir.
  const report = path.join(prepared.cwd, ".clinic", "report.clinic-doctor.html");
  fs.mkdirSync(path.dirname(report), { recursive: true });
  fs.copyFileSync(generated, report);
  fs.rmSync(dest, { recursive: true, force: true });
  log(`  wrote ${path.relative(ROOT, report)}`);
  // Its summary is embedded in the benchmark README.
  writeReadmes(ROOT);
}

// ---------------------------------------------------------------------------------------------
// Type-check benchmarks
// ---------------------------------------------------------------------------------------------

function parseDiagnostics(output: string): Record<string, number> {
  const diagnostics: Record<string, number> = {};
  for (const line of output.split("\n")) {
    const match = /^([A-Za-z][A-Za-z ]+):\s+([\d.]+)([sK]?)\s*$/.exec(line.trim());
    if (!match) continue;
    const [, key, value, unit] = match;
    diagnostics[key!] = Number(value) * (unit === "K" ? 1024 : 1);
  }
  return diagnostics;
}

/**
 * TypeScript 7 runs 4 checkers in parallel by default (regardless of the CPU count), and each one
 * rebuilds the shared router and client types, so the default's time and counts depend on that
 * setting. Single-threaded, `tsc` does each library's type work exactly once, on one dedicated CPU.
 */
const TSC_ARGS = ["--noEmit", "--incremental", "false", "--singleThreaded"];

function runTypecheckRound(cwd: string, round: number): TypecheckRound {
  const [node, tsc] = tool("typescript", "tsc");
  const [command, args] = pinned(
    node,
    [tsc, ...TSC_ARGS, "--extendedDiagnostics"],
    layout.pinned ? layout.typecheck : undefined,
  );
  const started = performance.now();
  const output = run(command, args, cwd);
  const wallTime = (performance.now() - started) / 1000;
  const diagnostics = parseDiagnostics(output);

  if (diagnostics["Check time"] === undefined || diagnostics["Total time"] === undefined) {
    throw new Error(`Cannot parse tsc --extendedDiagnostics output:\n${output}`);
  }
  return {
    round,
    checkTime: diagnostics["Check time"],
    totalTime: diagnostics["Total time"],
    wallTime,
    diagnostics,
  };
}

async function runTypecheckGroup(group: Group, selected: TypecheckBenchmark[]) {
  log(`\n▶ ${group.id} — ${group.title} (${roundsFor(group)} rounds)`);
  const dirs = new Map(selected.map((b) => [b.name, path.join(ROOT, "benchmarks", b.name)]));
  for (const [name, cwd] of dirs) {
    log(`  generating ${name}...`);
    run(process.execPath, ["scripts/gen.ts"], cwd);
    const [node, tsc] = tool("typescript", "tsc");
    run(node, [tsc, ...TSC_ARGS], cwd); // warm the file cache
  }

  const rounds = new Map(selected.map((b) => [b.name, [] as TypecheckRound[]]));
  for (let round = 1; round <= roundsFor(group); round++) {
    for (const benchmark of roundOrder(selected, round - 1)) {
      const result = runTypecheckRound(dirs.get(benchmark.name)!, round);
      rounds.get(benchmark.name)!.push(result);
      log(
        `  ${benchmark.name.padEnd(14)} round ${String(round).padStart(2)}: check ${result.checkTime.toFixed(3)} s · total ${result.totalTime.toFixed(3)} s · wall ${result.wallTime.toFixed(3)} s`,
      );
    }
  }

  return selected.map((benchmark): TypecheckBenchmarkResult => {
    const benchmarkRounds = rounds.get(benchmark.name)!.sort((a, b) => a.round - b.round);
    const keys = Object.keys(benchmarkRounds[0]!.diagnostics);
    return {
      name: benchmark.name,
      library: benchmark.library,
      versions: { ...versionsOf(benchmark.packages), ...versionsOf(["typescript"]) },
      rounds: benchmarkRounds,
      summary: {
        checkTime: spread(benchmarkRounds.map((r) => r.checkTime)),
        totalTime: spread(benchmarkRounds.map((r) => r.totalTime)),
        wallTime: spread(benchmarkRounds.map((r) => r.wallTime)),
        diagnostics: Object.fromEntries(
          keys.map((key) => [
            key,
            median(benchmarkRounds.map((r) => r.diagnostics[key] ?? Number.NaN)),
          ]),
        ),
      },
    };
  });
}

// ---------------------------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------------------------

const known = new Set([
  ...groups.map((g) => g.id),
  ...groups.flatMap((g) => g.benchmarks.map((b) => b.name)),
]);
for (const name of positionals) {
  if (!known.has(name))
    throw new Error(`Unknown group or benchmark "${name}". Known: ${[...known].join(", ")}`);
}

const cpus = {
  server: formatCpuList(layout.server),
  client: formatCpuList(layout.client),
  typecheck: formatCpuList(layout.typecheck),
  ...(layout.idle.length ? { idle: formatCpuList(layout.idle) } : {}),
};

function settingsFor(group: Group): Settings {
  return {
    rounds: roundsFor(group),
    warmupSeconds: warmupMs(group) / 1000,
    durationSeconds: DURATION_MS / 1000,
    connections: CONNECTIONS,
    loadThreads: LOAD_THREADS,
    pinned: layout.pinned,
    cpus,
    ...(group.kind === "typecheck" ? { tscArgs: TSC_ARGS } : {}),
    ...(layoutWarnings.length ? { warnings: layoutWarnings } : {}),
  };
}

log(
  `CPU layout: ${layout.pinned ? `server ${cpus.server}${cpus.idle ? ` (SMT sibling ${cpus.idle} kept idle)` : ""} · load generator ${cpus.client} · tsc ${cpus.typecheck}` : "not pinned"}`,
);
log(
  `Settings: ${ROUNDS_OVERRIDE ?? "per-group"} round(s) · ${WARMUP_OVERRIDE === undefined ? "per-group" : `${WARMUP_OVERRIDE} s`} warm-up + ${DURATION_MS / 1000} s measurement · ${CONNECTIONS} connections · ${LOAD_THREADS} load thread(s)`,
);

for (const group of groups) {
  const groupSelected = positionals.length === 0 || positionals.includes(group.id);
  const selected = (group.benchmarks as (ServerBenchmark | TypecheckBenchmark)[]).filter(
    (b) => groupSelected || positionals.includes(b.name),
  );
  if (selected.length === 0) continue;

  if (options.profile) {
    if (group.kind === "typecheck") continue;
    for (const benchmark of selected) await profileServer(group, benchmark as ServerBenchmark);
    continue;
  }

  const benchmarks =
    group.kind === "typecheck"
      ? await runTypecheckGroup(group, selected as TypecheckBenchmark[])
      : await runServerGroup(group, selected as ServerBenchmark[]);

  const result = {
    group: { id: group.id, title: group.title, kind: group.kind, workload: group.workload },
    date: new Date().toISOString(),
    environment: environment(),
    settings: settingsFor(group),
    benchmarks,
  } as GroupResult;
  log(consoleSummary(result));

  const complete = selected.length === group.benchmarks.length;
  if (!options.save || !complete) {
    if (!complete)
      log(
        `  (partial group: results are not saved — run \`pnpm bench ${group.id}\` to update them)`,
      );
    continue;
  }

  const file = resultsFile(ROOT, group.id);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(result, null, 2)}\n`);
  // Right away, so the READMEs never disagree with results/*.json, even if a later group fails.
  writeReadmes(ROOT);
  log(`  saved ${path.relative(ROOT, file)} and updated the READMEs`);
}
