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

oRPC 2.0.0-beta.51 — 2026-11-17 (@orpc/server@2.0.0-beta.51, @orpc/openapi@2.0.0-beta.51)

| Metric        | Result                                                                 |
| :------------ | :--------------------------------------------------------------------- |
| Throughput    | **28,167 req/s** (median; rounds 26,110 – 28,899, CV 3.8%)             |
| Latency       | p50 0.31 ms · p90 0.56 ms · p99 0.89 ms · p99.9 1.90 ms · mean 0.35 ms |
| Server CPU    | 34.9 µs per request (98% of one core)                                  |
| Server memory | 89 MiB peak RSS (89 MiB average under load)                            |

<details>
<summary>Per-round results, request and response</summary>

Drift: throughput change from the first to the second half of the measurement window. A server still warming up rises in nearly every round.

| Round |  Req/s |  Drift |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | -----: | -----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 28,899 |  +0.8% | 0.30 ms | 0.97 ms | 8.81 ms |        99% |   34.2 µs |   87 MiB |  0.4% |          42% |
|     2 | 28,628 |  +5.9% | 0.31 ms | 0.82 ms | 6.44 ms |        98% |   34.1 µs |   90 MiB |  1.3% |          43% |
|     3 | 26,340 |  -7.3% | 0.33 ms | 0.94 ms | 11.8 ms |        97% |   37.0 µs |   92 MiB |  1.3% |          42% |
|     4 | 28,640 |  +4.4% | 0.31 ms | 0.86 ms | 7.74 ms |        99% |   34.5 µs |   88 MiB |  0.8% |          43% |
|     5 | 28,437 |  -7.9% | 0.30 ms | 0.89 ms | 10.6 ms |        98% |   34.4 µs |   89 MiB |  1.2% |          44% |
|     6 | 26,531 |  +0.4% | 0.33 ms | 0.88 ms | 21.3 ms |        98% |   36.8 µs |   89 MiB |  1.2% |          41% |
|     7 | 26,110 | -13.3% | 0.33 ms | 0.94 ms | 5.70 ms |        98% |   37.6 µs |   89 MiB |  1.1% |          42% |
|     8 | 27,522 |  +3.5% | 0.32 ms | 0.89 ms | 5.54 ms |        98% |   35.8 µs |   90 MiB |  0.7% |          45% |
|     9 | 27,897 |  +5.3% | 0.31 ms | 0.84 ms | 12.5 ms |        98% |   35.3 µs |   91 MiB |  1.1% |          42% |
|    10 | 28,479 |  -2.1% | 0.30 ms | 0.85 ms | 15.1 ms |        98% |   34.4 µs |   91 MiB |  1.0% |          42% |

Request (plus a `host` header):

```http
GET /nested/procedure_1?who=hello%20world HTTP/1.1
user-agent: orpc-benchmarks
accept: */*
```

Response:

```
{"name":"nested/procedure_1","date":"2026-11-17T14:59:00.075Z","input":{"who":"hello world"}}
```

</details>

The whole `openapi` group, measured in the same session:

| Library                     | Version       |       Throughput | Relative                    | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :-------------------------- | :------------ | ---------------: | :-------------------------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [**oRPC**](../openapi-orpc) | 2.0.0-beta.51 | **28,167 req/s** | fastest                     |   26,110 – 28,899 |     0.31 ms |     0.89 ms |          34.9 µs |   89 MiB |
| [Hono](../openapi-hono)     | 4.13.19       | **25,410 req/s** | 1.11× slower (within noise) |   20,551 – 27,285 |     0.34 ms |     0.94 ms |          38.4 µs |   94 MiB |

<sub>Median of 10 rounds (fresh server each, order alternated) · 10 connections · 10 s warm-up + 10 s measured · server on CPU 3, load generator on CPUs 1-2.</sub>

Clinic.js Doctor profile from `pnpm bench:profile`, under the same load ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/benchmarks/openapi-orpc/.clinic/report.clinic-doctor.html)); it is a single round, so compare behaviour, not throughput:

- CPU usage: 98% on average
- Memory (RSS): 78 MiB – 93 MiB
- Event loop delay: 0.08 ms on average (max 15.2 ms)
- Detected issues: event loop utilization (performance; expected: the load keeps the server saturated)

Run on:

```
CPU: Intel(R) Xeon(R) Processor @ 2.10GHz (4 CPUs, no SMT, KVM VM)
Memory: 16088 MiB
OS: Ubuntu 24.04.5 LTS (Linux 6.18.44-fc-v553 x64)
Node: v26.13.1 (V8 14.6.202.34-node.40)
pnpm: 12.21.0
```

<!-- result:end -->
