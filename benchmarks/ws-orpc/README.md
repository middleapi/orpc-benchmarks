# oRPC WebSocket Runtime Benchmark

- Evaluates the performance of oRPC's RPC runtime over **WebSocket** on a project with **6 procedures** and **3 routers**, served by `RPCHandler` from `@orpc/server/websocket` on a [`ws`](https://github.com/websockets/ws) server.
- Inputs use a no-op [Standard Schema](https://github.com/standard-schema/standard-schema) validator rather than a schema library such as Zod, so the result reflects oRPC itself.
- Load: the frame the official oRPC WebSocket client sends for `nested.procedure_1("hello world")`, captured by [scripts/client.ts](./scripts/client.ts) at the start of each run and replayed with a fresh id per request over 10 plain WebSocket connections, one request in flight each.

## How to run

```bash
pnpm bench          # this benchmark only (printed, not saved)
pnpm bench:profile  # Clinic.js Doctor report at .clinic/report.clinic-doctor.html
```

Committed results come from `pnpm bench ws` at the repository root, which measures the whole group in one session; see the [methodology](../../README.md#methodology).

## Latest Result

<!-- result:start -->

oRPC 2.0.0-beta.50 — 2026-11-11 (@orpc/server@2.0.0-beta.50, @orpc/client@2.0.0-beta.50)

| Metric        | Result                                                                 |
| :------------ | :--------------------------------------------------------------------- |
| Throughput    | **25,056 req/s** (median; rounds 22,879 – 29,053, CV 7.2%)             |
| Latency       | p50 0.37 ms · p90 0.58 ms · p99 0.95 ms · p99.9 3.68 ms · mean 0.40 ms |
| Server CPU    | 39.6 µs per request (99% of one core)                                  |
| Server memory | 112 MiB peak RSS (103 MiB average under load)                          |

<details>
<summary>Per-round results, request and response</summary>

Drift: throughput change from the first to the second half of the measurement window. A server still warming up rises in nearly every round.

| Round |  Req/s |  Drift |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | -----: | -----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 25,126 | -11.7% | 0.37 ms | 0.95 ms | 18.0 ms |        99% |   39.5 µs |  109 MiB |  0.1% |          45% |
|     2 | 24,529 |  -9.7% | 0.37 ms | 0.96 ms | 17.2 ms |        99% |   40.2 µs |  103 MiB |  0.3% |          44% |
|     3 | 22,879 |  +5.1% | 0.41 ms | 1.08 ms | 16.5 ms |        98% |   42.8 µs |  112 MiB |  1.1% |          43% |
|     4 | 25,713 |  +4.4% | 0.36 ms | 0.93 ms | 11.7 ms |        99% |   38.4 µs |  112 MiB |  0.5% |          45% |
|     5 | 24,847 |  +6.2% | 0.38 ms | 0.95 ms | 16.1 ms |        98% |   39.6 µs |  113 MiB |  0.6% |          45% |
|     6 | 29,053 |  -0.8% | 0.29 ms | 0.84 ms | 14.9 ms |        99% |   33.9 µs |  115 MiB |  0.5% |          49% |
|     7 | 27,029 | -13.9% | 0.32 ms | 0.93 ms | 21.5 ms |        98% |   36.4 µs |  113 MiB |  1.1% |          46% |
|     8 | 25,393 |  +3.8% | 0.36 ms | 1.00 ms | 14.2 ms |        98% |   38.6 µs |  111 MiB |  0.9% |          42% |
|     9 | 24,986 |  -5.6% | 0.38 ms | 0.90 ms | 15.1 ms |        99% |   39.6 µs |  108 MiB |  0.4% |          43% |
|    10 | 22,911 |  +4.0% | 0.40 ms | 1.13 ms | 15.4 ms |        99% |   43.1 µs |  113 MiB |  0.9% |          42% |

Frame (the id increments with each request):

```
{"id":"1","kind":"request","json":{"url":"/nested/procedure_1","body":{"json":"hello world"}}}
```

Response:

```
{"id":"1","kind":"response","json":{"body":{"json":{"name":"nested/procedure_1","date":"2026-11-11T11:02:01.857Z","input":"hello world"},"meta":[["date","date"]]}}}
```

</details>

The whole `ws` group, measured in the same session:

| Library                | Version       |       Throughput | Relative     | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :--------------------- | :------------ | ---------------: | :----------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [**oRPC**](../ws-orpc) | 2.0.0-beta.50 | **25,056 req/s** | fastest      |   22,879 – 29,053 |     0.37 ms |     0.95 ms |          39.6 µs |  112 MiB |
| [tRPC](../ws-trpc)     | 11.28.0       | **18,110 req/s** | 1.38× slower |   16,297 – 21,954 |     0.53 ms |     1.26 ms |          54.5 µs |   81 MiB |

<sub>Median of 10 rounds (fresh server each, order alternated) · 10 connections · 30 s warm-up + 10 s measured · server on CPU 3, load generator on CPUs 1-2.</sub>

Clinic.js Doctor profile from `pnpm bench:profile`, under the same load ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/benchmarks/ws-orpc/.clinic/report.clinic-doctor.html)); the profiler slows the server, so compare behaviour, not throughput:

- CPU usage: 98% on average (max 106%)
- Memory (RSS): 89 MiB – 122 MiB
- Event loop delay: 0.07 ms on average (max 10.3 ms)
- Detected issues: event loop utilization (performance; expected: the load keeps the server saturated)

Run on:

```
CPU: Intel(R) Xeon(R) Processor @ 2.10GHz (4 CPUs, no SMT, KVM VM)
Memory: 16086 MB
OS: Ubuntu 24.04.5 LTS (Linux 6.18.44-fc-v378 x64)
Node: v26.13.0 (V8 14.6.202.34-node.40)
pnpm: 12.18.0
```

<!-- result:end -->
