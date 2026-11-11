import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { groups } from "./config.ts";
import { packageBin } from "./system.ts";
import type {
  GroupResult,
  ServerBenchmarkResult,
  Spread,
  TypecheckBenchmarkResult,
} from "./results.ts";

const int = (value: number) => Math.round(value).toLocaleString("en-US");
const ms = (value: number) => `${value.toFixed(value < 10 ? 2 : 1)} ms`;
const seconds = (value: number) => `${value.toFixed(3)} s`;
const mib = (bytes: number) => `${Math.round(bytes / 1024 / 1024)} MiB`;
const pct = (fraction: number) => `${(fraction * 100).toFixed(fraction < 0.1 ? 1 : 0)}%`;
const us = (value: number) => `${value.toFixed(1)} µs`;
const signedPct = (fraction: number) =>
  `${fraction >= 0 ? "+" : ""}${(fraction * 100).toFixed(1)}%`;
const cpuLabel = (list: string) => (/[,-]/.test(list) ? `CPUs ${list}` : `CPU ${list}`);

function version(result: { versions: Record<string, string> }): string {
  return Object.values(result.versions)[0] ?? "?";
}

/**
 * Describes how a benchmark compares with the best one of its group. Ranges that overlap across
 * rounds are called out, since the difference is then within run-to-run noise.
 */
function relative(value: Spread, best: Spread, higherIsBetter: boolean): string {
  if (value === best) return "fastest";
  const factor = higherIsBetter ? best.median / value.median : value.median / best.median;
  const overlaps = higherIsBetter ? value.max >= best.min : value.min <= best.max;
  return `${factor.toFixed(2)}× slower${overlaps ? " (within noise)" : ""}`;
}

function bestOf<T>(items: T[], score: (item: T) => number): T {
  return items.reduce((best, item) => (score(item) > score(best) ? item : best));
}

function serverTable(
  result: GroupResult & { benchmarks: ServerBenchmarkResult[] },
  highlight?: string,
) {
  const best = bestOf(result.benchmarks, (b) => b.summary.throughput.median);
  const rows = result.benchmarks.map((b) => {
    const s = b.summary;
    const name = b.name === highlight ? `**${b.library}**` : b.library;
    return [
      `[${name}](${highlight ? `../${b.name}` : `./benchmarks/${b.name}`})`,
      version(b),
      `**${int(s.throughput.median)}** req/s`,
      relative(s.throughput, best.summary.throughput, true),
      `${int(s.throughput.min)} – ${int(s.throughput.max)}`,
      ms(s.latency.p50),
      ms(s.latency.p99),
      s.cpuPerRequest === undefined ? "n/a" : us(s.cpuPerRequest),
      s.peakRss === undefined ? "n/a" : mib(s.peakRss),
    ];
  });

  return table(
    [
      "Library",
      "Version",
      "Throughput",
      "Relative",
      "Range (min – max)",
      "Latency p50",
      "Latency p99",
      "Server CPU / req",
      "Peak RSS",
    ],
    ["l", "l", "r", "l", "r", "r", "r", "r", "r"],
    rows,
  );
}

function typecheckTable(
  result: GroupResult & { benchmarks: TypecheckBenchmarkResult[] },
  highlight?: string,
) {
  const best = bestOf(result.benchmarks, (b) => -b.summary.checkTime.median);
  const rows = result.benchmarks.map((b) => {
    const s = b.summary;
    const name = b.name === highlight ? `**${b.library}**` : b.library;
    return [
      `[${name}](${highlight ? `../${b.name}` : `./benchmarks/${b.name}`})`,
      version(b),
      `**${seconds(s.checkTime.median)}**`,
      relative(s.checkTime, best.summary.checkTime, false),
      `${seconds(s.checkTime.min)} – ${seconds(s.checkTime.max)}`,
      seconds(s.totalTime.median),
      int(s.diagnostics.Types ?? Number.NaN),
      int(s.diagnostics.Instantiations ?? Number.NaN),
      mib(s.diagnostics["Memory used"] ?? Number.NaN),
    ];
  });

  return table(
    [
      "Library",
      "Version",
      "Check time",
      "Relative",
      "Range (min – max)",
      "Total time",
      "Types",
      "Instantiations",
      "Memory used",
    ],
    ["l", "l", "r", "l", "r", "r", "r", "r", "r"],
    rows,
  );
}

