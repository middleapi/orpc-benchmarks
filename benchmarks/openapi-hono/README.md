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

Hono 4.13.19 — 2026-11-17 (hono@4.13.19, @hono/node-server@2.1.9)

| Metric        | Result                                                                 |
| :------------ | :--------------------------------------------------------------------- |
| Throughput    | **25,410 req/s** (median; rounds 20,551 – 27,285, CV 7.4%)             |
| Latency       | p50 0.34 ms · p90 0.62 ms · p99 0.94 ms · p99.9 1.85 ms · mean 0.39 ms |
| Server CPU    | 38.4 µs per request (98% of one core)                                  |
| Server memory | 94 MiB peak RSS (91 MiB average under load)                            |

<details>
<summary>Per-round results, request and response</summary>

Drift: throughput change from the first to the second half of the measurement window. A server still warming up rises in nearly every round.

| Round |  Req/s |  Drift |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | -----: | -----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 24,942 |  +4.9% | 0.34 ms | 0.95 ms | 12.8 ms |        99% |   39.6 µs |   94 MiB |  0.8% |          40% |
|     2 | 25,043 |  -8.1% | 0.34 ms | 0.95 ms | 7.74 ms |        98% |   39.2 µs |   88 MiB |  0.8% |          40% |
|     3 | 25,927 |  +5.3% | 0.33 ms | 0.91 ms | 35.0 ms |        98% |   37.9 µs |   93 MiB |  0.9% |          39% |
|     4 | 25,463 |  -3.0% | 0.33 ms | 1.15 ms | 9.53 ms |        97% |   38.0 µs |   97 MiB |  2.4% |          39% |
|     5 | 27,285 |  +1.4% | 0.32 ms | 0.85 ms | 13.0 ms |        98% |   36.1 µs |   97 MiB |  0.5% |          42% |
|     6 | 26,108 |  -6.9% | 0.33 ms | 0.91 ms | 10.1 ms |        98% |   37.4 µs |   96 MiB |  1.0% |          40% |
|     7 | 20,551 | -27.5% | 0.46 ms | 1.26 ms | 6.86 ms |        98% |   47.9 µs |   93 MiB |  1.0% |          41% |
|     8 | 23,714 |  +4.0% | 0.36 ms | 1.05 ms | 5.73 ms |        98% |   41.5 µs |   94 MiB |  1.0% |          38% |
|     9 | 25,356 |  -2.6% | 0.34 ms | 0.94 ms | 13.2 ms |        98% |   38.8 µs |   92 MiB |  1.2% |          41% |
|    10 | 26,561 | +10.4% | 0.33 ms | 0.90 ms | 9.70 ms |        98% |   37.1 µs |   96 MiB |  0.6% |          41% |

Request (plus a `host` header):

```http
GET /nested/procedure_1?who=hello%20world HTTP/1.1
user-agent: orpc-benchmarks
accept: */*
```

Response:

```
{"name":"nested/procedure_1","date":"2026-11-17T14:59:20.260Z","input":{"who":"hello world"}}
```

</details>

The whole `openapi` group, measured in the same session:

| Library                     | Version       |       Throughput | Relative                    | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :-------------------------- | :------------ | ---------------: | :-------------------------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [oRPC](../openapi-orpc)     | 2.0.0-beta.51 | **28,167 req/s** | fastest                     |   26,110 – 28,899 |     0.31 ms |     0.89 ms |          34.9 µs |   89 MiB |
| [**Hono**](../openapi-hono) | 4.13.19       | **25,410 req/s** | 1.11× slower (within noise) |   20,551 – 27,285 |     0.34 ms |     0.94 ms |          38.4 µs |   94 MiB |

<sub>Median of 10 rounds (fresh server each, order alternated) · 10 connections · 10 s warm-up + 10 s measured · server on CPU 3, load generator on CPUs 1-2.</sub>

Clinic.js Doctor profile from `pnpm bench:profile`, under the same load ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/benchmarks/openapi-hono/.clinic/report.clinic-doctor.html)); it is a single round, so compare behaviour, not throughput:

- CPU usage: 99% on average
- Memory (RSS): 73 MiB – 98 MiB
- Event loop delay: 0.10 ms on average (max 40.7 ms)
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
