/** How long connections may take to finish their last request once the measurement ends. */
export const DRAIN_TIMEOUT_MS = 2000;

export interface HttpRequestSpec {
  method: string;
  /** Path including the query string. */
  path: string;
  headers: Record<string, string>;
  body?: string;
}

export interface WsMessageTemplate {
  /** Each request is sent as `prefix + id + suffix`, with a per-connection incrementing id. */
  prefix: string;
  suffix: string;
}

export type LoadTarget =
  | { kind: "http"; host: string; port: number; request: HttpRequestSpec }
  | { kind: "ws"; url: string; message: WsMessageTemplate };

export interface WorkerConfig {
  target: LoadTarget;
  connections: number;
  /** Substrings every response must contain; anything else is counted as invalid. */
  expect: string[];
}

export interface WorkerReport {
  type: "result";
  completed: number;
  elapsedMs: number;
  /** Latency of every request completed during the measurement window, in microseconds. */
  latencies: Float64Array;
  /** Completed requests in each second of the measurement window. */
  perSecond: number[];
  invalid: number;
  errors: number;
  /** Requests that never got a response (each one stalls its connection for the rest of the run). */
  unanswered: number;
  firstFailure?: string;
  /** CPU time of the worker thread divided by wall time (1 = one full core). */
  cpuUtilization: number;
}
