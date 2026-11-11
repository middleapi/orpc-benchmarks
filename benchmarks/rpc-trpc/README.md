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

tRPC 11.28.0 — 2026-11-11 (@trpc/server@11.28.0, @trpc/client@11.28.0)

| Metric        | Result                                                                 |
| :------------ | :--------------------------------------------------------------------- |
| Throughput    | **6,627 req/s** (median; rounds 4,714 – 7,857, CV 17%)                 |
| Latency       | p50 1.12 ms · p90 2.24 ms · p99 6.86 ms · p99.9 10.6 ms · mean 1.51 ms |
| Server CPU    | 149.9 µs per request (99% of one core)                                 |
| Server memory | 205 MiB peak RSS (187 MiB average under load)                          |

<details>
<summary>Per-round results, request and response</summary>

Drift: throughput change from the first to the second half of the measurement window. A server still warming up rises in nearly every round.

| Round | Req/s |  Drift |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | ----: | -----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 4,828 |  -3.5% | 1.80 ms | 11.1 ms | 27.8 ms |        99% |  206.1 µs |  211 MiB |  0.4% |          11% |
|     2 | 4,714 |  +0.0% | 1.80 ms | 10.9 ms | 37.6 ms |        99% |  210.8 µs |  208 MiB |  0.6% |          11% |
|     3 | 7,857 |  +1.8% | 1.00 ms | 4.02 ms | 13.9 ms |        99% |  126.3 µs |  201 MiB |  0.6% |          15% |
|     4 | 6,572 |  +3.4% | 1.05 ms | 8.29 ms | 35.9 ms |        99% |  151.1 µs |  210 MiB |  0.7% |          13% |
|     5 | 6,931 | +10.5% | 1.18 ms | 4.84 ms | 12.5 ms |        99% |  142.4 µs |  198 MiB |  1.2% |          14% |
|     6 | 6,682 | +14.4% | 1.03 ms | 8.29 ms | 24.3 ms |        99% |  148.8 µs |  214 MiB |  0.4% |          13% |
|     7 | 7,703 |  -1.7% | 1.02 ms | 4.16 ms | 22.3 ms |        99% |  128.0 µs |  199 MiB |  1.1% |          15% |
|     8 | 5,430 | +35.9% | 1.39 ms | 10.4 ms | 25.1 ms |        99% |  183.2 µs |  214 MiB |  0.5% |          12% |
|     9 | 7,021 | +28.5% | 1.07 ms | 4.95 ms | 13.9 ms |        99% |  140.4 µs |  195 MiB |  1.3% |          14% |
|    10 | 6,043 |  -0.7% | 1.45 ms | 5.43 ms | 14.2 ms |        99% |  164.1 µs |  192 MiB |  0.7% |          14% |

Request (plus a `host` header):

```http
GET /nested.procedure_1?input=%7B%22json%22%3A%22hello%20world%22%7D HTTP/1.1
user-agent: orpc-benchmarks
accept: */*
```

Response:

```
{"result":{"data":{"json":{"name":"nested/procedure_1","date":"2026-11-11T10:55:37.583Z","input":"hello world"},"meta":{"values":{"date":["Date"]},"v":1}}}}
```

</details>

The whole `rpc` group, measured in the same session:

| Library                 | Version       |       Throughput | Relative     | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :---------------------- | :------------ | ---------------: | :----------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [oRPC](../rpc-orpc)     | 2.0.0-beta.50 | **24,750 req/s** | fastest      |   22,277 – 28,119 |     0.38 ms |     0.93 ms |          39.7 µs |   86 MiB |
| [**tRPC**](../rpc-trpc) | 11.28.0       |  **6,627 req/s** | 3.73× slower |     4,714 – 7,857 |     1.12 ms |     6.86 ms |         149.9 µs |  205 MiB |

<sub>Median of 10 rounds (fresh server each, order alternated) · 10 connections · 10 s warm-up + 10 s measured · server on CPU 3, load generator on CPUs 1-2.</sub>

Clinic.js Doctor profile from `pnpm bench:profile`, under the same load ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/benchmarks/rpc-trpc/.clinic/report.clinic-doctor.html)); it is a single round, so compare behaviour, not throughput:

- CPU usage: 99% on average
- Memory (RSS): 84 MiB – 223 MiB
- Event loop delay: 1.07 ms on average (max 25.3 ms)
- Detected issues: memory heapUsed (performance), event loop utilization (performance; expected: the load keeps the server saturated)

Run on:

```
CPU: Intel(R) Xeon(R) Processor @ 2.10GHz (4 CPUs, no SMT, KVM VM)
Memory: 16086 MB
OS: Ubuntu 24.04.5 LTS (Linux 6.18.44-fc-v378 x64)
Node: v26.13.0 (V8 14.6.202.34-node.40)
pnpm: 12.18.0
```

<!-- result:end -->
