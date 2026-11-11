import type { HttpRequestSpec } from "./load/index.ts";

export interface ServerBenchmark {
  /** Folder name under `benchmarks/`. */
  name: string;
  library: string;
  /** Packages whose installed versions are reported. */
  packages: string[];
  /**
   * Script (relative to the benchmark folder) that calls the server through the library's
   * official client and prints the wire payload; the load generator replays that payload.
   */
  client?: string;
  /** Fixed request for benchmarks without an official-client script. */
  request?: Omit<HttpRequestSpec, "headers">;
  /** Substrings every single response must contain. */
  expect: string[];
}

export interface TypecheckBenchmark {
  name: string;
  library: string;
  packages: string[];
}

interface GroupBase {
  id: string;
  title: string;
  /** One-line description of the workload, used in the README tables. */
  workload: string;
  /** Rounds per benchmark (default 10). `--rounds` overrides it. */
  rounds?: number;
  /** Warm-up before each measurement, in seconds (default 10). `--warmup` overrides it. */
  warmupSeconds?: number;
}

export type Group =
  | (GroupBase & { kind: "http" | "ws"; benchmarks: ServerBenchmark[] })
  | (GroupBase & { kind: "typecheck"; benchmarks: TypecheckBenchmark[] });

/** Every response of `nested.procedure_1("hello world")` must contain these. */
const RPC_RESULT = ['"name":"nested/procedure_1"', '"input":"hello world"'];

export const groups: Group[] = [
  {
    id: "rpc",
    kind: "http",
    title: "RPC over HTTP",
    workload:
      '`GET nested.procedure_1("hello world")` exactly as the official client sends it; the response carries a `Date`, so the RPC serializer runs on every request',
    benchmarks: [
      {
        name: "rpc-orpc",
        library: "oRPC",
        packages: ["@orpc/server", "@orpc/client"],
        client: "scripts/client.ts",
        expect: RPC_RESULT,
      },
      {
        name: "rpc-trpc",
        library: "tRPC",
        packages: ["@trpc/server", "@trpc/client"],
        client: "scripts/client.ts",
        expect: RPC_RESULT,
      },
    ],
  },
  {
    id: "ws",
    kind: "ws",
    title: "RPC over WebSocket",
    // With a 10 s warm-up, the runner's drift check still found tRPC's WebSocket server a few
    // percent faster in the second half of the measurement window (+4.8% median); 30 s removes it.
    warmupSeconds: 30,
    workload:
      '`nested.procedure_1("hello world")` frames exactly as the official client sends them, one in flight per connection',
    benchmarks: [
      {
        name: "ws-orpc",
        library: "oRPC",
        packages: ["@orpc/server", "@orpc/client"],
        client: "scripts/client.ts",
        expect: RPC_RESULT,
      },
      {
        name: "ws-trpc",
        library: "tRPC",
        packages: ["@trpc/server", "@trpc/client"],
        client: "scripts/client.ts",
        expect: RPC_RESULT,
      },
    ],
  },
  {
    id: "openapi",
    kind: "http",
    title: "OpenAPI (REST) over HTTP",
    workload: "`GET /nested/procedure_1?who=hello%20world`; the JSON response carries a `Date`",
    benchmarks: [
      {
        name: "openapi-orpc",
        library: "oRPC",
        packages: ["@orpc/server", "@orpc/openapi"],
        request: { method: "GET", path: "/nested/procedure_1?who=hello%20world" },
        expect: ['"name":"nested/procedure_1"', '"input":{"who":"hello world"}'],
      },
      {
        name: "openapi-hono",
        library: "Hono",
        packages: ["hono", "@hono/node-server"],
        request: { method: "GET", path: "/nested/procedure_1?who=hello%20world" },
        expect: ['"name":"nested/procedure_1"', '"input":{"who":"hello world"}'],
      },
    ],
  },
  {
    id: "typecheck",
    kind: "typecheck",
    title: "Type-checking",
    // A round takes a few seconds, but its time varies more from run to run than the servers'
    // throughput (about 10% vs 3%, CPU time included), so more rounds keep the median stable.
    rounds: 30,
    workload:
      "`tsc --noEmit` on 500 routers / 3,000 procedures plus a typed client call for each, every input declared with the same Standard Schema interface",
    benchmarks: [
      { name: "typecheck-orpc", library: "oRPC", packages: ["@orpc/server", "@orpc/client"] },
      { name: "typecheck-trpc", library: "tRPC", packages: ["@trpc/server", "@trpc/client"] },
    ],
  },
];

/** Headers sent with every HTTP request (plus `Host`, and any the official client set). */
export const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent": "orpc-benchmarks",
  Accept: "*/*",
};