function table(header: string[], align: ("l" | "r")[], rows: string[][]): string {
  const separator = align.map((a) => (a === "r" ? "--:" : ":--"));
  return [header, separator, ...rows].map((cells) => `| ${cells.join(" | ")} |`).join("\n");
}

function groupTable(result: GroupResult, highlight?: string): string {
  return result.group.kind === "typecheck"
    ? typecheckTable(result as GroupResult & { benchmarks: TypecheckBenchmarkResult[] }, highlight)
    : serverTable(result as GroupResult & { benchmarks: ServerBenchmarkResult[] }, highlight);
}

function describeRun(result: GroupResult): string {
  const s = result.settings;
  const idle = s.cpus.idle ? ` (SMT sibling ${s.cpus.idle} kept idle)` : "";
  const pinning = s.pinned
    ? result.group.kind === "typecheck"
      ? `\`tsc\` pinned to ${cpuLabel(s.cpus.typecheck)}${s.cpus.typecheck === s.cpus.server ? idle : ""}`
      : `server pinned to ${cpuLabel(s.cpus.server)}${idle}, load generator to ${cpuLabel(s.cpus.client)}`
    : "no CPU pinning";

  if (result.group.kind === "typecheck") {
    const typescript = result.benchmarks[0]?.versions.typescript;
    const flags = s.tscArgs?.filter((arg) => arg === "--singleThreaded" || arg === "--checkers");
    const mode = flags?.length ? `, \`tsc ${flags.join(" ")}\`` : "";
    return `TypeScript ${typescript ?? "?"}${mode} · median of ${s.rounds} rounds (run order alternated); ${pinning}.`;
  }

  return (
    `Median of ${s.rounds} rounds, each with a fresh server process (run order alternated); ` +
    `${s.connections} connections, ${s.warmupSeconds} s warm-up + ${s.durationSeconds} s measurement per round; ${pinning}.`
  );
}

/** Everything the runner flagged for this group (CPU layout, saturation, warm-up, noise). */
function groupWarnings(result: GroupResult): string[] {
  const benchmarks = result.benchmarks as (ServerBenchmarkResult | TypecheckBenchmarkResult)[];
  return [
    ...(result.settings.warnings ?? []),
    ...benchmarks.flatMap((b) => ("warnings" in b ? (b.warnings ?? []) : [])),
  ];
}

function warningLines(warnings: string[]): string[] {
  return warnings.length ? ["", ...warnings.map((warning) => `> ⚠ ${warning}`)] : [];
}

function describeEnvironment(result: GroupResult): string {
  const e = result.environment;
  const smt =
    e.threadsPerCore === undefined
      ? ""
      : e.threadsPerCore === 1
        ? ", no SMT"
        : `, ${e.threadsPerCore} threads per core`;
  return [
    `CPU: ${e.cpu} (${e.cores} ${e.threadsPerCore === undefined ? "cores" : "CPUs"}${smt}${e.virtualization ? `, ${e.virtualization}` : ""})`,
    `Memory: ${e.memory}`,
    `OS: ${e.os}`,
    `Node: ${e.node} (V8 ${e.v8})`,
    ...(e.pnpm ? [`pnpm: ${e.pnpm}`] : []),
  ].join("\n");
}

