# oRPC RPC Runtime Benchmark

- Evaluates the performance of oRPC's RPC runtime over HTTP on a project with **6 procedures** and **3 routers**, served by `RPCHandler` from `@orpc/server/node` on a plain `node:http` server.
- Inputs use a no-op [Standard Schema](https://github.com/standard-schema/standard-schema) validator rather than a schema library such as Zod, so the result reflects oRPC itself.
- Load: the `GET` request the official client (`RPCLink` with `method: "GET"`) sends for `nested.procedure_1("hello world")`, captured by [scripts/client.ts](./scripts/client.ts) at the start of each run.

## How to run

```bash
pnpm bench          # this benchmark only (printed, not saved)
pnpm bench:profile  # Clinic.js Doctor report at .clinic/report.clinic-doctor.html
```

Committed results come from `pnpm bench rpc` at the repository root, which measures the whole group in one session; see the [methodology](../../README.md#methodology).

## Latest Result

<!-- result:start -->

oRPC 2.0.0-beta.50 — 2026-11-11 (@orpc/server@2.0.0-beta.50, @orpc/client@2.0.0-beta.50)

| Metric        | Result                                                                 |
| :------------ | :--------------------------------------------------------------------- |
| Throughput    | **25,797 req/s** (median; rounds range 22,255 – 30,746, CV 9.5%)       |
| Latency       | p50 0.34 ms · p90 0.57 ms · p99 0.90 ms · p99.9 2.11 ms · mean 0.39 ms |
| Server CPU    | 38.2 µs per request (99% of one core used)                             |
| Server memory | 87 MiB peak RSS (86 MiB average while under load)                      |

<details>
<summary>Per-round results, request and response</summary>

Drift is the throughput change from the first to the second half of the measurement window. A server still warming up shows a positive drift in nearly every round; single rounds vary with machine noise.

| Round |  Req/s |  Drift |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | -----: | -----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 25,720 | +17.5% | 0.36 ms | 0.90 ms | 7.23 ms |        99% |   38.4 µs |   85 MiB |  0.6% |          37% |
|     2 | 23,804 |  +1.0% | 0.40 ms | 0.89 ms | 4.88 ms |        99% |   41.5 µs |   87 MiB |  0.7% |          34% |
|     3 | 27,300 |  -1.0% | 0.32 ms | 0.84 ms | 7.61 ms |        99% |   36.2 µs |   88 MiB |  1.0% |          40% |
|     4 | 22,255 |  -8.3% | 0.39 ms | 1.22 ms | 4.11 ms |        99% |   44.7 µs |   86 MiB |  0.2% |          38% |
|     5 | 25,023 |  -4.9% | 0.37 ms | 0.91 ms | 4.16 ms |        99% |   39.5 µs |   84 MiB |  0.7% |          36% |
|     6 | 27,581 | -15.8% | 0.31 ms | 0.85 ms | 4.84 ms |        98% |   35.6 µs |   87 MiB |  0.8% |          38% |
|     7 | 28,270 |  +1.9% | 0.30 ms | 0.83 ms | 10.1 ms |        98% |   34.7 µs |   83 MiB |  1.1% |          37% |
|     8 | 24,072 |  -9.6% | 0.35 ms | 1.11 ms | 5.13 ms |        99% |   41.1 µs |   88 MiB |  0.8% |          39% |
|     9 | 25,874 | +16.3% | 0.33 ms | 0.98 ms | 4.72 ms |        98% |   38.1 µs |   87 MiB |  1.1% |          38% |
|    10 | 30,746 |  -0.5% | 0.28 ms | 0.74 ms | 4.81 ms |        99% |   32.1 µs |   87 MiB |  1.0% |          38% |

Request sent by the load generator (plus a `Host` header):

```http
GET /nested/procedure_1?data=%7B%22json%22%3A%22hello+world%22%7D HTTP/1.1
User-Agent: orpc-benchmarks
Accept: */*
```

Response:

```
{"json":{"name":"nested/procedure_1","date":"2026-11-11T06:34:35.585Z","input":"hello world"},"meta":[["date","date"]]}
```

</details>

Compared with the rest of the `rpc` group, measured in the same session:

| Library                 | Version       |       Throughput | Relative     | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :---------------------- | :------------ | ---------------: | :----------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [**oRPC**](../rpc-orpc) | 2.0.0-beta.50 | **25,797** req/s | fastest      |   22,255 – 30,746 |     0.34 ms |     0.90 ms |          38.2 µs |   87 MiB |
| [tRPC](../rpc-trpc)     | 11.28.0       |  **7,106** req/s | 3.63× slower |     5,880 – 8,772 |     1.13 ms |     4.68 ms |         139.5 µs |  197 MiB |

<sub>Median of 10 rounds, each with a fresh server process (run order alternated); 10 connections, 10 s warm-up + 10 s measurement per round; server pinned to CPU 3, load generator to CPUs 1-2.</sub>

Clinic.js Doctor profile under the same load, generated with `pnpm bench:profile` ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/benchmarks/rpc-orpc/.clinic/report.clinic-doctor.html)). The profiler slows the server down, so use it to compare behaviour, not throughput:

- CPU usage: 98% on average (max 102%)
- Memory (RSS): 79 MiB – 95 MiB
- Event loop delay: 0.10 ms on average (max 14.2 ms)
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
