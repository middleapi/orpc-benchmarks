import type { HttpRequestSpec } from "./load/types.ts";

export interface ServerBenchmark {
  /** Folder under `benchmarks/`. */
  name: string;
  library: string;
  /** Packages whose versions are reported. */
  packages: string[];
  /** Official-client script (in the benchmark folder) whose wire payload is replayed. */
  client?: string;
  /** Fixed request, for benchmarks without a client script. */
  request?: Omit<HttpRequestSpec, "headers">;
  /** Substrings every response must contain. */
  expect: string[];
}

export interface TypecheckBenchmark {
  name: string;
  library: string;
  packages: string[];
}

interface GroupInfo {
  id: string;
  title: string;
  /** One-line workload description for the README tables. */
  workload: string;
  rounds: number;
}

export type Group =
  | (GroupInfo & { kind: "http" | "ws"; warmupSeconds: number; benchmarks: ServerBenchmark[] })
  | (GroupInfo & { kind: "typecheck"; benchmarks: TypecheckBenchmark[] });

const RPC_RESULT = ['"name":"nested/procedure_1"', '"input":"hello world"'];

const OPENAPI = {
  request: { method: "GET", path: "/nested/procedure_1?who=hello%20world" },
  expect: ['"name":"nested/procedure_1"', '"input":{"who":"hello world"}'],
};

export const groups: Group[] = [
  {
    id: "rpc",
    kind: "http",
    title: "RPC over HTTP",
    workload:
      '`GET nested.procedure_1("hello world")` exactly as the official client sends it; the response carries a `Date`, so the RPC serializer runs on every request',
    rounds: 10,
    warmupSeconds: 10,
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
    workload:
      '`nested.procedure_1("hello world")` frames exactly as the official client sends them, one in flight per connection',
    rounds: 10,
    warmupSeconds: 30, // tRPC's WebSocket server still speeds up after 10 s
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
    rounds: 10,
    warmupSeconds: 10,
    benchmarks: [
      {
        name: "openapi-orpc",
        library: "oRPC",
        packages: ["@orpc/server", "@orpc/openapi"],
        ...OPENAPI,
      },
      {
        name: "openapi-hono",
        library: "Hono",
        packages: ["hono", "@hono/node-server"],
        ...OPENAPI,
      },
    ],
  },
  {
    id: "typecheck",
    kind: "typecheck",
    title: "Type-checking",
    workload:
      "500 routers / 3,000 procedures plus a typed client call for each; every input uses the same Standard Schema interface",
    rounds: 30, // rounds are short and vary by about 10%
    benchmarks: [
      {
        name: "typecheck-orpc",
        library: "oRPC",
        packages: ["@orpc/server", "@orpc/client", "typescript"],
      },
      {
        name: "typecheck-trpc",
        library: "tRPC",
        packages: ["@trpc/server", "@trpc/client", "typescript"],
      },
    ],
  },
];

/** Sent with every HTTP request, besides `host` and the official client's own headers. */
export const DEFAULT_HEADERS = { "user-agent": "orpc-benchmarks", accept: "*/*" };
