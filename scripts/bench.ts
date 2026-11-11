/** Benchmark runner (`pnpm bench --help`); see "Methodology" in the root README. */
import { type ChildProcess, spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { parseArgs } from "node:util";
import {
  DEFAULT_HEADERS,
  type Group,
  type ServerBenchmark,
  type TypecheckBenchmark,
  groups,
} from "./lib/config.ts";
import { type LoadTarget, type WsMessageTemplate, frame, runLoad } from "./lib/load/index.ts";
import type { CaptureReport } from "./lib/official-client.ts";
import {
  consoleSummary,
  formatServerRound,
  formatTypecheckRound,
  int,
  pct,
  resultsFile,
  rounds as roundCount,
  signedPct,
  writeReadmes,
} from "./lib/report.ts";
import type {
  GroupResult,
  ServerBenchmarkResult,
  ServerRound,
  ServerSettings,
  ServerSummary,
  Spread,
  TypecheckBenchmarkResult,
  TypecheckRound,
  TypecheckSettings,
} from "./lib/results.ts";
import { mean, median, stdev } from "./lib/stats.ts";
import {
  type Environment,
  allowedCpus,
  cpuLayout,
  cpuTimes,
  environment,
  formatCpuList,
  packageBin,
  packageVersion,
  parseCpuList,
  pinCurrentProcess,
  pinned,
  processCpuSeconds,
  processMemory,
  run,
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
  --rounds <n>          rounds per benchmark, each with a fresh process (default: per group)
  --warmup <s>          warm-up seconds before each measurement (default: per group)
  --duration <s>        measurement seconds per round (default 10)
  --connections <n>     concurrent connections, one request in flight each (default 10)
  --load-threads <n>    load generator threads (default 1)
  --server-cpus <list>  CPUs for the server under test and tsc, e.g. "3"
  --client-cpus <list>  CPUs for the runner and the load generator, e.g. "1-2"
  --no-pin              do not pin processes to CPUs
  --no-save             do not write results/ and the READMEs
  --profile             write a Clinic.js Doctor report for each selected server benchmark
  --report-only         regenerate the README results from results/*.json and exit`);
  process.exit(0);
}

if (options["report-only"]) {
  writeReadmes(ROOT);
  console.log("READMEs regenerated from results/*.json");
  process.exit(0);
}

function positiveInt(name: string, value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0)
    throw new Error(`--${name} must be a positive integer`);
  return parsed;
}
const ROUNDS = options.rounds === undefined ? undefined : positiveInt("rounds", options.rounds);
const WARMUP = options.warmup === undefined ? undefined : positiveInt("warmup", options.warmup);
const DURATION = positiveInt("duration", options.duration);
const CONNECTIONS = positiveInt("connections", options.connections);
const LOAD_THREADS = positiveInt("load-threads", options["load-threads"]);

const known = new Set(groups.flatMap((g) => [g.id, ...g.benchmarks.map((b) => b.name)]));
for (const name of positionals) {
  if (!known.has(name))
    throw new Error(`Unknown group or benchmark "${name}". Known: ${[...known].join(", ")}`);
}

// The runner pins itself to the load generator CPUs, so its worker threads inherit them.
const cpuOption = (name: "server-cpus" | "client-cpus") =>
  options[name] === undefined ? undefined : parseCpuList(options[name]);
const layout = options.pin
  ? cpuLayout({ server: cpuOption("server-cpus"), client: cpuOption("client-cpus") })
  : undefined;
if (!layout && options.pin && (options["server-cpus"] || options["client-cpus"])) {
  throw new Error("CPU pinning needs Linux, `taskset` (util-linux) and at least 2 CPUs");
}
if (layout) pinCurrentProcess(layout.client);
const STEAL_CPUS = layout?.server ?? allowedCpus();

const UNPINNED = "no CPU pinning, so results are noisier";
const layoutWarning = !layout
  ? UNPINNED
  : layout.shared.length
    ? `load generator CPU(s) ${formatCpuList(layout.shared)} share a physical core with the server (SMT), so results are noisier and biased; put --server-cpus and --client-cpus on separate cores`
    : undefined;
if (layoutWarning) console.warn(`⚠ ${layoutWarning}`);

const cpus = layout && {
  server: formatCpuList(layout.server),
  client: formatCpuList(layout.client),
  ...(layout.idle.length ? { idle: formatCpuList(layout.idle) } : {}),
};
console.log(
  cpus
    ? `CPU layout: server ${cpus.server}${cpus.idle ? ` (SMT sibling ${cpus.idle} idle)` : ""} · load generator ${cpus.client}`
    : "CPU layout: not pinned",
);

function spread(values: number[]): Spread {
  return {
    median: median(values),
    min: Math.min(...values),
    max: Math.max(...values),
    cv: stdev(values) / mean(values),
  };
}

function medianOf<T>(items: T[], pick: (item: T) => number | undefined): number | undefined {
  const values = items.map(pick).filter((value) => value !== undefined);
  return values.length ? median(values) : undefined;
}

const versionsOf = (packages: string[]) =>
  Object.fromEntries(packages.map((pkg) => [pkg, packageVersion(ROOT, pkg)]));

/** Runs every item `rounds` times, alternating the order (A B, B A, …) so machine drift affects all alike. */
async function interleaved<T, R>(
  items: T[],
  rounds: number,
  runOne: (item: T, round: number) => R | Promise<R>,
): Promise<Map<T, R[]>> {
  const results = new Map(items.map((item) => [item, [] as R[]]));
  for (let round = 1; round <= rounds; round++) {
    for (const item of round % 2 ? items : [...items].reverse()) {
      results.get(item)!.push(await runOne(item, round));
    }
  }
  return results;
}

// ---------------------------------------------------------------------------------------------
// Servers
// ---------------------------------------------------------------------------------------------

interface RunningServer {
  child: ChildProcess;
  port: number;
  output: string[];
  exited: Promise<void>;
}

const servers = new Set<RunningServer>();

/** Signals the server's process group, which includes a wrapper (clinic) and the server it runs. */
function kill(server: RunningServer, signal: NodeJS.Signals): void {
  try {
    process.kill(-server.child.pid!, signal);
  } catch {
    // already gone
  }
}

process.on("exit", () => {
  for (const server of servers) kill(server, "SIGKILL");
});
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => process.exit(130));

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer().on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
  });
}

