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
| Throughput    | **23,780 req/s** (median; rounds range 21,736 – 25,906, CV 4.6%)       |
| Latency       | p50 0.39 ms · p90 0.61 ms · p99 0.98 ms · p99.9 2.28 ms · mean 0.42 ms |
| Server CPU    | 41.5 µs per request (99% of one core used)                             |
| Server memory | 91 MiB peak RSS (88 MiB average while under load)                      |

<details>
<summary>Per-round results, request and response</summary>

Drift is the throughput change from the first to the second half of the measurement window. A server still warming up shows a positive drift in nearly every round; single rounds vary with machine noise.

| Round |  Req/s |  Drift |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | -----: | -----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 23,613 | +11.5% | 0.39 ms | 0.98 ms | 7.75 ms |        98% |   41.6 µs |   90 MiB |  0.8% |          36% |
|     2 | 23,004 |  -4.8% | 0.42 ms | 0.97 ms | 5.67 ms |        99% |   42.9 µs |   91 MiB |  0.9% |          36% |
|     3 | 23,804 |  -5.7% | 0.39 ms | 0.98 ms | 5.53 ms |        99% |   41.5 µs |   93 MiB |  0.5% |          35% |
|     4 | 21,736 | +10.0% | 0.43 ms | 1.04 ms | 5.12 ms |        99% |   45.5 µs |   87 MiB |  0.4% |          34% |
|     5 | 23,887 |  +5.6% | 0.40 ms | 0.92 ms | 7.59 ms |        99% |   41.4 µs |   92 MiB |  0.5% |          34% |
|     6 | 24,262 |  -7.1% | 0.39 ms | 0.92 ms | 7.77 ms |        98% |   40.5 µs |   90 MiB |  1.3% |          38% |
|     7 | 22,738 | -17.5% | 0.40 ms | 1.03 ms | 5.06 ms |        98% |   43.3 µs |   90 MiB |  0.6% |          34% |
|     8 | 25,906 |  -1.9% | 0.32 ms | 0.98 ms | 7.21 ms |        98% |   37.9 µs |   91 MiB |  1.3% |          38% |
|     9 | 24,287 |  -8.6% | 0.39 ms | 0.91 ms | 4.83 ms |        99% |   40.6 µs |   89 MiB |  0.6% |          37% |
|    10 | 23,757 | +11.3% | 0.39 ms | 0.98 ms | 7.40 ms |        98% |   41.3 µs |   92 MiB |  1.1% |          37% |

Request sent by the load generator (plus a `Host` header):

```http
GET /nested/procedure_1?who=hello%20world HTTP/1.1
User-Agent: orpc-benchmarks
Accept: */*
```

Response:

```
{"name":"nested/procedure_1","date":"2026-11-11T07:04:55.230Z","input":{"who":"hello world"}}
```

</details>

Compared with the rest of the `openapi` group, measured in the same session:

| Library                     | Version       |       Throughput | Relative             | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :-------------------------- | :------------ | ---------------: | :------------------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [oRPC](../openapi-orpc)     | 2.0.0-beta.50 | **23,874** req/s | fastest              |   21,934 – 27,009 |     0.40 ms |     0.92 ms |          41.2 µs |   87 MiB |
| [**Hono**](../openapi-hono) | 4.13.17       | **23,780** req/s | 1.00× (within noise) |   21,736 – 25,906 |     0.39 ms |     0.98 ms |          41.5 µs |   91 MiB |

<sub>Median of 10 rounds, each with a fresh server process (run order alternated); 10 connections, 10 s warm-up + 10 s measurement per round; server pinned to CPU 3, load generator to CPUs 1-2.</sub>

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
