export interface HttpRequestSpec {
  method: string;
  /** Path and query string. */
  path: string;
  headers: Record<string, string>;
  body?: string;
}

/** Each request is `prefix + id + suffix`, with an id that increments per connection. */
export interface WsMessageTemplate {
  prefix: string;
  suffix: string;
}

export const frame = (message: WsMessageTemplate, id: number) =>
  `${message.prefix}${id}${message.suffix}`;

export type LoadTarget =
  | { kind: "http"; request: HttpRequestSpec }
  | { kind: "ws"; message: WsMessageTemplate };

/** How long the requests in flight may take to finish once the measurement ends. */
export const DRAIN_TIMEOUT_MS = 2000;

export interface WorkerConfig {
  target: LoadTarget;
  port: number;
  connections: number;
  /** Substrings every response must contain. */
  expect: string[];
}

export type WorkerMessage =
  | { type: "failed"; reason: string }
  | {
      type: "result";
      /** Milliseconds, one per request completed in the measurement window. */
      latencies: number[];
      /** Requests completed in each second of the window. */
      perSecond: number[];
      elapsedMs: number;
      /** Thread CPU time / wall time (1 = one core). */
      cpuUtilization: number;
      /** First valid response body. */
      sample: string;
    };
