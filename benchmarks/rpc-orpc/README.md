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
| Throughput    | **22,863 req/s** (median; rounds 21,733 – 25,864, CV 6.2%)             |
| Latency       | p50 0.40 ms · p90 0.67 ms · p99 0.94 ms · p99.9 1.93 ms · mean 0.44 ms |
| Server CPU    | 43.2 µs per request (99% of one core)                                  |
| Server memory | 86 MiB peak RSS (86 MiB average under load)                            |

<details>
<summary>Per-round results, request and response</summary>

Drift: throughput change from the first to the second half of the measurement window. A server still warming up rises in nearly every round.

| Round |  Req/s |  Drift |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | -----: | -----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 22,744 |  +0.5% | 0.41 ms | 0.93 ms | 4.18 ms |        99% |   43.6 µs |   87 MiB |  0.4% |          38% |
|     2 | 21,733 | +11.7% | 0.43 ms | 0.95 ms | 5.08 ms |        99% |   45.5 µs |   86 MiB |  0.6% |          36% |
|     3 | 22,391 |  +4.3% | 0.41 ms | 0.94 ms | 6.57 ms |        99% |   44.1 µs |   86 MiB |  0.6% |          36% |
|     4 | 25,098 | +29.7% | 0.39 ms | 0.85 ms | 4.81 ms |        99% |   39.6 µs |   88 MiB |  0.3% |          39% |
|     5 | 21,944 | +11.7% | 0.42 ms | 0.95 ms | 6.91 ms |        99% |   45.1 µs |   86 MiB |  0.4% |          36% |
|     6 | 24,342 | +14.3% | 0.38 ms | 1.00 ms | 8.91 ms |        99% |   40.7 µs |   84 MiB |  0.4% |          37% |
|     7 | 25,864 |  +1.2% | 0.34 ms | 0.94 ms | 5.18 ms |        99% |   38.1 µs |   84 MiB |  0.6% |          40% |
|     8 | 22,983 |  -1.6% | 0.40 ms | 0.93 ms | 12.9 ms |        98% |   42.8 µs |   85 MiB |  0.7% |          36% |
|     9 | 21,902 | +10.2% | 0.41 ms | 1.02 ms | 8.68 ms |        98% |   44.8 µs |   86 MiB |  0.6% |          37% |
|    10 | 23,946 | +14.1% | 0.40 ms | 0.91 ms | 5.00 ms |        99% |   41.3 µs |   81 MiB |  0.6% |          38% |

Request (plus a `host` header):

```http
GET /nested/procedure_1?data=%7B%22json%22%3A%22hello+world%22%7D HTTP/1.1
user-agent: orpc-benchmarks
accept: */*
```

Response:

```
{"json":{"name":"nested/procedure_1","date":"2026-11-11T15:10:27.885Z","input":"hello world"},"meta":[["date","date"]]}
```

</details>

The whole `rpc` group, measured in the same session:

| Library                 | Version       |       Throughput | Relative     | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :---------------------- | :------------ | ---------------: | :----------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [**oRPC**](../rpc-orpc) | 2.0.0-beta.50 | **22,863 req/s** | fastest      |   21,733 – 25,864 |     0.40 ms |     0.94 ms |          43.2 µs |   86 MiB |
| [tRPC](../rpc-trpc)     | 11.28.0       |  **5,171 req/s** | 4.42× slower |     4,073 – 6,901 |     1.68 ms |     6.04 ms |         192.6 µs |  196 MiB |

<sub>Median of 10 rounds (fresh server each, order alternated) · 10 connections · 10 s warm-up + 10 s measured · server on CPU 3, load generator on CPUs 1-2.</sub>

> [!WARNING]
>
> - rpc-orpc: throughput still rising in 9 of 10 rounds (median drift +10.9%) — try a longer --warmup

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
