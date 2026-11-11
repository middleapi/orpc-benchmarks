# Hono OpenAPI Runtime Benchmark

- Evaluates the performance of Hono's runtime on a project with **6 routes** matching the procedures in [openapi-orpc](../openapi-orpc); every route is exposed as a RESTful `GET` endpoint that reads its input from query parameters, served by `@hono/node-server`.
- Each route uses a pass-through `hono/validator`, mirroring the no-op Standard Schema of the oRPC benchmark, so the result reflects Hono itself.
- Load: `GET /nested/procedure_1?who=hello%20world`, the same request as the oRPC benchmark; both return the same JSON body.

## How to run

```bash
pnpm bench          # this benchmark only (printed, not saved)
pnpm bench:profile  # Clinic.js Doctor report at .clinic/report.clinic-doctor.html
```

Committed results come from `pnpm bench openapi` at the repository root, which measures the whole group in one session; see the [methodology](../../README.md#methodology).

## Latest Result

<!-- result:start -->

Hono 4.13.18 — 2026-11-11 (hono@4.13.18, @hono/node-server@2.1.7)

| Metric        | Result                                                                 |
| :------------ | :--------------------------------------------------------------------- |
| Throughput    | **23,632 req/s** (median; rounds 21,069 – 26,717, CV 7.8%)             |
| Latency       | p50 0.40 ms · p90 0.60 ms · p99 0.95 ms · p99.9 1.54 ms · mean 0.42 ms |
| Server CPU    | 41.9 µs per request (99% of one core)                                  |
| Server memory | 92 MiB peak RSS (89 MiB average under load)                            |

<details>
<summary>Per-round results, request and response</summary>

Drift: throughput change from the first to the second half of the measurement window. A server still warming up rises in nearly every round.

| Round |  Req/s |  Drift |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | -----: | -----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 24,045 | -18.2% | 0.38 ms | 0.95 ms | 9.29 ms |        99% |   41.2 µs |   91 MiB |  0.6% |          35% |
|     2 | 26,127 |  -7.1% | 0.32 ms | 0.90 ms | 9.12 ms |        99% |   37.8 µs |   90 MiB |  0.7% |          40% |
|     3 | 23,762 |  +3.3% | 0.40 ms | 0.95 ms | 6.82 ms |        99% |   41.8 µs |   92 MiB |  0.3% |          37% |
|     4 | 23,501 |  -5.0% | 0.40 ms | 0.95 ms | 6.96 ms |        99% |   42.0 µs |   93 MiB |  0.6% |          36% |
|     5 | 21,773 |  +4.9% | 0.43 ms | 0.97 ms | 10.8 ms |        99% |   45.5 µs |   90 MiB |  0.7% |          34% |
|     6 | 21,069 |  -8.7% | 0.43 ms | 1.00 ms | 7.01 ms |        99% |   47.0 µs |   92 MiB |  0.4% |          34% |
|     7 | 21,889 |  -3.1% | 0.43 ms | 0.97 ms | 10.9 ms |        99% |   45.2 µs |   90 MiB |  0.7% |          35% |
|     8 | 24,920 |  +8.7% | 0.38 ms | 0.90 ms | 5.21 ms |        99% |   39.8 µs |   92 MiB |  0.3% |          38% |
|     9 | 23,094 | +13.0% | 0.41 ms | 1.00 ms | 2.11 ms |        99% |   43.1 µs |   92 MiB |  0.2% |          36% |
|    10 | 26,717 |  -2.0% | 0.31 ms | 0.88 ms | 11.0 ms |        99% |   37.0 µs |   87 MiB |  0.7% |          40% |

Request (plus a `host` header):

```http
GET /nested/procedure_1?who=hello%20world HTTP/1.1
user-agent: orpc-benchmarks
accept: */*
```

Response:

```
{"name":"nested/procedure_1","date":"2026-11-11T11:29:35.813Z","input":{"who":"hello world"}}
```

</details>

The whole `openapi` group, measured in the same session:

| Library                     | Version       |       Throughput | Relative                    | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :-------------------------- | :------------ | ---------------: | :-------------------------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [oRPC](../openapi-orpc)     | 2.0.0-beta.50 | **23,981 req/s** | fastest                     |   21,921 – 26,625 |     0.40 ms |     0.91 ms |          41.5 µs |   90 MiB |
| [**Hono**](../openapi-hono) | 4.13.18       | **23,632 req/s** | 1.01× slower (within noise) |   21,069 – 26,717 |     0.40 ms |     0.95 ms |          41.9 µs |   92 MiB |

<sub>Median of 10 rounds (fresh server each, order alternated) · 10 connections · 10 s warm-up + 10 s measured · server on CPU 3, load generator on CPUs 1-2.</sub>

Clinic.js Doctor profile from `pnpm bench:profile`, under the same load ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/benchmarks/openapi-hono/.clinic/report.clinic-doctor.html)); the profiler slows the server, so compare behaviour, not throughput:

- CPU usage: 99% on average (max 121%)
- Memory (RSS): 66 MiB – 82 MiB
- Event loop delay: 0.12 ms on average (max 15.8 ms)
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