const accepts = (port: number) =>
  new Promise<boolean>((resolve) => {
    const socket = net.connect(port, "127.0.0.1");
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });

async function startServer(
  cwd: string,
  command: string[],
  env: NodeJS.ProcessEnv = {},
): Promise<RunningServer> {
  const port = await freePort();
  const [file, args] = pinned(command[0]!, command.slice(1), layout?.server);
  const child = spawn(file, args, {
    cwd,
    env: { ...process.env, ...env, PORT: String(port), NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true, // its own process group
  });
  const output: string[] = [];
  child.stdout!.on("data", (data) => output.push(String(data)));
  child.stderr!.on("data", (data) => output.push(String(data)));
  const server = {
    child,
    port,
    output,
    exited: new Promise<void>((resolve) => child.once("exit", () => resolve())),
  };
  servers.add(server);

  const deadline = Date.now() + 30_000;
  while (!(await accepts(port))) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(
        `Server exited (${child.exitCode ?? child.signalCode}) before listening:\n${output.join("")}`,
      );
    }
    if (Date.now() > deadline)
      throw new Error(`Server did not listen on port ${port}:\n${output.join("")}`);
    await sleep(50);
  }
  return server;
}

async function stopServer(
  server: RunningServer,
  signal: NodeJS.Signals,
  timeoutMs: number,
): Promise<void> {
  kill(server, signal);
  const timedOut = await Promise.race([
    server.exited.then(() => false),
    sleep(timeoutMs, true, { ref: false }),
  ]);
  if (timedOut) {
    kill(server, "SIGKILL");
    await server.exited;
  }
  servers.delete(server);
}

interface ServerOptions {
  env?: NodeJS.ProcessEnv;
  signal?: NodeJS.Signals;
  timeoutMs?: number;
}

