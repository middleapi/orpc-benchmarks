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
| Throughput    | **23,874 req/s** (median; rounds range 21,934 – 27,009, CV 5.8%)       |
| Latency       | p50 0.40 ms · p90 0.60 ms · p99 0.92 ms · p99.9 2.04 ms · mean 0.42 ms |
| Server CPU    | 41.2 µs per request (99% of one core used)                             |
| Server memory | 87 MiB peak RSS (86 MiB average while under load)                      |

<details>
<summary>Per-round results, request and response</summary>

Drift is the throughput change from the first to the second half of the measurement window. A server still warming up shows a positive drift in nearly every round; single rounds vary with machine noise.

| Round |  Req/s |  Drift |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | -----: | -----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 27,009 | +12.4% | 0.31 ms | 0.91 ms | 5.69 ms |        98% |   36.2 µs |   85 MiB |  1.5% |          39% |
|     2 | 24,410 |  -3.6% | 0.39 ms | 0.92 ms | 6.92 ms |        99% |   40.4 µs |   80 MiB |  0.7% |          38% |
|     3 | 24,150 |  +0.6% | 0.39 ms | 0.93 ms | 30.4 ms |        98% |   40.7 µs |   86 MiB |  1.2% |          37% |
|     4 | 21,934 |  +3.3% | 0.42 ms | 0.93 ms | 6.92 ms |        99% |   45.2 µs |   88 MiB |  0.3% |          36% |
|     5 | 24,282 |  -1.5% | 0.39 ms | 0.90 ms | 5.01 ms |        98% |   40.6 µs |   90 MiB |  0.7% |          38% |
|     6 | 23,481 |  +5.6% | 0.40 ms | 0.96 ms | 10.5 ms |        98% |   41.7 µs |   88 MiB |  1.1% |          37% |
|     7 | 23,410 | +16.0% | 0.41 ms | 0.91 ms | 4.82 ms |        99% |   42.3 µs |   88 MiB |  0.4% |          36% |
|     8 | 23,598 |  -5.3% | 0.41 ms | 0.97 ms | 5.36 ms |        99% |   41.9 µs |   89 MiB |  0.6% |          34% |
|     9 | 25,390 |  -9.1% | 0.38 ms | 0.88 ms | 6.07 ms |        98% |   38.8 µs |   85 MiB |  0.8% |          37% |
|    10 | 23,001 |  +6.2% | 0.41 ms | 0.91 ms | 7.36 ms |        99% |   43.0 µs |   86 MiB |  0.3% |          35% |

Request sent by the load generator (plus a `Host` header):

```http
GET /nested/procedure_1?who=hello%20world HTTP/1.1
User-Agent: orpc-benchmarks
Accept: */*
```

Response:

```
{"name":"nested/procedure_1","date":"2026-11-11T07:04:54.882Z","input":{"who":"hello world"}}
```

</details>

Compared with the rest of the `openapi` group, measured in the same session:

| Library                     | Version       |       Throughput | Relative             | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :-------------------------- | :------------ | ---------------: | :------------------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [**oRPC**](../openapi-orpc) | 2.0.0-beta.50 | **23,874** req/s | fastest              |   21,934 – 27,009 |     0.40 ms |     0.92 ms |          41.2 µs |   87 MiB |
| [Hono](../openapi-hono)     | 4.13.17       | **23,780** req/s | 1.00× (within noise) |   21,736 – 25,906 |     0.39 ms |     0.98 ms |          41.5 µs |   91 MiB |

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
