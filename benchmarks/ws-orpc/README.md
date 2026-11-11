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

oRPC 2.0.0-beta.50 — 2026-11-11 (@orpc/server@2.0.0-beta.50, @orpc/client@2.0.0-beta.50, ws@8.22.2)

| Metric        | Result                                                                 |
| :------------ | :--------------------------------------------------------------------- |
| Throughput    | **23,050 req/s** (median; rounds 20,660 – 27,315, CV 8.3%)             |
| Latency       | p50 0.39 ms · p90 0.69 ms · p99 1.05 ms · p99.9 3.94 ms · mean 0.43 ms |
| Server CPU    | 42.9 µs per request (99% of one core)                                  |
| Server memory | 109 MiB peak RSS (102 MiB average under load)                          |

<details>
<summary>Per-round results, request and response</summary>

Drift: throughput change from the first to the second half of the measurement window. A server still warming up rises in nearly every round.

| Round |  Req/s |  Drift |     p50 |     p99 |     Max | Server CPU | CPU / req | Peak RSS | Steal | Load gen CPU |
| ----: | -----: | -----: | ------: | ------: | ------: | ---------: | --------: | -------: | ----: | -----------: |
|     1 | 24,577 |  +3.5% | 0.37 ms | 1.02 ms | 15.7 ms |        98% |   40.0 µs |  107 MiB |  0.6% |          43% |
|     2 | 24,226 | +11.0% | 0.39 ms | 1.07 ms | 19.6 ms |        98% |   40.3 µs |  113 MiB |  0.7% |          44% |
|     3 | 20,660 |  +2.6% | 0.42 ms | 1.04 ms | 26.8 ms |        99% |   48.2 µs |  109 MiB |  0.1% |          39% |
|     4 | 23,850 |  +1.2% | 0.39 ms | 1.01 ms | 13.3 ms |        99% |   41.4 µs |  118 MiB |  0.3% |          43% |
|     5 | 27,315 |  -8.1% | 0.30 ms | 0.95 ms | 13.5 ms |        98% |   35.9 µs |  112 MiB |  0.9% |          48% |
|     6 | 24,218 |  -0.9% | 0.39 ms | 0.98 ms | 10.9 ms |        98% |   40.5 µs |  121 MiB |  1.0% |          43% |
|     7 | 21,410 |  -4.0% | 0.41 ms | 1.18 ms | 17.2 ms |        99% |   46.2 µs |  109 MiB |  0.5% |          42% |
|     8 | 22,140 | -11.2% | 0.40 ms | 1.13 ms | 21.9 ms |        99% |   44.6 µs |  102 MiB |  0.4% |          42% |
|     9 | 22,217 |  +2.5% | 0.40 ms | 1.05 ms | 14.4 ms |        98% |   44.3 µs |  103 MiB |  0.8% |          42% |
|    10 | 22,249 |  -0.1% | 0.39 ms | 1.18 ms | 18.0 ms |        99% |   44.5 µs |  102 MiB |  0.5% |          40% |

Frame (the id increments with each request):

```
{"id":"1","kind":"request","json":{"url":"/nested/procedure_1","body":{"json":"hello world"}}}
```

Response:

```
{"id":"1","kind":"response","json":{"body":{"json":{"name":"nested/procedure_1","date":"2026-11-11T15:17:12.668Z","input":"hello world"},"meta":[["date","date"]]}}}
```

</details>

The whole `ws` group, measured in the same session:

| Library                | Version       |       Throughput | Relative     | Range (min – max) | Latency p50 | Latency p99 | Server CPU / req | Peak RSS |
| :--------------------- | :------------ | ---------------: | :----------- | ----------------: | ----------: | ----------: | ---------------: | -------: |
| [**oRPC**](../ws-orpc) | 2.0.0-beta.50 | **23,050 req/s** | fastest      |   20,660 – 27,315 |     0.39 ms |     1.05 ms |          42.9 µs |  109 MiB |
| [tRPC](../ws-trpc)     | 11.28.0       | **17,801 req/s** | 1.29× slower |   15,250 – 20,013 |     0.53 ms |     1.26 ms |          55.5 µs |   80 MiB |

<sub>Median of 10 rounds (fresh server each, order alternated) · 10 connections · 30 s warm-up + 10 s measured · server on CPU 3, load generator on CPUs 1-2.</sub>

Clinic.js Doctor profile from `pnpm bench:profile`, under the same load ([full report](./.clinic/report.clinic-doctor.html), [view in browser](https://htmlpreview.github.io/?https://github.com/middleapi/orpc-benchmarks/blob/main/benchmarks/ws-orpc/.clinic/report.clinic-doctor.html)); it is a single round, so compare behaviour, not throughput:

- CPU usage: 99% on average
- Memory (RSS): 72 MiB – 101 MiB
- Event loop delay: 0.09 ms on average (max 11.4 ms)
- Detected issues: event loop utilization (performance; expected: the load keeps the server saturated)

Run on:

```
CPU: Intel(R) Xeon(R) Processor @ 2.10GHz (4 CPUs, no SMT, KVM VM)
Memory: 16086 MiB
OS: Ubuntu 24.04.5 LTS (Linux 6.18.44-fc-v378 x64)
Node: v26.13.0 (V8 14.6.202.34-node.40)
pnpm: 12.18.0
```

<!-- result:end -->