/** Runs `use` against a fresh server and always stops it; a failure includes the server's output. */
async function withServer<T>(
  cwd: string,
  command: string[],
  use: (server: RunningServer) => Promise<T>,
  { env, signal = "SIGTERM", timeoutMs = 10_000 }: ServerOptions = {},
): Promise<T> {
  const server = await startServer(cwd, command, env);
  try {
    return await use(server);
  } catch (error) {
    throw new Error(`${(error as Error).message}\nServer output:\n${server.output.join("")}`);
  } finally {
    await stopServer(server, signal, timeoutMs);
  }
}

// ---------------------------------------------------------------------------------------------
// Server benchmarks (http + ws)
// ---------------------------------------------------------------------------------------------

const SERVER = [process.execPath, "dist/main.mjs"];

interface Prepared {
  benchmark: ServerBenchmark;
  cwd: string;
  target: LoadTarget;
  /** First valid response, from round 1. */
  sample?: string;
}

/** Finds the request id in the two frames the official client sent (ids n and n + 1). */
function deriveTemplate(frames: string[]): WsMessageTemplate {
  if (frames.length !== 2)
    throw new Error(`Expected the official client to send 2 frames, got ${frames.length}`);
  const [first, second] = frames as [string, string];
  let start = 0;
  while (start < first.length && first[start] === second[start]) start++;
  while (start > 0 && /\d/.test(first[start - 1]!)) start--; // ids 11 and 12 share the "1"
  const id = /^\d+/.exec(first.slice(start))?.[0];
  const template = {
    prefix: first.slice(0, start),
    suffix: first.slice(start + (id?.length ?? 0)),
  };
  if (!id || frame(template, Number(id) + 1) !== second) {
    throw new Error(`Cannot find the request id in the captured frames:\n${first}\n${second}`);
  }
  return template;
}

/** Calls the server through the official client and returns what it sent. */
function capture(group: Group, benchmark: ServerBenchmark, cwd: string, port: number): LoadTarget {
  const output = run(process.execPath, [benchmark.client!], {
    cwd,
    env: { ...process.env, ORIGIN: `http://127.0.0.1:${port}` },
    timeout: 30_000,
  });
  const report = JSON.parse(output.trim().split("\n").at(-1)!) as CaptureReport;
  if (group.kind === "ws") return { kind: "ws", message: deriveTemplate(report.frames ?? []) };

  const [request, ...extra] = report.requests ?? [];
  if (!request || extra.length) {
    throw new Error(
      `Expected the official client to send 1 request, got ${report.requests?.length}`,
    );
  }
  const url = new URL(request.url);
  return {
    kind: "http",
    request: {
      method: request.method,
      path: url.pathname + url.search,
      headers: { ...DEFAULT_HEADERS, ...request.headers },
      body: request.body,
    },
  };
}

async function prepareServer(group: Group, benchmark: ServerBenchmark): Promise<Prepared> {
  const cwd = path.join(ROOT, "benchmarks", benchmark.name);
  const [node, tsdown] = packageBin(ROOT, "tsdown");
  run(node, [tsdown, "src/main.ts"], { cwd });

  if (!benchmark.request && !benchmark.client)
    throw new Error(`${benchmark.name} needs a client or a request`);
  const target: LoadTarget = benchmark.client
    ? await withServer(cwd, SERVER, async (server) => capture(group, benchmark, cwd, server.port))
    : { kind: "http", request: { ...benchmark.request!, headers: { ...DEFAULT_HEADERS } } };
  return { benchmark, cwd, target };
}

const loadOptions = (prepared: Prepared, settings: ServerSettings, port: number) => ({
  target: prepared.target,
  port,
  expect: prepared.benchmark.expect,
  connections: settings.connections,
  threads: settings.loadThreads,
  warmupMs: settings.warmupSeconds * 1000,
  durationMs: settings.durationSeconds * 1000,
});

/** Throughput change from the first to the second half of the window. */
function drift(perSecond: number[]): number | undefined {
  const half = Math.floor(perSecond.length / 2);
  return half ? mean(perSecond.slice(-half)) / mean(perSecond.slice(0, half)) - 1 : undefined;
}

