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

oRPC 2.0.0-beta.51 — 2026-11-17 (@orpc/server@2.0.0-beta.51, @orpc/client@2.0.0-beta.51, ws@8.23.0)

| Metric        | Result                                                                 |
| :------------ | :--------------------------------------------------------------------- |
| Throughput    | **27,448 req/s** (median; rounds 26,558 – 29,043, CV 3.9%)             |
| Latency       | p50 0.31 ms · p90 0.57 ms · p99 1.01 ms · p99.9 3.39 ms · mean 0.36 ms |
| Server CPU    | 35.4 µs per request (97% of one core)                                  |
| Server memory | 115 MiB peak RSS (114 MiB average under load)                          |

<details>
<summary>Per-round results, request and response</summary>

Drift: throughput change from the first to the second half of the measurement window. A server still warming up rises in nearly every round.

| Round |  Req/s | Drift |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | -----: | ----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 28,566 | +0.1% | 0.30 ms | 0.96 ms | 24.7 ms |        97% |   34.1 µs |  113 MiB |  1.0% |          49% |
|     2 | 28,786 | -9.8% | 0.30 ms | 0.93 ms | 20.0 ms |        97% |   33.8 µs |  117 MiB |  1.1% |          47% |
|     3 | 29,043 | +7.0% | 0.30 ms | 0.90 ms | 12.3 ms |        97% |   33.6 µs |  115 MiB |  1.1% |          48% |
|     4 | 26,574 | -6.7% | 0.32 ms | 1.01 ms | 12.2 ms |        97% |   36.6 µs |  116 MiB |  1.4% |          45% |
|     5 | 28,199 | +2.2% | 0.30 ms | 1.03 ms | 14.0 ms |        97% |   34.3 µs |  112 MiB |  1.8% |          49% |
|     6 | 26,583 | -1.8% | 0.32 ms | 1.01 ms | 18.5 ms |        97% |   36.6 µs |  116 MiB |  1.1% |          48% |
|     7 | 26,558 | -0.1% | 0.32 ms | 1.02 ms | 17.2 ms |        98% |   36.8 µs |  117 MiB |  1.1% |          46% |
|     8 | 28,486 | +6.2% | 0.30 ms | 0.91 ms | 19.1 ms |        98% |   34.3 µs |  114 MiB |  1.0% |          47% |
|     9 | 26,632 | -2.2% | 0.32 ms | 1.00 ms | 25.2 ms |        98% |   36.8 µs |  116 MiB |  0.7% |          46% |
|    10 | 26,696 | +1.9% | 0.32 ms | 1.09 ms | 35.6 ms |        97% |   36.4 µs |  115 MiB |  0.8% |          49% |

Frame (the id increments with each request):

```
{"id":"1","kind":"request","json":{"url":"/nested/procedure_1","body":{"json":"hello world"}}}
```

Response:

```
{"id":"1","kind":"response","json":{"body":{"json":{"name":"nested/procedure_1","date":"2026-11-17T14:45:36.350Z","input":"hello world"},"meta":[["date","date"]]}}}
```

</details>

The whole `ws` group, measured in the same session:

| Library                | Version       |       Throughput | Relative     | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :--------------------- | :------------ | ---------------: | :----------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [**oRPC**](../ws-orpc) | 2.0.0-beta.51 | **27,448 req/s** | fastest      |   26,558 – 29,043 |     0.31 ms |     1.01 ms |          35.4 µs |  115 MiB |
| [tRPC](../ws-trpc)     | 11.28.3       | **21,095 req/s** | 1.30× slower |   18,646 – 23,239 |     0.40 ms |     1.17 ms |          46.7 µs |   84 MiB |

<sub>Median of 10 rounds (fresh server each, order alternated) · 10 connections · 30 s warm-up + 10 s measured · server on CPU 3, load generator on CPUs 1-2.</sub>

Clinic.js Doctor profile from `pnpm bench:profile`, under the same load ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/benchmarks/ws-orpc/.clinic/report.clinic-doctor.html)); it is a single round, so compare behaviour, not throughput:

- CPU usage: 97% on average
- Memory (RSS): 74 MiB – 116 MiB
- Event loop delay: 0.08 ms on average (max 18.4 ms)
- Detected issues: CPU usage (data), event loop utilization (performance; expected: the load keeps the server saturated)

Run on:

```
CPU: Intel(R) Xeon(R) Processor @ 2.10GHz (4 CPUs, no SMT, KVM VM)
Memory: 16088 MiB
OS: Ubuntu 24.04.5 LTS (Linux 6.18.44-fc-v553 x64)
Node: v26.13.1 (V8 14.6.202.34-node.40)
pnpm: 12.21.0
```

<!-- result:end -->
