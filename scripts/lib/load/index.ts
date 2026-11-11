import { setTimeout as sleep } from "node:timers/promises";
import { Worker } from "node:worker_threads";
import { type LatencySummary, sum, summarizeLatencies } from "../stats.ts";
import { DRAIN_TIMEOUT_MS, type LoadTarget, type WorkerMessage } from "./types.ts";

export { frame, type HttpRequestSpec, type LoadTarget, type WsMessageTemplate } from "./types.ts";

export interface LoadOptions {
  target: LoadTarget;
  port: number;
  expect: string[];
  connections: number;
  /** Load generator threads; the connections are split between them. */
  threads: number;
  warmupMs: number;
  durationMs: number;
  onMeasureStart?: () => void;
  onMeasureEnd?: () => void;
}

export interface LoadResult {
  requests: number;
  /** Requests per second during the measurement window. */
  throughput: number;
  latency: LatencySummary;
  /** Requests completed in each second of the window. */
  perSecond: number[];
  /** CPU used by the busiest load generator thread (1 = one core). */
  clientCpu: number;
  /** First valid response body. */
  sample: string;
}

type Report = Extract<WorkerMessage, { type: "result" }>;

const WORKER_URL = new URL("./worker.ts", import.meta.url);

/** Runs the closed-loop load; rejects as soon as any response is invalid or a request is lost. */
export async function runLoad(options: LoadOptions): Promise<LoadResult> {
  const threads = Math.max(1, Math.min(options.threads, options.connections));
  const workers = Array.from(
    { length: threads },
    (_, i) =>
      new Worker(WORKER_URL, {
        workerData: {
          target: options.target,
          port: options.port,
          expect: options.expect,
          connections:
            Math.floor(options.connections / threads) + (i < options.connections % threads ? 1 : 0),
        },
      }),
  );

  const aborted = new Promise<never>((_, reject) => {
    for (const worker of workers) {
      worker.on("message", (message: WorkerMessage) => {
        if (message.type === "failed") reject(new Error(`Load run failed: ${message.reason}`));
      });
      worker.on("error", reject);
      worker.on("exit", (code) => reject(new Error(`Load generator exited early (${code})`)));
    }
  });
  aborted.catch(() => {}); // observed through `within`
  const within = <T>(promise: Promise<T>) => Promise.race([aborted, promise]);
  const reports = Promise.all(
    workers.map(
      (worker) =>
        new Promise<Report>((resolve) =>
          worker.on("message", (message: WorkerMessage) => {
            if (message.type === "result") resolve(message);
          }),
        ),
    ),
  );

  try {
    await within(sleep(options.warmupMs));
    for (const worker of workers) worker.postMessage("measure");
    options.onMeasureStart?.();

    await within(sleep(options.durationMs));
    for (const worker of workers) worker.postMessage("stop");
    options.onMeasureEnd?.();

    const timeout = sleep(DRAIN_TIMEOUT_MS + 10_000, undefined, { ref: false }).then(() => {
      throw new Error("A load generator thread did not report after the measurement");
    });
    const results = await within(Promise.race([reports, timeout]));

    const latencies = results.flatMap((result) => result.latencies);
    const seconds = Math.min(...results.map((result) => result.perSecond.length));
    return {
      requests: latencies.length,
      throughput: sum(results.map((result) => result.latencies.length / (result.elapsedMs / 1000))),
      latency: summarizeLatencies(latencies),
      perSecond: Array.from({ length: seconds }, (_, i) =>
        sum(results.map((result) => result.perSecond[i]!)),
      ),
      clientCpu: Math.max(...results.map((result) => result.cpuUtilization)),
      sample: results[0]!.sample,
    };
  } finally {
    await Promise.all(workers.map((worker) => worker.terminate()));
  }
}