async function runServerRound(
  prepared: Prepared,
  settings: ServerSettings,
  round: number,
): Promise<ServerRound> {
  return withServer(prepared.cwd, SERVER, async (server) => {
    const pid = server.child.pid!;
    const snapshot = () => ({
      wall: performance.now(),
      cpu: processCpuSeconds(pid),
      times: cpuTimes(STEAL_CPUS),
    });
    let start: ReturnType<typeof snapshot> | undefined;
    let end: ReturnType<typeof snapshot> | undefined;
    const rss: number[] = [];
    let sampler: NodeJS.Timeout | undefined;

    try {
      const load = await runLoad({
        ...loadOptions(prepared, settings, server.port),
        onMeasureStart() {
          start = snapshot();
          sampler = setInterval(() => {
            const memory = processMemory(pid);
            if (memory) rss.push(memory.rss);
          }, 250);
        },
        onMeasureEnd() {
          end = snapshot();
          clearInterval(sampler);
        },
      });
      prepared.sample ??= load.sample;

      const [a, b] = [start!, end!]; // both hooks ran
      const cpuSeconds = a.cpu !== undefined && b.cpu !== undefined ? b.cpu - a.cpu : undefined;
      return {
        round,
        throughput: load.throughput,
        requests: load.requests,
        latency: load.latency,
        drift: drift(load.perSecond),
        serverCpu: cpuSeconds === undefined ? undefined : cpuSeconds / ((b.wall - a.wall) / 1000),
        cpuPerRequest: cpuSeconds === undefined ? undefined : (cpuSeconds * 1e6) / load.requests,
        peakRss: processMemory(pid)?.peakRss,
        avgRss: rss.length ? mean(rss) : undefined,
        steal:
          a.times && b.times && b.times.total > a.times.total
            ? (b.times.steal - a.times.steal) / (b.times.total - a.times.total)
            : undefined,
        clientCpu: load.clientCpu,
      };
    } catch (error) {
      throw new Error(
        `${prepared.benchmark.name} round ${round} failed: ${(error as Error).message}`,
      );
    } finally {
      clearInterval(sampler);
    }
  });
}

function summarizeServer(rounds: ServerRound[]): ServerSummary {
  const latency = (key: keyof ServerRound["latency"]) => median(rounds.map((r) => r.latency[key]));
  return {
    throughput: spread(rounds.map((r) => r.throughput)),
    latency: {
      mean: latency("mean"),
      p50: latency("p50"),
      p90: latency("p90"),
      p99: latency("p99"),
      p999: latency("p999"),
      max: latency("max"),
    },
    serverCpu: medianOf(rounds, (r) => r.serverCpu),
    cpuPerRequest: medianOf(rounds, (r) => r.cpuPerRequest),
    peakRss: medianOf(rounds, (r) => r.peakRss),
    avgRss: medianOf(rounds, (r) => r.avgRss),
    steal: Math.max(...rounds.map((r) => r.steal ?? 0)),
    clientCpu: Math.max(...rounds.map((r) => r.clientCpu)),
  };
}

function serverWarnings({ name, rounds, summary }: ServerBenchmarkResult): string[] {
  const warnings: string[] = [];
  const drifts = rounds.flatMap((r) => (r.drift === undefined ? [] : [r.drift]));
  const rising = drifts.filter((d) => d > 0).length;
  // Warming up shows as a rise in nearly every round; a single round's drift is noise.
  if (drifts.length && median(drifts) > 0.03 && rising >= 0.75 * drifts.length) {
    warnings.push(
      `${name}: throughput still rising in ${rising} of ${drifts.length} rounds (median drift ${signedPct(median(drifts))}) — try a longer --warmup`,
    );
  }
  if (layout && summary.serverCpu !== undefined && summary.serverCpu < 0.9 * layout.server.length) {
    warnings.push(
      `${name}: the server used only ${pct(summary.serverCpu)} of its CPU — it may not be saturated`,
    );
  }
  if (summary.clientCpu > 0.8) {
    warnings.push(
      `${name}: a load generator thread used ${pct(summary.clientCpu)} CPU — try --load-threads 2`,
    );
  }
  if ((summary.steal ?? 0) > 0.05) {
    warnings.push(
      `${name}: up to ${pct(summary.steal!)} CPU steal — the host is busy, results are noisy`,
    );
  }
  return warnings;
}

