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

tRPC 11.28.3 — 2026-11-17 (@trpc/server@11.28.3, @trpc/client@11.28.3, superjson@2.2.6)

| Metric        | Result                                                                 |
| :------------ | :--------------------------------------------------------------------- |
| Throughput    | **6,976 req/s** (median; rounds 6,555 – 7,532, CV 4.8%)                |
| Latency       | p50 1.11 ms · p90 2.07 ms · p99 5.57 ms · p99.9 11.0 ms · mean 1.43 ms |
| Server CPU    | 141.3 µs per request (99% of one core)                                 |
| Server memory | 318 MiB peak RSS (308 MiB average under load)                          |

<details>
<summary>Per-round results, request and response</summary>

Drift: throughput change from the first to the second half of the measurement window. A server still warming up rises in nearly every round.

| Round | Req/s |  Drift |     p50 |     p99 |      Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | ----: | -----: | ------: | ------: | -------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 6,555 | -15.5% | 1.07 ms | 5.99 ms | 504.3 ms |        99% |  151.1 µs |  376 MiB |  0.7% |          16% |
|     2 | 6,815 | -17.9% | 1.06 ms | 5.67 ms | 523.7 ms |        99% |  145.1 µs |  403 MiB |  0.9% |          15% |
|     3 | 6,858 |  +1.3% | 1.09 ms | 5.77 ms |  88.7 ms |        99% |  144.2 µs |  283 MiB |  1.0% |          16% |
|     4 | 6,575 |  -1.8% | 1.12 ms | 6.15 ms | 238.1 ms |        98% |  149.5 µs |  345 MiB |  1.5% |          15% |
|     5 | 7,019 | +13.9% | 1.12 ms | 5.58 ms | 190.7 ms |        99% |  140.5 µs |  332 MiB |  1.0% |          15% |
|     6 | 7,442 |  -2.1% | 1.08 ms | 5.35 ms |  35.4 ms |        98% |  132.4 µs |  332 MiB |  1.4% |          14% |
|     7 | 7,281 |  +9.4% | 1.12 ms | 5.33 ms |  15.5 ms |        98% |  134.6 µs |  292 MiB |  1.8% |          15% |
|     8 | 6,933 |  +6.1% | 1.15 ms | 5.56 ms | 142.1 ms |        99% |  142.2 µs |  304 MiB |  1.3% |          15% |
|     9 | 7,532 |  +4.9% | 1.09 ms | 5.38 ms | 131.8 ms |        99% |  131.7 µs |  299 MiB |  0.8% |          15% |
|    10 | 7,090 |  +0.5% | 1.12 ms | 5.49 ms |  98.9 ms |        99% |  139.5 µs |  286 MiB |  0.9% |          14% |

Request (plus a `host` header):

```http
GET /nested.procedure_1?input=%7B%22json%22%3A%22hello%20world%22%7D HTTP/1.1
user-agent: orpc-benchmarks
accept: */*
```

Response:

```
{"result":{"data":{"json":{"name":"nested/procedure_1","date":"2026-11-17T14:32:51.773Z","input":"hello world"},"meta":{"values":{"date":["Date"]},"v":1}}}}
```

</details>

The whole `rpc` group, measured in the same session:

| Library                 | Version       |       Throughput | Relative     | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :---------------------- | :------------ | ---------------: | :----------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [oRPC](../rpc-orpc)     | 2.0.0-beta.51 | **28,118 req/s** | fastest      |   25,302 – 30,397 |     0.31 ms |     0.86 ms |          35.0 µs |   88 MiB |
| [**tRPC**](../rpc-trpc) | 11.28.3       |  **6,976 req/s** | 4.03× slower |     6,555 – 7,532 |     1.11 ms |     5.57 ms |         141.3 µs |  318 MiB |

<sub>Median of 10 rounds (fresh server each, order alternated) · 10 connections · 30 s warm-up + 10 s measured · server on CPU 3, load generator on CPUs 1-2.</sub>

Clinic.js Doctor profile from `pnpm bench:profile`, under the same load ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/benchmarks/rpc-trpc/.clinic/report.clinic-doctor.html)); it is a single round, so compare behaviour, not throughput:

- CPU usage: 99% on average
- Memory (RSS): 76 MiB – 249 MiB
- Event loop delay: 0.86 ms on average (max 74.1 ms)
- Detected issues: memory heapUsed (performance), event loop utilization (performance; expected: the load keeps the server saturated)

Run on:

```
CPU: Intel(R) Xeon(R) Processor @ 2.10GHz (4 CPUs, no SMT, KVM VM)
Memory: 16088 MiB
OS: Ubuntu 24.04.5 LTS (Linux 6.18.44-fc-v553 x64)
Node: v26.13.1 (V8 14.6.202.34-node.40)
pnpm: 12.21.0
```

<!-- result:end -->