/** Plain-text summary of a group run for the console: medians, ranges and the comparison. */
export function consoleSummary(result: GroupResult): string {
  const { rounds } = result.settings;
  const lines = [`  Summary (median of ${rounds} round${rounds === 1 ? "" : "s"}):`];
  const pad = Math.max(...result.benchmarks.map((b) => b.name.length));

  if (result.group.kind === "typecheck") {
    const benchmarks = result.benchmarks as TypecheckBenchmarkResult[];
    const best = bestOf(benchmarks, (b) => -b.summary.checkTime.median);
    for (const b of benchmarks) {
      const s = b.summary;
      lines.push(
        `    ${b.name.padEnd(pad)}  check ${seconds(s.checkTime.median)} (${seconds(s.checkTime.min)} – ${seconds(s.checkTime.max)}) · total ${seconds(s.totalTime.median)} · ${int(s.diagnostics.Types ?? Number.NaN)} types · ${int(s.diagnostics.Instantiations ?? Number.NaN)} instantiations · ${mib(s.diagnostics["Memory used"] ?? Number.NaN)} · ${relative(s.checkTime, best.summary.checkTime, false)}`,
      );
    }
  } else {
    const benchmarks = result.benchmarks as ServerBenchmarkResult[];
    const best = bestOf(benchmarks, (b) => b.summary.throughput.median);
    for (const b of benchmarks) {
      const s = b.summary;
      lines.push(
        `    ${b.name.padEnd(pad)}  ${int(s.throughput.median)} req/s (${int(s.throughput.min)} – ${int(s.throughput.max)}, CV ${pct(s.throughput.cv)}) · p50 ${ms(s.latency.p50)} · p99 ${ms(s.latency.p99)} · ${s.cpuPerRequest === undefined ? "n/a" : us(s.cpuPerRequest)} CPU/req · ${s.peakRss === undefined ? "n/a" : mib(s.peakRss)} peak RSS · ${relative(s.throughput, best.summary.throughput, true)}`,
      );
    }
  }

  lines.push(...groupWarnings(result).map((warning) => `  ⚠ ${warning}`));
  return lines.join("\n");
}

function rootSection(results: GroupResult[]): string {
  const sections = results.map((result) =>
    [
      `### \`${result.group.id}\` — ${result.group.title}`,
      "",
      `Workload: ${result.group.workload}.`,
      "",
      groupTable(result),
      "",
      `<sub>${result.date.slice(0, 10)} · ${describeRun(result)}</sub>`,
      ...warningLines(groupWarnings(result)),
    ].join("\n"),
  );

  const environments = [...new Set(results.map((result) => describeEnvironment(result)))];

  return [
    ...sections,
    "Run on:",
    ...environments.map((environment) => ["```", environment, "```"].join("\n")),
  ].join("\n\n");
}

function serverDetails(benchmark: ServerBenchmarkResult): string {
  const s = benchmark.summary;
  const lines = [
    table(
      ["Metric", "Result"],
      ["l", "l"],
      [
        [
          "Throughput",
          `**${int(s.throughput.median)} req/s** (median; rounds range ${int(s.throughput.min)} – ${int(s.throughput.max)}, CV ${pct(s.throughput.cv)})`,
        ],
        [
          "Latency",
          `p50 ${ms(s.latency.p50)} · p90 ${ms(s.latency.p90)} · p99 ${ms(s.latency.p99)} · p99.9 ${ms(s.latency.p999)} · mean ${ms(s.latency.mean)}`,
        ],
        [
          "Server CPU",
          s.cpuPerRequest === undefined || s.serverCpu === undefined
            ? "n/a"
            : `${us(s.cpuPerRequest)} per request (${pct(s.serverCpu)} of one core used)`,
        ],
        [
          "Server memory",
          s.peakRss === undefined || s.avgRss === undefined
            ? "n/a"
            : `${mib(s.peakRss)} peak RSS (${mib(s.avgRss)} average while under load)`,
        ],
      ],
    ),
  ];

  const rounds = table(
    [
      "Round",
      "Req/s",
      "Drift",
      "p50",
      "p99",
      "Max",
      "Server CPU",
      "CPU / req",
      "Peak RSS",
      "Steal",
      "Load gen CPU",
    ],
    ["r", "r", "r", "r", "r", "r", "r", "r", "r", "r", "r"],
    benchmark.rounds.map((r) => [
      `${r.round}`,
      int(r.throughput),
      r.drift === undefined ? "n/a" : signedPct(r.drift),
      ms(r.latency.p50),
      ms(r.latency.p99),
      ms(r.latency.max),
      r.serverCpu === undefined ? "n/a" : pct(r.serverCpu),
      r.cpuPerRequest === undefined ? "n/a" : us(r.cpuPerRequest),
      r.peakRss === undefined ? "n/a" : mib(r.peakRss),
      r.steal === undefined ? "n/a" : pct(r.steal),
      pct(r.clientCpu),
    ]),
  );

  const http = benchmark.payload.http;
  const request = http
    ? [
        "Request sent by the load generator (plus a `Host` header):",
        "",
        "```http",
        `${http.method} ${http.path} HTTP/1.1`,
        ...Object.entries(http.headers).map(([name, value]) => `${name}: ${value}`),
        ...(http.body ? ["", http.body] : []),
        "```",
      ]
    : [
        "Frame sent by the load generator (the id is incremented for every request on a connection):",
        "",
        // Plain fences: a `json` fence would be pretty-printed by the formatter, hiding the wire format.
        "```",
        benchmark.payload.ws ?? "",
        "```",
      ];

  lines.push(
    "",
    "<details>",
    "<summary>Per-round results, request and response</summary>",
    "",
    "Drift is the throughput change from the first to the second half of the measurement window; a clearly positive value means the server was still warming up.",
    "",
    rounds,
    "",
    ...request,
    "",
    "Response:",
    "",
    "```",
    benchmark.sampleResponse,
    "```",
    "",
    "</details>",
  );

  return lines.join("\n");
}

