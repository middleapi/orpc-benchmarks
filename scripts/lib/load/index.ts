import { setTimeout as sleep } from "node:timers/promises";
import { Worker } from "node:worker_threads";
import { type LatencySummary, mean, stdev, summarizeLatencies, sum } from "../stats.ts";
import type { LoadTarget, WorkerReport } from "./types.ts";

export type { HttpRequestSpec, LoadTarget, WsMessageTemplate } from "./types.ts";

export interface LoadOptions {
  target: LoadTarget;
  expect: string[];
  connections: number;
  /** Number of load generator threads; connections are split evenly between them. */
  workers: number;
  warmupMs: number;
  durationMs: number;
  /** Called right when the measurement window opens / closes (e.g. to sample the server). */
  onMeasureStart?: () => void;
  onMeasureEnd?: () => void;
}

export interface LoadResult {
  requests: number;
  elapsedMs: number;
  /** Completed requests per second during the measurement window. */
  throughput: number;
  latency: LatencySummary;
  /** Throughput of each one-second slice of the measurement window. */
  perSecond: { min: number; max: number; stdev: number; series: number[] };
  /** CPU used by the busiest load generator thread (1 = one full core). */
  clientCpu: number;
}

const WORKER_URL = new URL("./worker.ts", import.meta.url);

export async function runLoad(options: LoadOptions): Promise<LoadResult> {
  const threads = Math.max(1, Math.min(options.workers, options.connections));
  const workers: Worker[] = [];
  const results: Promise<WorkerReport>[] = [];
  const ready: Promise<void>[] = [];

  for (let i = 0; i < threads; i++) {
    const connections =
      Math.floor(options.connections / threads) + (i < options.connections % threads ? 1 : 0);
    const worker = new Worker(WORKER_URL, {
      workerData: { target: options.target, connections, expect: options.expect },
    });
    workers.push(worker);

    const exited = new Promise<never>((_, reject) => {
      worker.once("error", reject);
      worker.once("exit", (code) => reject(new Error(`Load generator exited early (${code})`)));
    });
    // Rejections are observed through `ready`/`results`; avoid unhandled-rejection noise.
    exited.catch(() => {});

    ready.push(
      Promise.race([
        exited,
        new Promise<void>((resolve) => {
          worker.on("message", (message: { type: string }) => {
            if (message.type === "ready") resolve();
          });
        }),
      ]),
    );

    const result = Promise.race([
      exited,
      new Promise<WorkerReport>((resolve) => {
        worker.on("message", (message: WorkerReport) => {
          if (message.type === "result") resolve(message);
        });
      }),
    ]);
    result.catch(() => {});
    results.push(result);
  }

  let readyTimer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      Promise.all(ready),
      new Promise<never>((_, reject) => {
        readyTimer = setTimeout(
          () =>
            reject(
              new Error("Load generator could not complete a first request on every connection"),
            ),
          15_000,
        );
      }),
    ]);
    clearTimeout(readyTimer);

    await sleep(options.warmupMs);
    for (const worker of workers) worker.postMessage("measure");
    options.onMeasureStart?.();

    await sleep(options.durationMs);
    for (const worker of workers) worker.postMessage("stop");
    options.onMeasureEnd?.();

    const reports = await Promise.all(results);
    const failure = reports.find((report) => report.invalid > 0 || report.errors > 0);
    if (failure) {
      throw new Error(
        `Load run is invalid (${sum(reports.map((r) => r.invalid))} invalid responses, ` +
          `${sum(reports.map((r) => r.errors))} connection errors): ${failure.firstFailure}`,
      );
    }

    const latencies = new Float64Array(sum(reports.map((report) => report.latencies.length)));
    let offset = 0;
    for (const report of reports) {
      latencies.set(report.latencies, offset);
      offset += report.latencies.length;
    }

    const seconds = Math.min(...reports.map((report) => report.perSecond.length));
    const perSecond = Array.from({ length: seconds }, (_, index) =>
      sum(reports.map((report) => report.perSecond[index] ?? 0)),
    );

    return {
      requests: sum(reports.map((report) => report.completed)),
      elapsedMs: mean(reports.map((report) => report.elapsedMs)),
      throughput: sum(reports.map((report) => report.completed / (report.elapsedMs / 1000))),
      latency: summarizeLatencies(latencies),
      perSecond: {
        min: Math.min(...perSecond),
        max: Math.max(...perSecond),
        stdev: stdev(perSecond),
        series: perSecond,
      },
      clientCpu: Math.max(...reports.map((report) => report.cpuUtilization)),
    };
  } finally {
    clearTimeout(readyTimer);
    await Promise.all(workers.map((worker) => worker.terminate()));
  }
}
