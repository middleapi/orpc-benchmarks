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

oRPC 2.0.0-beta.51 — 2026-11-17 (@orpc/server@2.0.0-beta.51, @orpc/client@2.0.0-beta.51)

| Metric        | Result                                                                 |
| :------------ | :--------------------------------------------------------------------- |
| Throughput    | **28,118 req/s** (median; rounds 25,302 – 30,397, CV 5.6%)             |
| Latency       | p50 0.31 ms · p90 0.55 ms · p99 0.86 ms · p99.9 2.34 ms · mean 0.36 ms |
| Server CPU    | 35.0 µs per request (98% of one core)                                  |
| Server memory | 88 MiB peak RSS (88 MiB average under load)                            |

<details>
<summary>Per-round results, request and response</summary>

Drift: throughput change from the first to the second half of the measurement window. A server still warming up rises in nearly every round.

| Round |  Req/s |  Drift |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | -----: | -----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 25,302 | +15.5% | 0.34 ms | 1.08 ms | 8.98 ms |        97% |   38.5 µs |   89 MiB |  1.4% |          41% |
|     2 | 26,090 |  -3.8% | 0.34 ms | 0.94 ms | 10.1 ms |        98% |   37.6 µs |   87 MiB |  0.7% |          43% |
|     3 | 27,480 |  -0.5% | 0.31 ms | 0.90 ms | 4.95 ms |        98% |   35.5 µs |   86 MiB |  1.3% |          42% |
|     4 | 25,745 |  -3.5% | 0.33 ms | 1.01 ms | 14.9 ms |        98% |   37.9 µs |   88 MiB |  1.2% |          41% |
|     5 | 28,536 |  -5.1% | 0.30 ms | 0.86 ms | 8.88 ms |        98% |   34.3 µs |   87 MiB |  1.3% |          42% |
|     6 | 28,308 |  +1.4% | 0.31 ms | 0.87 ms | 5.48 ms |        98% |   34.6 µs |   89 MiB |  0.8% |          44% |
|     7 | 28,315 |  +5.7% | 0.31 ms | 0.84 ms | 7.15 ms |        98% |   34.5 µs |   87 MiB |  1.2% |          43% |
|     8 | 28,255 |  -3.2% | 0.31 ms | 0.84 ms | 6.33 ms |        98% |   34.8 µs |   91 MiB |  0.8% |          43% |
|     9 | 30,397 |  +8.7% | 0.30 ms | 0.80 ms | 4.77 ms |        98% |   32.2 µs |   89 MiB |  1.0% |          43% |
|    10 | 27,981 |  -1.1% | 0.31 ms | 0.85 ms | 10.5 ms |        98% |   35.2 µs |   85 MiB |  0.7% |          42% |

Request (plus a `host` header):

```http
GET /nested/procedure_1?data=%7B%22json%22%3A%22hello+world%22%7D HTTP/1.1
user-agent: orpc-benchmarks
accept: */*
```

Response:

```
{"json":{"name":"nested/procedure_1","date":"2026-11-17T14:32:11.538Z","input":"hello world"},"meta":[["date","date"]]}
```

</details>

The whole `rpc` group, measured in the same session:

| Library                 | Version       |       Throughput | Relative     | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :---------------------- | :------------ | ---------------: | :----------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [**oRPC**](../rpc-orpc) | 2.0.0-beta.51 | **28,118 req/s** | fastest      |   25,302 – 30,397 |     0.31 ms |     0.86 ms |          35.0 µs |   88 MiB |
| [tRPC](../rpc-trpc)     | 11.28.3       |  **6,976 req/s** | 4.03× slower |     6,555 – 7,532 |     1.11 ms |     5.57 ms |         141.3 µs |  318 MiB |

<sub>Median of 10 rounds (fresh server each, order alternated) · 10 connections · 30 s warm-up + 10 s measured · server on CPU 3, load generator on CPUs 1-2.</sub>

Clinic.js Doctor profile from `pnpm bench:profile`, under the same load ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/benchmarks/rpc-orpc/.clinic/report.clinic-doctor.html)); it is a single round, so compare behaviour, not throughput:

- CPU usage: 98% on average
- Memory (RSS): 80 MiB – 97 MiB
- Event loop delay: 0.06 ms on average (max 13.8 ms)
- Detected issues: event loop utilization (performance; expected: the load keeps the server saturated)

Run on:

```
CPU: Intel(R) Xeon(R) Processor @ 2.10GHz (4 CPUs, no SMT, KVM VM)
Memory: 16088 MiB
OS: Ubuntu 24.04.5 LTS (Linux 6.18.44-fc-v553 x64)
Node: v26.13.1 (V8 14.6.202.34-node.40)
pnpm: 12.21.0
```

<!-- result:end -->
