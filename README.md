# oRPC Benchmarks

This repository compares the performance of [oRPC](https://orpc.unnoq.com) with similar libraries. For detailed results, please refer to the **README** file in each benchmark directory.

Benchmarks are organized into groups. Benchmarks in the same group share the same workload and are directly comparable to each other; benchmarks in different groups are not.

| Group       | Benchmarks                                                                                   | What it measures                                              |
| ----------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `rpc`       | [rpc-orpc](./benchmarks/rpc-orpc), [rpc-trpc](./benchmarks/rpc-trpc)                         | RPC runtime throughput over HTTP                              |
| `ws`        | [ws-orpc](./benchmarks/ws-orpc), [ws-trpc](./benchmarks/ws-trpc)                             | RPC runtime throughput over WebSocket                         |
| `openapi`   | [openapi-orpc](./benchmarks/openapi-orpc), [openapi-hono](./benchmarks/openapi-hono)         | OpenAPI (RESTful) runtime throughput over HTTP                |
| `typecheck` | [typecheck-orpc](./benchmarks/typecheck-orpc), [typecheck-trpc](./benchmarks/typecheck-trpc) | TypeScript type-checking time on a large, fully typed project |

Runtime benchmarks profile the server with [0x](https://github.com/davidmarkclements/0x); each run overwrites the committed flamegraph at `<benchmark>/public/flamegraph.html`.