function typecheckDetails(benchmark: TypecheckBenchmarkResult): string {
  const s = benchmark.summary;
  const summary = table(
    ["Metric", "Result"],
    ["l", "l"],
    [
      [
        "Check time",
        `**${seconds(s.checkTime.median)}** (median; rounds range ${seconds(s.checkTime.min)} – ${seconds(s.checkTime.max)})`,
      ],
      [
        "Total time",
        `${seconds(s.totalTime.median)} (process wall time ${seconds(s.wallTime.median)})`,
      ],
      [
        "Types / instantiations",
        `${int(s.diagnostics.Types ?? 0)} / ${int(s.diagnostics.Instantiations ?? 0)}`,
      ],
      ["Memory used", mib(s.diagnostics["Memory used"] ?? Number.NaN)],
    ],
  );

  const diagnostics = Object.entries(s.diagnostics)
    .map(([key, value]) => {
      const formatted =
        key === "Memory used"
          ? `${int(value / 1024)}K`
          : key.endsWith("time")
            ? `${value.toFixed(3)}s`
            : int(value);
      return `${`${key}:`.padEnd(16)}${formatted.padStart(12)}`;
    })
    .join("\n");

  const rounds = table(
    ["Round", "Check time", "Total time", "Wall time"],
    ["r", "r", "r", "r"],
    benchmark.rounds.map((r) => [
      `${r.round}`,
      seconds(r.checkTime),
      seconds(r.totalTime),
      seconds(r.wallTime),
    ]),
  );

  return [
    summary,
    "",
    "<details>",
    "<summary>Per-round results and full diagnostics</summary>",
    "",
    rounds,
    "",
    "Median `--extendedDiagnostics` output:",
    "",
    "```",
    diagnostics,
    "```",
    "",
    "</details>",
  ].join("\n");
}

interface ClinicData {
  processStat: { timestamp: number; delay: number; cpu: number; memory: { rss: number } }[];
  analysis: { interval: [number, number]; issues: Record<string, string | Record<string, string>> };
}

/** Names Clinic.js Doctor uses for its alerts. */
const CLINIC_LABELS: Record<string, string> = {
  delay: "event loop delay",
  cpu: "CPU usage",
  handles: "active handles",
  loopUtilization: "event loop utilization",
};

