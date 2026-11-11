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
| Throughput    | **5,171 req/s** (median; rounds 4,073 – 6,901, CV 16%)                 |
| Latency       | p50 1.68 ms · p90 2.79 ms · p99 6.04 ms · p99.9 8.55 ms · mean 1.93 ms |
| Server CPU    | 192.6 µs per request (99% of one core)                                 |
| Server memory | 196 MiB peak RSS (189 MiB average under load)                          |

<details>
<summary>Per-round results, request and response</summary>

Drift: throughput change from the first to the second half of the measurement window. A server still warming up rises in nearly every round.

| Round | Req/s |  Drift |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | ----: | -----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 5,285 |  +2.2% | 1.69 ms | 6.02 ms | 13.6 ms |        99% |  187.5 µs |  195 MiB |  0.7% |          13% |
|     2 | 5,058 | -10.2% | 1.87 ms | 6.05 ms | 13.1 ms |       100% |  197.7 µs |  197 MiB |  0.0% |          13% |
|     3 | 4,073 | +10.0% | 2.13 ms | 11.7 ms | 37.4 ms |       100% |  244.5 µs |  209 MiB |  0.0% |          11% |
|     4 | 5,471 | +38.9% | 1.64 ms | 5.92 ms | 15.9 ms |       100% |  182.2 µs |  194 MiB |  0.3% |          13% |
|     5 | 4,735 | -23.9% | 1.66 ms | 11.1 ms | 33.1 ms |        99% |  208.6 µs |  209 MiB |  1.0% |          11% |
|     6 | 6,279 |  -9.1% | 1.34 ms | 5.33 ms | 14.7 ms |        99% |  158.1 µs |  189 MiB |  0.6% |          14% |
|     7 | 5,568 |  +5.1% | 1.47 ms | 10.1 ms | 25.2 ms |        99% |  178.3 µs |  207 MiB |  0.5% |          12% |
|     8 | 6,901 |  -6.3% | 1.27 ms | 5.09 ms | 33.0 ms |        99% |  143.3 µs |  196 MiB |  0.9% |          15% |
|     9 | 4,804 | +12.1% | 1.76 ms | 6.48 ms | 20.7 ms |       100% |  207.3 µs |  195 MiB |  0.2% |          11% |
|    10 | 4,675 |  +5.2% | 1.99 ms | 6.04 ms | 11.3 ms |       100% |  213.5 µs |  193 MiB |  0.1% |          12% |

Request (plus a `host` header):

```http
GET /nested.procedure_1?input=%7B%22json%22%3A%22hello%20world%22%7D HTTP/1.1
user-agent: orpc-benchmarks
accept: */*
```

Response:

```
{"result":{"data":{"json":{"name":"nested/procedure_1","date":"2026-11-11T15:10:48.115Z","input":"hello world"},"meta":{"values":{"date":["Date"]},"v":1}}}}
```

</details>

The whole `rpc` group, measured in the same session:

| Library                 | Version       |       Throughput | Relative     | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :---------------------- | :------------ | ---------------: | :----------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [oRPC](../rpc-orpc)     | 2.0.0-beta.50 | **22,863 req/s** | fastest      |   21,733 – 25,864 |     0.40 ms |     0.94 ms |          43.2 µs |   86 MiB |
| [**tRPC**](../rpc-trpc) | 11.28.0       |  **5,171 req/s** | 4.42× slower |     4,073 – 6,901 |     1.68 ms |     6.04 ms |         192.6 µs |  196 MiB |

<sub>Median of 10 rounds (fresh server each, order alternated) · 10 connections · 10 s warm-up + 10 s measured · server on CPU 3, load generator on CPUs 1-2.</sub>

> [!WARNING]
>
> - rpc-orpc: throughput still rising in 9 of 10 rounds (median drift +10.9%) — try a longer --warmup

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
