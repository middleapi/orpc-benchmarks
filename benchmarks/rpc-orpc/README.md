# oRPC RPC Runtime Benchmark

- Evaluates the performance of oRPC's RPC runtime over HTTP on a project with **6 procedures** and **3 routers**, served by `RPCHandler` from `@orpc/server/node` on a plain `node:http` server.
- Inputs use a no-op [Standard Schema](https://github.com/standard-schema/standard-schema) validator rather than a schema library such as Zod, so the result reflects oRPC itself.
- Load: the `GET` request the official client (`RPCLink` with `method: "GET"`) sends for `nested.procedure_1("hello world")`, captured by [scripts/client.ts](./scripts/client.ts) at the start of each run.

## How to run

```bash
pnpm bench          # this benchmark only (printed, not saved)
pnpm bench:profile  # Clinic.js Doctor report at .clinic/report.clinic-doctor.html
```

Committed results come from `pnpm bench rpc` at the repository root, which measures the whole group in one session; see the [methodology](../../README.md#methodology).

## Latest Result

<!-- result:start -->

oRPC 2.0.0-beta.50 — 2026-11-11 (@orpc/server@2.0.0-beta.50, @orpc/client@2.0.0-beta.50)

| Metric        | Result                                                                 |
| :------------ | :--------------------------------------------------------------------- |
| Throughput    | **24,545 req/s** (median; rounds 16,480 – 26,491, CV 18%)              |
| Latency       | p50 0.36 ms · p90 0.60 ms · p99 0.92 ms · p99.9 1.72 ms · mean 0.41 ms |
| Server CPU    | 40.3 µs per request (99% of one core)                                  |
| Server memory | 87 MiB peak RSS (86 MiB average under load)                            |

<details>
<summary>Per-round results, request and response</summary>

Drift: throughput change from the first to the second half of the measurement window. A server still warming up rises in nearly every round.

| Round |  Req/s |  Drift |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | -----: | -----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 26,397 |  -3.6% | 0.34 ms | 0.89 ms | 12.9 ms |        99% |   37.3 µs |   87 MiB |  0.8% |          40% |
|     2 | 26,491 | -10.2% | 0.32 ms | 0.87 ms | 18.1 ms |        99% |   37.3 µs |   85 MiB |  0.7% |          37% |
|     3 | 18,562 | -36.1% | 0.51 ms | 1.48 ms | 18.1 ms |        98% |   52.9 µs |   83 MiB |  0.9% |          40% |
|     4 | 23,804 |  -0.4% | 0.40 ms | 0.93 ms | 5.25 ms |        99% |   41.4 µs |   87 MiB |  0.9% |          40% |
|     5 | 16,480 | -33.5% | 0.60 ms | 1.54 ms | 5.34 ms |        99% |   60.3 µs |   84 MiB |  0.5% |          39% |
|     6 | 16,877 | -43.7% | 0.52 ms | 1.67 ms | 11.5 ms |        98% |   58.4 µs |   88 MiB |  1.0% |          38% |
|     7 | 26,011 |  +1.4% | 0.32 ms | 0.89 ms | 6.23 ms |        98% |   37.8 µs |   88 MiB |  1.2% |          41% |
|     8 | 24,709 |  -7.4% | 0.36 ms | 0.92 ms | 8.97 ms |        99% |   40.0 µs |   86 MiB |  0.4% |          37% |
|     9 | 25,764 |  -3.5% | 0.33 ms | 0.91 ms | 6.09 ms |        98% |   38.2 µs |   88 MiB |  1.1% |          40% |
|    10 | 24,381 | +12.7% | 0.37 ms | 0.91 ms | 7.01 ms |        99% |   40.6 µs |   87 MiB |  0.6% |          40% |

Request (plus a `host` header):

```http
GET /nested/procedure_1?data=%7B%22json%22%3A%22hello+world%22%7D HTTP/1.1
user-agent: orpc-benchmarks
accept: */*
```

Response:

```
{"json":{"name":"nested/procedure_1","date":"2026-11-11T18:03:12.011Z","input":"hello world"},"meta":[["date","date"]]}
```

</details>

The whole `rpc` group, measured in the same session:

| Library                 | Version       |       Throughput | Relative     | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :---------------------- | :------------ | ---------------: | :----------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [**oRPC**](../rpc-orpc) | 2.0.0-beta.50 | **24,545 req/s** | fastest      |   16,480 – 26,491 |     0.36 ms |     0.92 ms |          40.3 µs |   87 MiB |
| [tRPC](../rpc-trpc)     | 11.28.0       |  **6,429 req/s** | 3.82× slower |     3,230 – 7,864 |     1.15 ms |     6.76 ms |         154.0 µs |  208 MiB |

<sub>Median of 10 rounds (fresh server each, order alternated) · 10 connections · 30 s warm-up + 10 s measured · server on CPU 3, load generator on CPUs 1-2.</sub>

Clinic.js Doctor profile from `pnpm bench:profile`, under the same load ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/benchmarks/rpc-orpc/.clinic/report.clinic-doctor.html)); it is a single round, so compare behaviour, not throughput:

- CPU usage: 99% on average
- Memory (RSS): 71 MiB – 99 MiB
- Event loop delay: 0.09 ms on average (max 11.6 ms)
- Detected issues: event loop utilization (performance; expected: the load keeps the server saturated)

Run on:

```
CPU: Intel(R) Xeon(R) Processor @ 2.10GHz (4 CPUs, no SMT, KVM VM)
Memory: 16086 MiB
OS: Ubuntu 24.04.5 LTS (Linux 6.18.44-fc-v378 x64)
Node: v26.13.0 (V8 14.6.202.34-node.40)
pnpm: 12.18.0
```

<!-- result:end -->