/** Summarises the data embedded in a Clinic.js Doctor HTML report over its analysis interval. */
function clinicSection(root: string, name: string): string | undefined {
  const file = path.join(root, "benchmarks", name, ".clinic", "report.clinic-doctor.html");
  if (!fs.existsSync(file)) return undefined;

  const html = fs.readFileSync(file, "utf8");
  const json = /<script type="application\/json" id="clinic-data">([\s\S]*?)<\/script>/.exec(
    html,
  )?.[1];
  if (!json) return undefined;

  const data = JSON.parse(json) as ClinicData;
  const [from, to] = data.analysis.interval;
  const samples = data.processStat.filter((s) => s.timestamp >= from && s.timestamp <= to);
  if (samples.length === 0) return undefined;

  const avg = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
  const cpu = samples.map((s) => s.cpu);
  const rss = samples.map((s) => s.memory.rss);
  const delay = samples.map((s) => s.delay);
  const issues = Object.entries(data.analysis.issues).flatMap(([key, value]) =>
    typeof value === "string"
      ? value === "none"
        ? []
        : [`${CLINIC_LABELS[key] ?? key} (${value})`]
      : Object.entries(value)
          .filter(([, v]) => v !== "none")
          .map(([k, v]) => `memory ${k} (${v})`),
  );
  const saturated = data.analysis.issues.loopUtilization !== "none";
  const link = `benchmarks/${name}/.clinic/report.clinic-doctor.html`;

  return [
    `Clinic.js Doctor profile under the same load, generated with \`pnpm bench:profile\` ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/${link})). The profiler slows the server down, so use it to compare behaviour, not throughput:`,
    "",
    `- CPU usage: ${pct(avg(cpu))} on average (max ${pct(Math.max(...cpu))})`,
    `- Memory (RSS): ${mib(Math.min(...rss))} – ${mib(Math.max(...rss))}`,
    `- Event loop delay: ${ms(avg(delay))} on average (max ${ms(Math.max(...delay))})`,
    `- Detected issues: ${issues.length ? issues.join(", ") : "none"}${saturated ? " — high event loop utilization is expected here, since the load keeps the server saturated" : ""}`,
  ].join("\n");
}

function benchmarkSection(root: string, result: GroupResult, name: string): string {
  const benchmark = (
    result.benchmarks as (ServerBenchmarkResult | TypecheckBenchmarkResult)[]
  ).find((b) => b.name === name)!;
  const versions = Object.entries(benchmark.versions)
    .map(([pkg, v]) => `${pkg}@${v}`)
    .join(", ");

  const clinic = result.group.kind === "typecheck" ? undefined : clinicSection(root, name);

  return [
    `${benchmark.library} ${version(benchmark)} — ${result.date.slice(0, 10)} (${versions})`,
    "",
    result.group.kind === "typecheck"
      ? typecheckDetails(benchmark as TypecheckBenchmarkResult)
      : serverDetails(benchmark as ServerBenchmarkResult),
    "",
    `Compared with the rest of the \`${result.group.id}\` group, measured in the same session:`,
    "",
    groupTable(result, name),
    "",
    `<sub>${describeRun(result)}</sub>`,
    ...warningLines(groupWarnings(result)),
    ...(clinic ? ["", clinic] : []),
    "",
    "Run on:",
    "",
    "```",
    describeEnvironment(result),
    "```",
  ].join("\n");
}

function replaceBetween(file: string, marker: string, content: string): void {
  const start = `<!-- ${marker}:start -->`;
  const end = `<!-- ${marker}:end -->`;
  const text = fs.readFileSync(file, "utf8");
  const from = text.indexOf(start);
  const to = text.indexOf(end);
  if (from === -1 || to === -1) throw new Error(`${file} is missing the ${start} / ${end} markers`);
  fs.writeFileSync(
    file,
    `${text.slice(0, from + start.length)}\n\n${content}\n\n${text.slice(to)}`,
  );
}

export function resultsFile(root: string, groupId: string): string {
  return path.join(root, "results", `${groupId}.json`);
}

/** Regenerates the result sections of the root README and of every benchmark README. */
export function writeReadmes(root: string): void {
  const resultFiles = groups
    .map((group) => resultsFile(root, group.id))
    .filter((file) => fs.existsSync(file));
  const results = resultFiles.map(
    (file) => JSON.parse(fs.readFileSync(file, "utf8")) as GroupResult,
  );

  const written = [path.join(root, "README.md")];
  replaceBetween(written[0]!, "results", rootSection(results));

  for (const result of results) {
    for (const benchmark of result.benchmarks) {
      const readme = path.join(root, "benchmarks", benchmark.name, "README.md");
      replaceBetween(readme, "result", benchmarkSection(root, result, benchmark.name));
      written.push(readme);
    }
  }

  // Keep generated files in the repository's formatting (aligned tables), so `pnpm fmt:check` passes.
  execFileSync(process.execPath, [packageBin(root, "oxfmt"), ...written, ...resultFiles], {
    cwd: root,
    stdio: "ignore",
  });
}