async function runServerGroup(group: Group, selected: ServerBenchmark[], settings: ServerSettings) {
  console.log(
    `\n▶ ${group.id} — ${group.title} (${roundCount(settings.rounds)}, ${settings.warmupSeconds} s warm-up + ${settings.durationSeconds} s measurement, ${settings.connections} connections)`,
  );
  const prepared: Prepared[] = [];
  for (const benchmark of selected) {
    console.log(`  preparing ${benchmark.name}...`);
    prepared.push(await prepareServer(group, benchmark));
  }

  const rounds = await interleaved(prepared, settings.rounds, async (item, round) => {
    const result = await runServerRound(item, settings, round);
    console.log(formatServerRound(item.benchmark.name, result));
    return result;
  });

  const benchmarks = prepared.map((p): ServerBenchmarkResult => ({
    name: p.benchmark.name,
    library: p.benchmark.library,
    versions: versionsOf(p.benchmark.packages),
    target: p.target,
    sampleResponse: p.sample!,
    rounds: rounds.get(p)!,
    summary: summarizeServer(rounds.get(p)!),
  }));
  const warnings = [
    ...(layoutWarning ? [layoutWarning] : []),
    ...benchmarks.flatMap(serverWarnings),
  ];
  return { benchmarks, warnings };
}

// ---------------------------------------------------------------------------------------------
// Profiling (Clinic.js Doctor)
// ---------------------------------------------------------------------------------------------

async function profileServer(group: Group, benchmark: ServerBenchmark, settings: ServerSettings) {
  console.log(`\n▶ profiling ${benchmark.name} with Clinic.js Doctor`);
  const prepared = await prepareServer(group, benchmark);
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), "orpc-bench-clinic-"));
  const clinic = [
    ...packageBin(ROOT, "clinic"),
    "doctor",
    "--dest",
    dest,
    "--name",
    "report",
    "--open=false",
    "--",
  ];
  let output: string[] = [];

  await withServer(
    prepared.cwd,
    [...clinic, ...SERVER],
    async (server) => {
      output = server.output;
      const load = await runLoad(loadOptions(prepared, settings, server.port));
      console.log(`  ${int(load.throughput)} req/s under the profiler; generating the report...`);
    },
    // NO_INSIGHT skips clinic's telemetry prompt, which never resolves on recent Node.js.
    // clinic writes its report on SIGINT.
    { env: { NO_INSIGHT: "1" }, signal: "SIGINT", timeoutMs: 300_000 },
  );

  const report = path.join(dest, "report.clinic-doctor.html");
  if (!fs.existsSync(report)) throw new Error(`Clinic did not write a report:\n${output.join("")}`);
  if (!options.save) {
    console.log(`  wrote ${report}`);
    return;
  }
  const committed = path.join(prepared.cwd, ".clinic", "report.clinic-doctor.html");
  fs.mkdirSync(path.dirname(committed), { recursive: true });
  fs.copyFileSync(report, committed);
  fs.rmSync(dest, { recursive: true, force: true });
  writeReadmes(ROOT);
  console.log(`  wrote ${path.relative(ROOT, committed)} and updated the README`);
}

// ---------------------------------------------------------------------------------------------
// Type-check benchmarks
// ---------------------------------------------------------------------------------------------

// TypeScript 7's 4 default checkers would each redo the shared router and client types.
const TSC_ARGS = ["--singleThreaded"];

function parseDiagnostics(output: string): Record<string, number> {
  const diagnostics: Record<string, number> = {};
  for (const line of output.split("\n")) {
    const match = /^([A-Za-z][A-Za-z ]+):\s+([\d.]+)([sK]?)\s*$/.exec(line.trim());
    if (match) diagnostics[match[1]!] = Number(match[2]) * (match[3] === "K" ? 1024 : 1);
  }
  return diagnostics;
}

