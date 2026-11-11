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

Hono 4.13.17 — 2026-11-11 (hono@4.13.17, @hono/node-server@2.1.6)

| Metric        | Result                                                                 |
| :------------ | :--------------------------------------------------------------------- |
| Throughput    | **22,661 req/s** (median; rounds 20,597 – 24,489, CV 5.9%)             |
| Latency       | p50 0.41 ms · p90 0.65 ms · p99 0.96 ms · p99.9 2.02 ms · mean 0.44 ms |
| Server CPU    | 43.7 µs per request (99% of one core)                                  |
| Server memory | 92 MiB peak RSS (90 MiB average under load)                            |

<details>
<summary>Per-round results, request and response</summary>

Drift: throughput change from the first to the second half of the measurement window. A server still warming up rises in nearly every round.

| Round |  Req/s |  Drift |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | -----: | -----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 24,291 |  -7.2% | 0.39 ms | 0.94 ms | 5.48 ms |        98% |   40.6 µs |   93 MiB |  1.0% |          38% |
|     2 | 21,776 | -10.1% | 0.41 ms | 1.01 ms | 5.08 ms |        99% |   45.6 µs |   91 MiB |  0.2% |          34% |
|     3 | 24,018 |  +4.2% | 0.40 ms | 0.94 ms | 14.3 ms |        99% |   41.4 µs |   93 MiB |  0.3% |          35% |
|     4 | 24,489 |  -5.9% | 0.38 ms | 0.95 ms | 11.0 ms |        98% |   40.2 µs |   90 MiB |  0.9% |          37% |
|     5 | 21,356 |  +6.8% | 0.43 ms | 1.16 ms | 17.4 ms |        99% |   46.2 µs |   93 MiB |  0.9% |          35% |
|     6 | 21,939 |  -5.0% | 0.42 ms | 1.01 ms | 5.20 ms |        99% |   45.1 µs |   91 MiB |  0.6% |          34% |
|     7 | 20,597 |  -1.6% | 0.43 ms | 1.18 ms | 5.72 ms |        99% |   48.0 µs |   93 MiB |  0.6% |          35% |
|     8 | 23,163 |  -6.0% | 0.41 ms | 0.96 ms | 4.81 ms |        99% |   42.6 µs |   92 MiB |  0.5% |          36% |
|     9 | 23,313 |  +6.1% | 0.40 ms | 0.91 ms | 5.08 ms |        99% |   42.6 µs |   89 MiB |  0.2% |          35% |
|    10 | 22,160 |  -5.2% | 0.42 ms | 0.97 ms | 10.3 ms |        99% |   44.7 µs |   95 MiB |  0.5% |          35% |

Request (plus a `host` header):

```http
GET /nested/procedure_1?who=hello%20world HTTP/1.1
user-agent: orpc-benchmarks
accept: */*
```

Response:

```
{"name":"nested/procedure_1","date":"2026-11-11T11:15:45.921Z","input":{"who":"hello world"}}
```

</details>

The whole `openapi` group, measured in the same session:

| Library                     | Version       |       Throughput | Relative                    | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :-------------------------- | :------------ | ---------------: | :-------------------------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [oRPC](../openapi-orpc)     | 2.0.0-beta.50 | **23,998 req/s** | fastest                     |   22,038 – 27,021 |     0.39 ms |     0.90 ms |          41.3 µs |   87 MiB |
| [**Hono**](../openapi-hono) | 4.13.17       | **22,661 req/s** | 1.06× slower (within noise) |   20,597 – 24,489 |     0.41 ms |     0.96 ms |          43.7 µs |   92 MiB |

<sub>Median of 10 rounds (fresh server each, order alternated) · 10 connections · 10 s warm-up + 10 s measured · server on CPU 3, load generator on CPUs 1-2.</sub>

Clinic.js Doctor profile from `pnpm bench:profile`, under the same load ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/benchmarks/openapi-hono/.clinic/report.clinic-doctor.html)); the profiler slows the server, so compare behaviour, not throughput:

- CPU usage: 99% on average (max 103%)
- Memory (RSS): 86 MiB – 103 MiB
- Event loop delay: 0.09 ms on average (max 18.5 ms)
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
