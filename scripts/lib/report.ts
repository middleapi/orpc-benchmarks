import fs from "node:fs";
import path from "node:path";
import { groups } from "./config.ts";
import { frame } from "./load/types.ts";
import {
  type BenchmarkResult,
  type GroupResult,
  type ServerBenchmarkResult,
  type ServerRound,
  type Spread,
  type TypecheckBenchmarkResult,
  type TypecheckRound,
  isTypecheck,
} from "./results.ts";
import { mean } from "./stats.ts";
import { packageBin, run } from "./system.ts";

export const int = (value: number) => Math.round(value).toLocaleString("en-US");
const ms = (value: number) => `${value.toFixed(value < 10 ? 2 : 1)} ms`;
const seconds = (value: number) => `${value.toFixed(3)} s`;
const mib = (bytes: number) => `${Math.round(bytes / 1024 / 1024)} MiB`;
export const pct = (fraction: number) => `${(fraction * 100).toFixed(fraction < 0.1 ? 1 : 0)}%`;
export const signedPct = (fraction: number) =>
  `${fraction >= 0 ? "+" : ""}${(fraction * 100).toFixed(1)}%`;
const us = (value: number) => `${value.toFixed(1)} µs`;
export const roundCount = (count: number) => `${count} round${count === 1 ? "" : "s"}`;
const orNa = <T>(value: T | undefined, format: (value: T) => string) =>
  value === undefined ? "n/a" : format(value);
const cpuLabel = (list: string) => (/[,-]/.test(list) ? `CPUs ${list}` : `CPU ${list}`);

/** "1.33× slower", plus "(within noise)" when the min – max ranges overlap. */
function relative(value: Spread, best: Spread, higherIsBetter: boolean): string {
  if (value === best) return "fastest";
  const factor = (higherIsBetter ? best.median / value.median : value.median / best.median).toFixed(
    2,
  );
  const overlaps = higherIsBetter ? value.max >= best.min : value.min <= best.max;
  return `${factor}×${factor === "1.00" ? "" : " slower"}${overlaps ? " (within noise)" : ""}`;
}

function bestOf<T>(items: T[], score: (item: T) => number): T {
  return items.reduce((best, item) => (score(item) > score(best) ? item : best));
}

interface Comparison {
  header: string[];
  rows: { name: string; library: string; cells: string[] }[];
}

/** One row per benchmark, shared by the README tables and the console summary. */
function comparison(result: GroupResult): Comparison {
  if (isTypecheck(result)) {
    const best = bestOf(result.benchmarks, (b) => -b.summary.checkTime.median).summary.checkTime;
    return {
      header: [
        "Version",
        "Check time",
        "Relative",
        "Range (min – max)",
        "Total time",
        "Types",
        "Instantiations",
        "Memory used",
      ],
      rows: result.benchmarks.map(({ name, library, versions, summary: s }) => ({
        name,
        library,
        cells: [
          Object.values(versions)[0]!,
          seconds(s.checkTime.median),
          relative(s.checkTime, best, false),
          `${seconds(s.checkTime.min)} – ${seconds(s.checkTime.max)}`,
          seconds(s.totalTime.median),
          int(s.diagnostics.Types ?? Number.NaN),
          int(s.diagnostics.Instantiations ?? Number.NaN),
          mib(s.diagnostics["Memory used"] ?? Number.NaN),
        ],
      })),
    };
  }

  const best = bestOf(result.benchmarks, (b) => b.summary.throughput.median).summary.throughput;
  return {
    header: [
      "Version",
      "Throughput",
      "Relative",
      "Range (min – max)",
      "Latency p50",
      "Latency p99",
      "Server CPU / req",
      "Peak RSS",
    ],
    rows: result.benchmarks.map(({ name, library, versions, summary: s }) => ({
      name,
      library,
      cells: [
        Object.values(versions)[0]!,
        `${int(s.throughput.median)} req/s`,
        relative(s.throughput, best, true),
        `${int(s.throughput.min)} – ${int(s.throughput.max)}`,
        ms(s.latency.p50),
        ms(s.latency.p99),
        orNa(s.cpuPerRequest, us),
        orNa(s.peakRss, mib),
      ],
    })),
  };
}

