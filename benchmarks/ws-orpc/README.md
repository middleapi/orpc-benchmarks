# oRPC WebSocket Runtime Benchmark

- Evaluates the performance of oRPC's RPC runtime over **WebSocket** on a project with **6 procedures** and **3 routers**, served by `RPCHandler` from `@orpc/server/websocket` on a [`ws`](https://github.com/websockets/ws) server.
- Uses [Standard Schema](https://github.com/standard-schema/standard-schema) instead of a specific library like Zod so the results reflect oRPC's performance without external influences.
- At the start of each run, [scripts/client.ts](./scripts/client.ts) calls `nested.procedure_1("hello world")` twice through the official oRPC WebSocket client and records the frames it sends. The load generator then replays that frame (with a fresh id per request) over 10 plain WebSocket connections, one request in flight each, so the numbers reflect the server rather than client-side scheduling — mirroring how the HTTP benchmarks send raw requests.
- Comparable to the other benchmarks in the `ws` group: [ws-orpc](../ws-orpc), [ws-trpc](../ws-trpc).

## How to run

```bash
pnpm bench          # this benchmark only; the numbers are printed, not saved
pnpm bench:profile  # Clinic.js Doctor report at .clinic/report.clinic-doctor.html
```

The committed results come from running the whole `ws` group in one session from the repository root (`pnpm bench ws`), so every library in the group is measured under the same conditions. See the [methodology](../../README.md#methodology).

## Latest Result

<!-- result:start -->

oRPC 2.0.0-beta.50 — 2026-11-11 (@orpc/server@2.0.0-beta.50, @orpc/client@2.0.0-beta.50)

| Metric        | Result                                                                 |
| :------------ | :--------------------------------------------------------------------- |
| Throughput    | **27,878 req/s** (median; rounds range 22,626 – 28,986, CV 7.6%)       |
| Latency       | p50 0.29 ms · p90 0.54 ms · p99 0.90 ms · p99.9 3.32 ms · mean 0.36 ms |
| Server CPU    | 35.0 µs per request (98% of one core used)                             |
| Server memory | 113 MiB peak RSS (109 MiB average while under load)                    |

<details>
<summary>Per-round results, request and response</summary>

Drift is the throughput change from the first to the second half of the measurement window. A server still warming up shows a positive drift in nearly every round; single rounds vary with machine noise.

| Round |  Req/s | Drift |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | -----: | ----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 28,640 | -4.5% | 0.29 ms | 0.87 ms | 13.3 ms |        98% |   34.1 µs |  113 MiB |  1.2% |          44% |
|     2 | 28,986 | -1.5% | 0.29 ms | 0.90 ms | 21.1 ms |        97% |   33.6 µs |  113 MiB |  1.4% |          44% |
|     3 | 27,776 | -2.0% | 0.29 ms | 1.01 ms | 14.0 ms |        97% |   34.8 µs |  110 MiB |  1.8% |          44% |
|     4 | 27,699 | +3.6% | 0.30 ms | 0.91 ms | 12.6 ms |        98% |   35.3 µs |  112 MiB |  1.3% |          44% |
|     5 | 22,626 | -1.9% | 0.37 ms | 1.39 ms | 19.0 ms |        98% |   43.3 µs |  110 MiB |  1.1% |          46% |
|     6 | 28,449 | -3.7% | 0.29 ms | 0.90 ms | 14.9 ms |        98% |   34.3 µs |  111 MiB |  1.2% |          45% |
|     7 | 27,365 | -5.5% | 0.30 ms | 0.92 ms | 29.1 ms |        98% |   35.7 µs |  115 MiB |  1.2% |          45% |
|     8 | 27,980 | +6.8% | 0.30 ms | 0.87 ms | 14.6 ms |        98% |   35.2 µs |  114 MiB |  0.6% |          45% |
|     9 | 28,963 | -1.8% | 0.29 ms | 0.85 ms | 13.6 ms |        98% |   33.8 µs |  116 MiB |  1.3% |          43% |
|    10 | 24,584 | -5.2% | 0.37 ms | 0.96 ms | 14.4 ms |        98% |   39.9 µs |  112 MiB |  1.1% |          43% |

Frame sent by the load generator (the id is incremented for every request on a connection):

```
{"id":"1","kind":"request","json":{"url":"/nested/procedure_1","body":{"json":"hello world"}}}
```

Response:

```
{"id":"1","kind":"response","json":{"body":{"json":{"name":"nested/procedure_1","date":"2026-11-11T06:41:21.745Z","input":"hello world"},"meta":[["date","date"]]}}}
```

</details>

Compared with the rest of the `ws` group, measured in the same session:

| Library                | Version       |       Throughput | Relative     | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :--------------------- | :------------ | ---------------: | :----------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [**oRPC**](../ws-orpc) | 2.0.0-beta.50 | **27,878** req/s | fastest      |   22,626 – 28,986 |     0.29 ms |     0.90 ms |          35.0 µs |  113 MiB |
| [tRPC](../ws-trpc)     | 11.28.0       | **20,974** req/s | 1.33× slower |   19,595 – 22,477 |     0.40 ms |     1.12 ms |          47.0 µs |   82 MiB |

<sub>Median of 10 rounds, each with a fresh server process (run order alternated); 10 connections, 30 s warm-up + 10 s measurement per round; server pinned to CPU 3, load generator to CPUs 1-2.</sub>

Clinic.js Doctor profile under the same load, generated with `pnpm bench:profile` ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/benchmarks/ws-orpc/.clinic/report.clinic-doctor.html)). The profiler slows the server down, so use it to compare behaviour, not throughput:

- CPU usage: 98% on average (max 106%)
- Memory (RSS): 89 MiB – 122 MiB
- Event loop delay: 0.07 ms on average (max 10.3 ms)
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
