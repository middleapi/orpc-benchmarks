import type { Group } from "./config.ts";
import type { HttpRequestSpec } from "./load/index.ts";
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
  /** Completed requests per second during the measurement window. */
  throughput: number;
  requests: number;
  /** Milliseconds. */
  latency: LatencySummary;
  perSecond: { min: number; max: number; stdev: number };
  /** Throughput change from the first to the second half of the window (warm-up check). */
  drift?: number;
  /** Server CPU time / wall time during the measurement window (1 = one full core). */
  serverCpu?: number;
  /** Server CPU time per completed request, in microseconds. */
  cpuPerRequest?: number;
  /** Bytes. */
  peakRss?: number;
  avgRss?: number;
  /** Share of the server CPUs' time stolen by the hypervisor during the window. */
  steal?: number;
  /** CPU used by the busiest load generator thread (1 = one full core). */
  clientCpu: number;
}

export interface ServerSummary {
  throughput: Spread;
  /** Medians across rounds, in milliseconds. */
  latency: LatencySummary;
  serverCpu?: number;
  cpuPerRequest?: number;
  peakRss?: number;
  avgRss?: number;
  steal?: number;
  clientCpu: number;
}

export interface TypecheckRound {
  round: number;
  /** Seconds, as reported by `--extendedDiagnostics`. */
  checkTime: number;
  totalTime: number;
  /** Wall-clock time of the whole `tsc` process, in seconds. */
  wallTime: number;
  diagnostics: Record<string, number>;
}

export interface TypecheckSummary {
  checkTime: Spread;
  totalTime: Spread;
  wallTime: Spread;
  /** Median of each `--extendedDiagnostics` counter. */
  diagnostics: Record<string, number>;
}

interface BenchmarkResultBase {
  name: string;
  library: string;
  versions: Record<string, string>;
}

export interface ServerBenchmarkResult extends BenchmarkResultBase {
  /** What the load generator sent (captured from the official client when available). */
  payload: { http?: HttpRequestSpec; ws?: string };
  sampleResponse: string;
  rounds: ServerRound[];
  summary: ServerSummary;
}

export interface TypecheckBenchmarkResult extends BenchmarkResultBase {
  rounds: TypecheckRound[];
  summary: TypecheckSummary;
}

export interface Settings {
  rounds: number;
  warmupSeconds: number;
  durationSeconds: number;
  connections: number;
  loadThreads: number;
  pinned: boolean;
  cpus: { server: string; client: string; typecheck: string };
}

export type GroupResult = {
  date: string;
  environment: Environment;
  settings: Settings;
} & (
  | {
      group: Pick<Group, "id" | "title" | "workload"> & { kind: "http" | "ws" };
      benchmarks: ServerBenchmarkResult[];
    }
  | {
      group: Pick<Group, "id" | "title" | "workload"> & { kind: "typecheck" };
      benchmarks: TypecheckBenchmarkResult[];
    }
);
