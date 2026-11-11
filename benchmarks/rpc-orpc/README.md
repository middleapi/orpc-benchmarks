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
| Throughput    | **24,750 req/s** (median; rounds 22,277 – 28,119, CV 7.4%)             |
| Latency       | p50 0.38 ms · p90 0.59 ms · p99 0.93 ms · p99.9 2.27 ms · mean 0.40 ms |
| Server CPU    | 39.7 µs per request (98% of one core)                                  |
| Server memory | 86 MiB peak RSS (85 MiB average under load)                            |

<details>
<summary>Per-round results, request and response</summary>

Drift: throughput change from the first to the second half of the measurement window. A server still warming up rises in nearly every round.

| Round |  Req/s |  Drift |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | -----: | -----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 23,508 |  -0.6% | 0.40 ms | 0.95 ms | 5.83 ms |        98% |   41.8 µs |   87 MiB |  1.0% |          36% |
|     2 | 23,175 |  -6.5% | 0.41 ms | 0.98 ms | 11.0 ms |        99% |   42.8 µs |   86 MiB |  0.3% |          36% |
|     3 | 23,455 |  -3.7% | 0.40 ms | 0.96 ms | 7.26 ms |        99% |   42.1 µs |   88 MiB |  0.8% |          37% |
|     4 | 22,277 | +46.5% | 0.41 ms | 1.14 ms | 6.89 ms |        98% |   44.1 µs |   85 MiB |  1.2% |          34% |
|     5 | 28,119 |  -6.7% | 0.30 ms | 0.83 ms | 12.4 ms |        98% |   34.8 µs |   84 MiB |  1.3% |          39% |
|     6 | 25,377 |  +2.6% | 0.37 ms | 0.91 ms | 7.86 ms |        98% |   38.7 µs |   86 MiB |  1.2% |          40% |
|     7 | 25,744 |  -4.7% | 0.33 ms | 0.91 ms | 7.10 ms |        98% |   38.3 µs |   87 MiB |  1.1% |          37% |
|     8 | 26,008 |  -3.4% | 0.34 ms | 0.89 ms | 11.6 ms |        98% |   37.8 µs |   85 MiB |  1.1% |          37% |
|     9 | 26,852 | +15.9% | 0.32 ms | 0.88 ms | 6.38 ms |        98% |   36.6 µs |   81 MiB |  0.8% |          42% |
|    10 | 24,123 |  -4.1% | 0.39 ms | 0.99 ms | 6.75 ms |        98% |   40.8 µs |   85 MiB |  0.8% |          37% |

Request (plus a `host` header):

```http
GET /nested/procedure_1?data=%7B%22json%22%3A%22hello+world%22%7D HTTP/1.1
user-agent: orpc-benchmarks
accept: */*
```

Response:

```
{"json":{"name":"nested/procedure_1","date":"2026-11-11T10:55:17.324Z","input":"hello world"},"meta":[["date","date"]]}
```

</details>

The whole `rpc` group, measured in the same session:

| Library                 | Version       |       Throughput | Relative     | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :---------------------- | :------------ | ---------------: | :----------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [**oRPC**](../rpc-orpc) | 2.0.0-beta.50 | **24,750 req/s** | fastest      |   22,277 – 28,119 |     0.38 ms |     0.93 ms |          39.7 µs |   86 MiB |
| [tRPC](../rpc-trpc)     | 11.28.0       |  **6,627 req/s** | 3.73× slower |     4,714 – 7,857 |     1.12 ms |     6.86 ms |         149.9 µs |  205 MiB |

<sub>Median of 10 rounds (fresh server each, order alternated) · 10 connections · 10 s warm-up + 10 s measured · server on CPU 3, load generator on CPUs 1-2.</sub>

Clinic.js Doctor profile from `pnpm bench:profile`, under the same load ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/benchmarks/rpc-orpc/.clinic/report.clinic-doctor.html)); it is a single round, so compare behaviour, not throughput:

- CPU usage: 98% on average
- Memory (RSS): 79 MiB – 95 MiB
- Event loop delay: 0.10 ms on average (max 14.2 ms)
- Detected issues: event loop utilization (performance; expected: the load keeps the server saturated)

Run on:

```
CPU: Intel(R) Xeon(R) Processor @ 2.10GHz (4 CPUs, no SMT, KVM VM)
Memory: 16086 MB
OS: Ubuntu 24.04.5 LTS (Linux 6.18.44-fc-v378 x64)
Node: v26.13.0 (V8 14.6.202.34-node.40)
pnpm: 12.18.0
```

<!-- result:end -->
