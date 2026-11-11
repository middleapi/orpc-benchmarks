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
| Throughput    | **25,745 req/s** (median; rounds 23,942 – 28,298, CV 6.0%)             |
| Latency       | p50 0.35 ms · p90 0.57 ms · p99 0.90 ms · p99.9 1.99 ms · mean 0.39 ms |
| Server CPU    | 38.4 µs per request (98% of one core)                                  |
| Server memory | 87 MiB peak RSS (86 MiB average under load)                            |

<details>
<summary>Per-round results, request and response</summary>

Drift: throughput change from the first to the second half of the measurement window. A server still warming up rises in nearly every round.

| Round |  Req/s |  Drift |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | -----: | -----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 24,365 |  +8.6% | 0.39 ms | 0.97 ms | 7.31 ms |        98% |   40.3 µs |   87 MiB |  1.0% |          38% |
|     2 | 23,942 | +13.3% | 0.40 ms | 0.96 ms | 8.15 ms |        98% |   41.1 µs |   87 MiB |  0.6% |          38% |
|     3 | 24,159 | +11.1% | 0.39 ms | 0.94 ms | 7.75 ms |        98% |   40.5 µs |   86 MiB |  1.3% |          36% |
|     4 | 27,409 |  -1.2% | 0.30 ms | 0.88 ms | 11.6 ms |        98% |   35.7 µs |   87 MiB |  1.6% |          40% |
|     5 | 25,157 |  -1.6% | 0.36 ms | 0.92 ms | 5.06 ms |        99% |   39.4 µs |   86 MiB |  0.5% |          38% |
|     6 | 25,335 |  -0.8% | 0.37 ms | 0.90 ms | 5.01 ms |        99% |   39.1 µs |   87 MiB |  0.5% |          37% |
|     7 | 27,659 | +19.5% | 0.30 ms | 0.86 ms | 5.30 ms |        99% |   35.8 µs |   87 MiB |  0.4% |          39% |
|     8 | 28,298 |  +2.9% | 0.30 ms | 0.85 ms | 6.35 ms |        98% |   34.8 µs |   86 MiB |  0.8% |          40% |
|     9 | 26,154 |  +5.3% | 0.33 ms | 0.88 ms | 8.27 ms |        99% |   37.7 µs |   89 MiB |  0.7% |          38% |
|    10 | 26,250 |  -5.7% | 0.32 ms | 0.91 ms | 5.30 ms |        98% |   37.3 µs |   86 MiB |  1.3% |          40% |

Request (plus a `host` header):

```http
GET /nested/procedure_1?data=%7B%22json%22%3A%22hello+world%22%7D HTTP/1.1
user-agent: orpc-benchmarks
accept: */*
```

Response:

```
{"json":{"name":"nested/procedure_1","date":"2026-11-11T16:02:38.907Z","input":"hello world"},"meta":[["date","date"]]}
```

</details>

The whole `rpc` group, measured in the same session:

| Library                 | Version       |       Throughput | Relative     | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :---------------------- | :------------ | ---------------: | :----------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [**oRPC**](../rpc-orpc) | 2.0.0-beta.50 | **25,745 req/s** | fastest      |   23,942 – 28,298 |     0.35 ms |     0.90 ms |          38.4 µs |   87 MiB |
| [tRPC](../rpc-trpc)     | 11.28.0       |  **6,153 req/s** | 4.18× slower |     5,436 – 7,545 |     1.29 ms |     7.45 ms |         160.9 µs |  205 MiB |

<sub>Median of 10 rounds (fresh server each, order alternated) · 10 connections · 10 s warm-up + 10 s measured · server on CPU 3, load generator on CPUs 1-2.</sub>

Clinic.js Doctor profile from `pnpm bench:profile`, under the same load ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/benchmarks/rpc-orpc/.clinic/report.clinic-doctor.html)); it is a single round, so compare behaviour, not throughput:

- CPU usage: 99% on average
- Memory (RSS): 72 MiB – 89 MiB
- Event loop delay: 0.10 ms on average (max 18.0 ms)
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