function table(header: string[], align: string, rows: string[][]): string {
  const separator = [...align].map((a) => (a === "r" ? "--:" : ":--"));
  return [header, separator, ...rows].map((cells) => `| ${cells.join(" | ")} |`).join("\n");
}

/** `highlight`: the benchmark whose README the table is in (its name in bold, relative links). */
function groupTable(result: GroupResult, highlight?: string): string {
  const { header, rows } = comparison(result);
  return table(
    ["Library", ...header],
    "llrlrrrrr",
    rows.map(({ name, library, cells }) => [
      `[${name === highlight ? `**${library}**` : library}](${highlight ? `../${name}` : `./benchmarks/${name}`})`,
      ...cells.map((cell, i) => (i === 1 ? `**${cell}**` : cell)), // the headline metric
    ]),
  );
}

/** "Label value · Label value …" for the console. */
const labelled = (header: string[], cells: string[]) =>
  cells.map((cell, i) => `${header[i]} ${cell}`).join(" · ");

export function consoleSummary(result: GroupResult): string {
  const { header, rows } = comparison(result);
  const width = Math.max(...rows.map((row) => row.name.length));
  return [
    `  Summary (median of ${roundCount(result.settings.rounds)}):`,
    ...rows.map(
      (row) => `    ${row.name.padEnd(width)}  ${labelled(header.slice(1), row.cells.slice(1))}`,
    ),
    ...result.warnings.map((warning) => `  ⚠ ${warning}`),
  ].join("\n");
}

const SERVER_ROUND = [
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
];
const serverRoundCells = (r: ServerRound) => [
  int(r.throughput),
  orNa(r.drift, signedPct),
  ms(r.latency.p50),
  ms(r.latency.p99),
  ms(r.latency.max),
  orNa(r.serverCpu, pct),
  orNa(r.cpuPerRequest, us),
  orNa(r.peakRss, mib),
  orNa(r.steal, pct),
  pct(r.clientCpu),
];

const TYPECHECK_ROUND = ["Check time", "Total time", "Wall time"];
const typecheckRoundCells = (r: TypecheckRound) =>
  [r.checkTime, r.totalTime, r.wallTime].map(seconds);

const roundLine = (name: string, round: number, details: string) =>
  `  ${name.padEnd(14)} round ${String(round).padStart(2)}: ${details}`;

export const formatServerRound = (name: string, r: ServerRound) =>
  roundLine(name, r.round, labelled(SERVER_ROUND, serverRoundCells(r)));

export const formatTypecheckRound = (name: string, r: TypecheckRound) =>
  roundLine(name, r.round, labelled(TYPECHECK_ROUND, typecheckRoundCells(r)));

function describeRun(result: GroupResult): string {
  const { cpus } = result.settings;
  const median = `median of ${roundCount(result.settings.rounds)} (order alternated)`;
  const server =
    cpus && `${cpuLabel(cpus.server)}${cpus.idle ? ` (SMT sibling ${cpus.idle} idle)` : ""}`;

  if (isTypecheck(result)) {
    const tsc = `\`tsc ${result.settings.tscArgs.join(" ")}\` ${server ? `on ${server}` : "(not pinned)"}`;
    return `TypeScript ${result.benchmarks[0]?.versions.typescript}, ${tsc} · ${median}.`;
  }

  const s = result.settings;
  const pinning = s.cpus
    ? `server on ${server}, load generator on ${cpuLabel(s.cpus.client)}`
    : "no CPU pinning";
  return `Median of ${roundCount(s.rounds)} (fresh server each, order alternated) · ${s.connections} connections · ${s.warmupSeconds} s warm-up + ${s.durationSeconds} s measured · ${pinning}.`;
}

function describeEnvironment(result: GroupResult): string {
  const e = result.environment;
  const smt =
    e.threadsPerCore === 1
      ? ", no SMT"
      : e.threadsPerCore
        ? `, ${e.threadsPerCore} threads per core`
        : "";
  return [
    `CPU: ${e.cpu} (${e.cores} CPUs${smt}${e.virtualization ? `, ${e.virtualization}` : ""})`,
    `Memory: ${e.memory}`,
    `OS: ${e.os}`,
    `Node: ${e.node} (V8 ${e.v8})`,
    ...(e.pnpm ? [`pnpm: ${e.pnpm}`] : []),
  ].join("\n");
}

