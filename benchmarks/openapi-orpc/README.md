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
| Throughput    | **23,981 req/s** (median; rounds 21,921 – 26,625, CV 6.3%)             |
| Latency       | p50 0.40 ms · p90 0.59 ms · p99 0.91 ms · p99.9 1.35 ms · mean 0.42 ms |
| Server CPU    | 41.5 µs per request (99% of one core)                                  |
| Server memory | 90 MiB peak RSS (89 MiB average under load)                            |

<details>
<summary>Per-round results, request and response</summary>

Drift: throughput change from the first to the second half of the measurement window. A server still warming up rises in nearly every round.

| Round |  Req/s |  Drift |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | -----: | -----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 25,797 |  -0.9% | 0.35 ms | 0.87 ms | 8.93 ms |        99% |   38.3 µs |   88 MiB |  0.8% |          36% |
|     2 | 26,625 | +10.8% | 0.32 ms | 0.89 ms | 7.17 ms |        98% |   37.0 µs |   92 MiB |  1.1% |          41% |
|     3 | 21,921 |  +4.7% | 0.42 ms | 0.94 ms | 5.24 ms |        99% |   45.4 µs |   90 MiB |  0.2% |          35% |
|     4 | 22,989 |  +5.6% | 0.42 ms | 0.91 ms | 3.71 ms |        99% |   43.2 µs |   90 MiB |  0.5% |          35% |
|     5 | 23,872 |  +4.7% | 0.40 ms | 0.91 ms | 2.89 ms |        99% |   41.6 µs |   90 MiB |  0.3% |          38% |
|     6 | 25,459 |  -6.4% | 0.37 ms | 0.86 ms | 55.5 ms |        99% |   38.7 µs |   86 MiB |  0.3% |          39% |
|     7 | 24,089 | -13.9% | 0.40 ms | 0.88 ms | 5.82 ms |        99% |   41.3 µs |   87 MiB |  0.3% |          36% |
|     8 | 23,319 |  -6.2% | 0.40 ms | 0.92 ms | 11.3 ms |        99% |   42.5 µs |   86 MiB |  0.3% |          36% |
|     9 | 23,039 |  +8.0% | 0.40 ms | 0.96 ms | 8.83 ms |        99% |   43.0 µs |   90 MiB |  0.4% |          36% |
|    10 | 25,553 | +11.8% | 0.34 ms | 0.93 ms | 5.79 ms |        99% |   38.9 µs |   90 MiB |  0.5% |          35% |

Request (plus a `host` header):

```http
GET /nested/procedure_1?who=hello%20world HTTP/1.1
user-agent: orpc-benchmarks
accept: */*
```

Response:

```
{"name":"nested/procedure_1","date":"2026-11-11T11:29:15.603Z","input":{"who":"hello world"}}
```

</details>

The whole `openapi` group, measured in the same session:

| Library                     | Version       |       Throughput | Relative                    | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :-------------------------- | :------------ | ---------------: | :-------------------------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [**oRPC**](../openapi-orpc) | 2.0.0-beta.50 | **23,981 req/s** | fastest                     |   21,921 – 26,625 |     0.40 ms |     0.91 ms |          41.5 µs |   90 MiB |
| [Hono](../openapi-hono)     | 4.13.18       | **23,632 req/s** | 1.01× slower (within noise) |   21,069 – 26,717 |     0.40 ms |     0.95 ms |          41.9 µs |   92 MiB |

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
