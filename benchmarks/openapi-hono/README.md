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
| Throughput    | **27,192 req/s** (median; rounds range 25,688 – 29,560, CV 4.6%)       |
| Latency       | p50 0.31 ms · p90 0.55 ms · p99 0.87 ms · p99.9 1.52 ms · mean 0.37 ms |
| Server CPU    | 36.2 µs per request (99% of one core used)                             |
| Server memory | 100 MiB peak RSS (98 MiB average while under load)                     |

<details>
<summary>Per-round results, request and response</summary>

| Round |  Req/s |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | -----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 25,688 | 0.34 ms | 0.88 ms | 12.4 ms |        99% |   38.5 µs |   96 MiB |  0.7% |          34% |
|     2 | 27,816 | 0.31 ms | 0.82 ms | 13.2 ms |        99% |   35.7 µs |  101 MiB |  0.4% |          40% |
|     3 | 28,481 | 0.30 ms | 0.79 ms | 30.5 ms |        98% |   34.6 µs |  101 MiB |  1.1% |          37% |
|     4 | 26,432 | 0.32 ms | 0.91 ms | 13.2 ms |        98% |   37.2 µs |  100 MiB |  1.0% |          37% |
|     5 | 28,711 | 0.29 ms | 0.82 ms | 12.4 ms |        99% |   34.5 µs |  100 MiB |  0.5% |          35% |
|     6 | 29,560 | 0.29 ms | 0.77 ms | 8.62 ms |        99% |   33.4 µs |   99 MiB |  0.8% |          37% |
|     7 | 27,461 | 0.30 ms | 0.87 ms | 12.9 ms |        99% |   36.0 µs |  100 MiB |  0.8% |          36% |
|     8 | 26,238 | 0.32 ms | 0.90 ms | 11.5 ms |        99% |   37.8 µs |   92 MiB |  0.5% |          38% |
|     9 | 26,923 | 0.31 ms | 0.89 ms | 24.4 ms |        98% |   36.4 µs |  102 MiB |  1.3% |          38% |
|    10 | 26,337 | 0.31 ms | 0.91 ms | 10.5 ms |        99% |   37.6 µs |  100 MiB |  0.5% |          39% |

Request sent by the load generator (plus a `Host` header):

```http
GET /nested/procedure_1?who=hello%20world HTTP/1.1
User-Agent: orpc-benchmarks
Accept: */*
```

Response:

```
{"name":"nested/procedure_1","date":"2026-11-11T03:23:34.198Z","input":{"who":"hello world"}}
```

</details>

Compared with the rest of the `openapi` group, measured in the same session:

| Library                     | Version       |       Throughput | Relative                    | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :-------------------------- | :------------ | ---------------: | :-------------------------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [oRPC](../openapi-orpc)     | 2.0.0-beta.50 | **28,311** req/s | fastest                     |   20,948 – 32,252 |     0.30 ms |     0.83 ms |          34.8 µs |   95 MiB |
| [**Hono**](../openapi-hono) | 4.13.17       | **27,192** req/s | 1.04× slower (within noise) |   25,688 – 29,560 |     0.31 ms |     0.87 ms |          36.2 µs |  100 MiB |

<sub>Median of 10 rounds, each with a fresh server process (run order alternated); 10 connections, 10 s warm-up + 10 s measurement per round; server pinned to CPU 3, load generator to CPUs 1-2.</sub>

Clinic.js Doctor profile under the same load, generated with `pnpm bench:profile` ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/benchmarks/openapi-hono/.clinic/report.clinic-doctor.html)). The profiler slows the server down, so use it to compare behaviour, not throughput:

- CPU usage: 99% on average (max 103%)
- Memory (RSS): 86 MiB – 103 MiB
- Event loop delay: 0.09 ms on average (max 18.5 ms)
- Detected issues: event loop utilization (performance) — high event loop utilization is expected here, since the load keeps the server saturated

Run on:

```
CPU: Intel(R) Xeon(R) Processor @ 2.10GHz (4 cores, KVM VM)
Memory: 16086 MB
OS: Ubuntu 24.04.5 LTS (Linux 6.18.44-fc-v378 x64)
Node: v26.13.0 (V8 14.6.202.34-node.40)
pnpm: 12.18.0
```

<!-- result:end -->
