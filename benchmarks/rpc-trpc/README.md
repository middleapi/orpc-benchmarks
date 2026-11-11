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
| Throughput    | **6,429 req/s** (median; rounds 3,230 – 7,864, CV 21%)                 |
| Latency       | p50 1.15 ms · p90 2.26 ms · p99 6.76 ms · p99.9 10.3 ms · mean 1.56 ms |
| Server CPU    | 154.0 µs per request (99% of one core)                                 |
| Server memory | 208 MiB peak RSS (193 MiB average under load)                          |

<details>
<summary>Per-round results, request and response</summary>

Drift: throughput change from the first to the second half of the measurement window. A server still warming up rises in nearly every round.

| Round | Req/s |  Drift |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | ----: | -----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 7,072 | -15.3% | 1.16 ms | 4.61 ms | 18.8 ms |        99% |  140.1 µs |  201 MiB |  0.9% |          15% |
|     2 | 6,701 | +12.5% | 1.07 ms | 8.06 ms | 24.6 ms |        99% |  147.4 µs |  211 MiB |  1.2% |          12% |
|     3 | 5,967 | +72.6% | 1.59 ms | 5.46 ms | 11.8 ms |        99% |  166.8 µs |  201 MiB |  0.2% |          15% |
|     4 | 7,864 |  -1.9% | 1.01 ms | 3.96 ms | 24.7 ms |        99% |  126.0 µs |  209 MiB |  0.8% |          16% |
|     5 | 3,230 | +10.4% | 2.88 ms | 8.72 ms | 16.7 ms |        99% |  306.8 µs |  195 MiB |  0.8% |          16% |
|     6 | 5,826 |  -0.2% | 1.31 ms | 9.57 ms | 29.6 ms |        99% |  170.6 µs |  216 MiB |  0.4% |          13% |
|     7 | 7,753 |  +6.6% | 1.03 ms | 3.96 ms | 13.7 ms |        99% |  127.4 µs |  208 MiB |  1.2% |          16% |
|     8 | 6,102 |  +8.0% | 1.21 ms | 9.57 ms | 33.3 ms |        99% |  161.7 µs |  208 MiB |  1.2% |          12% |
|     9 | 6,994 |  +0.2% | 1.12 ms | 4.79 ms | 27.9 ms |        98% |  140.8 µs |  207 MiB |  1.5% |          14% |
|    10 | 6,157 |  -7.6% | 1.15 ms | 8.86 ms | 26.2 ms |        99% |  160.5 µs |  215 MiB |  1.1% |          14% |

Request (plus a `host` header):

```http
GET /nested.procedure_1?input=%7B%22json%22%3A%22hello%20world%22%7D HTTP/1.1
user-agent: orpc-benchmarks
accept: */*
```

Response:

```
{"result":{"data":{"json":{"name":"nested/procedure_1","date":"2026-11-11T18:03:52.268Z","input":"hello world"},"meta":{"values":{"date":["Date"]},"v":1}}}}
```

</details>

The whole `rpc` group, measured in the same session:

| Library                 | Version       |       Throughput | Relative     | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :---------------------- | :------------ | ---------------: | :----------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [oRPC](../rpc-orpc)     | 2.0.0-beta.50 | **24,545 req/s** | fastest      |   16,480 – 26,491 |     0.36 ms |     0.92 ms |          40.3 µs |   87 MiB |
| [**tRPC**](../rpc-trpc) | 11.28.0       |  **6,429 req/s** | 3.82× slower |     3,230 – 7,864 |     1.15 ms |     6.76 ms |         154.0 µs |  208 MiB |

<sub>Median of 10 rounds (fresh server each, order alternated) · 10 connections · 30 s warm-up + 10 s measured · server on CPU 3, load generator on CPUs 1-2.</sub>

Clinic.js Doctor profile from `pnpm bench:profile`, under the same load ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/benchmarks/rpc-trpc/.clinic/report.clinic-doctor.html)); it is a single round, so compare behaviour, not throughput:

- CPU usage: 100% on average
- Memory (RSS): 74 MiB – 213 MiB
- Event loop delay: 1.19 ms on average (max 32.7 ms)
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
