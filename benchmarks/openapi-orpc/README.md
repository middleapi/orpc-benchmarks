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
| Throughput    | **27,009 req/s** (median; rounds 21,983 – 29,990, CV 9.4%)             |
| Latency       | p50 0.31 ms · p90 0.56 ms · p99 0.88 ms · p99.9 1.54 ms · mean 0.37 ms |
| Server CPU    | 36.6 µs per request (99% of one core)                                  |
| Server memory | 88 MiB peak RSS (88 MiB average under load)                            |

<details>
<summary>Per-round results, request and response</summary>

Drift: throughput change from the first to the second half of the measurement window. A server still warming up rises in nearly every round.

| Round |  Req/s |  Drift |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | -----: | -----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 21,983 |  -7.5% | 0.42 ms | 0.95 ms | 4.84 ms |        99% |   45.1 µs |   89 MiB |  0.4% |          36% |
|     2 | 23,924 |  -5.4% | 0.39 ms | 0.86 ms | 4.58 ms |        99% |   41.6 µs |   88 MiB |  0.1% |          37% |
|     3 | 27,179 | +12.2% | 0.31 ms | 0.86 ms | 4.39 ms |        99% |   36.5 µs |   89 MiB |  0.3% |          40% |
|     4 | 29,990 |  +0.5% | 0.29 ms | 0.78 ms | 4.79 ms |        99% |   32.9 µs |   89 MiB |  0.8% |          40% |
|     5 | 27,737 |  +2.4% | 0.30 ms | 0.87 ms | 4.43 ms |        99% |   35.7 µs |   88 MiB |  0.5% |          38% |
|     6 | 28,067 |  +2.3% | 0.30 ms | 0.90 ms | 27.7 ms |        98% |   35.0 µs |   87 MiB |  1.2% |          38% |
|     7 | 29,445 |  +5.3% | 0.29 ms | 0.84 ms | 6.28 ms |        99% |   33.5 µs |   89 MiB |  0.7% |          41% |
|     8 | 24,976 | -11.1% | 0.38 ms | 0.90 ms | 5.84 ms |        99% |   39.6 µs |   87 MiB |  0.7% |          39% |
|     9 | 26,838 | +10.8% | 0.31 ms | 0.88 ms | 4.75 ms |        99% |   36.8 µs |   88 MiB |  0.8% |          41% |
|    10 | 25,429 |  -7.7% | 0.36 ms | 0.94 ms | 16.9 ms |        99% |   38.9 µs |   87 MiB |  0.8% |          40% |

Request (plus a `host` header):

```http
GET /nested/procedure_1?who=hello%20world HTTP/1.1
user-agent: orpc-benchmarks
accept: */*
```

Response:

```
{"name":"nested/procedure_1","date":"2026-11-11T15:30:36.806Z","input":{"who":"hello world"}}
```

</details>

The whole `openapi` group, measured in the same session:

| Library                     | Version       |       Throughput | Relative                    | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :-------------------------- | :------------ | ---------------: | :-------------------------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [**oRPC**](../openapi-orpc) | 2.0.0-beta.50 | **27,009 req/s** | fastest                     |   21,983 – 29,990 |     0.31 ms |     0.88 ms |          36.6 µs |   88 MiB |
| [Hono](../openapi-hono)     | 4.13.18       | **24,543 req/s** | 1.10× slower (within noise) |   19,715 – 27,871 |     0.36 ms |     0.93 ms |          40.3 µs |   91 MiB |

<sub>Median of 10 rounds (fresh server each, order alternated) · 10 connections · 10 s warm-up + 10 s measured · server on CPU 3, load generator on CPUs 1-2.</sub>

Clinic.js Doctor profile from `pnpm bench:profile`, under the same load ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/benchmarks/openapi-orpc/.clinic/report.clinic-doctor.html)); it is a single round, so compare behaviour, not throughput:

- CPU usage: 99% on average
- Memory (RSS): 72 MiB – 92 MiB
- Event loop delay: 0.11 ms on average (max 20.0 ms)
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
