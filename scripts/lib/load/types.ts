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

/** How long the connections may take to answer their last request and close once the measurement ends. */
export const DRAIN_TIMEOUT_MS = 2000;

export interface WorkerConfig {
  target: LoadTarget;
  port: number;
  connections: number;
  expect: string[];
}

export type WorkerMessage =
  | { type: "failed"; reason: string }
  | {
      type: "result";
      /** Milliseconds, one per request completed in the measurement window. */
      latencies: number[];
      perSecond: number[];
      elapsedMs: number;
      /** Thread CPU time / wall time (1 = one core). */
      cpuUtilization: number;
      sample: string;
    };
