# Hono OpenAPI Runtime Benchmark

- Evaluates the performance of Hono's runtime on a project with **6 routes** matching the procedures in [openapi-orpc](../openapi-orpc); every route is exposed as a RESTful `GET` endpoint that reads its input from query parameters, served by `@hono/node-server`.
- Each route uses a pass-through `hono/validator`, mirroring the no-op Standard Schema used in the oRPC benchmark, so the results reflect Hono's performance without external influences.
- Load: `GET /nested/procedure_1?who=hello%20world`, the same request as the oRPC benchmark; both return the same JSON body.
- Comparable to the other benchmarks in the `openapi` group: [openapi-orpc](../openapi-orpc), [openapi-hono](../openapi-hono).

## How to run

```bash
pnpm bench          # this benchmark only; the numbers are printed, not saved
pnpm bench:profile  # Clinic.js Doctor report at .clinic/report.clinic-doctor.html
```

The committed results come from running the whole `openapi` group in one session from the repository root (`pnpm bench openapi`), so every library in the group is measured under the same conditions. See the [methodology](../../README.md#methodology).

## Latest Result

<!-- result:start -->

Hono 4.13.17 — 2026-11-11 (hono@4.13.17, @hono/node-server@2.1.6)

| Metric        | Result                                                                 |
| :------------ | :--------------------------------------------------------------------- |
| Throughput    | **24,747 req/s** (median; rounds range 22,208 – 27,061, CV 5.6%)       |
| Latency       | p50 0.37 ms · p90 0.59 ms · p99 0.92 ms · p99.9 1.81 ms · mean 0.40 ms |
| Server CPU    | 39.9 µs per request (99% of one core used)                             |
| Server memory | 93 MiB peak RSS (90 MiB average while under load)                      |

<details>
<summary>Per-round results, request and response</summary>

Drift is the throughput change from the first to the second half of the measurement window. A server still warming up shows a positive drift in nearly every round; single rounds vary with machine noise.

| Round |  Req/s |  Drift |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | -----: | -----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 24,002 | +15.2% | 0.38 ms | 0.98 ms | 13.8 ms |        98% |   40.7 µs |   89 MiB |  1.5% |          37% |
|     2 | 23,632 |  -7.5% | 0.40 ms | 0.97 ms | 6.98 ms |        98% |   41.5 µs |   92 MiB |  1.3% |          36% |
|     3 | 24,897 | +10.0% | 0.36 ms | 0.92 ms | 12.2 ms |        98% |   39.6 µs |   94 MiB |  0.7% |          37% |
|     4 | 27,061 |  -2.1% | 0.31 ms | 0.86 ms | 9.73 ms |        99% |   36.5 µs |   95 MiB |  0.7% |          41% |
|     5 | 24,437 |  -1.4% | 0.38 ms | 0.92 ms | 8.58 ms |        99% |   40.4 µs |   94 MiB |  0.8% |          38% |
|     6 | 25,091 |  -3.6% | 0.37 ms | 0.89 ms | 15.7 ms |        99% |   39.5 µs |   90 MiB |  0.7% |          39% |
|     7 | 25,130 |  +7.0% | 0.34 ms | 0.94 ms | 11.5 ms |        98% |   39.2 µs |   90 MiB |  1.0% |          39% |
|     8 | 26,558 |  +1.8% | 0.32 ms | 0.88 ms | 11.0 ms |        99% |   37.2 µs |   93 MiB |  0.7% |          41% |
|     9 | 22,208 |  +5.5% | 0.42 ms | 0.97 ms | 7.65 ms |        98% |   44.1 µs |   93 MiB |  1.4% |          35% |
|    10 | 24,597 | +13.4% | 0.38 ms | 0.91 ms | 5.21 ms |        99% |   40.3 µs |   91 MiB |  0.4% |          37% |

Request sent by the load generator (plus a `Host` header):

```http
GET /nested/procedure_1?who=hello%20world HTTP/1.1
User-Agent: orpc-benchmarks
Accept: */*
```

Response:

```
{"name":"nested/procedure_1","date":"2026-11-11T06:54:47.561Z","input":{"who":"hello world"}}
```

</details>

Compared with the rest of the `openapi` group, measured in the same session:

| Library                     | Version       |       Throughput | Relative                    | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :-------------------------- | :------------ | ---------------: | :-------------------------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [oRPC](../openapi-orpc)     | 2.0.0-beta.50 | **26,205** req/s | fastest                     |   24,028 – 28,456 |     0.36 ms |     0.87 ms |          37.7 µs |   86 MiB |
| [**Hono**](../openapi-hono) | 4.13.17       | **24,747** req/s | 1.06× slower (within noise) |   22,208 – 27,061 |     0.37 ms |     0.92 ms |          39.9 µs |   93 MiB |

<sub>Median of 10 rounds, each with a fresh server process (run order alternated); 10 connections, 10 s warm-up + 10 s measurement per round; server pinned to CPU 3, load generator to CPUs 1-2.</sub>

> ⚠ openapi-hono: throughput was still rising during the measurement (+3.6% from the first to the second half, median) — try a longer --warmup

Clinic.js Doctor profile under the same load, generated with `pnpm bench:profile` ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/benchmarks/openapi-hono/.clinic/report.clinic-doctor.html)). The profiler slows the server down, so use it to compare behaviour, not throughput:

- CPU usage: 99% on average (max 103%)
- Memory (RSS): 86 MiB – 103 MiB
- Event loop delay: 0.09 ms on average (max 18.5 ms)
- Detected issues: event loop utilization (performance) — high event loop utilization is expected here, since the load keeps the server saturated

Run on:

```
CPU: Intel(R) Xeon(R) Processor @ 2.10GHz (4 CPUs, no SMT, KVM VM)
Memory: 16086 MB
OS: Ubuntu 24.04.5 LTS (Linux 6.18.44-fc-v378 x64)
Node: v26.13.0 (V8 14.6.202.34-node.40)
pnpm: 12.18.0
```

<!-- result:end -->