const warningLines = (result: GroupResult) =>
  result.warnings.length
    ? ["", "> [!WARNING]", ...result.warnings.map((warning) => `> - ${warning}`)]
    : [];

const fence = (content: string, lang = "") => ["```" + lang, content, "```"].join("\n");

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
      ...warningLines(result),
    ].join("\n"),
  );
  const environments = [...new Set(results.map(describeEnvironment))];
  return [...sections, "Run on:", ...environments.map((e) => fence(e))].join("\n\n");
}

function details(summary: string, ...content: string[]): string {
  return ["<details>", `<summary>${summary}</summary>`, "", ...content, "</details>"].join("\n");
}

function serverDetails(b: ServerBenchmarkResult): string {
  const s = b.summary;
  const summary = table(["Metric", "Result"], "ll", [
    [
      "Throughput",
      `**${int(s.throughput.median)} req/s** (median; rounds ${int(s.throughput.min)} – ${int(s.throughput.max)}, CV ${pct(s.throughput.cv)})`,
    ],
    [
      "Latency",
      `p50 ${ms(s.latency.p50)} · p90 ${ms(s.latency.p90)} · p99 ${ms(s.latency.p99)} · p99.9 ${ms(s.latency.p999)} · mean ${ms(s.latency.mean)}`,
    ],
    [
      "Server CPU",
      s.cpuPerRequest === undefined || s.serverCpu === undefined
        ? "n/a"
        : `${us(s.cpuPerRequest)} per request (${pct(s.serverCpu)} of one core)`,
    ],
    [
      "Server memory",
      s.peakRss === undefined || s.avgRss === undefined
        ? "n/a"
        : `${mib(s.peakRss)} peak RSS (${mib(s.avgRss)} average under load)`,
    ],
  ]);
  const rounds = table(
    ["Round", ...SERVER_ROUND],
    "r".repeat(SERVER_ROUND.length + 1),
    b.rounds.map((r) => [`${r.round}`, ...serverRoundCells(r)]),
  );
  const { target } = b;
  const request =
    target.kind === "http"
      ? [
          "Request (plus a `host` header):",
          "",
          fence(
            [
              `${target.request.method} ${target.request.path} HTTP/1.1`,
              ...Object.entries(target.request.headers).map(([name, value]) => `${name}: ${value}`),
              ...(target.request.body ? ["", target.request.body] : []),
            ].join("\n"),
            "http",
          ),
        ]
      : // Plain fence: oxfmt would reformat a `json` one.
        ["Frame (the id increments with each request):", "", fence(frame(target.message, 1))];

  return [
    summary,
    "",
    details(
      "Per-round results, request and response",
      "Drift: throughput change from the first to the second half of the measurement window. A server still warming up rises in nearly every round.",
      "",
      rounds,
      "",
      ...request,
      "",
      "Response:",
      "",
      fence(b.sampleResponse),
      "",
    ),
  ].join("\n");
}

function typecheckDetails(b: TypecheckBenchmarkResult): string {
  const s = b.summary;
  const summary = table(["Metric", "Result"], "ll", [
    [
      "Check time",
      `**${seconds(s.checkTime.median)}** (median; rounds ${seconds(s.checkTime.min)} – ${seconds(s.checkTime.max)})`,
    ],
    [
      "Total time",
      `${seconds(s.totalTime.median)} (process wall time ${seconds(s.wallTime.median)})`,
    ],
    [
      "Types / instantiations",
      `${int(s.diagnostics.Types ?? Number.NaN)} / ${int(s.diagnostics.Instantiations ?? Number.NaN)}`,
    ],
    ["Memory used", mib(s.diagnostics["Memory used"] ?? Number.NaN)],
  ]);
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
    ["Round", ...TYPECHECK_ROUND],
    "rrrr",
    b.rounds.map((r) => [`${r.round}`, ...typecheckRoundCells(r)]),
  );

  return [
    summary,
    "",
    details(
      "Per-round results and full diagnostics",
      rounds,
      "",
      "Median of each `--extendedDiagnostics` value:",
      "",
      fence(diagnostics),
      "",
    ),
  ].join("\n");
}

