# oRPC RPC Runtime Benchmark

- Evaluates the performance of oRPC's RPC runtime over HTTP on a project with **6 procedures** and **3 routers**, served by `RPCHandler` from `@orpc/server/node` on a plain `node:http` server.
- Uses [Standard Schema](https://github.com/standard-schema/standard-schema) instead of a specific library like Zod so the results reflect oRPC's performance without external influences.
- The load generator sends exactly the `GET` request the official client (`RPCLink` with `method: "GET"`) produces for `nested.procedure_1("hello world")`, captured by [scripts/client.ts](./scripts/client.ts) at the start of each run.
- Comparable to the other benchmarks in the `rpc` group: [rpc-orpc](../rpc-orpc), [rpc-trpc](../rpc-trpc).

## How to run

```bash
pnpm bench          # this benchmark only; the numbers are printed, not saved
pnpm bench:profile  # Clinic.js Doctor report at .clinic/report.clinic-doctor.html
```

The committed results come from running the whole `rpc` group in one session from the repository root (`pnpm bench rpc`), so every library in the group is measured under the same conditions. See the [methodology](../../README.md#methodology).

## Latest Result

<!-- result:start -->

oRPC 2.0.0-beta.50 — 2026-11-11 (@orpc/server@2.0.0-beta.50, @orpc/client@2.0.0-beta.50)

| Metric        | Result                                                                 |
| :------------ | :--------------------------------------------------------------------- |
| Throughput    | **30,249 req/s** (median; rounds range 29,214 – 31,559, CV 2.7%)       |
| Latency       | p50 0.28 ms · p90 0.51 ms · p99 0.75 ms · p99.9 1.44 ms · mean 0.33 ms |
| Server CPU    | 32.5 µs per request (99% of one core used)                             |
| Server memory | 95 MiB peak RSS (95 MiB average while under load)                      |

<details>
<summary>Per-round results, request and response</summary>

Drift is the throughput change from the first to the second half of the measurement window; a clearly positive value means the server was still warming up.

| Round |  Req/s | Drift |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | -----: | ----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 31,559 | +1.1% | 0.27 ms | 0.70 ms | 6.65 ms |        99% |   31.2 µs |   94 MiB |  0.8% |          37% |
|     2 | 29,214 | -4.1% | 0.28 ms | 0.87 ms | 11.3 ms |        98% |   33.5 µs |   96 MiB |  1.1% |          39% |
|     3 | 31,074 | +4.0% | 0.28 ms | 0.71 ms | 11.7 ms |        99% |   31.8 µs |   98 MiB |  0.7% |          39% |
|     4 | 30,203 | -4.0% | 0.28 ms | 0.74 ms | 13.7 ms |        99% |   32.6 µs |   95 MiB |  0.7% |          37% |
|     5 | 30,176 | +1.7% | 0.28 ms | 0.76 ms | 3.61 ms |        99% |   32.7 µs |   95 MiB |  0.8% |          38% |
|     6 | 31,065 | -3.8% | 0.28 ms | 0.73 ms | 9.91 ms |        99% |   31.9 µs |   95 MiB |  0.6% |          37% |
|     7 | 30,687 | +5.7% | 0.28 ms | 0.75 ms | 5.19 ms |        98% |   32.1 µs |   96 MiB |  1.1% |          38% |
|     8 | 30,295 | +2.1% | 0.28 ms | 0.76 ms | 9.07 ms |        98% |   32.4 µs |   90 MiB |  0.8% |          39% |
|     9 | 29,292 | -2.8% | 0.29 ms | 0.82 ms | 12.2 ms |        98% |   33.6 µs |   92 MiB |  1.2% |          37% |
|    10 | 29,387 | -7.7% | 0.29 ms | 0.80 ms | 3.07 ms |        99% |   33.7 µs |   94 MiB |  0.5% |          37% |

Request sent by the load generator (plus a `Host` header):

```http
GET /nested/procedure_1?data=%7B%22json%22%3A%22hello+world%22%7D HTTP/1.1
User-Agent: orpc-benchmarks
Accept: */*
```

Response:

```
{"json":{"name":"nested/procedure_1","date":"2026-11-11T03:10:03.215Z","input":"hello world"},"meta":[["date","date"]]}
```

</details>

Compared with the rest of the `rpc` group, measured in the same session:

| Library                 | Version       |       Throughput | Relative     | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :---------------------- | :------------ | ---------------: | :----------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [**oRPC**](../rpc-orpc) | 2.0.0-beta.50 | **30,249** req/s | fastest      |   29,214 – 31,559 |     0.28 ms |     0.75 ms |          32.5 µs |   95 MiB |
| [tRPC](../rpc-trpc)     | 11.28.0       |  **8,213** req/s | 3.68× slower |     7,500 – 8,945 |     0.93 ms |     5.22 ms |         120.8 µs |  212 MiB |

<sub>Median of 10 rounds, each with a fresh server process (run order alternated); 10 connections, 10 s warm-up + 10 s measurement per round; server pinned to CPU 3, load generator to CPUs 1-2.</sub>

Clinic.js Doctor profile under the same load, generated with `pnpm bench:profile` ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/benchmarks/rpc-orpc/.clinic/report.clinic-doctor.html)). The profiler slows the server down, so use it to compare behaviour, not throughput:

- CPU usage: 98% on average (max 102%)
- Memory (RSS): 79 MiB – 95 MiB
- Event loop delay: 0.10 ms on average (max 14.2 ms)
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
