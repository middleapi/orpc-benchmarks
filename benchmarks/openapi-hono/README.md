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
| Throughput    | **24,543 req/s** (median; rounds 19,715 – 27,871, CV 10%)              |
| Latency       | p50 0.36 ms · p90 0.60 ms · p99 0.93 ms · p99.9 1.63 ms · mean 0.41 ms |
| Server CPU    | 40.3 µs per request (99% of one core)                                  |
| Server memory | 91 MiB peak RSS (89 MiB average under load)                            |

<details>
<summary>Per-round results, request and response</summary>

Drift: throughput change from the first to the second half of the measurement window. A server still warming up rises in nearly every round.

| Round |  Req/s | Drift |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | -----: | ----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 19,715 | +2.4% | 0.47 ms | 1.00 ms | 5.32 ms |       100% |   50.5 µs |   89 MiB |  0.1% |          32% |
|     2 | 21,875 | -6.2% | 0.43 ms | 0.96 ms | 7.32 ms |        99% |   45.4 µs |   91 MiB |  0.2% |          34% |
|     3 | 26,757 | -2.1% | 0.31 ms | 0.88 ms | 13.8 ms |        99% |   36.9 µs |   96 MiB |  1.0% |          38% |
|     4 | 26,058 | +9.9% | 0.32 ms | 0.92 ms | 16.4 ms |        99% |   37.9 µs |   94 MiB |  0.6% |          36% |
|     5 | 23,705 | +0.6% | 0.40 ms | 0.94 ms | 5.29 ms |       100% |   42.0 µs |   92 MiB |  0.1% |          34% |
|     6 | 24,204 | +1.8% | 0.35 ms | 1.05 ms | 9.98 ms |        99% |   40.8 µs |   89 MiB |  0.6% |          35% |
|     7 | 27,871 | +0.3% | 0.31 ms | 0.85 ms | 10.4 ms |        98% |   35.3 µs |   95 MiB |  0.9% |          38% |
|     8 | 22,398 | +7.0% | 0.40 ms | 1.20 ms | 15.1 ms |        97% |   43.5 µs |   92 MiB |  1.3% |          38% |
|     9 | 24,933 | -5.7% | 0.36 ms | 0.91 ms | 7.50 ms |        99% |   39.8 µs |   90 MiB |  0.4% |          39% |
|    10 | 24,882 | +7.9% | 0.35 ms | 0.93 ms | 3.80 ms |        99% |   39.8 µs |   90 MiB |  0.5% |          38% |

Request (plus a `host` header):

```http
GET /nested/procedure_1?who=hello%20world HTTP/1.1
user-agent: orpc-benchmarks
accept: */*
```

Response:

```
{"name":"nested/procedure_1","date":"2026-11-11T15:30:57.015Z","input":{"who":"hello world"}}
```

</details>

The whole `openapi` group, measured in the same session:

| Library                     | Version       |       Throughput | Relative                    | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :-------------------------- | :------------ | ---------------: | :-------------------------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [oRPC](../openapi-orpc)     | 2.0.0-beta.50 | **27,009 req/s** | fastest                     |   21,983 – 29,990 |     0.31 ms |     0.88 ms |          36.6 µs |   88 MiB |
| [**Hono**](../openapi-hono) | 4.13.18       | **24,543 req/s** | 1.10× slower (within noise) |   19,715 – 27,871 |     0.36 ms |     0.93 ms |          40.3 µs |   91 MiB |

<sub>Median of 10 rounds (fresh server each, order alternated) · 10 connections · 10 s warm-up + 10 s measured · server on CPU 3, load generator on CPUs 1-2.</sub>

Clinic.js Doctor profile from `pnpm bench:profile`, under the same load ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/benchmarks/openapi-hono/.clinic/report.clinic-doctor.html)); it is a single round, so compare behaviour, not throughput:

- CPU usage: 99% on average
- Memory (RSS): 70 MiB – 94 MiB
- Event loop delay: 0.10 ms on average (max 19.3 ms)
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
