# oRPC OpenAPI Runtime Benchmark

- Evaluates the performance of oRPC's OpenAPI runtime on a project with **6 procedures** and **3 routers**; every procedure is exposed as a RESTful `GET` endpoint that reads its input from query parameters, served by `OpenAPIHandler` from `@orpc/openapi/node` on a plain `node:http` server.
- Inputs use a no-op [Standard Schema](https://github.com/standard-schema/standard-schema) validator rather than a schema library such as Zod, so the result reflects oRPC itself.
- Load: `GET /nested/procedure_1?who=hello%20world`, the same request as the Hono benchmark; both return the same JSON body.

## How to run

```bash
pnpm bench          # this benchmark only (printed, not saved)
pnpm bench:profile  # Clinic.js Doctor report at .clinic/report.clinic-doctor.html
```

Committed results come from `pnpm bench openapi` at the repository root, which measures the whole group in one session; see the [methodology](../../README.md#methodology).

## Latest Result

<!-- result:start -->

oRPC 2.0.0-beta.50 — 2026-11-11 (@orpc/server@2.0.0-beta.50, @orpc/openapi@2.0.0-beta.50)

| Metric        | Result                                                                 |
| :------------ | :--------------------------------------------------------------------- |
| Throughput    | **23,998 req/s** (median; rounds 22,038 – 27,021, CV 6.2%)             |
| Latency       | p50 0.39 ms · p90 0.59 ms · p99 0.90 ms · p99.9 1.72 ms · mean 0.42 ms |
| Server CPU    | 41.3 µs per request (99% of one core)                                  |
| Server memory | 87 MiB peak RSS (87 MiB average under load)                            |

<details>
<summary>Per-round results, request and response</summary>

Drift: throughput change from the first to the second half of the measurement window. A server still warming up rises in nearly every round.

| Round |  Req/s |  Drift |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | -----: | -----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 22,751 |  -1.8% | 0.42 ms | 0.93 ms | 8.50 ms |        99% |   43.5 µs |   87 MiB |  0.5% |          36% |
|     2 | 23,310 |  +1.4% | 0.41 ms | 0.92 ms | 5.03 ms |        99% |   42.4 µs |   85 MiB |  0.7% |          35% |
|     3 | 25,895 |  +2.4% | 0.35 ms | 0.89 ms | 11.1 ms |        98% |   38.0 µs |   88 MiB |  0.9% |          37% |
|     4 | 24,100 |  -1.9% | 0.39 ms | 0.88 ms | 6.08 ms |        99% |   41.1 µs |   88 MiB |  0.4% |          36% |
|     5 | 27,021 |  -2.7% | 0.32 ms | 0.86 ms | 5.24 ms |        99% |   36.6 µs |   89 MiB |  0.7% |          38% |
|     6 | 23,897 | +16.1% | 0.40 ms | 0.88 ms | 6.74 ms |        99% |   41.5 µs |   89 MiB |  0.4% |          37% |
|     7 | 25,305 |  -0.2% | 0.35 ms | 0.91 ms | 8.89 ms |        98% |   38.7 µs |   87 MiB |  1.4% |          37% |
|     8 | 25,075 |  +7.0% | 0.38 ms | 0.90 ms | 5.41 ms |        99% |   39.3 µs |   87 MiB |  0.7% |          38% |
|     9 | 23,682 |  -8.0% | 0.39 ms | 0.91 ms | 4.42 ms |        99% |   41.8 µs |   87 MiB |  0.3% |          35% |
|    10 | 22,038 |  +5.8% | 0.41 ms | 0.91 ms | 5.14 ms |       100% |   45.2 µs |   90 MiB |  0.1% |          34% |

Request (plus a `host` header):

```http
GET /nested/procedure_1?who=hello%20world HTTP/1.1
user-agent: orpc-benchmarks
accept: */*
```

Response:

```
{"name":"nested/procedure_1","date":"2026-11-11T11:15:25.732Z","input":{"who":"hello world"}}
```

</details>

The whole `openapi` group, measured in the same session:

| Library                     | Version       |       Throughput | Relative                    | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :-------------------------- | :------------ | ---------------: | :-------------------------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [**oRPC**](../openapi-orpc) | 2.0.0-beta.50 | **23,998 req/s** | fastest                     |   22,038 – 27,021 |     0.39 ms |     0.90 ms |          41.3 µs |   87 MiB |
| [Hono](../openapi-hono)     | 4.13.17       | **22,661 req/s** | 1.06× slower (within noise) |   20,597 – 24,489 |     0.41 ms |     0.96 ms |          43.7 µs |   92 MiB |

<sub>Median of 10 rounds (fresh server each, order alternated) · 10 connections · 10 s warm-up + 10 s measured · server on CPU 3, load generator on CPUs 1-2.</sub>

Clinic.js Doctor profile from `pnpm bench:profile`, under the same load ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/benchmarks/openapi-orpc/.clinic/report.clinic-doctor.html)); the profiler slows the server, so compare behaviour, not throughput:

- CPU usage: 99% on average (max 103%)
- Memory (RSS): 80 MiB – 98 MiB
- Event loop delay: 0.06 ms on average (max 7.70 ms)
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
