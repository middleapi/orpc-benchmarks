# tRPC RPC Runtime Benchmark

- Evaluates the performance of tRPC's RPC runtime over HTTP on a project with **6 procedures** and **3 routers**, served by tRPC's standalone adapter (`createHTTPServer`) with the SuperJSON transformer.
- Inputs use a no-op [Standard Schema](https://github.com/standard-schema/standard-schema) validator rather than a schema library such as Zod, so the result reflects tRPC itself.
- Load: the `GET` request the official client (`httpLink`) sends for `nested.procedure_1.query("hello world")`, captured by [scripts/client.ts](./scripts/client.ts) at the start of each run.

## How to run

```bash
pnpm bench          # this benchmark only (printed, not saved)
pnpm bench:profile  # Clinic.js Doctor report at .clinic/report.clinic-doctor.html
```

Committed results come from `pnpm bench rpc` at the repository root, which measures the whole group in one session; see the [methodology](../../README.md#methodology).

## Latest Result

<!-- result:start -->

tRPC 11.28.0 — 2026-11-11 (@trpc/server@11.28.0, @trpc/client@11.28.0, superjson@2.2.6)

| Metric        | Result                                                                 |
| :------------ | :--------------------------------------------------------------------- |
| Throughput    | **6,153 req/s** (median; rounds 5,436 – 7,545, CV 12%)                 |
| Latency       | p50 1.29 ms · p90 2.32 ms · p99 7.45 ms · p99.9 11.7 ms · mean 1.63 ms |
| Server CPU    | 160.9 µs per request (99% of one core)                                 |
| Server memory | 205 MiB peak RSS (188 MiB average under load)                          |

<details>
<summary>Per-round results, request and response</summary>

Drift: throughput change from the first to the second half of the measurement window. A server still warming up rises in nearly every round.

| Round | Req/s |  Drift |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | ----: | -----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 5,656 | +30.8% | 1.44 ms | 10.1 ms | 28.6 ms |        99% |  175.0 µs |  216 MiB |  0.7% |          11% |
|     2 | 5,521 |  -7.2% | 1.52 ms | 10.3 ms | 24.1 ms |        99% |  179.7 µs |  216 MiB |  0.9% |          12% |
|     3 | 6,233 |  +5.5% | 1.53 ms | 5.18 ms | 32.0 ms |        99% |  159.1 µs |  197 MiB |  0.7% |          13% |
|     4 | 6,972 |  +8.9% | 1.11 ms | 4.77 ms | 15.0 ms |        99% |  142.0 µs |  188 MiB |  0.9% |          13% |
|     5 | 6,638 |  +9.7% | 1.26 ms | 5.14 ms | 14.1 ms |        99% |  149.3 µs |  196 MiB |  0.9% |          14% |
|     6 | 5,436 |  -2.9% | 1.39 ms | 10.3 ms | 28.0 ms |        99% |  182.1 µs |  217 MiB |  0.9% |          12% |
|     7 | 7,545 |  +5.4% | 1.09 ms | 4.20 ms | 11.9 ms |        99% |  131.3 µs |  195 MiB |  0.8% |          16% |
|     8 | 7,289 | +12.8% | 1.12 ms | 4.68 ms | 10.6 ms |        99% |  136.1 µs |  193 MiB |  0.7% |          14% |
|     9 | 5,806 |  -2.0% | 1.32 ms | 9.92 ms | 38.4 ms |        99% |  170.2 µs |  214 MiB |  1.1% |          12% |
|    10 | 6,072 | -18.3% | 1.16 ms | 9.71 ms | 25.4 ms |        99% |  162.7 µs |  213 MiB |  0.9% |          12% |

Request (plus a `host` header):

```http
GET /nested.procedure_1?input=%7B%22json%22%3A%22hello%20world%22%7D HTTP/1.1
user-agent: orpc-benchmarks
accept: */*
```

Response:

```
{"result":{"data":{"json":{"name":"nested/procedure_1","date":"2026-11-11T16:02:59.147Z","input":"hello world"},"meta":{"values":{"date":["Date"]},"v":1}}}}
```

</details>

The whole `rpc` group, measured in the same session:

| Library                 | Version       |       Throughput | Relative     | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :---------------------- | :------------ | ---------------: | :----------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [oRPC](../rpc-orpc)     | 2.0.0-beta.50 | **25,745 req/s** | fastest      |   23,942 – 28,298 |     0.35 ms |     0.90 ms |          38.4 µs |   87 MiB |
| [**tRPC**](../rpc-trpc) | 11.28.0       |  **6,153 req/s** | 4.18× slower |     5,436 – 7,545 |     1.29 ms |     7.45 ms |         160.9 µs |  205 MiB |

<sub>Median of 10 rounds (fresh server each, order alternated) · 10 connections · 10 s warm-up + 10 s measured · server on CPU 3, load generator on CPUs 1-2.</sub>

Clinic.js Doctor profile from `pnpm bench:profile`, under the same load ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/benchmarks/rpc-trpc/.clinic/report.clinic-doctor.html)); it is a single round, so compare behaviour, not throughput:

- CPU usage: 100% on average
- Memory (RSS): 70 MiB – 211 MiB
- Event loop delay: 1.27 ms on average (max 26.2 ms)
- Detected issues: memory heapUsed (performance), event loop utilization (performance; expected: the load keeps the server saturated)

Run on:

```
CPU: Intel(R) Xeon(R) Processor @ 2.10GHz (4 CPUs, no SMT, KVM VM)
Memory: 16086 MiB
OS: Ubuntu 24.04.5 LTS (Linux 6.18.44-fc-v378 x64)
Node: v26.13.0 (V8 14.6.202.34-node.40)
pnpm: 12.18.0
```

<!-- result:end -->