async function runTypecheckGroup(
  group: Group,
  selected: TypecheckBenchmark[],
  settings: TypecheckSettings,
) {
  console.log(`\n▶ ${group.id} — ${group.title} (${roundCount(settings.rounds)})`);
  const [node, tsc] = packageBin(ROOT, "typescript", "tsc");
  const cwdOf = (b: TypecheckBenchmark) => path.join(ROOT, "benchmarks", b.name);
  for (const benchmark of selected) {
    console.log(`  generating ${benchmark.name}...`);
    run(process.execPath, ["scripts/gen.ts"], { cwd: cwdOf(benchmark) });
    run(node, [tsc, ...TSC_ARGS], { cwd: cwdOf(benchmark) }); // warms the file cache
  }

  const rounds = await interleaved(
    selected,
    settings.rounds,
    (benchmark, round): TypecheckRound => {
      const [command, args] = pinned(
        node,
        [tsc, ...TSC_ARGS, "--extendedDiagnostics"],
        layout?.server,
      );
      const started = performance.now();
      const output = run(command, args, { cwd: cwdOf(benchmark) });
      const wallTime = (performance.now() - started) / 1000;
      const diagnostics = parseDiagnostics(output);
      const { "Check time": checkTime, "Total time": totalTime } = diagnostics;
      if (checkTime === undefined || totalTime === undefined) {
        throw new Error(`Cannot parse the tsc --extendedDiagnostics output:\n${output}`);
      }
      const result = { round, checkTime, totalTime, wallTime, diagnostics };
      console.log(formatTypecheckRound(benchmark.name, result));
      return result;
    },
  );

  const benchmarks = selected.map((benchmark): TypecheckBenchmarkResult => {
    const results = rounds.get(benchmark)!;
    const keys = Object.keys(results[0]!.diagnostics);
    return {
      name: benchmark.name,
      library: benchmark.library,
      versions: versionsOf(benchmark.packages),
      rounds: results,
      summary: {
        checkTime: spread(results.map((r) => r.checkTime)),
        totalTime: spread(results.map((r) => r.totalTime)),
        wallTime: spread(results.map((r) => r.wallTime)),
        diagnostics: Object.fromEntries(
          keys.map((key) => [key, median(results.map((r) => r.diagnostics[key] ?? Number.NaN))]),
        ),
      },
    };
  });
  return { benchmarks, warnings: layout ? [] : [UNPINNED] };
}

// ---------------------------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------------------------

let env: Environment | undefined;

for (const group of groups) {
  const all = positionals.length === 0 || positionals.includes(group.id);
  const pick = <T extends { name: string }>(benchmarks: T[]) =>
    benchmarks.filter((b) => all || positionals.includes(b.name));
  const rounds = ROUNDS ?? group.rounds;
  let measured: Pick<GroupResult, "settings" | "benchmarks" | "warnings">;

  if (group.kind === "typecheck") {
    const selected = pick(group.benchmarks);
    if (!selected.length || options.profile) continue;
    const settings: TypecheckSettings = {
      rounds,
      tscArgs: TSC_ARGS,
      ...(cpus ? { cpus: { server: cpus.server, ...(cpus.idle ? { idle: cpus.idle } : {}) } } : {}),
    };
    measured = { settings, ...(await runTypecheckGroup(group, selected, settings)) };
  } else {
    const selected = pick(group.benchmarks);
    if (!selected.length) continue;
    const settings: ServerSettings = {
      rounds,
      warmupSeconds: WARMUP ?? group.warmupSeconds,
      durationSeconds: DURATION,
      connections: CONNECTIONS,
      loadThreads: LOAD_THREADS,
      ...(cpus ? { cpus } : {}),
    };
    if (options.profile) {
      for (const benchmark of selected) await profileServer(group, benchmark, settings);
      continue;
    }
    measured = { settings, ...(await runServerGroup(group, selected, settings)) };
  }

  const { id, title, kind, workload } = group;
  const result = {
    group: { id, title, kind, workload },
    date: new Date().toISOString(),
    environment: (env ??= environment()),
    ...measured,
  } as GroupResult;
  console.log(consoleSummary(result));

  const complete = result.benchmarks.length === group.benchmarks.length;
  if (!complete)
    console.log(`  (partial group, not saved: run \`pnpm bench ${id}\` to update the results)`);
  if (!complete || !options.save) continue;

  const file = resultsFile(ROOT, id);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(result, null, 2)}\n`);
  writeReadmes(ROOT); // now, so a later failure leaves the READMEs in sync with results/
  console.log(`  saved ${path.relative(ROOT, file)} and updated the READMEs`);
}