interface ClinicData {
  processStat: { timestamp: number; delay: number; cpu: number; memory: { rss: number } }[];
  analysis: { interval: [number, number]; issues: Record<string, string | Record<string, string>> };
}

const CLINIC_LABELS: Record<string, string> = {
  delay: "event loop delay",
  cpu: "CPU usage",
  handles: "active handles",
  loopUtilization: "event loop utilization",
};

/** Summarises a Clinic.js Doctor report over its analysis interval. */
function clinicSection(root: string, name: string): string | undefined {
  const file = path.join(root, "benchmarks", name, ".clinic", "report.clinic-doctor.html");
  if (!fs.existsSync(file)) return undefined;
  const json = /<script type="application\/json" id="clinic-data">([\s\S]*?)<\/script>/.exec(
    fs.readFileSync(file, "utf8"),
  )?.[1];
  if (!json) return undefined;

  const data = JSON.parse(json) as ClinicData;
  const [from, to] = data.analysis.interval;
  const samples = data.processStat.filter((s) => s.timestamp >= from && s.timestamp <= to);
  if (samples.length === 0) return undefined;

  const cpu = samples.map((s) => s.cpu);
  const rss = samples.map((s) => s.memory.rss);
  const delay = samples.map((s) => s.delay);
  const issues = Object.entries(data.analysis.issues).flatMap(([key, value]) =>
    typeof value === "string"
      ? value === "none"
        ? []
        : [
            `${CLINIC_LABELS[key] ?? key} (${value}${key === "loopUtilization" ? "; expected: the load keeps the server saturated" : ""})`,
          ]
      : Object.entries(value)
          .filter(([, v]) => v !== "none")
          .map(([k, v]) => `memory ${k} (${v})`),
  );
  const link = `benchmarks/${name}/.clinic/report.clinic-doctor.html`;

  return [
    `Clinic.js Doctor profile from \`pnpm bench:profile\`, under the same load ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/${link})); it is a single round, so compare behaviour, not throughput:`,
    "",
    `- CPU usage: ${pct(mean(cpu))} on average`,
    `- Memory (RSS): ${mib(Math.min(...rss))} – ${mib(Math.max(...rss))}`,
    `- Event loop delay: ${ms(mean(delay))} on average (max ${ms(Math.max(...delay))})`,
    `- Detected issues: ${issues.length ? issues.join(", ") : "none"}`,
  ].join("\n");
}

function benchmarkSection(root: string, result: GroupResult, benchmark: BenchmarkResult): string {
  const { name } = benchmark;
  const versions = Object.entries(benchmark.versions).map(([pkg, v]) => `${pkg}@${v}`);
  const clinic = isTypecheck(result) ? undefined : clinicSection(root, name);

  return [
    `${benchmark.library} ${Object.values(benchmark.versions)[0]} — ${result.date.slice(0, 10)} (${versions.join(", ")})`,
    "",
    isTypecheck(result)
      ? typecheckDetails(benchmark as TypecheckBenchmarkResult)
      : serverDetails(benchmark as ServerBenchmarkResult),
    "",
    `The whole \`${result.group.id}\` group, measured in the same session:`,
    "",
    groupTable(result, name),
    "",
    `<sub>${describeRun(result)}</sub>`,
    ...warningLines(result),
    ...(clinic ? ["", clinic] : []),
    "",
    "Run on:",
    "",
    fence(describeEnvironment(result)),
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

/** Regenerates the results in the root README and in every benchmark README. */
export function writeReadmes(root: string): void {
  const files = groups
    .map((group) => resultsFile(root, group.id))
    .filter((file) => fs.existsSync(file));
  const results = files.map((file) => JSON.parse(fs.readFileSync(file, "utf8")) as GroupResult);

  const written = [path.join(root, "README.md")];
  replaceBetween(written[0]!, "results", rootSection(results));
  for (const result of results) {
    for (const benchmark of result.benchmarks) {
      const readme = path.join(root, "benchmarks", benchmark.name, "README.md");
      replaceBetween(readme, "result", benchmarkSection(root, result, benchmark));
      written.push(readme);
    }
  }

  // oxfmt aligns the tables, so `pnpm fmt:check` passes.
  const [node, oxfmt] = packageBin(root, "oxfmt");
  run(node, [oxfmt, ...written, ...files], { cwd: root });
}
