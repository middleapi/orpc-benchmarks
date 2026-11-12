import type { LoadTarget } from "./load/types.ts";
import type { LatencySummary } from "./stats.ts";
import type { Environment } from "./system.ts";

export interface Spread {
  median: number;
  min: number;
  max: number;
  /** Coefficient of variation (sample stdev / mean). */
  cv: number;
}

export interface ServerRound {
  round: number;
  /** Requests per second during the measurement window. */
  throughput: number;
  requests: number;
  latency: LatencySummary;
  /** Throughput change from the first to the second half of the window. */
  drift?: number;
  /** Server CPU time / wall time (1 = one core). */
  serverCpu?: number;
  /** Server CPU time per request, in microseconds. */
  cpuPerRequest?: number;
  /** Bytes. */
  peakRss?: number;
  avgRss?: number;
  /** Share of the server CPUs' time taken by the hypervisor. */
  steal?: number;
  /** CPU used by the busiest load generator thread (1 = one core). */
  clientCpu: number;
}

export interface ServerSummary {
  throughput: Spread;
  /** Medians across rounds. */
  latency: LatencySummary;
  serverCpu?: number;
  cpuPerRequest?: number;
  peakRss?: number;
  avgRss?: number;
  /** Maximum across rounds. */
  steal: number;
  /** Maximum across rounds. */
  clientCpu: number;
}

export interface TypecheckRound {
  round: number;
  /** Seconds, from `--extendedDiagnostics`. */
  checkTime: number;
  totalTime: number;
  /** Wall time of the whole `tsc` process, in seconds. */
  wallTime: number;
  diagnostics: Record<string, number>;
}

export interface TypecheckSummary {
  checkTime: Spread;
  totalTime: Spread;
  wallTime: Spread;
  /** Median of each `--extendedDiagnostics` value. */
  diagnostics: Record<string, number>;
}

export interface BenchmarkResult {
  name: string;
  library: string;
  versions: Record<string, string>;
}

export interface ServerBenchmarkResult extends BenchmarkResult {
  /** What the load generator sent. */
  target: LoadTarget;
  sampleResponse: string;
  rounds: ServerRound[];
  summary: ServerSummary;
}

export interface TypecheckBenchmarkResult extends BenchmarkResult {
  rounds: TypecheckRound[];
  summary: TypecheckSummary;
}

/** CPU lists, absent when nothing was pinned. `idle`: SMT siblings of the server, left unused. */
interface ServerCpus {
  server: string;
  idle?: string;
}

export interface ServerSettings {
  rounds: number;
  warmupSeconds: number;
  durationSeconds: number;
  connections: number;
  loadThreads: number;
  cpus?: ServerCpus & { client: string };
}

export interface TypecheckSettings {
  rounds: number;
  tscArgs: string[];
  /** `tsc` runs on the server's CPU. */
  cpus?: ServerCpus;
}

type GroupInfo<Kind> = { id: string; title: string; workload: string; kind: Kind };

export type GroupResult = {
  date: string;
  environment: Environment;
  /** Problems the runner detected (CPU layout, saturation, warm-up, noise). */
  warnings: string[];
} & (
  | {
      group: GroupInfo<"http" | "ws">;
      settings: ServerSettings;
      benchmarks: ServerBenchmarkResult[];
    }
  | {
      group: GroupInfo<"typecheck">;
      settings: TypecheckSettings;
      benchmarks: TypecheckBenchmarkResult[];
    }
);

type TypecheckGroupResult = Extract<GroupResult, { settings: TypecheckSettings }>;

export const isTypecheck = (result: GroupResult): result is TypecheckGroupResult =>
  result.group.kind === "typecheck";
