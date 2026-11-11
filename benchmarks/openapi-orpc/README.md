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
| Throughput    | **26,205 req/s** (median; rounds range 24,028 – 28,456, CV 5.2%)       |
| Latency       | p50 0.36 ms · p90 0.56 ms · p99 0.87 ms · p99.9 1.62 ms · mean 0.38 ms |
| Server CPU    | 37.7 µs per request (99% of one core used)                             |
| Server memory | 86 MiB peak RSS (86 MiB average while under load)                      |

<details>
<summary>Per-round results, request and response</summary>

Drift is the throughput change from the first to the second half of the measurement window; a clearly positive value means the server was still warming up.

| Round |  Req/s |  Drift |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | -----: | -----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 25,729 | -11.9% | 0.36 ms | 0.88 ms | 6.28 ms |        99% |   38.3 µs |   86 MiB |  0.7% |          37% |
|     2 | 26,283 |  -4.4% | 0.36 ms | 0.85 ms | 5.78 ms |        99% |   37.6 µs |   87 MiB |  0.7% |          39% |
|     3 | 24,149 | -21.3% | 0.40 ms | 0.89 ms | 7.11 ms |        99% |   41.0 µs |   80 MiB |  0.6% |          36% |
|     4 | 26,724 |  +1.9% | 0.32 ms | 0.85 ms | 9.18 ms |        98% |   36.9 µs |   86 MiB |  0.7% |          38% |
|     5 | 26,483 |  +0.2% | 0.32 ms | 0.89 ms | 5.74 ms |        98% |   37.0 µs |   84 MiB |  1.3% |          38% |
|     6 | 26,127 |  -4.1% | 0.35 ms | 0.86 ms | 4.67 ms |        99% |   37.9 µs |   88 MiB |  0.6% |          37% |
|     7 | 28,456 |  +0.8% | 0.30 ms | 0.85 ms | 6.18 ms |        98% |   34.5 µs |   87 MiB |  1.2% |          41% |
|     8 | 27,016 |  +2.0% | 0.32 ms | 0.86 ms | 5.48 ms |        99% |   36.5 µs |   84 MiB |  0.7% |          42% |
|     9 | 24,028 | +10.3% | 0.40 ms | 0.89 ms | 6.95 ms |        99% |   41.0 µs |   88 MiB |  0.6% |          37% |
|    10 | 24,934 | +21.6% | 0.39 ms | 0.88 ms | 4.24 ms |        99% |   39.8 µs |   86 MiB |  0.1% |          36% |

Request sent by the load generator (plus a `Host` header):

```http
GET /nested/procedure_1?who=hello%20world HTTP/1.1
User-Agent: orpc-benchmarks
Accept: */*
```

Response:

```
{"name":"nested/procedure_1","date":"2026-11-11T06:54:47.230Z","input":{"who":"hello world"}}
```

</details>

Compared with the rest of the `openapi` group, measured in the same session:

| Library                     | Version       |       Throughput | Relative                    | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :-------------------------- | :------------ | ---------------: | :-------------------------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [**oRPC**](../openapi-orpc) | 2.0.0-beta.50 | **26,205** req/s | fastest                     |   24,028 – 28,456 |     0.36 ms |     0.87 ms |          37.7 µs |   86 MiB |
| [Hono](../openapi-hono)     | 4.13.17       | **24,747** req/s | 1.06× slower (within noise) |   22,208 – 27,061 |     0.37 ms |     0.92 ms |          39.9 µs |   93 MiB |

<sub>Median of 10 rounds, each with a fresh server process (run order alternated); 10 connections, 10 s warm-up + 10 s measurement per round; server pinned to CPU 3, load generator to CPUs 1-2.</sub>

Clinic.js Doctor profile under the same load, generated with `pnpm bench:profile` ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/benchmarks/openapi-orpc/.clinic/report.clinic-doctor.html)). The profiler slows the server down, so use it to compare behaviour, not throughput:

- CPU usage: 99% on average (max 103%)
- Memory (RSS): 80 MiB – 98 MiB
- Event loop delay: 0.06 ms on average (max 7.70 ms)
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
