# oRPC OpenAPI Runtime Benchmark

- Evaluates the performance of oRPC's OpenAPI runtime on a project with **6 procedures** and **3 routers**; every procedure is exposed as a RESTful `GET` endpoint that reads its input from query parameters, served by `OpenAPIHandler` from `@orpc/openapi/node` on a plain `node:http` server.
- Uses [Standard Schema](https://github.com/standard-schema/standard-schema) instead of a specific library like Zod so the results reflect oRPC's performance without external influences.
- Load: `GET /nested/procedure_1?who=hello%20world`, the same request as the Hono benchmark; both return the same JSON body.
- Comparable to the other benchmarks in the `openapi` group: [openapi-orpc](../openapi-orpc), [openapi-hono](../openapi-hono).

## How to run

```bash
pnpm bench          # this benchmark only; the numbers are printed, not saved
pnpm bench:profile  # Clinic.js Doctor report at .clinic/report.clinic-doctor.html
```

The committed results come from running the whole `openapi` group in one session from the repository root (`pnpm bench openapi`), so every library in the group is measured under the same conditions. See the [methodology](../../README.md#methodology).

## Latest Result

<!-- result:start -->

oRPC 2.0.0-beta.50 — 2026-11-11 (@orpc/server@2.0.0-beta.50, @orpc/openapi@2.0.0-beta.50)

| Metric        | Result                                                                 |
| :------------ | :--------------------------------------------------------------------- |
| Throughput    | **28,311 req/s** (median; rounds range 20,948 – 32,252, CV 11%)        |
| Latency       | p50 0.30 ms · p90 0.53 ms · p99 0.83 ms · p99.9 1.33 ms · mean 0.35 ms |
| Server CPU    | 34.8 µs per request (99% of one core used)                             |
| Server memory | 95 MiB peak RSS (94 MiB average while under load)                      |

<details>
<summary>Per-round results, request and response</summary>

Drift is the throughput change from the first to the second half of the measurement window; a clearly positive value means the server was still warming up.

| Round |  Req/s |  Drift |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | -----: | -----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 30,172 |  -0.6% | 0.28 ms | 0.75 ms | 7.59 ms |        99% |   32.8 µs |   95 MiB |  0.6% |          40% |
|     2 | 28,817 |  -1.3% | 0.30 ms | 0.79 ms | 26.4 ms |        99% |   34.2 µs |   96 MiB |  1.0% |          36% |
|     3 | 27,971 |  +4.3% | 0.31 ms | 0.83 ms | 4.72 ms |        99% |   35.4 µs |   94 MiB |  0.8% |          39% |
|     4 | 32,252 |  -0.9% | 0.27 ms | 0.67 ms | 3.80 ms |        99% |   30.6 µs |   96 MiB |  0.8% |          38% |
|     5 | 30,034 |  +7.9% | 0.29 ms | 0.74 ms | 8.92 ms |        99% |   33.0 µs |   92 MiB |  0.5% |          37% |
|     6 | 20,948 | -21.3% | 0.44 ms | 1.29 ms | 28.6 ms |        98% |   46.8 µs |   97 MiB |  1.1% |          39% |
|     7 | 28,652 |  -1.4% | 0.29 ms | 0.85 ms | 24.8 ms |        98% |   34.2 µs |   94 MiB |  1.5% |          40% |
|     8 | 27,754 | -13.5% | 0.31 ms | 0.84 ms | 18.2 ms |        98% |   35.4 µs |   94 MiB |  1.1% |          37% |
|     9 | 27,446 |  +7.4% | 0.30 ms | 0.88 ms | 4.72 ms |        99% |   36.1 µs |   96 MiB |  0.5% |          39% |
|    10 | 26,811 |  -4.3% | 0.34 ms | 0.84 ms | 4.73 ms |        99% |   36.8 µs |   94 MiB |  1.1% |          38% |

Request sent by the load generator (plus a `Host` header):

```http
GET /nested/procedure_1?who=hello%20world HTTP/1.1
User-Agent: orpc-benchmarks
Accept: */*
```

Response:

```
{"name":"nested/procedure_1","date":"2026-11-11T03:23:33.865Z","input":{"who":"hello world"}}
```

</details>

Compared with the rest of the `openapi` group, measured in the same session:

| Library                     | Version       |       Throughput | Relative                    | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :-------------------------- | :------------ | ---------------: | :-------------------------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [**oRPC**](../openapi-orpc) | 2.0.0-beta.50 | **28,311** req/s | fastest                     |   20,948 – 32,252 |     0.30 ms |     0.83 ms |          34.8 µs |   95 MiB |
| [Hono](../openapi-hono)     | 4.13.17       | **27,192** req/s | 1.04× slower (within noise) |   25,688 – 29,560 |     0.31 ms |     0.87 ms |          36.2 µs |  100 MiB |

<sub>Median of 10 rounds, each with a fresh server process (run order alternated); 10 connections, 10 s warm-up + 10 s measurement per round; server pinned to CPU 3, load generator to CPUs 1-2.</sub>

Clinic.js Doctor profile under the same load, generated with `pnpm bench:profile` ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/benchmarks/openapi-orpc/.clinic/report.clinic-doctor.html)). The profiler slows the server down, so use it to compare behaviour, not throughput:

- CPU usage: 99% on average (max 103%)
- Memory (RSS): 80 MiB – 98 MiB
- Event loop delay: 0.06 ms on average (max 7.70 ms)
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
